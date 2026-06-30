import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseSessionCookie, SESSION_KEY } from "@/lib/session-cookie";

export interface CurrentUser {
  id: string;
  badgeCode: string;
  displayName: string;
  role: string;
  isAdmin: boolean;
  phone: string | null;
  handler: string | null;
  bio: string | null;
  hasPassword: boolean;
}

/**
 * Server-side: detect the currently logged-in badge user from cookies.
 * Checks the session cookie first (set after password verify), then
 * falls back to the anonymousId cookie for backward compatibility.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();

  // 1. Try session cookie (set after successful password verification)
  const sessionValue = cookieStore.get(SESSION_KEY)?.value;
  const sessionBadgeCode = parseSessionCookie(sessionValue);
  if (sessionBadgeCode) {
    const supabase = await createServerSupabaseClient();
    const { data: user } = await supabase
      .from('User')
      .select("*")
      .eq("badgeCode", sessionBadgeCode)
      .maybeSingle();

    if (user) {
      return {
        id: user.id,
        badgeCode: user.badgeCode,
        displayName: user.displayName,
        role: user.role,
        isAdmin: user.isAdmin,
        phone: user.phone,
        handler: user.handler,
        bio: user.bio,
        hasPassword: !!user.passwordHash,
      };
    }
  }

  // 2. Fall back to anonymousId cookie
  const anonId = cookieStore.get("noirgateway_id")?.value;
  if (!anonId) return null;

  const supabase = await createServerSupabaseClient();

  const { data: linkedUser } = await supabase
    .from('User')
    .select("*")
    .filter("linkedIds", "ov", `{${anonId}}`)
    .maybeSingle();

  if (!linkedUser) return null;

  return {
    id: linkedUser.id,
    badgeCode: linkedUser.badgeCode,
    displayName: linkedUser.displayName,
    role: linkedUser.role,
    isAdmin: linkedUser.isAdmin,
    phone: linkedUser.phone,
    handler: linkedUser.handler,
    bio: linkedUser.bio,
    hasPassword: !!linkedUser.passwordHash,
  };
}

/**
 * Check if the current user is BRU (has full admin access).
 */
export async function isCurrentUserBureau(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "BUREAU" || user?.isAdmin === true;
}
