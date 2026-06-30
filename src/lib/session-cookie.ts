const SESSION_KEY = "noirgateway_session";

/**
 * Set the session cookie with the user's badgeCode.
 * Called after successful password verification.
 */
export function setSessionCookie(badgeCode: string): string {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  return `${SESSION_KEY}=${encodeURIComponent(badgeCode)}; path=/; max-age=${maxAge}; SameSite=Lax; HttpOnly`;
}

/**
 * Clear the session cookie.
 */
export function clearSessionCookie(): string {
  return `${SESSION_KEY}=; path=/; max-age=0; SameSite=Lax; HttpOnly`;
}

/**
 * Extract badgeCode from session cookie value.
 */
export function parseSessionCookie(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export { SESSION_KEY };
