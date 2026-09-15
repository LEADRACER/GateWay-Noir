import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

// Check if user has access to discussion
async function checkDiscussionAccess(supabase: any, user: any, discussion: any): Promise<boolean> {
  // BUREAU has access to everything
  if (user.role === "BUREAU") return true;

  // Creator has access
  if (discussion.createdById === user.id) return true;

  // For visibility='all', all DETECTIVE, AGENT, BUREAU have access
  if (discussion.visibility === 'all') return true;

  // For visibility='agents', AGENT and BUREAU have access
  if (discussion.visibility === 'agents' && (user.role === 'AGENT' || user.role === 'BUREAU')) return true;

  // For visibility='invited', check if user is participant
  const { data: participant } = await supabase
    .from('DiscussionParticipant')
    .select('id')
    .eq('discussionId', discussion.id)
    .eq('userId', user.id)
    .maybeSingle();

  return !!participant;
}

// GET /api/agent/discussions/[id]/messages — get messages for a discussion
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== "DETECTIVE" && user.role !== "AGENT" && user.role !== "BUREAU")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: discussion } = await supabase
    .from('AgentDiscussion')
    .select("id, title, description, isOpen, visibility, summary, createdById, updatedAt, createdAt")
    .eq("id", id)
    .maybeSingle();

  if (!discussion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check access
  const hasAccess = await checkDiscussionAccess(supabase, user, discussion);
  if (!hasAccess) {
    return NextResponse.json({ error: "Not authorized to view this discussion" }, { status: 403 });
  }

  const { data: messages } = await supabase
    .from('AgentDiscussionMessage')
    .select('*, user:User(badgeCode, displayName, role)')
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
  if (!user || (user.role !== "DETECTIVE" && user.role !== "AGENT" && user.role !== "BUREAU")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: discussion } = await supabase
    .from('AgentDiscussion')
    .select("id, isOpen, visibility, createdById")
    .eq("id", id)
    .maybeSingle();

  if (!discussion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check access for posting
  const hasAccess = await checkDiscussionAccess(supabase, user, discussion);
  if (!hasAccess) {
    return NextResponse.json({ error: "Not authorized to post in this discussion" }, { status: 403 });
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

  const { data: message, error: insertError } = await supabase
    .from('AgentDiscussionMessage')
    .insert({
      discussionId: id,
      content: content.trim(),
      userId: user.id,
    })
    .select('*, user:User(badgeCode, displayName, role)')
    .single();

  // SECURITY/BUG: check insert errors — no silent fake success
  if (insertError) {
    console.error("Failed to send message:", insertError);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  // Touch the discussion's updatedAt
  await supabase
    .from('AgentDiscussion')
    .update({ updatedAt: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ message }, { status: 201 });
}
