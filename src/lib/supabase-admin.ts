import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin client — uses the service_role key for privileged operations.
 * Only use on the server side (never expose to client).
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Supabase Admin: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Check if the Supabase Admin client is configured.
 */
export function isSupabaseAdminConfigured(): boolean {
  return !!supabaseUrl && !!supabaseServiceKey;
}
