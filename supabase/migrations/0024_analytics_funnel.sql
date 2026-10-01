-- 0024_analytics_funnel.sql
-- E-commerce depth for first-party analytics (GA-gap phase 2).
--
--   1. A server-side `purchase` event (written once per order, idempotent by
--      order id, consent-gated) so a cart can be tied to the session that
--      bought — the only honest way to measure abandonment and per-channel
--      conversion. Orders themselves still come from the orders table; the
--      event only carries the order id as the join key.
--   2. Product demand gains a `carts` column (opened → carted → ordered).
--   3. analytics_funnel(): session funnel, abandonment, tracked revenue, and
--      conversion/revenue per acquisition channel.
--
-- Note on the new enum value: functions below compare `name::text` rather
-- than the enum literal, so this file runs as a single script even though a
-- freshly added enum value cannot be *used* inside the same transaction.

alter type public.analytics_name add value if not exists 'purchase';

-- ─────────────────────────────────────────────────────────────────────────
-- Product demand, now with carts (impressions → clicks → opens → carts → orders)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.analytics_product_demand(
  p_from timestamptz,
  p_to   timestamptz,
  p_limit int default 50
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
with imp as (
  select product_id, count(*) as impressions
  from (
    select unnest(result_ids) as product_id
    from searches_settled
    where occurred_at between p_from and p_to
  ) x
  group by 1
),
clk as (
  select product_id, count(*) as clicks
  from analytics_events
  where name::text = 'select_item' and search_id is not null
    and product_id is not null
    and occurred_at between p_from and p_to
  group by 1
),
opens as (
  select product_id, count(*) as opens
  from (
    select distinct on (
      visitor_id, product_id, floor(extract(epoch from occurred_at) / 1800)
    ) visitor_id, product_id
    from analytics_events
    where name::text = 'view_item' and product_id is not null
      and occurred_at between p_from and p_to
  ) d
  group by 1
),
carts as (
  -- One "carted" per session + product: re-clicking Add to cart in the same
  -- session is still one decision to buy.
  select product_id, count(*) as carts
  from (
    select distinct session_id, product_id
    from analytics_events
    where name::text = 'add_to_cart' and product_id is not null
      and occurred_at between p_from and p_to
  ) c
  group by 1
),
ord as (
  select oi.product_id, sum(oi.qty)::bigint as orders
  from order_items oi
  join orders o on o.id = oi.order_id
  where o.created_at between p_from and p_to
    and o.status <> 'cancelled'
    and oi.product_id is not null
  group by 1
),
rows_out as (
  select
    p.id,
    p.slug,
    p.name_ar,
    p.name_en,
    coalesce(imp.impressions, 0) as impressions,
    coalesce(clk.clicks, 0)      as clicks,
    coalesce(opens.opens, 0)     as opens,
    coalesce(carts.carts, 0)     as carts,
    coalesce(ord.orders, 0)      as orders
  from products p
  left join imp   on imp.product_id   = p.id
  left join clk   on clk.product_id   = p.id
  left join opens on opens.product_id = p.id
  left join carts on carts.product_id = p.id
  left join ord   on ord.product_id   = p.id
  where p.is_active = true
    and (coalesce(imp.impressions,0) + coalesce(opens.opens,0)
         + coalesce(carts.carts,0) + coalesce(ord.orders,0)) > 0
  order by impressions desc, opens desc, orders desc
  limit p_limit
)
select coalesce((select jsonb_agg(to_jsonb(rows_out)) from rows_out), '[]'::jsonb);
$$;

revoke execute on function public.analytics_product_demand(timestamptz, timestamptz, int) from public, anon, authenticated;
grant  execute on function public.analytics_product_demand(timestamptz, timestamptz, int) to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Funnel: sessions → viewed a product → added to cart → purchased.
-- Sessions are attributed to their landing channel (same rule as
-- analytics_acquisition). Revenue joins the purchase event's order id back to
-- the orders table and excludes cancelled orders — money, never events.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.analytics_funnel(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
with ev as (
  select visitor_id, session_id, name::text as name, occurred_at, channel, props
  from analytics_events
  where occurred_at between p_from and p_to
),
sess as (
  select distinct on (session_id) session_id, coalesce(channel, 'direct') as channel
  from ev
  order by session_id, occurred_at
),
flags as (
  select s.session_id, s.channel,
         bool_or(e.name = 'view_item')   as viewed,
         bool_or(e.name = 'add_to_cart') as carted,
         bool_or(e.name = 'purchase')    as purchased
  from sess s
  join ev e on e.session_id = s.session_id
  group by s.session_id, s.channel
),
pur as (
  select distinct e.session_id, (e.props->>'order_id')::uuid as order_id
  from ev e
  where e.name = 'purchase' and e.props ? 'order_id'
),
rev as (
  select p.session_id, sum(o.total)::numeric as revenue
  from pur p
  join orders o on o.id = p.order_id and o.status <> 'cancelled'
  group by p.session_id
),
tot as (
  select count(*)::int                          as sessions,
         count(*) filter (where viewed)::int    as viewed,
         count(*) filter (where carted)::int    as carted,
         count(*) filter (where purchased)::int as purchased
  from flags
),
-- Abandonment is measured per VISITOR, not per session: the cart lives in
-- localStorage and survives across visits, so "added to cart in visit 1, bought
-- in visit 2" must not be counted as an abandoned cart.
vflags as (
  select visitor_id,
         bool_or(name = 'add_to_cart') as carted,
         bool_or(name = 'purchase')    as purchased
  from ev
  group by visitor_id
),
vt as (
  select count(*) filter (where carted)::int                   as carted_visitors,
         count(*) filter (where carted and not purchased)::int as abandoned_visitors
  from vflags
),
ch as (
  select f.channel,
         count(*)::int                           as sessions,
         count(*) filter (where f.purchased)::int as purchased,
         coalesce(sum(r.revenue), 0)::numeric    as revenue
  from flags f
  left join rev r on r.session_id = f.session_id
  group by f.channel
  order by sessions desc
)
select jsonb_build_object(
  'sessions',          tot.sessions,
  'viewed',            tot.viewed,
  'carted',            tot.carted,
  'purchased',         tot.purchased,
  'cartedVisitors',    vt.carted_visitors,
  'abandonedVisitors', vt.abandoned_visitors,
  'revenue',           coalesce((select sum(revenue) from rev), 0),
  'byChannel',         coalesce((select jsonb_agg(to_jsonb(ch)) from ch), '[]'::jsonb)
)
from tot, vt;
$$;

revoke execute on function public.analytics_funnel(timestamptz, timestamptz) from public, anon, authenticated;
grant  execute on function public.analytics_funnel(timestamptz, timestamptz) to service_role;
