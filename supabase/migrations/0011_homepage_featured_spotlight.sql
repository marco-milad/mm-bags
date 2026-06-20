-- Singleton table that controls which product appears in the homepage
-- "Most-wanted this season" spotlight section (rendered by
-- components/home/FeaturedProduct.tsx). Mirrors migration 0006 in
-- intent — replace the legacy `tags @> ['featured']` selector with a
-- dedicated row the admin can edit from /admin/homepage without
-- touching product taxonomy. The tag stays on products for
-- backwards-compat / catalog filtering but no longer drives the
-- homepage pick.
--
-- Singleton pattern: `id boolean PRIMARY KEY check (id = true)` lets
-- AT MOST one row ever exist. Writers always upsert with `id = true`;
-- readers do a single `.maybeSingle()`. No position column, no list
-- semantics — just "the spotlight product right now".
--
-- ON DELETE CASCADE: if the underlying product is deleted, the
-- spotlight row goes with it and the homepage falls back to "no
-- featured product" (the existing page already handles that null
-- branch). Better UX than ON DELETE RESTRICT, which would block
-- product deletion until the admin first cleared the spotlight.

CREATE TABLE IF NOT EXISTS homepage_featured_spotlight (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: public can SELECT (the homepage SSR reads this every render);
-- writes go through the admin server action which uses the service-
-- role key (bypasses RLS). No INSERT/UPDATE/DELETE policies on purpose.
ALTER TABLE homepage_featured_spotlight ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homepage_featured_spotlight_read_all"
  ON homepage_featured_spotlight;
CREATE POLICY "homepage_featured_spotlight_read_all"
  ON homepage_featured_spotlight
  FOR SELECT
  USING (true);

-- Seed from the currently `featured`-tagged product so the homepage
-- doesn't blink to empty between this migration and the first admin
-- save. Pick the lowest sort_order, tie-broken by newest. Idempotent:
-- ON CONFLICT (id) DO NOTHING means re-running the migration won't
-- clobber an admin pick that's already been made.
INSERT INTO homepage_featured_spotlight (id, product_id)
SELECT true, id
FROM products
WHERE is_active = true
  AND 'featured' = ANY(tags)
ORDER BY sort_order ASC, created_at DESC
LIMIT 1
ON CONFLICT (id) DO NOTHING;
