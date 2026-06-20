-- Returns system: online order returns + POS sale returns + restock RPC
--
-- Design mirrors the purchase_orders / purchase_order_items pattern from
-- 0003 — parent record (the return event) + line items (what came back +
-- snapshot pricing) + GENERATED totals + audit-friendly created_by.
--
-- Two design choices worth flagging:
--
--   1. We do NOT add 'returned' to the orders.status enum. A partially-
--      returned order is still 'delivered' (the customer received it);
--      the return is a separate fact recorded on order_returns rows.
--      Adding a status would force a false either/or choice between
--      "delivered" and "returned" when reality is "delivered, then
--      partially returned three items 11 days later".
--
--   2. orders + pos_sales gain a denormalised `has_returns` + `returns_total`
--      pair so the lists, dashboards, and reports can colour-code "has
--      refunds" rows without an aggregate JOIN on every render. The
--      server actions maintain these alongside the canonical rows.
--
-- The 'return' value in stock_movements.type already exists (0003), so
-- restocking from a return reuses the same ledger pattern as every
-- other inventory move.

BEGIN;

-- ─── 1. Online order returns ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.order_returns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reason          text NOT NULL
                    CHECK (reason IN (
                      'defective',
                      'wrong_size',
                      'wrong_color',
                      'changed_mind',
                      'damaged_in_shipping',
                      'other'
                    )),
  refund_method   text NOT NULL
                    CHECK (refund_method IN (
                      'cash',
                      'card_original',
                      'store_credit',
                      'bank_transfer'
                    )),
  refund_amount   numeric(12, 2) NOT NULL CHECK (refund_amount >= 0),
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_return_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id       uuid NOT NULL REFERENCES public.order_returns(id) ON DELETE CASCADE,
  -- order_item_id is the link back to which line of the original order
  -- is being returned. NULL only if the order_items row was deleted
  -- (shouldn't happen in practice — orders are immutable once placed).
  order_item_id   uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  -- product_id + variant_id are denormalised so the restock RPC and
  -- the stock-movements ledger don't have to chase the order_item FK
  -- (which could be NULL after a product/variant delete).
  product_id      uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id      uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  qty             integer NOT NULL CHECK (qty > 0),
  unit_price      numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  total_amount    numeric(12, 2)
                    GENERATED ALWAYS AS (qty * unit_price) STORED
);

CREATE INDEX IF NOT EXISTS order_returns_order_id_idx
  ON public.order_returns (order_id);
CREATE INDEX IF NOT EXISTS order_returns_created_at_idx
  ON public.order_returns (created_at DESC);
CREATE INDEX IF NOT EXISTS order_return_items_return_id_idx
  ON public.order_return_items (return_id);
CREATE INDEX IF NOT EXISTS order_return_items_variant_id_idx
  ON public.order_return_items (variant_id);
CREATE INDEX IF NOT EXISTS order_return_items_product_id_idx
  ON public.order_return_items (product_id);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS has_returns boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS returns_total numeric(12, 2) NOT NULL DEFAULT 0;

-- ─── 2. POS sale returns ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pos_returns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         uuid NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  reason          text NOT NULL
                    CHECK (reason IN (
                      'defective',
                      'wrong_size',
                      'wrong_color',
                      'changed_mind',
                      'damaged_in_shipping',
                      'other'
                    )),
  refund_method   text NOT NULL
                    CHECK (refund_method IN (
                      'cash',
                      'card_original',
                      'store_credit',
                      'bank_transfer'
                    )),
  refund_amount   numeric(12, 2) NOT NULL CHECK (refund_amount >= 0),
  notes           text,
  -- Person at the till who processed the return. Distinct from
  -- pos_sales.cashier_id (the seller) because the returner may be a
  -- different staffer.
  cashier_id      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_return_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id       uuid NOT NULL REFERENCES public.pos_returns(id) ON DELETE CASCADE,
  sale_item_id    uuid REFERENCES public.pos_sale_items(id) ON DELETE SET NULL,
  product_id      uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id      uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  qty             integer NOT NULL CHECK (qty > 0),
  unit_price      numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  total_amount    numeric(12, 2)
                    GENERATED ALWAYS AS (qty * unit_price) STORED
);

CREATE INDEX IF NOT EXISTS pos_returns_sale_id_idx
  ON public.pos_returns (sale_id);
CREATE INDEX IF NOT EXISTS pos_returns_created_at_idx
  ON public.pos_returns (created_at DESC);
CREATE INDEX IF NOT EXISTS pos_return_items_return_id_idx
  ON public.pos_return_items (return_id);
CREATE INDEX IF NOT EXISTS pos_return_items_variant_id_idx
  ON public.pos_return_items (variant_id);
CREATE INDEX IF NOT EXISTS pos_return_items_product_id_idx
  ON public.pos_return_items (product_id);

ALTER TABLE public.pos_sales
  ADD COLUMN IF NOT EXISTS has_returns boolean NOT NULL DEFAULT false;
ALTER TABLE public.pos_sales
  ADD COLUMN IF NOT EXISTS returns_total numeric(12, 2) NOT NULL DEFAULT 0;

-- ─── 3. restock_atomic RPC ────────────────────────────────────────
--
-- Mirror of deduct_stock_atomic. Adds qty BACK to a variant and
-- writes a stock_movements row of the given type (default 'return').
-- FOR UPDATE on the variant row prevents two concurrent returns from
-- racing on the stock_qty read-then-write — same protection the
-- forward sale path has.

CREATE OR REPLACE FUNCTION public.restock_atomic(
  p_variant_id     uuid,
  p_qty            int,
  p_reference_type text,
  p_reference_id   uuid,
  p_created_by     uuid,
  p_movement_type  text DEFAULT 'return',
  p_notes          text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_qty int;
  v_product_id  uuid;
BEGIN
  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'restock_atomic: p_qty must be positive (got %)', p_qty;
  END IF;
  IF p_movement_type NOT IN ('return', 'adjustment') THEN
    RAISE EXCEPTION
      'restock_atomic: movement_type must be return or adjustment (got %)',
      p_movement_type;
  END IF;

  SELECT stock_qty, product_id
    INTO v_current_qty, v_product_id
  FROM public.product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF v_current_qty IS NULL THEN
    RAISE EXCEPTION 'restock_atomic: variant % not found', p_variant_id;
  END IF;

  UPDATE public.product_variants
  SET stock_qty = stock_qty + p_qty
  WHERE id = p_variant_id;

  INSERT INTO public.stock_movements (
    variant_id,
    product_id,
    type,
    qty_change,
    qty_before,
    qty_after,
    reference_type,
    reference_id,
    notes,
    created_by
  ) VALUES (
    p_variant_id,
    v_product_id,
    p_movement_type,
    p_qty,
    v_current_qty,
    v_current_qty + p_qty,
    p_reference_type,
    p_reference_id,
    p_notes,
    p_created_by
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.restock_atomic(
  uuid, int, text, uuid, uuid, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restock_atomic(
  uuid, int, text, uuid, uuid, text, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.restock_atomic(
  uuid, int, text, uuid, uuid, text, text
) TO authenticated;

-- ─── 4. RLS ────────────────────────────────────────────────────────

ALTER TABLE public.order_returns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_returns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_return_items   ENABLE ROW LEVEL SECURITY;

-- Staff (cashier / manager / admin) can do everything on returns
-- tables — same gate as suppliers / purchase_orders.
DROP POLICY IF EXISTS "Staff access order_returns" ON public.order_returns;
CREATE POLICY "Staff access order_returns" ON public.order_returns
  FOR ALL USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff access order_return_items" ON public.order_return_items;
CREATE POLICY "Staff access order_return_items" ON public.order_return_items
  FOR ALL USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff access pos_returns" ON public.pos_returns;
CREATE POLICY "Staff access pos_returns" ON public.pos_returns
  FOR ALL USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff access pos_return_items" ON public.pos_return_items;
CREATE POLICY "Staff access pos_return_items" ON public.pos_return_items
  FOR ALL USING (public.is_active_staff());

-- ─── 5. Grants ────────────────────────────────────────────────────

GRANT ALL ON public.order_returns      TO authenticated, service_role;
GRANT ALL ON public.order_return_items TO authenticated, service_role;
GRANT ALL ON public.pos_returns        TO authenticated, service_role;
GRANT ALL ON public.pos_return_items   TO authenticated, service_role;

-- ─── 6. Comments ──────────────────────────────────────────────────

COMMENT ON TABLE public.order_returns IS
  'One row per online-order return event. Many-to-one with orders — partial returns produce one row each, full return is also one row.';
COMMENT ON TABLE public.order_return_items IS
  'Line items within an order_return. qty <= original order_items.qty - sum(previous returns).';
COMMENT ON TABLE public.pos_returns IS
  'One row per POS-sale return event. Same shape as order_returns.';
COMMENT ON COLUMN public.orders.has_returns IS
  'Denormalised: true if any order_returns rows reference this order. Server actions keep it in sync.';
COMMENT ON COLUMN public.orders.returns_total IS
  'Denormalised: sum of refund_amount across all order_returns for this order. Used for net-revenue reports.';
COMMENT ON FUNCTION public.restock_atomic(uuid, int, text, uuid, uuid, text, text) IS
  'Mirror of deduct_stock_atomic for the return flow. Adds qty back to variant.stock_qty under row-level lock and writes a stock_movements row of the given type.';

COMMIT;
