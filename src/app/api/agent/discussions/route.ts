import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

// GET /api/agent/discussions — list all open discussions (AGT+ only)
export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "AGENT" && user.role !== "BUREAU")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: discussions } = await supabase
    .from('AgentDiscussion')
    .select('*, User(badgeCode, displayName)')
    .order("updatedAt", { ascending: false });

  // Get message counts
  const enriched = await Promise.all(
    (discussions || []).map(async (d: any) => {
      const { count } = await supabase
        .from('AgentDiscussionMessage')
        .select("*", { count: "exact", head: true })
        .eq("discussionId", d.id);
      return { ...d, _count: { messages: count ?? 0 } };
    }),
  );

  return NextResponse.json({ discussions: enriched });
}

// POST /api/agent/discussions — create a new discussion (AGT+ only)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "AGENT" && user.role !== "BUREAU")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { title, description } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: discussion } = await supabase
    .from('AgentDiscussion')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      createdById: user.id,
    })
    .select('*, User(badgeCode, displayName)')
    .single();

  return NextResponse.json({ discussion }, { status: 201 });
}
