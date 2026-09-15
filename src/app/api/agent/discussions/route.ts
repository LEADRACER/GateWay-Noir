import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

// GET /api/agent/discussions — list accessible discussions (DET+ only)
// BUREAU sees all; AGENT sees visibility='all'/'agents' + invited; DETECTIVE sees visibility='all' + invited
export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "DETECTIVE" && user.role !== "AGENT" && user.role !== "BUREAU")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('AgentDiscussion')
    .select('id, title, description, isOpen, visibility, createdById, createdAt, updatedAt, createdBy:User(badgeCode, displayName)')
    .order("updatedAt", { ascending: false });

  // Filter for non-BUREAU users
  if (user.role !== "BUREAU") {
    // Get discussion IDs where user is a participant
    const { data: participantDiscussions } = await supabase
      .from('DiscussionParticipant')
      .select('discussionId')
      .eq('userId', user.id);

    const participantIds = (participantDiscussions || []).map(p => p.discussionId);

    if (user.role === "DETECTIVE") {
      // DETECTIVE: only visibility='all' (which includes DET) OR user is participant
      query = query.or(`visibility.eq.all,${participantIds.length > 0 ? `id.in.(${participantIds.join(",")})` : 'id.eq.none'}`);
    } else {
      // AGENT: visibility='all' or 'agents' OR user is participant
      query = query.or(`visibility.in.(all,agents),${participantIds.length > 0 ? `id.in.(${participantIds.join(",")})` : 'id.eq.none'}`);
    }
  }

  const { data: discussions } = await query;

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

// POST /api/agent/discussions — create a new discussion (DET+ only)
// Body: { title, description?, visibility?: 'all'|'agents'|'invited', participantIds?: string[] }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "DETECTIVE" && user.role !== "AGENT" && user.role !== "BUREAU")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { title, description, visibility, participantIds } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // Visibility rules:
  // - BUREAU: can create 'all', 'agents', or 'invited'
  // - AGENT: can create 'all' or 'agents' (not 'invited')
  // - DETECTIVE: can only create 'all'
  let finalVisibility = 'all';
  if (user.role === "BUREAU") {
    finalVisibility = visibility || 'all';
  } else if (user.role === "AGENT") {
    finalVisibility = visibility === 'agents' ? 'agents' : 'all';
  }
  // DETECTIVE always gets 'all'

  if (finalVisibility === 'invited' && user.role !== 'BUREAU') {
    return NextResponse.json({ error: "Only Bureau can create invited-only discussions" }, { status: 403 });
  }
  if (finalVisibility === 'agents' && user.role === 'DETECTIVE') {
    return NextResponse.json({ error: "Detectives cannot create agent-only discussions" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: discussion, error: insertError } = await supabase
    .from('AgentDiscussion')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      visibility: finalVisibility,
      createdById: user.id,
      updatedAt: new Date().toISOString(),
    })
    .select('*, createdBy:User(badgeCode, displayName)')
    .single();

  if (insertError) {
    console.error("Failed to create discussion:", insertError);
    return NextResponse.json({ error: "Failed to create discussion" }, { status: 500 });
  }

  // Add creator as participant
  await supabase
    .from('DiscussionParticipant')
    .insert({
      discussionId: discussion.id,
      userId: user.id,
      invitedBy: user.id,
    });

  // Add additional participants (for invited discussions)
  if (finalVisibility === 'invited' && participantIds?.length) {
    const validParticipants = participantIds
      .filter((id: string) => id !== user.id) // creator already added
      .map((id: string) => ({
        discussionId: discussion.id,
        userId: id,
        invitedBy: user.id,
      }));

    if (validParticipants.length > 0) {
      await supabase
        .from('DiscussionParticipant')
        .insert(validParticipants);
    }
  }

  return NextResponse.json({ discussion }, { status: 201 });
}
