import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

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
 * Returns null if no badge is linked.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const anonId = cookieStore.get("noirgateway_id")?.value;
  if (!anonId) return null;

  const linkedUser = await prisma.user.findFirst({
    where: {
      linkedIds: { array_contains: anonId },
    },
  });

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
