import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

let cached: SupabaseClient<Database> | null = null;

/**
 * Anon-key Supabase client with no cookie adapter.
 *
 * createSupabaseServerClient() reads cookies() to keep a user's session in
 * sync. That is required wherever a query depends on who is asking, and
 * wrong everywhere else: touching cookies() opts the whole route into
 * dynamic rendering, so the [locale] layout's two catalogue reads were
 * enough to make every page on the site — including /faq and the policy
 * pages, which fetch nothing at all — server-render on every request.
 *
 * Nothing about the catalogue depends on the caller. The three RLS policies
 * covering these reads are role-independent:
 *
 *     collections       for select using (is_active)
 *     products          for select using (is_active)
 *     product_variants  for select using (true)
 *
 * so an anonymous request and a signed-in admin's request return the same
 * rows. This client makes that explicit and drops the false dependency.
 *
 * Anon key, never the service role: RLS still applies, exactly as it does
 * for the browser client.
 */
export function getSupabasePublicClient(): SupabaseClient<Database> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase public client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  cached = createClient<Database>(url, anonKey, {
    // No session to persist or refresh — this client never authenticates.
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
