import { createHmac, timingSafeEqual } from "crypto";

const SESSION_KEY = "noirgateway_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * SECURITY: sessions are opaque, HMAC-signed tokens — never the raw badgeCode.
 * A badge code is only 4 chars from a 32-char alphabet (~1M combos), so storing
 * it verbatim in the cookie made sessions trivially forgeable/brute-forceable.
 */
function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET (or NEXTAUTH_SECRET) must be set to sign session cookies");
  }
  return secret;
}

function sign(body: string): string {
  return createHmac("sha256", sessionSecret()).update(body).digest("base64url");
}

/** Create an opaque signed token for a badgeCode. Format: payload.sig */
export function createSessionToken(badgeCode: string): string {
  const payload = JSON.stringify({
    b: badgeCode,
    e: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
  const body = Buffer.from(payload).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** Verify a session token. Returns the badgeCode, or null when invalid/expired. */
export function verifySessionToken(token: string): string | null {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = sign(body);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      b?: string;
      e?: number;
    };
    if (typeof payload.b !== "string" || typeof payload.e !== "number") return null;
    if (payload.e < Math.floor(Date.now() / 1000)) return null;
    return payload.b;
  } catch {
    return null;
  }
}

export function setSessionCookie(badgeCode: string): string {
  const token = createSessionToken(badgeCode);
  return `${SESSION_KEY}=${token}; path=/; max-age=${SESSION_TTL_SECONDS}; SameSite=Lax; Secure; HttpOnly`;
}

export function clearSessionCookie(): string {
  return `${SESSION_KEY}=; path=/; max-age=0; SameSite=Lax; HttpOnly`;
}

export function parseSessionCookie(value: string | undefined): string | null {
  if (!value) return null;
  return verifySessionToken(value);
}

export function safeToISOString(d: Date | string): string {
  if (typeof d === "string") return d;
  return d.toISOString();
}

export { SESSION_KEY };
