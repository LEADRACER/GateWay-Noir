/**
 * Standalone Supabase client for scripts (not SSR — no Next.js cookies).
 * Usage: npx tsx <script>.ts
 * 
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 * Falls back to NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
import { createClient } from "@supabase/supabase-js";

function getEnvVar(...names: string[]): string | undefined {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return undefined;
}

export function createScriptSupabaseClient() {
  const url = getEnvVar("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = getEnvVar("SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    console.error("Set them in .env or export them before running this script");
    process.exit(1);
  }

  return createClient(url, key);
}
