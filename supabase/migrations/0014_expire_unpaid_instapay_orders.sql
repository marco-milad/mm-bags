-- Expire unpaid InstaPay orders + restock atomically.
--
-- Business rule: an InstaPay order whose transfer never arrived should
-- not hold stock hostage forever. After a configurable window (app-side
-- default 4h) the order is cancelled, payment_status becomes 'failed',
-- and every order_items line is restocked with a ledger entry.
--
-- Why one plpgsql function instead of app-side orchestration:
--   * A function call is ONE transaction — if the process dies mid-way
--     nothing is committed, so a retry can never double-restock or
--     leave a cancelled-but-not-restocked order (crash safety).
--   * FOR UPDATE SKIP LOCKED on the order rows means two concurrent
--     sweep runs partition the work instead of racing, and a sweep
--     can never collide with markInstapayPaid: whichever commits
--     first wins, the loser's WHERE predicate no longer matches.
--   * Reuses the exact ledger pattern of deduct_stock_atomic /
--     restock_atomic (0003 / 0010): variant row lock, qty_before /
--     qty_after snapshot, append-only stock_movements row.
--
-- Ledger semantics: type='return' (stock physically coming back — the
-- CHECK constraint from 0003 allows it) with reference_type =
-- 'instapay_expiry' + reference_id = order id, so expiry restocks are
-- distinguishable from customer returns in every report.
--
-- Statuses reused, none invented: orders.status → 'cancelled',
-- orders.payment_status → 'failed' (both in the 0001 CHECK lists).
-- markInstapayPaid requires payment_status='pending', so an expired
-- order can never be flipped to paid afterwards.

BEGIN;

CREATE OR REPLACE FUNCTION public.expire_unpaid_instapay_orders(
  p_cutoff timestamptz,
  p_limit  int DEFAULT 50
) RETURNS TABLE (
  expired_order_id uuid,
  order_number     text,
  items_restocked  int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order  record;
  v_item   record;
  v_qty    int;
  v_count  int;
BEGIN
  -- Defence in depth: refuse cutoffs newer than 1 hour ago so a buggy
  -- caller can never mass-expire orders customers placed minutes ago.
  IF p_cutoff > now() - interval '1 hour' THEN
    RAISE EXCEPTION
      'expire_unpaid_instapay_orders: cutoff % is too recent (must be at least 1h in the past)',
      p_cutoff;
  END IF;
  IF p_limit <= 0 OR p_limit > 200 THEN
    RAISE EXCEPTION
      'expire_unpaid_instapay_orders: p_limit must be 1..200 (got %)', p_limit;
  END IF;

  -- Serialise whole sweeps. SKIP LOCKED already partitions ORDERS
  -- between concurrent runs, but two runs holding different orders
  -- could still lock the same VARIANTS in different interleavings
  -- (shared variants across orders) and deadlock. One sweep at a time
  -- costs nothing at this store's scale and removes the class.
  PERFORM pg_advisory_xact_lock(hashtext('expire_unpaid_instapay_orders'));

  FOR v_order IN
    SELECT o.id, o.order_number
    FROM public.orders o
    WHERE o.payment_method = 'instapay'
      AND o.payment_status = 'pending'
      -- 'pending' ONLY: markInstapayPaid always sets paid+confirmed
      -- together, so a confirmed-but-unpaid order can only mean the
      -- admin manually advanced it (deliberately proceeding without
      -- payment) — the sweep must not override that decision.
      AND o.status = 'pending'
      AND o.created_at < p_cutoff
    ORDER BY o.created_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    -- The row is locked by us until COMMIT; a concurrent
    -- markInstapayPaid is now queued behind this transaction and its
    -- `WHERE payment_status = 'pending'` guard will match nothing
    -- after we commit. Conversely, if the admin's update committed
    -- before our SELECT, the order never entered this loop.
    UPDATE public.orders
    SET status = 'cancelled',
        payment_status = 'failed'
    WHERE id = v_order.id;

    v_count := 0;
    FOR v_item IN
      SELECT oi.variant_id, oi.product_id, oi.qty
      FROM public.order_items oi
      WHERE oi.order_id = v_order.id
        AND oi.variant_id IS NOT NULL
        AND oi.qty > 0
    LOOP
      -- Same lock + snapshot pattern as restock_atomic (0010).
      SELECT pv.stock_qty INTO v_qty
      FROM public.product_variants pv
      WHERE pv.id = v_item.variant_id
      FOR UPDATE;

      -- Variant deleted since the order was placed — nothing to
      -- restock for this line; the order still expires.
      CONTINUE WHEN v_qty IS NULL;

      UPDATE public.product_variants
      SET stock_qty = stock_qty + v_item.qty
      WHERE id = v_item.variant_id;

      INSERT INTO public.stock_movements (
        variant_id, product_id, type, qty_change,
        qty_before, qty_after, reference_type, reference_id,
        notes, created_by
      ) VALUES (
        v_item.variant_id,
        v_item.product_id,
        'return',
        v_item.qty,
        v_qty,
        v_qty + v_item.qty,
        'instapay_expiry',
        v_order.id,
        'Auto-restock: unpaid InstaPay order expired',
        NULL
      );

      v_count := v_count + 1;
    END LOOP;

    expired_order_id := v_order.id;
    order_number     := v_order.order_number;
    items_restocked  := v_count;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Destructive maintenance function — service-role only. PostgREST's
-- anon/authenticated roles must not be able to call it. Revoking from
-- PUBLIC also strips service_role's inherited default, so grant it
-- back explicitly — without this PostgREST hides the function from
-- the schema cache entirely ("Could not find the function").
REVOKE EXECUTE ON FUNCTION public.expire_unpaid_instapay_orders(timestamptz, int)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_unpaid_instapay_orders(timestamptz, int)
  TO service_role;

COMMENT ON FUNCTION public.expire_unpaid_instapay_orders IS
  'Cancels InstaPay orders still payment_status=pending older than the cutoff and restocks their items (ledger type=return, reference_type=instapay_expiry). One transaction: crash-safe, idempotent, SKIP LOCKED against concurrent runs and markInstapayPaid.';

COMMIT;
