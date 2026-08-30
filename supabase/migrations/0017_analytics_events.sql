-- Analytics phase 1: the event log, the rollup tables, and the collapse view.
--
-- Event names are GA4's vocabulary verbatim. A future GA4 or Meta forwarder is
-- then an adapter, not a re-instrumentation.
create type public.analytics_name as enum (
  'page_view', 'search', 'view_item', 'select_item', 'add_to_cart'
);

-- Deliberately NO foreign key to products or users. Deleting a product must
-- never block ingest or cascade away history; joins happen at read time.
create table if not exists public.analytics_events (
  id              uuid primary key,          -- client-generated, validated, never trusted
  name            public.analytics_name not null,
  occurred_at     timestamptz not null default now(),

  visitor_id      text not null,             -- mm_vid
  session_id      text not null,             -- mm_sid
  user_id         uuid,

  path            text,
  locale          text,
  referrer_domain text,
  device_type     text,                      -- mobile | tablet | desktop

  query_raw       text,                      -- PII-scrubbed at write time
  query_norm      text,
  result_count    int,
  result_ids      uuid[],                    -- first 20 result ids; rank order = impressions
  category        text,
  sort            text,

  product_id      uuid,
  search_id       uuid,
  list_id         text,                      -- 'search_results' | 'home_grid' | 'category'
  position        int,
  props           jsonb
);

create index if not exists analytics_events_name_time_idx    on public.analytics_events (name, occurred_at);
create index if not exists analytics_events_query_time_idx   on public.analytics_events (query_norm, occurred_at);
create index if not exists analytics_events_product_time_idx on public.analytics_events (product_id, occurred_at);
create index if not exists analytics_events_visitor_time_idx on public.analytics_events (visitor_id, occurred_at);
create index if not exists analytics_events_time_idx         on public.analytics_events (occurred_at);  -- Live View

create table if not exists public.search_synonyms (
  id         uuid primary key default gen_random_uuid(),
  term       text not null unique,           -- normalized
  maps_to    text not null,
  created_at timestamptz not null default now()
);

-- Rollups are keyed by CAIRO calendar date and kept forever; the raw events
-- behind them are pruned at 90 days.
create table if not exists public.analytics_daily (
  date          date primary key,
  visitors      int not null,
  new_visitors  int not null,
  sessions      int not null,
  page_views    int not null,
  searches      int not null,                -- from searches_settled, never raw
  zero_results  int not null,
  product_opens int not null
);

create table if not exists public.search_term_daily (
  date         date not null,
  query_norm   text not null,
  sample_raw   text,                         -- keeps Arabizi alive past the prune
  searches     int not null,
  zero_results int not null,
  clicks       int not null,
  primary key (date, query_norm)
);

-- ─── RLS ─────────────────────────────────────────────────────────────────
-- Every table in `public` is exposed to `anon` through PostgREST by default,
-- and these hold behavioural data. RLS on with NO policies makes them
-- invisible to anon and authenticated alike; service_role bypasses RLS and is
-- the only thing that reads or writes here.
--
-- Do not add a "public read" policy to make something work.
alter table public.analytics_events  enable row level security;
alter table public.analytics_daily   enable row level security;
alter table public.search_term_daily enable row level security;
alter table public.search_synonyms   enable row level security;

-- ─── The collapse view ───────────────────────────────────────────────────
-- Collapses a burst of as-you-type searches into the one the visitor settled
-- on: consecutive searches by one visitor within 30 seconds where each query
-- is a prefix of the next.
--
-- Keep `order by occurred_at desc` -- most recent, not longest. If someone
-- types "شنطة" then backspaces to "شنط", keeping the longest would retain a row
-- whose search_id the browser never held, and every later select_item would
-- point at a collapsed-away search, silently returning null attribution.
--
-- security_invoker is NOT optional on Supabase. Without it the view runs as its
-- owner, bypassing the RLS just enabled on analytics_events, and PostgREST
-- serves it to anon.
--
-- NOTE for this codebase: search here is a navigation to /catalog?q=, not an
-- as-you-type box, so one search produces exactly one row and this view is
-- close to a pass-through. It is built anyway -- it costs nothing, it keeps
-- every query reading one source, and it is already correct on the day an
-- as-you-type box ships. Expect a collapse ratio of 1.0, which is the right
-- answer here rather than the "view is bypassed" signal it means elsewhere.
create or replace view public.searches_settled
with (security_invoker = true) as
with marked as (
  select *,
    case when lag(occurred_at) over w is null
           or occurred_at - lag(occurred_at) over w > interval '30 seconds'
           or query_norm not like lag(query_norm) over w || '%'
         then 1 else 0 end as new_burst
  from public.analytics_events
  where name = 'search'
  window w as (partition by visitor_id order by occurred_at)
),
bursts as (
  select *, sum(new_burst) over (partition by visitor_id order by occurred_at) as burst_id
  from marked
)
select distinct on (visitor_id, burst_id) *
from bursts
order by visitor_id, burst_id, occurred_at desc;

revoke all on public.searches_settled from anon, authenticated;
