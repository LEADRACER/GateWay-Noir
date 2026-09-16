import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import {
  canViewDiscussion,
  isDiscussionAudience,
  isSpectatorVisibility,
} from "@/lib/discussion-access";

const DISCUSSION_ROLES = new Set(["DETECTIVE", "AGENT", "BUREAU"]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (user && !DISCUSSION_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: discussion, error: discussionError } = await supabase
    .from("AgentDiscussion")
    .select(`id, visibility, "spectatorVisibility", "createdById"`)
    .eq("id", id)
    .maybeSingle();

  if (discussionError || !discussion) {
    return NextResponse.json(
      { error: discussionError ? "Failed to load discussion" : "Discussion not found" },
      { status: discussionError ? 500 : 404 },
    );
  }

  const participant = user
    ? await supabase
        .from("DiscussionParticipant")
        .select("id")
        .eq("discussionId", id)
        .eq("userId", user.id)
        .maybeSingle()
    : null;

  if (
    !canViewDiscussion({
      role: user?.role ?? null,
      audience: isDiscussionAudience(discussion.visibility)
        ? discussion.visibility
        : "bru_agt_det",
      spectatorVisibility: isSpectatorVisibility(discussion.spectatorVisibility)
        ? discussion.spectatorVisibility
        : "participants_only",
      isParticipant: Boolean(participant?.data),
      isCreator: discussion.createdById === user?.id,
    })
  ) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { data: participants, error: participantsError } = await supabase
    .from("DiscussionParticipant")
    .select(`
      id,
      discussionId,
      userId,
      joinedAt,
      user:User!userId(id, badgeCode, displayName, role)
    `)
    .eq("discussionId", id)
    .order("joinedAt", { ascending: true });

  if (participantsError) {
    return NextResponse.json({ error: "Failed to load participants" }, { status: 500 });
  }

  return NextResponse.json({
    participants: (participants || []).map((participantRow) => {
      const participantUser = Array.isArray(participantRow.user)
        ? participantRow.user[0]
        : participantRow.user;
      return {
        id: participantRow.id,
        discussionId: participantRow.discussionId,
        userId: participantRow.userId,
        joinedAt: participantRow.joinedAt,
        user: participantUser
          ? {
              id: participantUser.id,
              badgeCode: participantUser.badgeCode,
              displayName: participantUser.displayName,
              role: participantUser.role,
            }
          : null,
      };
    }),
  });
}
