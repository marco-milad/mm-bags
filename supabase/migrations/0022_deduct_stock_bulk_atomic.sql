-- 0022_deduct_stock_bulk_atomic.sql
-- ============================================================================
-- All-or-nothing bulk stock deduction for the online checkout.
--
-- Why this exists (H2 hardening):
--   The previous online path (lib/inventory/deduct-stock.ts) looped one
--   `deduct_stock_atomic` RPC per variant. Each call is atomic on its own,
--   but a multi-variant order could deduct variant A, then fail on variant B
--   (a concurrent buyer grabbed B's last unit between the pre-check and the
--   lock). placeOrder would then delete the order — but A's stock stayed
--   decremented and was never restored (a silent stock leak).
--
--   This function deducts EVERY line inside a single transaction. If any line
--   is missing, has a non-positive qty, or lacks stock, it RAISEs — which
--   rolls back the whole function, so NOTHING is decremented and NO ledger
--   rows are written. Partial deduction becomes impossible.
--
-- Concurrency:
--   Variant rows are locked FOR UPDATE in a deterministic order (ORDER BY
--   variant id). Two concurrent multi-variant orders that overlap therefore
--   acquire their locks in the same sequence and cannot deadlock. Each row is
--   re-checked under its lock, so overselling is impossible even if two carts
--   race for the same last unit.
--
-- Aggregation:
--   Requested quantities are summed per variant first, so a malformed payload
--   that lists the same variant twice is checked against the combined qty
--   (and produces one ledger row), not each line independently.
--
-- The per-item `deduct_stock_atomic` is intentionally LEFT IN PLACE and
-- unchanged — the POS path still uses it. This is additive.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deduct_stock_bulk_atomic(
  p_items          jsonb,   -- [{"variant_id": "<uuid>", "qty": <int>}, ...]
  p_reference_type text,
  p_reference_id   uuid,
  p_created_by     uuid,
  p_movement_type  text DEFAULT 'online_sale'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r             record;
  v_current_qty int;
  v_product_id  uuid;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'deduct_stock_bulk_atomic: p_items must be a JSON array (got %)',
      coalesce(jsonb_typeof(p_items), 'null');
  END IF;

  -- Aggregate per variant and lock rows in a deterministic order so
  -- concurrent multi-variant orders can never deadlock.
  FOR r IN
    SELECT (elem->>'variant_id')::uuid AS variant_id,
           SUM((elem->>'qty')::int)    AS qty
    FROM jsonb_array_elements(p_items) AS elem
    GROUP BY (elem->>'variant_id')::uuid
    ORDER BY (elem->>'variant_id')::uuid
  LOOP
    IF r.qty IS NULL OR r.qty <= 0 THEN
      RAISE EXCEPTION 'deduct_stock_bulk_atomic: qty must be positive for variant % (got %)',
        r.variant_id, r.qty;
    END IF;

    -- Row-level lock: concurrent sales of the same variant serialise here.
    SELECT stock_qty, product_id
    INTO v_current_qty, v_product_id
    FROM public.product_variants
    WHERE id = r.variant_id
    FOR UPDATE;

    IF v_current_qty IS NULL THEN
      RAISE EXCEPTION 'deduct_stock_bulk_atomic: variant % not found', r.variant_id;
    END IF;
    IF v_current_qty < r.qty THEN
      RAISE EXCEPTION 'Insufficient stock for variant % (have %, need %)',
        r.variant_id, v_current_qty, r.qty;
    END IF;

    UPDATE public.product_variants
    SET stock_qty = stock_qty - r.qty
    WHERE id = r.variant_id;

    INSERT INTO public.stock_movements (
      variant_id, product_id, type, qty_change,
      qty_before, qty_after, reference_type, reference_id, created_by
    ) VALUES (
      r.variant_id,
      v_product_id,
      p_movement_type,
      -r.qty,
      v_current_qty,
      v_current_qty - r.qty,
      p_reference_type,
      p_reference_id,
      p_created_by
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.deduct_stock_bulk_atomic IS
  'All-or-nothing stock decrement for a whole order. Locks all variant rows FOR UPDATE in id order, re-checks stock, decrements, and logs one stock_movements row per variant — all in one transaction. RAISEs (rolling back everything) on any missing/insufficient/invalid line. Used by the online checkout; POS still uses deduct_stock_atomic.';

-- The online checkout calls this through the service-role admin client.
GRANT EXECUTE ON FUNCTION public.deduct_stock_bulk_atomic(jsonb, text, uuid, uuid, text)
  TO service_role;
