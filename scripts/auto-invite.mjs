#!/usr/bin/env node
/**
 * Auto-Invite — WhatsApp Group Invite Processor
 *
 * Processes pending group invites for the WhatsApp announcer cron.
 */

export async function processGroupInvites(sock, supabase) {
  if (!sock) return 0;

  try {
    const { data, error } = await supabase
      .from("AgentDiscussion")
      .select("id, title, visibility, \"DiscussionParticipant\":participants(userId)")
      .eq("visibility", "bru_agt_det")
      .limit(10);

    if (error) {
      console.error("auto-invite error:", error.message);
      return 0;
    }

    if (!data?.length) return 0;

    let processed = 0;
    for (const discussion of data) {
      // Invite logic would go here — for now, mark as processed
      processed++;
    }

    return processed;
  } catch (e) {
    console.error("auto-invite fatal:", e.message);
    return 0;
  }
}
