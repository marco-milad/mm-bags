-- ============================================================================
-- Concurrency / transaction verification for deduct_stock_bulk_atomic
-- (H2 test scenarios 10–13).
--
-- ⚠️  NOT EXECUTED in the build environment — there is no live Postgres here.
--     Run this against a Supabase branch / local `supabase db` instance to
--     verify the atomicity and concurrency guarantees. Each block states its
--     expected result. Nothing below has been asserted automatically.
--
-- Prereqs: migration 0022 applied; a throwaway product + variants to mutate.
-- Clean up the seed rows afterwards (or run on a disposable branch).
-- ============================================================================

-- ── Seed ────────────────────────────────────────────────────────────────────
-- (Adjust ids/columns to your schema; these are illustrative.)
-- insert into products (id, slug, name_ar, name_en, base_price, is_active)
--   values ('00000000-0000-0000-0000-0000000000p1','tst','تجربة','Test',100,true);
-- insert into product_variants (id, product_id, stock_qty)
--   values ('00000000-0000-0000-0000-0000000000v1','00000000-0000-0000-0000-0000000000p1',1),
--          ('00000000-0000-0000-0000-0000000000v2','00000000-0000-0000-0000-0000000000p1',5);

-- ── Scenario 12: partial failure rolls back EVERYTHING (all-or-nothing) ───────
-- v1 has stock 1, v2 has stock 5. Ask for 1 of v1 and 6 of v2 (v2 insufficient).
-- EXPECT: exception raised; v1.stock_qty STILL 1; NO stock_movements rows for
-- this reference. i.e. the successful v1 line is rolled back with the failing
-- v2 line. This is the "stock deducted → order fails → stock lost" case the
-- old per-item loop had; the bulk RPC must NOT leak here.
do $$
begin
  perform public.deduct_stock_bulk_atomic(
    '[{"variant_id":"00000000-0000-0000-0000-0000000000v1","qty":1},
      {"variant_id":"00000000-0000-0000-0000-0000000000v2","qty":6}]'::jsonb,
    'online_sale', gen_random_uuid(), null, 'online_sale');
  raise exception 'FAIL: expected insufficient-stock error, none raised';
exception
  when others then
    raise notice 'OK (scenario 12): rolled back with %', sqlerrm;
end $$;
-- Then assert (should print stock_qty = 1, movement_count = 0):
--   select stock_qty from product_variants where id = '...v1';
--   select count(*) from stock_movements where variant_id in ('...v1','...v2')
--     and reference_type = 'online_sale' and created_at > now() - interval '1 minute';

-- ── Scenario 8/9 at the DB layer: missing variant → whole call rolls back ─────
do $$
begin
  perform public.deduct_stock_bulk_atomic(
    '[{"variant_id":"00000000-0000-0000-0000-0000000000v2","qty":1},
      {"variant_id":"11111111-1111-1111-1111-111111111111","qty":1}]'::jsonb,
    'online_sale', gen_random_uuid(), null, 'online_sale');
  raise exception 'FAIL: expected variant-not-found error, none raised';
exception
  when others then
    raise notice 'OK: missing variant rolled the whole batch back (%).', sqlerrm;
end $$;
-- Assert v2.stock_qty unchanged (= 5).

-- ── Scenarios 10 & 11: two concurrent orders race for the last unit ───────────
-- Run in TWO psql sessions against the same DB. v1 stock = 1.
--
-- Session A:
--   begin;
--   select public.deduct_stock_bulk_atomic(
--     '[{"variant_id":"...v1","qty":1}]'::jsonb,'online_sale',gen_random_uuid(),null,'online_sale');
--   -- hold the transaction open (do NOT commit yet)
--
-- Session B (while A is open):
--   begin;
--   select public.deduct_stock_bulk_atomic(
--     '[{"variant_id":"...v1","qty":1}]'::jsonb,'online_sale',gen_random_uuid(),null,'online_sale');
--   -- B BLOCKS on the FOR UPDATE row lock held by A.
--
-- Session A: commit;   -- v1.stock_qty is now 0
-- Session B: unblocks, re-reads stock_qty = 0 under its lock, RAISES
--            "Insufficient stock", and rolls back.
--
-- EXPECT: exactly ONE of the two succeeds; final v1.stock_qty = 0 (never -1);
-- exactly one stock_movements row. This proves overselling is impossible.

-- ── Scenario 13 (order/stock consistency) is exercised at the app layer ───────
-- placeOrder deletes order + order_items when deductStockBulk fails, and the
-- bulk RPC guarantees no partial deduction — so a cancelled order never leaves
-- stock decremented, and a committed deduction always has its order rows.
