import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // SECURITY: the server-side client uses the SERVICE ROLE key (never shipped
    // to the browser). RLS is enabled on every table, so the public anon key is
    // locked down completely; the service role bypasses RLS and keeps the app
    // working. The anon fallback only covers environments missing the key.
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from Server Components — ignore (Next.js handles)
          }
        },
      },
    },
  );
}
