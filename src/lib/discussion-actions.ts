"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { canViewDiscussion, isDiscussionAudience, isSpectatorVisibility } from "@/lib/discussion-access";

const DISCUSSION_ROLES = new Set(["DETECTIVE", "AGENT", "BUREAU"]);

export async function getAgentDiscussions() {
  const caller = await getCurrentUser();
  if (!caller || !DISCUSSION_ROLES.has(caller.role)) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data: discussions, error } = await supabase
    .from("AgentDiscussion")
    .select(`
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
    `)
    .order("updatedAt", { ascending: false });

  if (error || !discussions) return [];

  const { data: participants, error: participantError } = await supabase
    .from("DiscussionParticipant")
    .select("discussionId")
    .eq("userId", caller.id);
  if (participantError) return [];

  const participantDiscussionIds = new Set(
    (participants || []).map((participant) => participant.discussionId),
  );
  const visibleDiscussions = discussions.filter((discussion) =>
    canViewDiscussion({
      role: caller.role,
      audience: isDiscussionAudience(discussion.visibility)
        ? discussion.visibility
        : "bru_agt_det",
      spectatorVisibility: isSpectatorVisibility(discussion.spectatorVisibility)
        ? discussion.spectatorVisibility
        : "participants_only",
      isParticipant: participantDiscussionIds.has(discussion.id),
      isCreator: discussion.createdById === caller.id,
    }),
  );

  return Promise.all(
    visibleDiscussions.map(async (discussion) => {
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
      };
    }),
  );
}
