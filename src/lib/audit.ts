import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

export type AuditAction =
  | "connection_created"
  | "connection_removed"
  | "connection_request_sent"
  | "connection_request_rejected"
  | "connection_followed"
  | "connection_unfollowed"
  | "connection_privacy_changed"
  | "elevation_requested"
  | "elevation_approved"
  | "elevation_rejected"
  | "topic_created"
  | "topic_concluded"
  | "topic_discarded"
  | "comment_posted"
  | "comment_flagged"
  | "vote_cast"
  | "badge_claimed"
  | "badge_password_set"
  | "badge_password_verified"
  | "agent_task_assigned"
  | "agent_task_completed"
  | "agent_discussion_created"
  | "agent_discussion_message"
  | "user_promoted"
  | "user_demoted"
  | "admin_action";

export interface AuditLogInput {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    const user = await getCurrentUser();
    const supabase = await createServerSupabaseClient();

    // Get request headers for IP/User-Agent (from Next.js request context)
    // Note: In API routes, you can pass these explicitly from the request
    const { error } = await supabase.from("AuditLog").insert({
      userId: user?.id ?? null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata ?? {},
      ipAddress: null, // Set from API route if available
      userAgent: null, // Set from API route if available
    });

    if (error) {
      console.error("Audit log error:", error);
    }
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}

export async function logAuditWithRequest(
  input: AuditLogInput,
  requestHeaders: { ip?: string; userAgent?: string }
): Promise<void> {
  try {
    const user = await getCurrentUser();
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from("AuditLog").insert({
      userId: user?.id ?? null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata ?? {},
      ipAddress: requestHeaders.ip ?? null,
      userAgent: requestHeaders.userAgent ?? null,
    });

    if (error) {
      console.error("Audit log error:", error);
    }
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}

// Helper to extract client info from Next.js request
export function getRequestInfo(req: Request): { ip: string; userAgent: string } {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  return { ip, userAgent };
}