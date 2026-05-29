-- 0002 — Collections hierarchy expansion.
-- M.M Bags grows from travel-only to a full bag store.
-- Adds parent/child relationships so existing travel collections can nest under
-- a new 'travel-bags' top-level category, alongside 5 new top-level categories.

alter table public.collections add column if not exists parent_slug text;
create index if not exists collections_parent_slug_idx on public.collections(parent_slug);
comment on column public.collections.parent_slug is
  'Slug of parent collection (e.g. travel-bags). NULL = top-level category.';
