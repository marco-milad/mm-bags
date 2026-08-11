-- Widen the CHECK constraint on orders.payment_method so the checkout
-- can create "instapay" orders. Card stays in the allowed set so any
-- pre-existing historical row (from the previous placeholder-checkout
-- era) still validates on future writes — the storefront UI has since
-- removed the card option so no NEW card orders will be created until
-- the real Paymob integration lands.
--
-- Payment statuses are unchanged: an InstaPay order lives at
-- payment_status='pending' from creation until the admin manually
-- confirms the transfer arrived and flips it to 'paid'. That's the
-- same shape a card+Paymob order would eventually use, so nothing
-- here forecloses the future integration.

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
    CHECK (payment_method IN ('card', 'cod', 'instapay'));
