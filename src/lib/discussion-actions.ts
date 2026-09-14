"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

export async function getAgentDiscussions() {
  const caller = await getCurrentUser();
  if (!caller || (caller.role !== "AGENT" && caller.role !== "BUREAU")) {
    return [];
  }

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('AgentDiscussion')
    .select('id, title, description, isOpen, visibility, createdById, createdAt, updatedAt, createdBy:User(badgeCode, displayName)')
    .order("updatedAt", { ascending: false });

  if (caller.role === "AGENT") {
    const { data: participantDiscussions } = await supabase
      .from('DiscussionParticipant')
      .select('discussionId')
      .eq('userId', caller.id);

    const participantIds = (participantDiscussions || []).map(p => p.discussionId);

    query = query.or(`visibility.eq.all,${participantIds.length > 0 ? `id.in.(${participantIds.join(",")})` : 'id.eq.none'}`);
  }

  const { data: discussions } = await query;

  if (!discussions) return [];

  const enriched = await Promise.all(
    (discussions as any[]).map(async (d: any) => {
      const [{ count: messageCount }, { count: participantCount }] = await Promise.all([
        supabase
          .from('AgentDiscussionMessage')
          .select("*", { count: "exact", head: true })
          .eq("discussionId", d.id),
        supabase
          .from('DiscussionParticipant')
          .select("*", { count: "exact", head: true })
          .eq("discussionId", d.id),
      ]);
      return { 
        ...d, 
        _count: { 
          messages: messageCount ?? 0, 
          participants: participantCount ?? 0 
        } 
      };
    }),
  );

  return enriched;
}