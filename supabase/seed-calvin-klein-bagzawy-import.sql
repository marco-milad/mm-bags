-- Calvin Klein product import from bagzawy.com.
-- 2 consolidated products · 20 variants · 21 unique images served from cdn.shopify.com.
-- bagzawy lists each color as a separate product (11 source pages); we consolidate
-- into a 3-piece set (5 colors) and a single luggage (5 colors × 3 sizes).
-- Slug-prefixed with `ck-` to match the existing collection convention.
-- Idempotent: ON CONFLICT updates on slug + SKU.

-- ============ PRODUCTS ============
insert into public.products
  (slug, collection_id, name_ar, name_en, description_ar, description_en,
   base_price, sale_price, material_ar, material_en, images, is_active, sort_order)
values
  (
    'ck-3-piece-set',
    (select id from public.collections where slug = 'calvin-klein'),
    'كالفن كلاين — طقم سفر ٣ قطع',
    'Calvin Klein 3-Piece Travel Set',
    'طقم سفر فاخر من ٣ قطع — مقاس كبير ٢٨ بوصة (L) + وسط ٢٤ بوصة (M) + كابن ٢٠ بوصة (S). خامة سيليكون ٩٠٪ مع ألياف ١٠٪. عجلات دوّارة ٣٦٠ درجة لحركة سلسة على كل الأسطح. متوفر بـ ٥ ألوان.',
    'Premium 3-piece travel set — Large 28" + Medium 24" + Carry-on 20". 90% silicone / 10% fiber. 360° smooth spinner wheels for effortless movement on any surface. Available in 5 colors.',
    3499, null,
    '٩٠٪ سيليكون / ١٠٪ ألياف', '90% silicone / 10% fiber',
    array[
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_6509ad3b-b40c-42a5-bd6a-884085625ec9.png?v=1780380722',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_7d098d0f-02ff-49cd-a0c6-a38eaa1ec631.jpg?v=1780380722',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_014f8d43-ddf9-4304-8fe1-f7f544ec734b.png?v=1780348901',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_aa0c4ed1-0d26-4aef-a692-f8845955c8ac.png?v=1780349542',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_c43843a4-cfa8-4212-8eca-aba4b67c82da.jpg?v=1780380946',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_3be316ec-e976-4fcf-a709-5a1c97c6fb1a.png?v=1780380722',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_8d4729a0-28a2-45b3-bc15-c543065bb35a.jpg?v=1780380722'
    ],
    true,
    100
  ),
  (
    'ck-luggage',
    (select id from public.collections where slug = 'calvin-klein'),
    'كالفن كلاين — شنطة سفر',
    'Calvin Klein Luggage',
    'شنطة سفر بقطعة واحدة — مقاسات ٢٠ / ٢٤ / ٢٨ بوصة. خامة سيليكون ٩٠٪ مع ألياف ١٠٪ لمظهر أنيق وحماية للملابس. عجلات دوّارة ٣٦٠ درجة. متوفرة بـ ٥ ألوان: برتقالي، سماوي، بيج، أسود، كشمير.',
    'Single-piece luggage — 20" / 24" / 28" sizes. 90% silicone / 10% fiber for a sleek look and full content protection. 360° smooth spinner wheels. Available in 5 colors: Orange, Baby Blue, Beige, Black, Kashmir.',
    950, null,
    '٩٠٪ سيليكون / ١٠٪ ألياف', '90% silicone / 10% fiber',
    array[
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_d5c21888-854c-4237-be9f-39c5717a40c0.png?v=1780383067',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_181b04db-8854-43a9-b03d-a55a4fd7f881.png?v=1780383067',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_53fbd39d-dff6-49f8-91b8-0554bda76dab.png?v=1780383069',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_ff91f453-f513-4622-a154-2ae3f9f83e24.png?v=1780381192',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_0112b125-93ca-4531-a0a9-0503ef03810b.png?v=1780381192',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_7a3cf398-2a2d-4113-8f04-8fe858246c56.png?v=1780381192',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_d7e0769c-d0d9-4bfd-9075-6822166da299.png?v=1780381904',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_be5895cd-7cc6-40cc-b7d3-73e2422f0858.png?v=1780381904',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_3bbcda63-bf22-4b5a-a7a5-dd3d6d1b80f1.png?v=1780381904',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_48dd5b4b-7483-4ad4-ae50-036358e11f56.png?v=1780381192',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_779a2291-d3c5-425f-8e41-f8bb65f50f9e.png?v=1780381192',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_d597cb0c-db2d-48dd-bbdd-94018e646ce9.png?v=1780381192',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_6183d864-9640-430f-984a-04607191c285.png?v=1777810563',
      'https://cdn.shopify.com/s/files/1/0960/9782/9182/files/rn-image_picker_lib_temp_c1eafa11-f3bb-49eb-afed-3b34680c2e9d.png?v=1777810619'
    ],
    true,
    101
  )
on conflict (slug) do update set
  collection_id  = excluded.collection_id,
  name_ar        = excluded.name_ar,
  name_en        = excluded.name_en,
  description_ar = excluded.description_ar,
  description_en = excluded.description_en,
  base_price     = excluded.base_price,
  material_ar    = excluded.material_ar,
  material_en    = excluded.material_en,
  images         = excluded.images,
  is_active      = excluded.is_active,
  sort_order     = excluded.sort_order,
  updated_at     = now();

-- ============ VARIANTS ============
-- 5 set variants (Beige, Orange, Pink, Black, Baby Blue) — all `is_set=true`, flat 3499 EGP.
-- 15 luggage variants (5 colors × 3 sizes) — S 20" / M 24" / L 28" at 950 / 1499 / 1750 EGP.
-- Exception: Kashmir M 24" is 1500 EGP (preserved verbatim from source).
with target as (
  select
    (select id from public.products where slug = 'ck-3-piece-set') as set_id,
    (select id from public.products where slug = 'ck-luggage')     as lug_id
)
insert into public.product_variants
  (product_id, sku, color_en, color_ar, color_hex,
   size_inches, size_label_ar, is_set, price_override, stock_qty)
select
  case v.product when 'SET' then t.set_id else t.lug_id end,
  v.sku, v.color_en, v.color_ar, v.color_hex,
  v.size_inches, v.size_label_ar, v.is_set, v.price_override, v.stock_qty
from target t
cross join (values
  -- 3-Piece Set: 5 colors, no sizes
  ('SET','CK-SET-BEI','Beige',    'بيج',     '#d4b483', null::int, 'طقم ٣ قطع', true,  3499::numeric, 50),
  ('SET','CK-SET-ORG','Orange',   'برتقالي', '#e8743c', null,      'طقم ٣ قطع', true,  3499,          50),
  ('SET','CK-SET-PNK','Pink',     'وردي',    '#e8a4a4', null,      'طقم ٣ قطع', true,  3499,          50),
  ('SET','CK-SET-BLK','Black',    'أسود',    '#0d0d0d', null,      'طقم ٣ قطع', true,  3499,          50),
  ('SET','CK-SET-BBL','Baby Blue','سماوي',   '#aed8e6', null,      'طقم ٣ قطع', true,  3499,          50),
  -- Single Luggage: 5 colors × 3 sizes = 15
  ('LUG','CK-LUG-ORG-20','Orange',   'برتقالي', '#e8743c', 20, 'شنطة كابن ٢٠ بوصة', false, 950,  30),
  ('LUG','CK-LUG-ORG-24','Orange',   'برتقالي', '#e8743c', 24, 'شنطة وسط ٢٤ بوصة',  false, 1499, 30),
  ('LUG','CK-LUG-ORG-28','Orange',   'برتقالي', '#e8743c', 28, 'شنطة كبيرة ٢٨ بوصة', false, 1750, 30),
  ('LUG','CK-LUG-BBL-20','Baby Blue','سماوي',   '#aed8e6', 20, 'شنطة كابن ٢٠ بوصة', false, 950,  30),
  ('LUG','CK-LUG-BBL-24','Baby Blue','سماوي',   '#aed8e6', 24, 'شنطة وسط ٢٤ بوصة',  false, 1499, 30),
  ('LUG','CK-LUG-BBL-28','Baby Blue','سماوي',   '#aed8e6', 28, 'شنطة كبيرة ٢٨ بوصة', false, 1750, 30),
  ('LUG','CK-LUG-BEI-20','Beige',    'بيج',     '#d4b483', 20, 'شنطة كابن ٢٠ بوصة', false, 950,  30),
  ('LUG','CK-LUG-BEI-24','Beige',    'بيج',     '#d4b483', 24, 'شنطة وسط ٢٤ بوصة',  false, 1499, 30),
  ('LUG','CK-LUG-BEI-28','Beige',    'بيج',     '#d4b483', 28, 'شنطة كبيرة ٢٨ بوصة', false, 1750, 30),
  ('LUG','CK-LUG-BLK-20','Black',    'أسود',    '#0d0d0d', 20, 'شنطة كابن ٢٠ بوصة', false, 950,  30),
  ('LUG','CK-LUG-BLK-24','Black',    'أسود',    '#0d0d0d', 24, 'شنطة وسط ٢٤ بوصة',  false, 1499, 30),
  ('LUG','CK-LUG-BLK-28','Black',    'أسود',    '#0d0d0d', 28, 'شنطة كبيرة ٢٨ بوصة', false, 1750, 30),
  ('LUG','CK-LUG-KSH-20','Kashmir',  'كشمير',   '#b8a380', 20, 'شنطة كابن ٢٠ بوصة', false, 950,  30),
  ('LUG','CK-LUG-KSH-24','Kashmir',  'كشمير',   '#b8a380', 24, 'شنطة وسط ٢٤ بوصة',  false, 1500, 30),
  ('LUG','CK-LUG-KSH-28','Kashmir',  'كشمير',   '#b8a380', 28, 'شنطة كبيرة ٢٨ بوصة', false, 1750, 30)
) as v(product, sku, color_en, color_ar, color_hex, size_inches, size_label_ar, is_set, price_override, stock_qty)
on conflict (sku) do update set
  product_id     = excluded.product_id,
  color_en       = excluded.color_en,
  color_ar       = excluded.color_ar,
  color_hex      = excluded.color_hex,
  size_inches    = excluded.size_inches,
  size_label_ar  = excluded.size_label_ar,
  is_set         = excluded.is_set,
  price_override = excluded.price_override,
  stock_qty      = excluded.stock_qty;

-- ============ CLEANUP ============
-- Remove placeholder CK products from seed.sql now that real bagzawy data is in place.
delete from public.products
where slug in ('ck-signature-24', 'ck-carry-on-20', 'ck-weekend-bag');
