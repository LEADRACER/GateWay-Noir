"use server";

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

function extractSuffixInternal(badgeCode: string): string {
  const parts = badgeCode.split("-");
  return parts[1] || parts[0].slice(-4);
}

function generateCodeWithSuffix(prefix: string, suffix: string): string {
  return `${prefix}-${suffix.toUpperCase()}`;
}

export async function generateBadgeCode(role: string = "DETECTIVE", existingCode?: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const prefix = BADGE_PREFIXES[role] ?? "DET";

  if (existingCode) {
    const suffix = extractSuffixInternal(existingCode);
    const newCode = generateCodeWithSuffix(prefix, suffix);
    const { data: existing } = await supabase
      .from("User")
      .select("id")
      .eq("badgeCode", newCode)
      .maybeSingle();
    if (!existing) return newCode;
  }

  let attempts = 0;
  while (attempts < 20) {
    const code = generateCode(prefix);
    const { data: existing } = await supabase
      .from("User")
      .select("id")
      .eq("badgeCode", code)
      .maybeSingle();
    if (!existing) return code;
    attempts++;
  }
  throw new Error("Unable to generate unique badge code");
}