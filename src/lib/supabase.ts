import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Server-only client using the secret key, which bypasses RLS.
 * Never import this from client components.
 */
export function supabaseAdmin(): SupabaseClient {
  if (client) return client;

  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY missing from environment");
  }

  client = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
