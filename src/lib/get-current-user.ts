import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
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
