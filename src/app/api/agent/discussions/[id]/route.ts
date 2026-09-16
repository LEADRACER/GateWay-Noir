import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import {
  canManageParticipants,
  isDiscussionAudience,
  isSpectatorVisibility,
} from "@/lib/discussion-access";
import { revalidatePath } from "next/cache";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: discussion, error: discussionError } = await supabase
    .from("AgentDiscussion")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (discussionError || !discussion) {
    return NextResponse.json(
      { error: discussionError ? "Failed to load discussion" : "Discussion not found" },
      { status: discussionError ? 500 : 404 },
    );
  }

  const isCreator = discussion.createdById === user.id;
  const isBureau = user.role === "BUREAU";
  const isAgent = user.role === "AGENT";
  const canEditMetadata = isCreator || isBureau || isAgent;

  if (!canEditMetadata && !isBureau && !isAgent) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updateBody = body as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if (updateBody.title !== undefined) {
    if (typeof updateBody.title !== "string" || !updateBody.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (updateBody.title.trim().length > 200) {
      return NextResponse.json({ error: "Title is too long" }, { status: 400 });
    }
    update.title = updateBody.title.trim();
  }

  if (updateBody.description !== undefined) {
    if (typeof updateBody.description !== "string") {
      return NextResponse.json({ error: "Description must be a string" }, { status: 400 });
    }
    update.description = updateBody.description.trim() || null;
  }

  if (updateBody.isOpen !== undefined) {
    if (typeof updateBody.isOpen !== "boolean") {
      return NextResponse.json({ error: "isOpen must be a boolean" }, { status: 400 });
    }
    update.isOpen = updateBody.isOpen;

    if (discussion.isOpen === false && updateBody.isOpen === true) {
      const { data: messages, error: messagesError } = await supabase
        .from("AgentDiscussionMessage")
        .select("content, createdAt, user:User(badgeCode)")
        .eq("discussionId", id)
        .order("createdAt", { ascending: true });

      if (messagesError) {
        return NextResponse.json({ error: "Failed to reopen discussion" }, { status: 500 });
      }

      const sessionMessages = messages || [];
      const lastMessage = sessionMessages[sessionMessages.length - 1];
      const agents = [...new Set(sessionMessages.map((message) => {
        const author = Array.isArray(message.user) ? message.user[0] : message.user;
        return author?.badgeCode ?? "?";
      }))].join(", ");
      const excerpt = String(lastMessage?.content ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);

      update.summary = lastMessage
        ? `${sessionMessages.length} comment${sessionMessages.length === 1 ? "" : "s"} · ${agents} · last ${new Date(
            lastMessage.createdAt,
          ).toISOString().slice(0, 10)} — ${excerpt}`
        : null;

      const { error: deleteError } = await supabase
        .from("AgentDiscussionMessage")
        .delete()
        .eq("discussionId", id);
      if (deleteError) {
        return NextResponse.json({ error: "Failed to reopen discussion" }, { status: 500 });
      }
    }
  }

  if (updateBody.visibility !== undefined) {
    if (!isAgent && !isBureau) {
      return NextResponse.json({ error: "Only Agents and Bureau can change the audience" }, { status: 403 });
    }
    if (!isDiscussionAudience(updateBody.visibility)) {
      return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
    }
    if (isAgent && updateBody.visibility === "bru_only") {
      return NextResponse.json({ error: "Agents cannot set a BRU-only audience" }, { status: 403 });
    }
    update.visibility = updateBody.visibility;
  }

  // Spectator visibility is no longer editable since 'all' audience is removed
  // if (updateBody.spectatorVisibility !== undefined) { ... }

  if (updateBody.participantIds !== undefined) {
    if (!canManageParticipants(user.role)) {
      return NextResponse.json({ error: "Only Bureau can manage participants" }, { status: 403 });
    }
    if (!Array.isArray(updateBody.participantIds)) {
      return NextResponse.json({ error: "participantIds must be an array" }, { status: 400 });
    }
    if (
      !updateBody.participantIds.every(
        (participantId) =>
          typeof participantId === "string" &&
          participantId.trim().length > 0 &&
          participantId.trim() === participantId,
      )
    ) {
      return NextResponse.json({ error: "participantIds must contain user IDs" }, { status: 400 });
    }

    const requestedIds = [...new Set(updateBody.participantIds as string[])];
    const { data: users, error: usersError } = await supabase
      .from("User")
      .select("id")
      .in("id", requestedIds);
    if (usersError || users?.length !== requestedIds.length) {
      return NextResponse.json({ error: "One or more participants do not exist" }, { status: 400 });
    }

    const { data: currentParticipants, error: participantsError } = await supabase
      .from("DiscussionParticipant")
      .select("userId")
      .eq("discussionId", id);
    if (participantsError) {
      return NextResponse.json({ error: "Failed to load participants" }, { status: 500 });
    }

    const currentIds = new Set((currentParticipants || []).map((participant) => participant.userId));
    const nextIds = new Set([...requestedIds, discussion.createdById]);
    const toRemove = [...currentIds].filter((participantId) => !nextIds.has(participantId));
    const toAdd = [...nextIds].filter((participantId) => !currentIds.has(participantId));

    if (toRemove.length > 0) {
      const { error: removeError } = await supabase
        .from("DiscussionParticipant")
        .delete()
        .eq("discussionId", id)
        .in("userId", toRemove);
      if (removeError) {
        return NextResponse.json({ error: "Failed to update participants" }, { status: 500 });
      }
    }

    if (toAdd.length > 0) {
      const { error: addError } = await supabase
        .from("DiscussionParticipant")
        .insert(
          toAdd.map((participantId) => ({
            discussionId: id,
            userId: participantId,
            invitedBy: user.id,
          })),
        );
      if (addError) {
        return NextResponse.json({ error: "Failed to update participants" }, { status: 500 });
      }
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  update.updatedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("AgentDiscussion")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Failed to update discussion" }, { status: 500 });
  }

  revalidatePath("/agent/discussions");
  revalidatePath(`/agent/discussions/${id}`);

  return NextResponse.json({ discussion: updated });
}
