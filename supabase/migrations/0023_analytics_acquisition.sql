-- 0023_analytics_acquisition.sql
-- Acquisition & tech dimensions for first-party analytics (GA-gap phase 1).
--
-- Additive: new nullable columns on analytics_events + one read RPC. No data
-- migration; rows written before this deploy simply carry NULLs (shown as
-- "(unknown)"/"direct" in the dashboard).
--
--   channel      -- derived at ingest: direct | organic_search | social |
--                   referral | paid | email
--   utm_source   -- landing-URL campaign params (client-sent, page_view only)
--   utm_medium
--   utm_campaign
--   country      -- 2-letter ISO from Vercel edge geo header (NOT the IP —
--                   the IP itself is never stored, same privacy stance as before)
--   browser      -- parsed from User-Agent at ingest
--   os           -- parsed from User-Agent at ingest

alter table public.analytics_events
  add column if not exists channel      text,
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists country      text,
  add column if not exists browser      text,
  add column if not exists os           text;

create index if not exists analytics_events_channel_time_idx
  on public.analytics_events (channel, occurred_at);

-- ─────────────────────────────────────────────────────────────────────────
-- Acquisition: where visitors come from + what they browse with.
-- Session-level attribution uses each session's EARLIEST event (the landing
-- touch); channel defaults to 'direct'. Country/browser/os/device are counted
-- by distinct visitor. Mirrors the hardening of every other analytics RPC.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.analytics_acquisition(
  p_from timestamptz, p_to timestamptz, p_limit int default 10
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
with ev as (
  select * from analytics_events where occurred_at between p_from and p_to
),
sess as (
  -- one row per session: the channel/source/campaign of its landing event
  select distinct on (session_id)
    session_id,
    coalesce(channel, 'direct') as channel,
    utm_source,
    utm_campaign
  from ev
  order by session_id, occurred_at
),
by_channel as (
  select channel, count(*)::int as sessions
  from sess group by channel order by sessions desc
),
by_source as (
  select utm_source as source, count(*)::int as sessions
  from sess where utm_source is not null group by 1 order by 2 desc limit p_limit
),
by_campaign as (
  select utm_campaign as campaign, count(*)::int as sessions
  from sess where utm_campaign is not null group by 1 order by 2 desc limit p_limit
),
by_country as (
  select coalesce(country, '(unknown)') as country,
         count(distinct visitor_id)::int as visitors
  from ev group by 1 order by 2 desc limit p_limit
),
by_browser as (
  select coalesce(browser, '(unknown)') as browser,
         count(distinct visitor_id)::int as visitors
  from ev group by 1 order by 2 desc limit p_limit
),
by_os as (
  select coalesce(os, '(unknown)') as os,
         count(distinct visitor_id)::int as visitors
  from ev group by 1 order by 2 desc limit p_limit
),
by_device as (
  select coalesce(device_type, '(unknown)') as device,
         count(distinct visitor_id)::int as visitors
  from ev group by 1 order by 2 desc
)
select jsonb_build_object(
  'channels',  coalesce((select jsonb_agg(to_jsonb(by_channel))  from by_channel),  '[]'::jsonb),
  'sources',   coalesce((select jsonb_agg(to_jsonb(by_source))   from by_source),   '[]'::jsonb),
  'campaigns', coalesce((select jsonb_agg(to_jsonb(by_campaign)) from by_campaign), '[]'::jsonb),
  'countries', coalesce((select jsonb_agg(to_jsonb(by_country))  from by_country),  '[]'::jsonb),
  'browsers',  coalesce((select jsonb_agg(to_jsonb(by_browser))  from by_browser),  '[]'::jsonb),
  'os',        coalesce((select jsonb_agg(to_jsonb(by_os))       from by_os),       '[]'::jsonb),
  'devices',   coalesce((select jsonb_agg(to_jsonb(by_device))   from by_device),   '[]'::jsonb)
);
$$;

revoke execute on function public.analytics_acquisition(timestamptz, timestamptz, int)
  from public, anon, authenticated;
grant  execute on function public.analytics_acquisition(timestamptz, timestamptz, int)
  to service_role;
