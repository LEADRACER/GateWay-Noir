/**
 * Phone number normalization — India-first (+91), E.164 output.
 *
 * Accepts:
 *   +919876543210  -> +919876543210   (already E.164, any country)
 *   9876543210     -> +919876543210   (10-digit Indian mobile -> +91)
 *   09876543210    -> +919876543210   (leading 0 dropped -> +91)
 *   919876543210   -> +919876543210   (implicit 91 -> +)
 *   +447911123456  -> +447911123456   (other country code kept)
 *   "98765 43210", "+91-98765-43210"  (separators stripped)
 *
 * Rejects (returns null): letters/symbols, <10 digits, bare numbers that are
 * not clearly Indian (e.g. a bare 13-digit number without +).
 */
export function normalizePhone(input: string): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  // Keep a leading '+' if present, drop everything else non-digit.
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;

  // Already E.164 (explicit +countrycode). 10-15 digits after '+'.
  if (hasPlus) {
    if (digits.length >= 10 && digits.length <= 15) return "+" + digits;
    return null;
  }

  // Bare (no '+') — India-first interpretation.
  if (digits.length === 10) {
    // 10-digit Indian mobile (national numbering starts 6-9); still accept
    // anything 10-digit as +91 since WAHA targets Indian numbers here.
    return "+91" + digits;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return "+91" + digits.slice(1); // 0XXXXXXXXXX -> +91XXXXXXXXXX
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return "+" + digits; // 91XXXXXXXXXX -> +91XXXXXXXXXX
  }

  // Anything else bare (or non-Indian without '+') is ambiguous — reject.
  return null;
}
