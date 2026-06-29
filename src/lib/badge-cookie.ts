const COOKIE_KEY = "noirgateway_badge";

/**
 * Save the badge code to a cookie for cross-session persistence.
 */
export function saveBadgeCodeToCookie(badgeCode: string): void {
  if (typeof window === "undefined") return;
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(badgeCode)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

/**
 * Retrieve the last-known badge code from the cookie.
 */
export function getBadgeCodeFromCookie(): string | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_KEY}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * Clear the badge code cookie.
 */
export function clearBadgeCodeCookie(): void {
  if (typeof window === "undefined") return;
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Extract the 4-char suffix from a full badge code.
 */
export function extractSuffix(badgeCode: string): string {
  const parts = badgeCode.split("-");
  return parts[1] || badgeCode.slice(-4);
}
