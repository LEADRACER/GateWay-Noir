import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

// GET /api/agent/discussions/[id]/messages — get messages for a discussion
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== "AGENT" && user.role !== "BUREAU")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: discussion } = await supabase
    .from('AgentDiscussion')
    .select("id, title, description, isOpen, createdById, updatedAt, createdAt")
    .eq("id", id)
    .maybeSingle();

  if (!discussion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from('AgentDiscussionMessage')
    .select('*, User(badgeCode, displayName, role)')
    .eq("discussionId", id)
    .order("createdAt", { ascending: true });

  return NextResponse.json({ discussion, messages: messages || [] });
}

// POST /api/agent/discussions/[id]/messages — post a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== "AGENT" && user.role !== "BUREAU")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: discussion } = await supabase
    .from('AgentDiscussion')
    .select("isOpen")
    .eq("id", id)
    .maybeSingle();

  if (!discussion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!discussion.isOpen) {
    return NextResponse.json({ error: "Discussion is closed" }, { status: 400 });
  }

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (content.trim().length > 5000) {
    return NextResponse.json({ error: "Message too long (max 5000 chars)" }, { status: 400 });
  }

  const { data: message } = await supabase
    .from('AgentDiscussionMessage')
    .insert({
      discussionId: id,
      content: content.trim(),
      userId: user.id,
    })
    .select('*, User(badgeCode, displayName, role)')
    .single();

  // Touch the discussion's updatedAt
  await supabase
    .from('AgentDiscussion')
    .update({ updatedAt: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ message }, { status: 201 });
}
