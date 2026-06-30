import { createServerSupabaseClient } from "@/lib/supabase/server";

const BADGE_CHARS = "CDFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1
const BADGE_PREFIXES: Record<string, string> = {
  DETECTIVE: "DET",
  AGENT: "AGT",
  BUREAU: "BRU",
};

function randomChar(): string {
  return BADGE_CHARS[Math.floor(Math.random() * BADGE_CHARS.length)];
}

function generateCode(prefix: string): string {
  const code = Array.from({ length: 4 }, () => randomChar()).join("");
  return `${prefix}-${code}`;
}

/**
 * Extract the 4-char suffix from a badge code like "DET-A3K9" → "A3K9"
 */
export function extractSuffix(badgeCode: string): string {
  const parts = badgeCode.split("-");
  return parts[1] || parts[0].slice(-4);
}

/**
 * Generate a badge code with a given prefix and a given suffix.
 */
function generateCodeWithSuffix(prefix: string, suffix: string): string {
  return `${prefix}-${suffix.toUpperCase()}`;
}

/**
 * Generate a new badge code for a role, reusing the existing suffix if provided.
 */
export async function generateBadgeCode(role: string = "DETECTIVE", existingCode?: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const prefix = BADGE_PREFIXES[role] ?? "DET";

  // If we have an existing code, reuse its suffix
  if (existingCode) {
    const suffix = extractSuffix(existingCode);
    const newCode = generateCodeWithSuffix(prefix, suffix);
    const { data: existing } = await supabase
      .from('User')
      .select("id")
      .eq("badgeCode", newCode)
      .maybeSingle();
    if (!existing) return newCode;
    // Fall through to random if suffix collision
  }

  // Fallback: random suffix
  let attempts = 0;
  while (attempts < 20) {
    const code = generateCode(prefix);
    const { data: existing } = await supabase
      .from('User')
      .select("id")
      .eq("badgeCode", code)
      .maybeSingle();
    if (!existing) return code;
    attempts++;
  }
  throw new Error("Unable to generate unique badge code");
}

/**
 * Re-prefix an existing badge code to match a new role, keeping the same suffix.
 */
export function reprefixBadgeCode(badgeCode: string, newRole: string): string {
  const prefix = BADGE_PREFIXES[newRole] ?? "DET";
  const suffix = extractSuffix(badgeCode);
  return `${prefix}-${suffix}`;
}

export function getBadgePrefix(role: string): string {
  return BADGE_PREFIXES[role] ?? "DET";
}
