import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";

// PATCH /api/agent/discussions/[id] — update title/description, close/reopen, visibility, participants
// Creator or BUREAU can update title/description/isOpen
// Only BUREAU can change visibility or manage participants
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

  const isCreator = discussion.createdById === user.id;
  const isBureau = user.role === "BUREAU";

  if (!isCreator && !isBureau) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};

  // Title/description - creator or BUREAU
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    update.title = body.title.trim();
  }
  if (body.description !== undefined) {
    update.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  }

  // isOpen - creator or BUREAU
  if (body.isOpen !== undefined) {
    update.isOpen = !!body.isOpen;

    // SEAL & SUMMARIZE: reopening a closed discussion wipes the old session
    if (discussion.isOpen === false && body.isOpen === true) {
      const { data: msgs } = await supabase
        .from('AgentDiscussionMessage')
        .select('content, createdAt, user:User(badgeCode)')
        .eq('discussionId', id)
        .order('createdAt', { ascending: true });

      if (msgs && msgs.length > 0) {
        const agents = [...new Set(msgs.map((m: any) => m.user?.badgeCode ?? "?"))].join(", ");
        const last = msgs[msgs.length - 1];
        const excerpt = String(last.content ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 160);
        update.summary = `${msgs.length} comment${msgs.length > 1 ? "s" : ""} · ${agents} · last ${new Date(
          last.createdAt
        ).toISOString().slice(0, 10)} — ${excerpt}`;
      } else {
        update.summary = null;
      }

      await supabase.from('AgentDiscussionMessage').delete().eq('discussionId', id);
    }
  }

  // Visibility - BUREAU only
  if (body.visibility !== undefined && isBureau) {
    if (!['all', 'invited'].includes(body.visibility)) {
      return NextResponse.json({ error: "Invalid visibility value" }, { status: 400 });
    }
    update.visibility = body.visibility;
  }

  // Participants management - BUREAU only
  if (body.participantIds !== undefined && isBureau) {
    if (!Array.isArray(body.participantIds)) {
      return NextResponse.json({ error: "participantIds must be an array" }, { status: 400 });
    }

    // Get current participants
    const { data: currentParticipants } = await supabase
      .from('DiscussionParticipant')
      .select('userId')
      .eq('discussionId', id);

    const currentIds = new Set((currentParticipants || []).map(p => p.userId));
    const newIds = new Set(body.participantIds.filter((id: string) => id !== discussion.createdById));

    // Remove participants not in new list
    const toRemove = [...currentIds].filter(id => !newIds.has(id));
    if (toRemove.length > 0) {
      await supabase
        .from('DiscussionParticipant')
        .delete()
        .eq('discussionId', id)
        .in('userId', toRemove);
    }

    // Add new participants
    const toAdd = [...newIds].filter(id => !currentIds.has(id));
    if (toAdd.length > 0) {
      const inserts = toAdd.map(userId => ({
        discussionId: id,
        userId,
        invitedBy: user.id,
      }));
      await supabase.from('DiscussionParticipant').insert(inserts);
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  update.updatedAt = new Date().toISOString();

  const { data: updated } = await supabase
    .from('AgentDiscussion')
    .update(update)
    .eq("id", id)
    .select()
    .single();

  // Revalidate discussion list and detail page so participant changes propagate
  revalidatePath("/agent/discussions");
  revalidatePath(`/agent/discussions/${id}`);

  return NextResponse.json({ discussion: updated });
}
