import { getAnonymousId } from "./anonymous";

export interface BadgeUser {
  id: string;
  badgeCode: string;
  displayName: string;
  role: string;
  phone?: string;
  handler?: string;
  hasPassword?: boolean;
  isAdmin?: boolean;
  voteCount?: number;
  commentCount?: number;
  createdAt?: string;
}

export interface BadgeStatus {
  success: boolean;
  hasBadge: boolean;
  isNew?: boolean;
  user?: BadgeUser;
}

export async function checkBadgeStatus(): Promise<BadgeStatus> {
  const anonymousId = getAnonymousId();
  if (!anonymousId) return { success: false, hasBadge: false };

  try {
    const res = await fetch(`/api/badge/reveal?anonymousId=${encodeURIComponent(anonymousId)}`);
    const data = await res.json();
    return data;
  } catch {
    return { success: false, hasBadge: false };
  }
}

export async function generateBadgeCode(): Promise<{
  success: boolean;
  user?: BadgeUser;
  error?: string;
}> {
  try {
    const anonymousId = getAnonymousId();
    const res = await fetch("/api/badge/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonymousId }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function claimBadge(badgeCode: string, password?: string): Promise<{
  success: boolean;
  alreadyClaimed?: boolean;
  error?: string;
  user?: BadgeUser;
}> {
  const anonymousId = getAnonymousId();
  if (!anonymousId) return { success: false, error: "No anonymous ID" };

  try {
    const res = await fetch("/api/badge/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badgeCode, anonymousId, password }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function registerPhone(badgeCode: string, phone: string): Promise<{
  success: boolean;
  phone?: string;
  error?: string;
}> {
  try {
    const res = await fetch("/api/badge/phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badgeCode, phone }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function setPassword(badgeCode: string, password: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const anonymousId = getAnonymousId();
  if (!anonymousId) return { success: false, error: "No anonymous ID" };

  try {
    const res = await fetch("/api/badge/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badgeCode: badgeCode.toUpperCase(), password, anonymousId }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function verifyPassword(badgeCode: string, password: string): Promise<{
  success: boolean;
  error?: string;
  user?: BadgeUser;
}> {
  try {
    const res = await fetch("/api/badge/verify-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badgeCode: badgeCode.toUpperCase(), password }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function updateBadgeName(badgeCode: string, displayName: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch("/api/badge/name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badgeCode: badgeCode.toUpperCase(), displayName }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "Network error" };
  }
}
