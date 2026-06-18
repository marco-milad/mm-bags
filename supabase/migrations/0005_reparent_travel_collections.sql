-- Re-parent travel-sets, two-piece-sets, and lv-collection under
-- travel-bags so they appear as subcategories alongside milano-series,
-- calvin-klein, and travel-accessories. With this change, the parent
-- /catalog/travel-bags page automatically aggregates products from
-- all six children via resolveCollectionScope(); breadcrumbs +
-- filter pills inherit the new structure with no code changes.
--
-- Sort order rationale (merchandising sequence):
--   1. milano-series      — branded line
--   2. calvin-klein       — branded line
--   3. lv-collection      — branded line (new)
--   4. travel-sets        — bundle (new)
--   5. two-piece-sets     — bundle (new)
--   6. travel-accessories — accessories last
--
-- Applied to the remote project via Supabase MCP under the name
-- `reparent_travel_collections_under_travel_bags` — this file mirrors
-- the same SQL into version control.

UPDATE collections SET parent_slug = 'travel-bags', sort_order = 3
  WHERE slug = 'lv-collection';
UPDATE collections SET parent_slug = 'travel-bags', sort_order = 4
  WHERE slug = 'travel-sets';
UPDATE collections SET parent_slug = 'travel-bags', sort_order = 5
  WHERE slug = 'two-piece-sets';
UPDATE collections SET sort_order = 6
  WHERE slug = 'travel-accessories';
