/**
 * WhatsApp Notification Dispatcher
 *
 * Provides message formatting helpers and a processing function
 * used by the standalone cron script (scripts/whatsapp-announcer.ts).
 *
 * Architecture (queue-based for Vercel compatibility):
 *   Server actions → add `notified=false` rows in DB tables
 *   Cron script   → polls DB, sends via Baileys, marks notified=true
 *
 * No direct Baileys calls from server actions — they use DB tracking
 * columns on ElevationRequest (notified), AgentTask (notified), and
 * Topic (announced).
 */

// ─── Message Formatting ───

/**
 * Format an elevation approval notification.
 */
export function formatElevationApproved(
  badgeCode: string,
): string {
  return [
    `━━━ NOIR BUREAU ━━━`,
    ``,
    `Your badge has been elevated.`,
    ``,
    `AGT-CODE: ${badgeCode}`,
    `STATUS:   FIELD AGENT`,
    ``,
    `You are now a Field Agent of the Gateway:Noir Bureau of Investigation.`,
    `Access your profile and tasks at:`,
    `https://noirgateway.app/agent/tasks`,
    ``,
    `— Gateway Noir Bureau`,
  ].join("\n");
}

/**
 * Format an elevation rejection notification.
 */
export function formatElevationRejected(): string {
  return [
    `━━━ NOIR BUREAU ━━━`,
    ``,
    `Your elevation request has been reviewed.`,
    ``,
    `STATUS: NOT APPROVED`,
    ``,
    `You may submit a new request after 30 days.`,
    ``,
    `— Gateway Noir Bureau`,
  ].join("\n");
}

/**
 * Format a task assignment notification.
 */
export function formatTaskAssigned(
  title: string,
  assignedBy: string,
): string {
  return [
    `━━━ NOIR BUREAU ━━━`,
    ``,
    `New task assigned by ${assignedBy}:`,
    ``,
    `"${title}"`,
    ``,
    `View & respond:`,
    `https://noirgateway.app/agent/tasks`,
    ``,
    `— Gateway Noir Bureau`,
  ].join("\n");
}

/**
 * Format a task completion notification (sent to the admin who assigned it).
 */
export function formatTaskCompleted(
  badgeCode: string,
  title: string,
): string {
  return [
    `━━━ NOIR BUREAU ━━━`,
    ``,
    `Agent ${badgeCode} completed a task:`,
    ``,
    `"${title}"`,
    ``,
    `— Gateway Noir Bureau`,
  ].join("\n");
}

/**
 * Format a topic conclusion / verdict announcement.
 */
export function formatTopicConcluded(
  title: string,
  verdict: string,
  slug: string,
): string {
  return [
    `━━━ CASE CLOSED ━━━`,
    ``,
    `"${title}"`,
    ``,
    `VERDICT: ${verdict}`,
    ``,
    `Read the full case:`,
    `https://noirgateway.app/topic/${slug}`,
    ``,
    `— Gateway Noir Bureau`,
  ].join("\n");
}
