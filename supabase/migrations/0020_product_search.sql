-- Analytics phase 3: searchable product text.
--
-- V7 finding: this catalogue already has name_ar NOT NULL and the storefront
-- already matches it with ilike, so Arabic search is not broken here the way it
-- is in a catalogue with English-only names. What is missing is normalization
-- (كاب / كآب / كــاب are three different rows to ilike) and keyword expansion.
--
-- Payload cost was measured before adding this column rather than assumed:
-- across the real 81-product catalogue the blob averages 90 bytes and peaks at
-- 142, so the four public queries that still do select("*") on products grow by
-- ~90 B per row — 0.2% of a product page. The catalog grid uses an explicit
-- column list and does not pick it up at all.

-- Trigram index support. If this project does not have pg_trgm available the
-- statement fails here rather than silently degrading — which is the point.
create extension if not exists pg_trgm;

alter table public.products
  add column if not exists search_keywords text[] not null default '{}',
  add column if not exists search_blob     text   not null default '';

-- ilike '%term%' cannot use a btree index; a GIN trigram index is what makes
-- the scan disappear, and it also enables similarity() ranking for typos.
create index if not exists products_search_blob_trgm
  on public.products using gin (search_blob gin_trgm_ops);

comment on column public.products.search_blob is
  'Normalized name_ar + name_en + slug + tags + search_keywords. Written by '
  'buildSearchBlob() in lib/search/blob.ts — the SAME function that normalizes '
  'incoming queries. Normalizing only one side matches nothing at all, so both '
  'must come from one implementation. Recomputed in saveProduct(); there is '
  'deliberately no trigger, so there is exactly one writer.';
