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

export function extractSuffix(badgeCode: string): string {
  const parts = badgeCode.split("-");
  return parts[1] || parts[0].slice(-4);
}

export async function generateBadgeCode(role: string = "DETECTIVE", existingCode?: string): Promise<string> {
  const { generateBadgeCode: serverGenerate } = await import("./server/badge");
  return serverGenerate(role, existingCode);
}

export function reprefixBadgeCode(badgeCode: string, newRole: string): string {
  const prefix = BADGE_PREFIXES[newRole] ?? "DET";
  const suffix = extractSuffix(badgeCode);
  return `${prefix}-${suffix}`;
}

export function getBadgePrefix(role: string): string {
  return BADGE_PREFIXES[role] ?? "DET";
}
