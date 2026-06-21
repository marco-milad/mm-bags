-- newsletter_subscribers — bring the table under version control and
-- lock down public read access.
--
-- BACKGROUND: The table was originally created by hand in Supabase
-- Studio (no prior migration ever defined it), so its RLS posture
-- could not be reasoned about from the repo alone. Five code paths
-- read/write it (lib/queries/admin-newsletter.ts, lib/admin/newsletter-
-- actions.ts, app/api/newsletter/route.ts, app/admin/newsletter/export/
-- route.ts, lib/queries/admin-usage.ts) — ALL of them go through
-- getSupabaseAdminClient() (service-role key, bypasses RLS), so no
-- application path needs an anon SELECT policy.
--
-- This migration:
--   1. Creates the table idempotently in the shape the app already
--      uses (matches lib/supabase/types.ts:648 generated types). Safe
--      to re-run; if the table already exists with the same columns,
--      it's a no-op.
--   2. Enables AND forces RLS (FORCE so even the table owner can't
--      bypass RLS by accident in future Studio-issued queries).
--   3. Drops any policies that may have been added by hand in Studio
--      (named or unnamed permissive policies on anon/authenticated)
--      so the deny-by-default posture is guaranteed.
--   4. Installs NO new policies — service-role bypasses RLS, anon and
--      authenticated roles get denied for every operation.

-- ─── 1. Table (idempotent) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  locale text NOT NULL CHECK (locale IN ('ar', 'en')),
  is_active boolean NOT NULL DEFAULT true,
  subscribed_at timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. Force RLS on ───────────────────────────────────────────────
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers FORCE ROW LEVEL SECURITY;

-- ─── 3. Drop any hand-rolled Studio policies ──────────────────────
-- The names below cover the defaults Studio's "New Policy" UI uses
-- (and the common patterns devs paste in). Adjust if a custom name
-- was used in this project — verify with:
--   select policyname from pg_policies where tablename = 'newsletter_subscribers';
DROP POLICY IF EXISTS "Enable read access for all users" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Enable insert for anon users" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Allow public read" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Allow anon insert" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_subscribers_read_all" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_subscribers_insert_all" ON public.newsletter_subscribers;

-- ─── 4. NO new policies. ──────────────────────────────────────────
-- Intentional: every legitimate access path uses the service-role
-- key (admin client), which bypasses RLS. Anon and authenticated
-- roles must be denied by default. Verify after apply:
--   select * from pg_policies where tablename = 'newsletter_subscribers';
--   -- expected: zero rows
