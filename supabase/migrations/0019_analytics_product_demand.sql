-- Analytics phase 2: product demand.
--
-- Answers "which products get seen, opened, and bought — and where does the
-- funnel leak". Impressions and clicks stay at zero until search logging ships
-- (phase 3/4); the columns exist now so the shape does not change later.
--
-- Two adaptations to this schema, verified rather than assumed:
--
--   V2  order_items carries product_id directly alongside variant_id, so the
--       extra hop through product_variants that the generic version needs is
--       dropped here.
--   V3  orders.status is one of pending/confirmed/processing/shipped/
--       out_for_delivery/delivered/cancelled. Only 'cancelled' is not a real
--       sale, matching the `.neq("status","cancelled")` the admin reports
--       already use.
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
  -- Rank-ordered result ids are impressions: the product appeared in a result
  -- set. Nearly free, because the server already holds the results where
  -- result_count is computed.
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
  where name = 'select_item' and search_id is not null
    and product_id is not null
    and occurred_at between p_from and p_to
  group by 1
),
opens as (
  -- Deduped per visitor + product per 30 minutes. One person reopening a modal
  -- is one open, not five — and the dedup happens at READ time so the raw log
  -- keeps every event.
  select product_id, count(*) as opens
  from (
    select distinct on (
      visitor_id, product_id, floor(extract(epoch from occurred_at) / 1800)
    ) visitor_id, product_id
    from analytics_events
    where name = 'view_item' and product_id is not null
      and occurred_at between p_from and p_to
  ) d
  group by 1
),
ord as (
  -- Orders are money, not behaviour: they come from the orders table, never
  -- from an event. Cancelled orders are not demand that converted.
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
    coalesce(ord.orders, 0)      as orders
  from products p
  left join imp   on imp.product_id   = p.id
  left join clk   on clk.product_id   = p.id
  left join opens on opens.product_id = p.id
  left join ord   on ord.product_id   = p.id
  where p.is_active = true
    and (coalesce(imp.impressions,0) + coalesce(opens.opens,0) + coalesce(ord.orders,0)) > 0
  order by impressions desc, opens desc, orders desc
  limit p_limit
)
select coalesce((select jsonb_agg(to_jsonb(rows_out)) from rows_out), '[]'::jsonb);
$$;

revoke execute on function public.analytics_product_demand(timestamptz, timestamptz, int) from public, anon, authenticated;
grant  execute on function public.analytics_product_demand(timestamptz, timestamptz, int) to service_role;
