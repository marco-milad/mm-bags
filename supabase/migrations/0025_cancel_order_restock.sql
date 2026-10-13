-- 0025 — Cancelling an order puts its stock back.
--
-- Before this, only the InstaPay expiry sweep (0014/0015) restocked. An admin
-- cancelling a COD (or confirmed/processing/shipped) order just flipped the
-- status, so every cancellation permanently removed the ordered units from
-- stock — products could show "sold out" while the goods sat on the shelf.
--
-- cancel_order_with_restock(order_id):
--   * locks the order row; already-cancelled → no-op (idempotent);
--   * refuses delivered orders (those come back through the returns flow);
--   * marks it cancelled (an unpaid InstaPay order also gets payment 'failed',
--     exactly like the expiry sweep);
--   * restocks the NET quantity this order took out of each variant, computed
--     from stock_movements (deductions negative, earlier restocks positive),
--     so it can never put back more than was deducted or restock twice;
--   * one transaction, variant rows locked in id order (no deadlocks with
--     checkout's bulk deduction, which also locks in id order).
-- Ledger: type 'return', reference_type 'order_cancel'.

BEGIN;

CREATE OR REPLACE FUNCTION public.cancel_order_with_restock(
  p_order_id uuid
) RETURNS TABLE (
  was_cancelled   boolean,
  items_restocked int,
  units_restocked int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order record;
  v_line  record;
  v_qty   int;
  v_items int := 0;
  v_units int := 0;
BEGIN
  SELECT o.id, o.status, o.payment_method, o.payment_status
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cancel_order_with_restock: order % not found', p_order_id;
  END IF;

  IF v_order.status = 'cancelled' THEN
    was_cancelled := false; items_restocked := 0; units_restocked := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_order.status = 'delivered' THEN
    RAISE EXCEPTION 'cancel_order_with_restock: order % is delivered — use a return instead', p_order_id;
  END IF;

  UPDATE public.orders
  SET status = 'cancelled',
      payment_status = CASE
        WHEN v_order.payment_method = 'instapay' AND v_order.payment_status = 'pending'
          THEN 'failed'
        ELSE payment_status
      END
  WHERE id = p_order_id;

  FOR v_line IN
    SELECT sm.variant_id,
           max(sm.product_id::text)::uuid AS product_id,
           -sum(sm.qty_change)::int       AS net_out
    FROM public.stock_movements sm
    WHERE sm.reference_id = p_order_id
      AND sm.variant_id IS NOT NULL
    GROUP BY sm.variant_id
    HAVING -sum(sm.qty_change) > 0
    ORDER BY sm.variant_id
  LOOP
    SELECT pv.stock_qty INTO v_qty
    FROM public.product_variants pv
    WHERE pv.id = v_line.variant_id
    FOR UPDATE;

    CONTINUE WHEN v_qty IS NULL; -- variant deleted since: nothing to put back

    UPDATE public.product_variants
    SET stock_qty = stock_qty + v_line.net_out
    WHERE id = v_line.variant_id;

    INSERT INTO public.stock_movements (
      variant_id, product_id, type, qty_change,
      qty_before, qty_after, reference_type, reference_id,
      notes, created_by
    ) VALUES (
      v_line.variant_id, v_line.product_id, 'return', v_line.net_out,
      v_qty, v_qty + v_line.net_out, 'order_cancel', p_order_id,
      'Auto-restock: order cancelled', NULL
    );

    v_items := v_items + 1;
    v_units := v_units + v_line.net_out;
  END LOOP;

  was_cancelled := true; items_restocked := v_items; units_restocked := v_units;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_order_with_restock(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order_with_restock(uuid)
  TO service_role;

COMMENT ON FUNCTION public.cancel_order_with_restock IS
  'Cancels an order and restocks the net quantity it deducted (from stock_movements). Idempotent; refuses delivered orders (use returns). service_role only.';

COMMIT;
