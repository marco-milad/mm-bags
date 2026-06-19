-- Store-specific pricing
--
-- Lets Marco quote a different number on the till than the website.
-- Walk-in customers sometimes get a different price than online
-- shoppers (cash discount, friend pricing, scratch-and-dent). The
-- website pricing stays untouched no matter what these columns hold.
--
-- Resolution order in the POS, per-cart line:
--   variant.store_price_override
--     ?? product.store_price
--     ?? variant.price_override
--     ?? product.sale_price
--     ?? product.base_price
--
-- Resolution on the website (unchanged from today):
--   product.sale_price ?? product.base_price
--   (variant.price_override applied per-variant in `effectivePrice`)
--
-- Both columns nullable. Null on both → website pricing is used in
-- POS too, which is the desired default for most products.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS store_price numeric(12,2);

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS store_price_override numeric(12,2);

COMMENT ON COLUMN products.store_price IS
  'POS-only price; null = use base_price/sale_price in POS too. Never read by the storefront.';
COMMENT ON COLUMN product_variants.store_price_override IS
  'POS-only per-variant price; overrides products.store_price for this variant only.';
