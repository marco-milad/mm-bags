-- Business-hours InstaPay expiration.
--
-- Policy change: an unpaid InstaPay order no longer expires after N
-- wall-clock hours — it gets N *business hours* (11:00–22:00
-- Africa/Cairo, every day) to complete payment. Time outside business
-- hours does not count, so a customer who transfers at 21:50 can't
-- have their order die overnight before the admin ever sees the
-- receipt. Expiry itself also only ever HAPPENS during business hours.
--
-- The whole calculation lives HERE, in the database, on the database
-- clock. The application passes only "how many business seconds" —
-- there is no app-side cutoff computation anymore, so the app and DB
-- can never disagree about eligibility, and the old app/DB clock-skew
-- margin becomes unnecessary.
--
-- Africa/Cairo DST (reintroduced 2023: last Friday of April → last
-- Thursday of October) is handled by Postgres' own tzdata via
-- AT TIME ZONE. Both Egyptian transitions happen at midnight — safely
-- OUTSIDE the 11:00–22:00 window — so local-time arithmetic inside a
-- business day is never ambiguous or skipped.
--
-- Migration 0014's function had signature (p_cutoff timestamptz,
-- p_limit int); the new signature drops the cutoff. Postgres treats a
-- different signature as an overload, so the old function is DROPped
-- explicitly rather than left behind as a callable stale path.

BEGIN;

-- ── 1. Business-hours predicate ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_cairo_business_hours(p_at timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT (p_at AT TIME ZONE 'Africa/Cairo')::time >= time '11:00'
     AND (p_at AT TIME ZONE 'Africa/Cairo')::time <  time '22:00';
$$;

-- ── 2. Canonical business-time deadline ─────────────────────────────
-- Returns the instant at which `p_business_seconds` of business time
-- have elapsed since `p_start`. Walks forward day by day in Cairo
-- local time; converts back to timestamptz only at the end.
CREATE OR REPLACE FUNCTION public.cairo_business_deadline(
  p_start            timestamptz,
  p_business_seconds int
) RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_local     timestamp := p_start AT TIME ZONE 'Africa/Cairo';
  v_remaining numeric   := p_business_seconds;
  v_day       date      := (p_start AT TIME ZONE 'Africa/Cairo')::date;
  v_open      timestamp;
  v_close     timestamp;
  v_from      timestamp;
  v_avail     numeric;
  v_guard     int := 0;
BEGIN
  IF p_business_seconds <= 0 THEN
    RETURN p_start;
  END IF;

  LOOP
    v_guard := v_guard + 1;
    IF v_guard > 400 THEN
      RAISE EXCEPTION 'cairo_business_deadline: did not converge for start=%', p_start;
    END IF;

    v_open  := v_day::timestamp + interval '11 hours';
    v_close := v_day::timestamp + interval '22 hours';
    v_from  := greatest(v_local, v_open);

    IF v_from < v_close THEN
      v_avail := extract(epoch FROM (v_close - v_from));
      IF v_avail >= v_remaining THEN
        -- Local business times (11:00–22:00) are never ambiguous in
        -- Cairo — DST shifts at midnight — so this conversion is safe.
        RETURN (v_from + make_interval(secs => v_remaining)) AT TIME ZONE 'Africa/Cairo';
      END IF;
      v_remaining := v_remaining - v_avail;
    END IF;

    v_day   := v_day + 1;
    v_local := v_day::timestamp; -- midnight; next iteration clamps to 11:00
  END LOOP;
END;
$$;

-- ── 3. Replace the sweep function (business-hours aware) ────────────
DROP FUNCTION IF EXISTS public.expire_unpaid_instapay_orders(timestamptz, int);

CREATE FUNCTION public.expire_unpaid_instapay_orders(
  p_business_seconds int DEFAULT 7200,
  p_limit            int DEFAULT 50
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
  -- TTL sanity: at least one business hour, at most ~200 business
  -- hours — a buggy caller can never mass-expire fresh orders.
  IF p_business_seconds < 3600 OR p_business_seconds > 720000 THEN
    RAISE EXCEPTION
      'expire_unpaid_instapay_orders: p_business_seconds must be 3600..720000 (got %)',
      p_business_seconds;
  END IF;
  IF p_limit <= 0 OR p_limit > 200 THEN
    RAISE EXCEPTION
      'expire_unpaid_instapay_orders: p_limit must be 1..200 (got %)', p_limit;
  END IF;

  -- Expiry only ever happens during business hours: an order whose
  -- deadline passed overnight waits for the first in-hours sweep.
  IF NOT public.is_cairo_business_hours(now()) THEN
    RETURN;
  END IF;

  -- Serialise whole sweeps (variant-lock deadlock prevention between
  -- two concurrent runs holding different orders sharing variants).
  PERFORM pg_advisory_xact_lock(hashtext('expire_unpaid_instapay_orders'));

  FOR v_order IN
    SELECT o.id, o.order_number
    FROM public.orders o
    WHERE o.payment_method = 'instapay'
      AND o.payment_status = 'pending'
      -- 'pending' ONLY: a confirmed-but-unpaid order means the admin
      -- deliberately advanced it — the sweep must not override that.
      AND o.status = 'pending'
      AND public.cairo_business_deadline(o.created_at, p_business_seconds) <= now()
    ORDER BY o.created_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
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
      SELECT pv.stock_qty INTO v_qty
      FROM public.product_variants pv
      WHERE pv.id = v_item.variant_id
      FOR UPDATE;

      CONTINUE WHEN v_qty IS NULL;

      UPDATE public.product_variants
      SET stock_qty = stock_qty + v_item.qty
      WHERE id = v_item.variant_id;

      INSERT INTO public.stock_movements (
        variant_id, product_id, type, qty_change,
        qty_before, qty_after, reference_type, reference_id,
        notes, created_by
      ) VALUES (
        v_item.variant_id, v_item.product_id, 'return', v_item.qty,
        v_qty, v_qty + v_item.qty, 'instapay_expiry', v_order.id,
        'Auto-restock: unpaid InstaPay order expired', NULL
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

-- ── 4. Security model: service_role only, same as 0014 ─────────────
REVOKE EXECUTE ON FUNCTION public.is_cairo_business_hours(timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_cairo_business_hours(timestamptz)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.cairo_business_deadline(timestamptz, int)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cairo_business_deadline(timestamptz, int)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.expire_unpaid_instapay_orders(int, int)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_unpaid_instapay_orders(int, int)
  TO service_role;

COMMENT ON FUNCTION public.cairo_business_deadline IS
  'Instant at which N business seconds (11:00-22:00 Africa/Cairo, every day) have elapsed since the given start. Canonical business-time calculation for InstaPay expiry.';
COMMENT ON FUNCTION public.expire_unpaid_instapay_orders IS
  'Cancels+restocks InstaPay orders whose business-hours payment window (default 2 business hours) has elapsed. Runs only during Cairo business hours. One transaction: crash-safe, idempotent, SKIP LOCKED + advisory lock.';

COMMIT;

NOTIFY pgrst, 'reload schema';
