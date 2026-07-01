/**
 * Simple logger for WhatsApp modules.
 * Prefixes messages with timestamps and tags for clarity.
 */

export function log(tag: string, message: string): void {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  console.log(`[${timestamp}] [WA/${tag}] ${message}`);
}

export function error(tag: string, message: string, err?: unknown): void {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  console.error(`[${timestamp}] [WA/${tag}] ${message}`, err || "");
}
