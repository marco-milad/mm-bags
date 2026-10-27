-- 0031 — Private order link (/[locale]/o/<view_token>).
--
-- Each order gets an unguessable token. Whoever holds the link sees the
-- order's full status page without signing in or typing the phone digits —
-- the same model as a Shopify order-status link. The token is 32 hex chars
-- from gen_random_uuid() (122 random bits from the server's strong RNG), so
-- it cannot be guessed or enumerated; the order id / number are NOT enough.
--
-- The column default covers every insert path (storefront checkout, admin,
-- POS); existing orders are backfilled here so old customers get a link too.
-- No new grants: orders stays service-role only, the app reads it server-side.

BEGIN;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS view_token text;

UPDATE public.orders
SET view_token = replace(gen_random_uuid()::text, '-', '')
WHERE view_token IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN view_token SET DEFAULT replace(gen_random_uuid()::text, '-', ''),
  ALTER COLUMN view_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_view_token_key ON public.orders (view_token);

COMMIT;
