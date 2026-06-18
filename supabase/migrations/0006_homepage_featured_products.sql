-- Sortable join table that controls which products appear in the
-- homepage "Best Sellers" rail, and in what order. Replaces the
-- legacy `tags @> ARRAY['best-seller']` selector — the tag stays on
-- products as a search/taxonomy artefact but no longer drives
-- merchandising.
--
-- Pattern mirrors product_variants / collections sort_order: a
-- dedicated position column, edited from /admin/homepage via three
-- server actions (add / remove / reorder).
--
-- Applied to the remote project via Supabase MCP under
-- `homepage_featured_products` — this file mirrors the same SQL into
-- version control for replay on fresh environments.

CREATE TABLE IF NOT EXISTS homepage_featured_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  position int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS homepage_featured_products_position_idx
  ON homepage_featured_products (position);

-- RLS: public can SELECT (the homepage SSR reads this on every render);
-- writes go exclusively through the admin server actions which use the
-- service-role key (RLS bypassed). No INSERT/UPDATE/DELETE policies
-- intentionally — anon/auth users cannot mutate.
ALTER TABLE homepage_featured_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homepage_featured_products_read_all"
  ON homepage_featured_products;
CREATE POLICY "homepage_featured_products_read_all"
  ON homepage_featured_products
  FOR SELECT
  USING (true);

-- Seed with the 8 currently-tagged best-sellers in their existing
-- order (lowest sort_order first, then newest). Idempotent: if the
-- table already has rows (e.g. migration re-run), the INSERT is a
-- no-op because of the product_id UNIQUE constraint.
INSERT INTO homepage_featured_products (product_id, position)
SELECT id, (ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at DESC) - 1)::int
FROM products
WHERE is_active = true
  AND 'best-seller' = ANY(tags)
ON CONFLICT (product_id) DO NOTHING;
