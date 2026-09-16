import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import {
  canManageParticipants,
  canViewDiscussion,
  isDiscussionAudience,
  isSpectatorVisibility,
} from "@/lib/discussion-access";

const DISCUSSION_SELECT = `
  id,
  title,
  description,
  "isOpen",
  visibility,
  "spectatorVisibility",
  "createdById",
  "createdAt",
  "updatedAt",
  summary,
  createdBy:User(badgeCode, displayName)
`;

const DISCUSSION_ROLES = new Set(["DETECTIVE", "AGENT", "BUREAU"]);

async function enrichDiscussions(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  discussions: Array<Record<string, unknown>>,
) {
  return Promise.all(
    discussions.map(async (discussion) => {
      const [{ count: messageCount }, { count: participantCount }] = await Promise.all([
        supabase
          .from("AgentDiscussionMessage")
          .select("*", { count: "exact", head: true })
          .eq("discussionId", discussion.id),
        supabase
          .from("DiscussionParticipant")
          .select("*", { count: "exact", head: true })
          .eq("discussionId", discussion.id),
      ]);

      // Get active participants (users who posted in last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentMessages } = await supabase
        .from("AgentDiscussionMessage")
        .select("userId, createdAt, user:User(badgeCode, displayName, role)")
        .eq("discussionId", discussion.id)
        .gte("createdAt", oneDayAgo)
        .order("createdAt", { ascending: false })
        .limit(10);

      // Get unique active participants with their latest activity
      const activeParticipantsMap = new Map<string, { badgeCode: string; displayName: string; role: string; lastActive: string }>();
      if (recentMessages) {
        for (const msg of recentMessages) {
          const user = Array.isArray(msg.user) ? msg.user[0] : msg.user;
          if (user && !activeParticipantsMap.has(user.badgeCode)) {
            activeParticipantsMap.set(user.badgeCode, {
              badgeCode: user.badgeCode,
              displayName: user.displayName,
              role: user.role,
              lastActive: msg.createdAt,
            });
          }
        }
      }
      const activeParticipants = Array.from(activeParticipantsMap.values()).slice(0, 5);

      const createdBy = Array.isArray(discussion.createdBy)
        ? discussion.createdBy[0] ?? null
        : discussion.createdBy ?? null;

      return {
        ...discussion,
        createdBy,
        _count: {
          messages: messageCount ?? 0,
          participants: participantCount ?? 0,
        },
        activeParticipants,
      };
    }),
  );
}

export async function GET() {
  const user = await getCurrentUser();
  if (user && !DISCUSSION_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const query = supabase.from("AgentDiscussion").select(DISCUSSION_SELECT);

  if (!user) {
    // Visitors can no longer see any discussions since 'all' audience is removed
    return NextResponse.json({ discussions: [] });
  }

  const { data: discussions, error } = await query.order("updatedAt", { ascending: false });
  if (error) {
    return NextResponse.json({ error: "Failed to load discussions" }, { status: 500 });
  }

  let participantDiscussionIds = new Set<string>();
  if (user) {
    const { data: participants, error: participantError } = await supabase
      .from("DiscussionParticipant")
      .select("discussionId")
      .eq("userId", user.id);

    if (participantError) {
      return NextResponse.json({ error: "Failed to load discussions" }, { status: 500 });
    }

    participantDiscussionIds = new Set(
      (participants || []).map((participant) => participant.discussionId),
    );
  }

  const visibleDiscussions = (discussions || []).filter((discussion) =>
    canViewDiscussion({
      role: user?.role ?? null,
      audience: isDiscussionAudience(discussion.visibility) ? discussion.visibility : "bru_agt_det",
      _spectatorVisibility: isSpectatorVisibility(discussion.spectatorVisibility)
        ? discussion.spectatorVisibility
        : "participants_only",
      isParticipant: participantDiscussionIds.has(String(discussion.id)),
      isCreator: discussion.createdById === user?.id,
    }),
  );

  const enriched = await enrichDiscussions(supabase, visibleDiscussions);
  return NextResponse.json({ discussions: enriched });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !DISCUSSION_ROLES.has(user.role)) {
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

  const requestBody = body as Record<string, unknown>;
  const title = typeof requestBody.title === "string" ? requestBody.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (title.length > 200) {
    return NextResponse.json({ error: "Title is too long" }, { status: 400 });
  }

  const description =
    typeof requestBody.description === "string" ? requestBody.description.trim() : "";
  const requestedAudience = requestBody.visibility ?? "bru_agt_det";
  if (!isDiscussionAudience(requestedAudience)) {
    return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
  }

  if (
    (user.role === "AGENT" && requestedAudience === "bru_only") ||
    (user.role === "DETECTIVE" && requestedAudience !== "bru_agt_det")
  ) {
    return NextResponse.json({ error: "Your role cannot create this audience" }, { status: 403 });
  }

  const requestedSpectatorVisibility =
    requestBody.spectatorVisibility ?? "participants_only";
  if (!isSpectatorVisibility(requestedSpectatorVisibility)) {
    return NextResponse.json({ error: "Invalid spectator visibility" }, { status: 400 });
  }
  // Spectator visibility 'all' is only relevant for 'all' audience which is removed
  if (requestedSpectatorVisibility === "all") {
    return NextResponse.json({ error: "Spectator visibility 'all' is not supported" }, { status: 400 });
  }

  let participantIds: string[] | undefined;
  if (requestBody.participantIds !== undefined) {
    if (!canManageParticipants(user.role) || !Array.isArray(requestBody.participantIds)) {
      return NextResponse.json({ error: "Only Bureau can manage participants" }, { status: 403 });
    }
    if (
      !requestBody.participantIds.every(
        (participantId) =>
          typeof participantId === "string" &&
          participantId.trim().length > 0 &&
          participantId.trim() === participantId,
      )
    ) {
      return NextResponse.json({ error: "participantIds must contain user IDs" }, { status: 400 });
    }
    participantIds = [...new Set(requestBody.participantIds as string[])].filter(
      (participantId) => participantId !== user.id,
    );
  }

  const supabase = await createServerSupabaseClient();

  if (participantIds?.length) {
    const { data: users, error: usersError } = await supabase
      .from("User")
      .select("id")
      .in("id", participantIds);

    if (usersError || users?.length !== participantIds.length) {
      return NextResponse.json({ error: "One or more participants do not exist" }, { status: 400 });
    }
  }

  const { data: discussion, error: insertError } = await supabase
    .from("AgentDiscussion")
    .insert({
      title,
      description: description || null,
      visibility: requestedAudience,
      spectatorVisibility: requestedSpectatorVisibility,
      createdById: user.id,
      updatedAt: new Date().toISOString(),
    })
    .select("*, createdBy:User(badgeCode, displayName)")
    .single();

  if (insertError || !discussion) {
    return NextResponse.json({ error: "Failed to create discussion" }, { status: 500 });
  }

  const creatorInsert = await supabase.from("DiscussionParticipant").insert({
    discussionId: discussion.id,
    userId: user.id,
    invitedBy: user.id,
  });
  if (creatorInsert.error) {
    return NextResponse.json({ error: "Failed to create discussion" }, { status: 500 });
  }

  if (participantIds?.length) {
    const { error: participantsError } = await supabase
      .from("DiscussionParticipant")
      .insert(
        participantIds.map((participantId) => ({
          discussionId: discussion.id,
          userId: participantId,
          invitedBy: user.id,
        })),
      );

    if (participantsError) {
      await supabase.from("AgentDiscussion").delete().eq("id", discussion.id);
      return NextResponse.json({ error: "Failed to add participants" }, { status: 500 });
    }
  }

  return NextResponse.json({ discussion }, { status: 201 });
}
