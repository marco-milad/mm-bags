-- 0028 — One wishlist row per (user, product).
--
-- 0001's unique(user_id, product_id, variant_id) never fires for the rows
-- the app writes, because variant_id is always NULL and NULLs are distinct
-- in Postgres. The app checks before inserting, but two devices adding the
-- same product at the same moment could both pass the check. This partial
-- unique index closes that race for the NULL-variant rows.
--
-- The app already treats 23505 (unique_violation) on these inserts as
-- "already saved", so the code works the same before and after this runs.

BEGIN;

-- Drop any existing duplicates first (keep the oldest), or the index fails.
-- The table was empty when this was written; this is a safety net.
DELETE FROM public.wishlists w
USING public.wishlists keep
WHERE w.variant_id IS NULL
  AND keep.variant_id IS NULL
  AND w.user_id = keep.user_id
  AND w.product_id = keep.product_id
  AND (coalesce(w.added_at, '-infinity'), w.id) > (coalesce(keep.added_at, '-infinity'), keep.id);

CREATE UNIQUE INDEX IF NOT EXISTS wishlists_user_product_no_variant_key
  ON public.wishlists (user_id, product_id)
  WHERE variant_id IS NULL;

COMMIT;
