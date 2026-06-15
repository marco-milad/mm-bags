-- ============================================================================
-- 0003_erp_schema.sql — Add the ERP layer (suppliers, purchase orders,
-- staff, POS sales, stock movements) and a `show_in_store` flag on products.
--
-- Apply via Supabase Studio's SQL editor or `supabase db push`. The
-- service-role REST API does not accept arbitrary DDL.
--
-- All new tables have RLS enabled with an admin/manager/cashier policy
-- gated on the `staff` table — once a real staff row exists for an
-- authenticated user, the ERP pages become accessible to them.
-- ============================================================================

-- ── 1. Suppliers ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  phone       text,
  address     text,
  notes       text,
  total_paid  numeric(12, 2) DEFAULT 0,
  total_owed  numeric(12, 2) DEFAULT 0,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ── 2. Purchase orders (توريدات) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  uuid REFERENCES public.suppliers(id),
  order_date   date DEFAULT CURRENT_DATE,
  total_cost   numeric(12, 2) DEFAULT 0,
  amount_paid  numeric(12, 2) DEFAULT 0,
  amount_owed  numeric(12, 2) DEFAULT 0,
  status       text DEFAULT 'pending'
               CHECK (status IN ('pending', 'received', 'partial', 'paid')),
  notes        text,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id  uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id         uuid REFERENCES public.products(id),
  variant_id         uuid REFERENCES public.product_variants(id),
  qty                int NOT NULL CHECK (qty > 0),
  unit_cost          numeric(10, 2) NOT NULL,
  total_cost         numeric(10, 2) GENERATED ALWAYS AS (qty * unit_cost) STORED
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po
  ON public.purchase_order_items(purchase_order_id);

-- ── 3. Staff ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) UNIQUE,
  name        text NOT NULL,
  phone       text,
  role        text DEFAULT 'cashier'
              CHECK (role IN ('cashier', 'manager', 'admin')),
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ── 4. POS sales (مبيعات المحل) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pos_sales (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number      text UNIQUE NOT NULL, -- e.g. POS-2026-0001
  cashier_id       uuid REFERENCES public.staff(id),
  subtotal         numeric(10, 2) NOT NULL,
  discount_amount  numeric(10, 2) DEFAULT 0,
  total            numeric(10, 2) NOT NULL,
  payment_method   text NOT NULL
                   CHECK (payment_method IN ('cash', 'e-wallet', 'instapay', 'card')),
  payment_ref      text,
  notes            text,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_sales_created_at
  ON public.pos_sales(created_at DESC);

CREATE TABLE IF NOT EXISTS public.pos_sale_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         uuid REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  variant_id      uuid REFERENCES public.product_variants(id),
  product_id      uuid REFERENCES public.products(id),
  qty             int NOT NULL CHECK (qty > 0),
  unit_price      numeric(10, 2) NOT NULL,
  total_price     numeric(10, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  snapshot_name   text,
  snapshot_color  text,
  snapshot_size   text
);

CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale
  ON public.pos_sale_items(sale_id);

-- ── 5. Stock movements (حركة المخزون) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id      uuid REFERENCES public.product_variants(id),
  product_id      uuid REFERENCES public.products(id),
  type            text NOT NULL
                  CHECK (type IN ('purchase_in', 'online_sale', 'pos_sale',
                                  'adjustment', 'return', 'transfer')),
  qty_change      int NOT NULL, -- positive = in, negative = out
  qty_before      int NOT NULL,
  qty_after       int NOT NULL,
  reference_type  text,
  reference_id    uuid,
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at
  ON public.stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant
  ON public.stock_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference
  ON public.stock_movements(reference_type, reference_id);

-- ── 6. show_in_store flag on products ───────────────────────────────────────
-- true  + is_active=true   → store + online
-- true  + is_active=false  → store only (POS still rings these up)
-- false + is_active=true   → online only (unusual)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS show_in_store boolean DEFAULT true;

-- ── 7. Atomic stock deduction RPC ───────────────────────────────────────────
-- Used by the order placement + POS checkout paths so a sale can never
-- silently oversell. Locks the variant row, checks stock, decrements,
-- and writes a stock_movements row in one transaction.
CREATE OR REPLACE FUNCTION public.deduct_stock_atomic(
  p_variant_id     uuid,
  p_qty            int,
  p_reference_type text,
  p_reference_id   uuid,
  p_created_by     uuid,
  p_movement_type  text DEFAULT 'online_sale'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_qty int;
  v_product_id uuid;
BEGIN
  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'deduct_stock_atomic: p_qty must be positive (got %)', p_qty;
  END IF;

  -- Row-level lock — concurrent sales of the same variant queue up here
  -- instead of racing.
  SELECT stock_qty, product_id
  INTO v_current_qty, v_product_id
  FROM public.product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF v_current_qty IS NULL THEN
    RAISE EXCEPTION 'deduct_stock_atomic: variant % not found', p_variant_id;
  END IF;
  IF v_current_qty < p_qty THEN
    RAISE EXCEPTION 'Insufficient stock for variant % (have %, need %)',
      p_variant_id, v_current_qty, p_qty;
  END IF;

  UPDATE public.product_variants
  SET stock_qty = stock_qty - p_qty
  WHERE id = p_variant_id;

  INSERT INTO public.stock_movements (
    variant_id, product_id, type, qty_change,
    qty_before, qty_after, reference_type, reference_id, created_by
  ) VALUES (
    p_variant_id,
    v_product_id,
    p_movement_type,
    -p_qty,
    v_current_qty,
    v_current_qty - p_qty,
    p_reference_type,
    p_reference_id,
    p_created_by
  );
END;
$$;

-- ── 8. RLS posture ──────────────────────────────────────────────────────────
ALTER TABLE public.suppliers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sales              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sale_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements        ENABLE ROW LEVEL SECURITY;

-- Helper: is the caller an active staff member? Used by all ERP policies
-- so the role check lives in one place.
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE user_id = auth.uid()
      AND role IN ('cashier', 'manager', 'admin')
      AND is_active = true
  );
$$;

-- Drop existing policies if re-running, then recreate. `IF EXISTS` keeps
-- this idempotent across re-applies.
DROP POLICY IF EXISTS "Staff access suppliers"          ON public.suppliers;
DROP POLICY IF EXISTS "Staff access purchase_orders"    ON public.purchase_orders;
DROP POLICY IF EXISTS "Staff access purchase_order_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Staff access staff"              ON public.staff;
DROP POLICY IF EXISTS "Staff access pos_sales"          ON public.pos_sales;
DROP POLICY IF EXISTS "Staff access pos_sale_items"     ON public.pos_sale_items;
DROP POLICY IF EXISTS "Staff access stock_movements"    ON public.stock_movements;

CREATE POLICY "Staff access suppliers"          ON public.suppliers
  FOR ALL USING (public.is_active_staff());
CREATE POLICY "Staff access purchase_orders"    ON public.purchase_orders
  FOR ALL USING (public.is_active_staff());
CREATE POLICY "Staff access purchase_order_items" ON public.purchase_order_items
  FOR ALL USING (public.is_active_staff());
CREATE POLICY "Staff access staff"              ON public.staff
  FOR ALL USING (public.is_active_staff());
CREATE POLICY "Staff access pos_sales"          ON public.pos_sales
  FOR ALL USING (public.is_active_staff());
CREATE POLICY "Staff access pos_sale_items"     ON public.pos_sale_items
  FOR ALL USING (public.is_active_staff());
CREATE POLICY "Staff access stock_movements"    ON public.stock_movements
  FOR ALL USING (public.is_active_staff());

-- ── 9. Comments for the next maintainer ─────────────────────────────────────
COMMENT ON COLUMN public.products.show_in_store IS
  'show_in_store=true + is_active=false → store-only (POS rings up, hidden from /catalog). show_in_store=true + is_active=true → store + online.';
COMMENT ON FUNCTION public.deduct_stock_atomic IS
  'Atomic stock decrement + movement log. Locks variant row, raises on insufficient stock. Used by checkout and POS.';
COMMENT ON TABLE public.stock_movements IS
  'Append-only ledger of every stock change. Drives the stock report and audit trail.';
