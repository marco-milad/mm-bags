-- Widen numeric columns to fix "numeric field overflow" errors on
-- product save. Prices needed room for realistic Egyptian EGP values
-- (luggage sets often exceed a few thousand), and the spec fields
-- needed room for the real-world ranges (e.g. capacity up to 999 L).
--
-- Applied to the remote project via Supabase MCP under the migration
-- name `widen_numeric_columns_for_overflow_fix` — this file mirrors
-- the same SQL into version control.

ALTER TABLE products
  ALTER COLUMN base_price TYPE numeric(12,2),
  ALTER COLUMN sale_price TYPE numeric(12,2),
  ALTER COLUMN weight_kg TYPE numeric(6,2),
  ALTER COLUMN laptop_inches TYPE numeric(5,1),
  ALTER COLUMN capacity_liters TYPE numeric(7,1);

ALTER TABLE product_variants
  ALTER COLUMN price_override TYPE numeric(12,2);

ALTER TABLE orders
  ALTER COLUMN subtotal TYPE numeric(12,2),
  ALTER COLUMN shipping_fee TYPE numeric(12,2),
  ALTER COLUMN discount_amount TYPE numeric(12,2),
  ALTER COLUMN loyalty_discount TYPE numeric(12,2),
  ALTER COLUMN total TYPE numeric(12,2);

ALTER TABLE pos_sales
  ALTER COLUMN subtotal TYPE numeric(12,2),
  ALTER COLUMN discount_amount TYPE numeric(12,2),
  ALTER COLUMN total TYPE numeric(12,2);
