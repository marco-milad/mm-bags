-- Analytics phase 1: the read layer, the nightly rollup, retention, PII scan.
--
-- These are SQL functions rather than query-builder calls because the reports
-- need window functions, `filter (where ...)`, `full outer join` and
-- `distinct on` — none of which supabase-js can express.
--
-- ── TIMEZONE ──────────────────────────────────────────────────────────────
-- Every timestamp column in this database is `timestamptz` (verified against
-- the migrations, not assumed). For timestamptz the correct Cairo bucket is the
-- SINGLE conversion:
--
--     (occurred_at at time zone 'Africa/Cairo')::date
--
-- The double form used for plain `timestamp` columns
-- (`at time zone 'UTC' at time zone 'Africa/Cairo'`) double-shifts here and
-- would silently file the evening peak on the wrong day. Because rollups are
-- keyed by date and raw rows prune at 90 days, that error becomes permanent.
--
-- ── HARDENING ─────────────────────────────────────────────────────────────
-- Every function is `security definer` with a pinned `search_path`; without the
-- pin that combination is a privilege-escalation hole. Execute is revoked from
-- public/anon/authenticated and granted only to service_role, which is the only
-- role the app ever uses to reach them.

-- ─────────────────────────────────────────────────────────────────────────
-- Overview: the KPI tiles and the daily series.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.analytics_overview(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
with totals as (
  select
    count(distinct e.visitor_id) as visitors,
    count(distinct e.visitor_id) filter (
      where (v.first_seen_at at time zone 'Africa/Cairo')::date
          = (e.occurred_at    at time zone 'Africa/Cairo')::date) as new_visitors,
    count(distinct e.session_id) as sessions,
    count(*) filter (where e.name = 'page_view') as page_views,
    count(*) filter (where e.name = 'view_item') as product_opens
  from analytics_events e
  left join analytics_visitors v on v.id = e.visitor_id
  where e.occurred_at between p_from and p_to
),
st as (
  select count(*) as searches,
         count(*) filter (where result_count = 0) as zero_results
  from searches_settled
  where occurred_at between p_from and p_to
),
raw as (
  select count(*) as n from analytics_events
  where name = 'search' and occurred_at between p_from and p_to
),
days as (
  select (e.occurred_at at time zone 'Africa/Cairo')::date as date,
         count(distinct e.visitor_id) as visitors,
         count(distinct e.session_id) as sessions,
         count(*) filter (where e.name = 'page_view') as page_views
  from analytics_events e
  where e.occurred_at between p_from and p_to
  group by 1
),
sdays as (
  select (occurred_at at time zone 'Africa/Cairo')::date as date, count(*) as searches
  from searches_settled
  where occurred_at between p_from and p_to
  group by 1
),
series as (
  select coalesce(days.date, sdays.date) as date,
         coalesce(days.visitors, 0)   as visitors,
         coalesce(days.sessions, 0)   as sessions,
         coalesce(days.page_views, 0) as page_views,
         coalesce(sdays.searches, 0)  as searches
  from days full outer join sdays on sdays.date = days.date
  order by 1
)
select jsonb_build_object(
  'visitors',     totals.visitors,
  'newVisitors',  totals.new_visitors,
  'sessions',     totals.sessions,
  'pageViews',    totals.page_views,
  'productOpens', totals.product_opens,
  'searches',     st.searches,
  'zeroResults',  st.zero_results,
  'zeroResultRate', case when st.searches > 0
                    then round(100.0 * st.zero_results / st.searches, 1) else 0 end,
  -- raw ÷ settled. On a stack with an as-you-type box this lands around 3–8 and
  -- 1.0 would mean the collapse view is being bypassed. HERE search is a
  -- navigation to /catalog?q=, so one search is one row and 1.0 is the correct
  -- answer, not a warning. Surface it, do not alarm on it.
  'collapseRatio', case when st.searches > 0
                   then round(raw.n::numeric / st.searches, 2) else null end,
  'series', coalesce((select jsonb_agg(to_jsonb(series)) from series), '[]'::jsonb)
)
from totals, st, raw;
$$;

revoke execute on function public.analytics_overview(timestamptz, timestamptz) from public, anon, authenticated;
grant  execute on function public.analytics_overview(timestamptz, timestamptz) to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Live: who is here now, and what just happened.
-- Independent of the dashboard's range filter.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.analytics_live()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
with active as (
  select count(distinct visitor_id) as n
  from analytics_events
  where occurred_at > now() - interval '5 minutes'
),
ticker as (
  select
    -- Never expose a raw visitor_id in the UI; six characters is enough to
    -- recognise "same person" across consecutive rows.
    left(visitor_id, 6) as visitor,
    name::text          as name,
    path, locale, device_type,
    query_raw, result_count,
    occurred_at
  from analytics_events
  where occurred_at > now() - interval '30 minutes'
  order by occurred_at desc
  limit 20
)
select jsonb_build_object(
  'activeNow', (select n from active),
  'events', coalesce((select jsonb_agg(to_jsonb(ticker)) from ticker), '[]'::jsonb)
);
$$;

revoke execute on function public.analytics_live() from public, anon, authenticated;
grant  execute on function public.analytics_live() to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Nightly rollup. Idempotent, so a missed night backfills by widening p_days.
--
-- One statement per table, not a TypeScript loop of per-row upserts: on a
-- serverless function with a 60–300 s ceiling, a row-at-a-time loop over a
-- month of terms times out; a single statement does not.
--
-- Every search figure reads searches_settled, never analytics_events. Mixing
-- the two makes the headline tile and the term table disagree.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.analytics_rollup(p_days int default 2)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_from timestamptz := ((current_date at time zone 'Africa/Cairo')::date - (p_days - 1))::timestamptz;
  v_daily int;
  v_terms int;
begin
  insert into analytics_daily (date, visitors, new_visitors, sessions, page_views,
                               searches, zero_results, product_opens)
  select d.date, d.visitors, d.new_visitors, d.sessions, d.page_views,
         coalesce(s.searches, 0), coalesce(s.zero_results, 0), d.product_opens
  from (
    select (e.occurred_at at time zone 'Africa/Cairo')::date as date,
           count(distinct e.visitor_id) as visitors,
           count(distinct e.visitor_id) filter (
             where (v.first_seen_at at time zone 'Africa/Cairo')::date
                 = (e.occurred_at    at time zone 'Africa/Cairo')::date) as new_visitors,
           count(distinct e.session_id) as sessions,
           count(*) filter (where e.name = 'page_view') as page_views,
           count(*) filter (where e.name = 'view_item') as product_opens
    from analytics_events e
    left join analytics_visitors v on v.id = e.visitor_id
    where e.occurred_at >= v_from
    group by 1
  ) d
  left join (
    select (occurred_at at time zone 'Africa/Cairo')::date as date,
           count(*) as searches,
           count(*) filter (where result_count = 0) as zero_results
    from searches_settled
    where occurred_at >= v_from
    group by 1
  ) s on s.date = d.date
  on conflict (date) do update set
    visitors = excluded.visitors, new_visitors = excluded.new_visitors,
    sessions = excluded.sessions, page_views = excluded.page_views,
    searches = excluded.searches, zero_results = excluded.zero_results,
    product_opens = excluded.product_opens;
  get diagnostics v_daily = row_count;

  insert into search_term_daily (date, query_norm, sample_raw, searches, zero_results, clicks)
  select t.date, t.query_norm, t.sample_raw, t.searches, t.zero_results, coalesce(c.clicks, 0)
  from (
    select (s.occurred_at at time zone 'Africa/Cairo')::date as date,
           s.query_norm,
           min(s.query_raw) as sample_raw,
           count(*) as searches,
           count(*) filter (where s.result_count = 0) as zero_results
    from searches_settled s
    where s.occurred_at >= v_from and s.query_norm is not null
    group by 1, 2
  ) t
  left join (
    select (e.occurred_at at time zone 'Africa/Cairo')::date as date,
           s.query_norm, count(*) as clicks
    from analytics_events e
    join searches_settled s on s.id = e.search_id
    where e.name = 'select_item' and e.occurred_at >= v_from
    group by 1, 2
  ) c on c.date = t.date and c.query_norm = t.query_norm
  on conflict (date, query_norm) do update set
    sample_raw = excluded.sample_raw, searches = excluded.searches,
    zero_results = excluded.zero_results, clicks = excluded.clicks;
  get diagnostics v_terms = row_count;

  return jsonb_build_object('days', p_days, 'dailyRows', v_daily, 'termRows', v_terms);
end;
$$;

revoke execute on function public.analytics_rollup(int) from public, anon, authenticated;
grant  execute on function public.analytics_rollup(int) to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Retention. Rollups are kept forever; the raw rows behind them are not.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.analytics_prune()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_events int; v_visitors int;
begin
  delete from analytics_events where occurred_at < now() - interval '90 days';
  get diagnostics v_events = row_count;

  delete from analytics_visitors where last_seen_at < now() - interval '13 months';
  get diagnostics v_visitors = row_count;

  return jsonb_build_object('eventsPruned', v_events, 'visitorsPruned', v_visitors);
end;
$$;

revoke execute on function public.analytics_prune() from public, anon, authenticated;
grant  execute on function public.analytics_prune() to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- PII scan.
--
-- A scrubber fails silently: the pattern either matched or it did not, and
-- nobody finds out which. The Arabic-Indic phone leak this codebase guards
-- against survived hundreds of passing tests because nothing was looking.
--
-- These patterns are deliberately BROADER than the scrubber's — any 7+ digit
-- run in any script, and anything email-shaped. Report, never auto-delete:
-- deleting hides the signal this exists to surface.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.analytics_pii_scan()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
with digits as (
  select 'analytics_events.query_raw' as source, count(*) as n
  from analytics_events where query_raw ~ '[0-9٠-٩۰-۹]{7,}'
  union all
  select 'analytics_events.query_norm', count(*)
  from analytics_events where query_norm ~ '[0-9٠-٩۰-۹]{7,}'
  union all
  select 'search_term_daily.sample_raw', count(*)
  from search_term_daily where sample_raw ~ '[0-9٠-٩۰-۹]{7,}'
),
emails as (
  select 'analytics_events.query_raw' as source, count(*) as n
  from analytics_events where query_raw ~ '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'
  union all
  select 'analytics_events.query_norm', count(*)
  from analytics_events where query_norm ~ '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'
  union all
  select 'search_term_daily.sample_raw', count(*)
  from search_term_daily where sample_raw ~ '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'
)
select jsonb_build_object(
  'digitRuns', (select coalesce(jsonb_object_agg(source, n), '{}'::jsonb) from digits where n > 0),
  'emails',    (select coalesce(jsonb_object_agg(source, n), '{}'::jsonb) from emails where n > 0),
  'total',     (select coalesce(sum(n), 0) from (select n from digits union all select n from emails) x)
);
$$;

revoke execute on function public.analytics_pii_scan() from public, anon, authenticated;
grant  execute on function public.analytics_pii_scan() to service_role;
