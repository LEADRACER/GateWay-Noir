import type { BadgeUser } from "@/lib/badge-client";

export const DEFAULT_BADGE_NAMES = [
  "Detective",
  "Agent",
  "Field Agent",
  "Bureau Chief",
  "Anonymous",
];

export function isDefaultBadgeName(name: string | null | undefined): boolean {
  const trimmed = name?.trim() || "";
  return !trimmed || DEFAULT_BADGE_NAMES.includes(trimmed);
}

export function getBadgeProfileRequirements(user: Pick<BadgeUser, "displayName" | "phone">) {
  return {
    needsName: isDefaultBadgeName(user.displayName),
    needsPhone: !user.phone?.trim(),
  };
}

export function isBadgeProfileComplete(user: Pick<BadgeUser, "displayName" | "phone">) {
  const requirements = getBadgeProfileRequirements(user);
  return !requirements.needsName && !requirements.needsPhone;
}
