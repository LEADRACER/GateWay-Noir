import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

// PATCH /api/agent/discussions/[id] — close/resolve a discussion
export async function PATCH(
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
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!discussion) {
    return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
  }

  if (discussion.createdById !== user.id && user.role !== "BUREAU") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const { data: updated } = await supabase
    .from('AgentDiscussion')
    .update({ isOpen: body.isOpen ?? discussion.isOpen })
    .eq("id", id)
    .select()
    .single();

  return NextResponse.json({ discussion: updated });
}
