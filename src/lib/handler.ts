import type { SupabaseClient } from "@supabase/supabase-js";

export interface HandlerBadgeInfo {
  id: string;
  badgeCode: string;
  displayName: string;
  phone: string | null;
  role: string;
}

/**
 * Resolve a user's handler (stored as the handler's user UUID) into the
 * handler's BADGE identity — the badge code is the public identifier used
 * everywhere else (login, claim, display, WA addressing).
 *
 * Returns null when there is no handler or the handler row no longer exists.
 */
export async function getHandlerBadgeInfo(
  supabase: SupabaseClient,
  handlerId: string | null | undefined
): Promise<HandlerBadgeInfo | null> {
  if (!handlerId) return null;
  const { data } = await supabase
    .from("User")
    .select("id, badgeCode, displayName, phone, role")
    .eq("id", handlerId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    badgeCode: data.badgeCode,
    displayName: data.displayName,
    phone: data.phone,
    role: data.role,
  };
}
