-- 0029 — Personal, single-use coupons for approved newsletter subscribers.
--
-- Owner decision (2026-10-27): the 10% newsletter offer is no longer a
-- shared code. Each subscriber waits in the admin as "pending"; when Marco
-- approves, the app issues one personal code (MM-XXXXXX) that works once
-- and expires after 60 days. Checkout validates and redeems it server-side.
--
-- Safe to run before the code deploy: the current app ignores the new
-- columns, and the coupons table is unused until then.

BEGIN;

-- 1) Subscriber review status. Existing subscribers start as pending, so
--    they appear in the admin queue for a decision.
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'newsletter_subscribers_status_check'
  ) THEN
    ALTER TABLE public.newsletter_subscribers
      ADD CONSTRAINT newsletter_subscribers_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- 2) Coupons. used_at + order_id are set in ONE conditional UPDATE
--    (… WHERE used_at IS NULL), so two orders can never redeem one code.
CREATE TABLE IF NOT EXISTS public.coupons (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        NOT NULL UNIQUE,
  percent_off   int         NOT NULL CHECK (percent_off BETWEEN 1 AND 50),
  subscriber_id uuid        REFERENCES public.newsletter_subscribers(id) ON DELETE SET NULL,
  email         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at    timestamptz,
  used_at       timestamptz,
  order_id      uuid        REFERENCES public.orders(id) ON DELETE SET NULL
);

-- One code per subscriber.
CREATE UNIQUE INDEX IF NOT EXISTS coupons_subscriber_key
  ON public.coupons (subscriber_id) WHERE subscriber_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS coupons_order_idx ON public.coupons (order_id);

-- Server-only: the service role bypasses RLS; nobody else gets in.
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.coupons FROM anon, authenticated;

-- 3) Which code an order used (the amount is in discount_amount).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code text;

COMMIT;
