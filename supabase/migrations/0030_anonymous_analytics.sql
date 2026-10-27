-- 0030 — Anonymous, cookieless measurement + path and retention reports.
--
-- Until now a visitor who declined (or never answered) the analytics banner
-- produced no data at all. Owner decision (2026-10-27): count them
-- anonymously, the way cookieless tools (e.g. Plausible) do:
--
--   * no cookie, no localStorage/sessionStorage, nothing stored on the device;
--   * no IP, no user id, no device fingerprint stored;
--   * `visit_key` is a random id that lives only in the open tab's memory, so
--     one visit's pages can be linked into a path, but a later visit can never
--     be linked to it ("who came back" stays consent-only);
--   * visitors who explicitly opted out (mm_optout cookie, or the browser's
--     Global Privacy Control signal) are not counted at all.
--
-- This lives in its OWN table so no existing visitor/session metric can be
-- polluted by rows without an identity. Raw rows are kept 90 days, like
-- analytics_events (analytics_prune below).

begin;

create table if not exists public.analytics_anon_events (
  id              uuid        primary key,          -- client-generated, validated
  name            text        not null check (name in (
                    'page_view', 'view_item', 'select_item', 'add_to_cart',
                    'consent_accepted', 'consent_rejected')),
  occurred_at     timestamptz not null default now(),
  visit_key       text        not null,             -- in-memory per tab; never stored client-side
  path            text,
  locale          text,
  referrer_domain text,
  channel         text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  device_type     text,
  browser         text,
  os              text,
  country         text,                             -- edge geo, country only
  product_id      uuid,
  list_id         text,
  position        int
);

create index if not exists analytics_anon_events_time_idx  on public.analytics_anon_events (occurred_at);
create index if not exists analytics_anon_events_visit_idx on public.analytics_anon_events (visit_key, occurred_at);

-- Server-only, like every analytics table: RLS on, no policies.
alter table public.analytics_anon_events enable row level security;
alter table public.analytics_anon_events force row level security;
revoke all on public.analytics_anon_events from anon, authenticated;

-- ─── Retention: raw anonymous rows also go after 90 days ─────────────────
create or replace function public.analytics_prune()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_events int; v_visitors int; v_anon int;
begin
  delete from analytics_events where occurred_at < now() - interval '90 days';
  get diagnostics v_events = row_count;

  delete from analytics_anon_events where occurred_at < now() - interval '90 days';
  get diagnostics v_anon = row_count;

  delete from analytics_visitors where last_seen_at < now() - interval '13 months';
  get diagnostics v_visitors = row_count;

  return jsonb_build_object('eventsPruned', v_events, 'anonPruned', v_anon, 'visitorsPruned', v_visitors);
end;
$$;

revoke execute on function public.analytics_prune() from public, anon, authenticated;
grant  execute on function public.analytics_prune() to service_role;

-- ─── Reach: everyone vs. consented, and the banner's acceptance rate ─────
create or replace function public.analytics_reach(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
select jsonb_build_object(
  'trackedPageViews', (select count(*) from analytics_events
                        where name::text = 'page_view' and occurred_at between p_from and p_to),
  'trackedVisits',    (select count(distinct session_id) from analytics_events
                        where name::text = 'page_view' and occurred_at between p_from and p_to),
  'anonPageViews',    (select count(*) from analytics_anon_events
                        where name = 'page_view' and occurred_at between p_from and p_to),
  'anonVisits',       (select count(distinct visit_key) from analytics_anon_events
                        where name = 'page_view' and occurred_at between p_from and p_to),
  'anonProductViews', (select count(*) from analytics_anon_events
                        where name = 'view_item' and occurred_at between p_from and p_to),
  'anonAddToCart',    (select count(*) from analytics_anon_events
                        where name = 'add_to_cart' and occurred_at between p_from and p_to),
  'consentAccepted',  (select count(*) from analytics_anon_events
                        where name = 'consent_accepted' and occurred_at between p_from and p_to),
  'consentRejected',  (select count(*) from analytics_anon_events
                        where name = 'consent_rejected' and occurred_at between p_from and p_to),
  -- Where anonymous visits came from / what they used, by each visit's landing page view.
  'anonChannels', coalesce((
    select jsonb_agg(jsonb_build_object('channel', channel, 'visits', visits) order by visits desc)
    from (
      select coalesce(channel, 'direct') as channel, count(*) as visits
      from (
        select distinct on (visit_key) visit_key, channel
        from analytics_anon_events
        where name = 'page_view' and occurred_at between p_from and p_to
        order by visit_key, occurred_at
      ) landing
      group by 1 order by 2 desc limit 8
    ) c), '[]'::jsonb),
  'anonDevices', coalesce((
    select jsonb_agg(jsonb_build_object('device', device, 'visits', visits) order by visits desc)
    from (
      select coalesce(device_type, 'unknown') as device, count(distinct visit_key) as visits
      from analytics_anon_events
      where name = 'page_view' and occurred_at between p_from and p_to
      group by 1 order by 2 desc
    ) d), '[]'::jsonb)
);
$$;

revoke execute on function public.analytics_reach(timestamptz, timestamptz) from public, anon, authenticated;
grant  execute on function public.analytics_reach(timestamptz, timestamptz) to service_role;

-- ─── Paths: entry pages, exit pages, page → next page (ALL visits) ───────
-- One "visit" = a consented session (s:…) or an anonymous tab (a:…). The
-- locale prefix is dropped so /ar/x and /en/x count as the same page, and a
-- reload of the same page is not a transition.
create or replace function public.analytics_paths(
  p_from  timestamptz,
  p_to    timestamptz,
  p_limit int default 10
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
with pv as (
  select 's:' || session_id as visit, path, occurred_at
  from analytics_events
  where name::text = 'page_view' and occurred_at between p_from and p_to
  union all
  select 'a:' || visit_key, path, occurred_at
  from analytics_anon_events
  where name = 'page_view' and occurred_at between p_from and p_to
),
norm as (
  select visit, occurred_at,
         coalesce(nullif(regexp_replace(coalesce(path, '/'), '^/(ar|en)(/|$)', '/'), ''), '/') as page
  from pv
),
ordered as (
  select visit, page,
         row_number() over (partition by visit order by occurred_at) as rn,
         count(*)     over (partition by visit)                       as n,
         lead(page)   over (partition by visit order by occurred_at) as next_page
  from norm
),
visits as (
  select visit, max(n) as n from ordered group by visit
),
entries as (
  select page, count(*) as visits from ordered where rn = 1
  group by page order by visits desc, page limit p_limit
),
pages as (
  select page, count(*) as views, count(*) filter (where rn = n) as exits
  from ordered group by page order by views desc, page limit p_limit
),
moves as (
  select page as from_page, next_page as to_page, count(*) as moves
  from ordered
  where next_page is not null and next_page <> page
  group by 1, 2 order by moves desc, 1, 2 limit p_limit
)
select jsonb_build_object(
  'visits',      (select count(*) from visits),
  'singlePage',  (select count(*) from visits where n = 1),
  'pagesPerVisit', (select round(avg(n)::numeric, 2) from visits),
  -- Row aliases (e/p/m) matter: in `to_jsonb(moves) from moves` the COLUMN
  -- named moves would win over the row and return bare numbers.
  'entries',     coalesce((select jsonb_agg(to_jsonb(e)) from entries e), '[]'::jsonb),
  'pages',       coalesce((select jsonb_agg(to_jsonb(p)) from pages p), '[]'::jsonb),
  'moves',       coalesce((select jsonb_agg(to_jsonb(m)) from moves m), '[]'::jsonb)
);
$$;

revoke execute on function public.analytics_paths(timestamptz, timestamptz, int) from public, anon, authenticated;
grant  execute on function public.analytics_paths(timestamptz, timestamptz, int) to service_role;

-- ─── Retention (consented visitors only — needs a returning cookie) ──────
-- Weekly cohorts by first visit (Cairo weeks), and who came back in each of
-- the following 4 weeks. Plus, for the selected window: how many visitors
-- were returning, and how many purchases came from a return visit.
create or replace function public.analytics_retention(
  p_from  timestamptz,
  p_to    timestamptz,
  p_weeks int default 8
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
with v as (
  select id,
         (date_trunc('week', first_seen_at at time zone 'Africa/Cairo')) as cohort
  from analytics_visitors
  where first_seen_at >= (date_trunc('week', now() at time zone 'Africa/Cairo')
                          - make_interval(weeks => p_weeks - 1)) at time zone 'Africa/Cairo'
),
act as (
  select distinct visitor_id,
         date_trunc('week', occurred_at at time zone 'Africa/Cairo') as wk
  from analytics_events
  where occurred_at >= (select coalesce(min(cohort), now()::timestamp) from v) at time zone 'Africa/Cairo'
),
cohorts as (
  select v.cohort::date as week,
         count(distinct v.id) as visitors,
         count(distinct a.visitor_id) filter (where a.wk = v.cohort + interval '1 week') as w1,
         count(distinct a.visitor_id) filter (where a.wk = v.cohort + interval '2 weeks') as w2,
         count(distinct a.visitor_id) filter (where a.wk = v.cohort + interval '3 weeks') as w3,
         count(distinct a.visitor_id) filter (where a.wk = v.cohort + interval '4 weeks') as w4
  from v left join act a on a.visitor_id = v.id
  group by v.cohort
  order by v.cohort
),
in_range as (
  select visitor_id, count(distinct session_id) as sessions
  from analytics_events
  where occurred_at between p_from and p_to
  group by visitor_id
),
first_session as (
  select distinct on (visitor_id) visitor_id, session_id
  from analytics_events
  order by visitor_id, occurred_at
),
purchases as (
  select e.visitor_id, e.session_id
  from analytics_events e
  where e.name::text = 'purchase' and e.occurred_at between p_from and p_to
)
select jsonb_build_object(
  'cohorts', coalesce((select jsonb_agg(to_jsonb(c) order by c.week) from cohorts c), '[]'::jsonb),
  'visitors', (select count(*) from in_range),
  'returning', (
    select count(*) from in_range r
    join analytics_visitors av on av.id = r.visitor_id
    where r.sessions > 1 or av.first_seen_at < p_from
  ),
  'purchases', (select count(*) from purchases),
  'returningPurchases', (
    select count(*) from purchases p
    join first_session f on f.visitor_id = p.visitor_id
    where f.session_id <> p.session_id
  )
);
$$;

revoke execute on function public.analytics_retention(timestamptz, timestamptz, int) from public, anon, authenticated;
grant  execute on function public.analytics_retention(timestamptz, timestamptz, int) to service_role;

commit;
