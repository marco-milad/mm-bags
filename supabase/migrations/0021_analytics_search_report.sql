-- Analytics phase 3: the search report.
--
-- Three lists, and the second and third are queried INDEPENDENTLY rather than
-- filtered out of the top-N slice. That is not a style preference: a term
-- nobody finds is rarely also a term everybody searches, so deriving the
-- zero-result and no-click lists from the top terms truncates away exactly the
-- rows worth acting on. The origin system shipped that bug and quietly lost the
-- most valuable output in the whole project.
--
-- Every count reads searches_settled, never analytics_events. Mixing the two
-- makes the headline tile and the term table disagree by a factor of 4–8 on a
-- stack with an as-you-type box.
create or replace function public.analytics_search_report(
  p_from  timestamptz,
  p_to    timestamptz,
  p_limit int default 20
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
with settled as (
  select id, query_norm, query_raw, result_count
  from searches_settled
  where occurred_at between p_from and p_to and query_norm is not null
),
clicks as (
  select search_id, product_id
  from analytics_events
  where name = 'select_item' and search_id is not null
    and occurred_at between p_from and p_to
),
top_terms as (
  select s.query_norm,
         min(s.query_raw)                                       as sample_raw,
         count(distinct s.id)                                   as searches,
         count(distinct s.id) filter (where s.result_count = 0) as zero_results,
         count(c.product_id)                                    as clicks,
         -- The most-opened product FROM this search, not a guess from the name.
         mode() within group (order by c.product_id)            as top_product_id
  from settled s
  left join clicks c on c.search_id = s.id
  group by s.query_norm
  order by searches desc
  limit p_limit
),
zero_terms as (
  select query_norm, min(query_raw) as sample_raw, count(*) as searches
  from settled
  where result_count = 0
  group by query_norm
  order by searches desc
  limit p_limit
),
no_click_terms as (
  select s.query_norm, min(s.query_raw) as sample_raw, count(*) as searches
  from settled s
  left join (select distinct search_id from clicks) c on c.search_id = s.id
  where s.result_count > 0
  group by s.query_norm
  having count(c.search_id) = 0
  order by searches desc
  limit p_limit
),
top_with_names as (
  select t.*, p.slug as top_product_slug, p.name_ar as top_product_ar, p.name_en as top_product_en
  from top_terms t
  left join products p on p.id = t.top_product_id
)
select jsonb_build_object(
  'topTerms',     coalesce((select jsonb_agg(to_jsonb(top_with_names))  from top_with_names),  '[]'::jsonb),
  'zeroTerms',    coalesce((select jsonb_agg(to_jsonb(zero_terms))      from zero_terms),      '[]'::jsonb),
  'noClickTerms', coalesce((select jsonb_agg(to_jsonb(no_click_terms))  from no_click_terms),  '[]'::jsonb)
);
$$;

revoke execute on function public.analytics_search_report(timestamptz, timestamptz, int) from public, anon, authenticated;
grant  execute on function public.analytics_search_report(timestamptz, timestamptz, int) to service_role;
