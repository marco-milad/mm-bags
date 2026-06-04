-- M.M Bags demo seed
-- Paste into Supabase SQL editor and Run after 0001_init.sql.
-- Idempotent: safe to re-run; uses ON CONFLICT on slugs.

-- =====================
-- COLLECTIONS
-- =====================

insert into public.collections (slug, name_ar, name_en, description_ar, description_en, sort_order)
values
  ('milano-series', 'تشكيلة Milano', 'Milano Series',
   'تشكيلة Milano: شنط سفر بتصميم إيطالي وجودة عالية، مناسبة لكل أنواع الرحلات.',
   'The Milano collection — Italian-inspired luggage built for every kind of trip.', 1),
  ('calvin-klein', 'كالفن كلاين', 'Calvin Klein',
   'تعاون حصري مع Calvin Klein — مظهر أنيق وجودة معتمدة.',
   'An exclusive collaboration with Calvin Klein — refined look, certified quality.', 2),
  ('travel-accessories', 'إكسسوارات السفر', 'Travel Accessories',
   'كل اللي محتاجه في رحلتك — منظمات، أكياس، أقفال، وأكتر.',
   'Everything you need on a trip — organizers, pouches, locks and more.', 3)
on conflict (slug) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  description_ar = excluded.description_ar,
  description_en = excluded.description_en,
  sort_order = excluded.sort_order;

-- =====================
-- PRODUCTS + VARIANTS
-- Helper CTE pattern: insert product, then insert variants referencing it by slug.
-- =====================

-- Milano cabin 20"
with c as (select id from public.collections where slug = 'milano-series'),
     p as (
       insert into public.products
         (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, sale_price, images, material_ar, material_en, weight_kg, sort_order)
       select 'milano-cabin-20', c.id,
              'Milano Cabin شنطة كابين 20"',
              'Milano Cabin 20"',
              'شنطة كابين خفيفة من تشكيلة Milano — قياس 20 بوصة، مناسبة للرحلات القصيرة وحجم المقصورة.',
              'A lightweight cabin from the Milano series — 20 inch, perfect for short trips and overhead bins.',
              1800, 1500,
              array['https://images.unsplash.com/photo-1581553673739-c4906b5d0de8?w=800&q=80'],
              'بوليكربونات صلب', 'Hard polycarbonate', 2.8, 10
       from c
       on conflict (slug) do update set
         collection_id = excluded.collection_id,
         name_ar = excluded.name_ar,
         name_en = excluded.name_en,
         description_ar = excluded.description_ar,
         description_en = excluded.description_en,
         base_price = excluded.base_price,
         sale_price = excluded.sale_price,
         images = excluded.images,
         material_ar = excluded.material_ar,
         material_en = excluded.material_en,
         weight_kg = excluded.weight_kg,
         sort_order = excluded.sort_order
       returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, size_inches, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, 20, v.sku, v.stock
from p
cross join (values
  ('أسود', 'Black', '#0d0d0d', 'MIL-CAB-20-BLK', 12),
  ('كحلي', 'Navy',  '#1b2b4b', 'MIL-CAB-20-NVY', 4),
  ('فضي', 'Silver', '#c0c0c0', 'MIL-CAB-20-SLV', 0)
) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

-- Milano medium 24"
with c as (select id from public.collections where slug = 'milano-series'),
     p as (
       insert into public.products
         (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, images, material_ar, material_en, weight_kg, sort_order)
       select 'milano-medium-24', c.id,
              'Milano Medium شنطة وسط 24"',
              'Milano Medium 24"',
              'الحجم الوسط من Milano — 24 بوصة، توازن مثالي بين المساحة والوزن لرحلة أسبوع.',
              'Milano in 24" — the sweet spot between space and weight for a week-long trip.',
              2400,
              array['https://images.unsplash.com/photo-1581553673739-c4906b5d0de8?w=800&q=80'],
              'بوليكربونات صلب', 'Hard polycarbonate', 3.6, 11
       from c
       on conflict (slug) do update set base_price = excluded.base_price, sale_price = null
       returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, size_inches, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, 24, v.sku, v.stock
from p
cross join (values
  ('أسود', 'Black', '#0d0d0d', 'MIL-MED-24-BLK', 8),
  ('كحلي', 'Navy',  '#1b2b4b', 'MIL-MED-24-NVY', 5),
  ('ذهبي', 'Brass', '#b8975a', 'MIL-MED-24-BRS', 2)
) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

-- Milano 3-piece set
with c as (select id from public.collections where slug = 'milano-series'),
     p as (
       insert into public.products
         (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, sale_price, images, material_ar, material_en, weight_kg, sort_order, tags)
       select 'milano-set-3pc', c.id,
              'Milano طقم 3 قطع',
              'Milano 3-Piece Set',
              'طقم كامل من Milano: كابين 20" + وسط 24" + كبير 28". الحل الأمثل للعائلات والرحلات الطويلة.',
              'A full Milano set: 20" cabin + 24" medium + 28" large. The right answer for families and long trips.',
              3900, 3500,
              array['https://images.unsplash.com/photo-1581553673739-c4906b5d0de8?w=800&q=80'],
              'بوليكربونات صلب', 'Hard polycarbonate', 10.2, 12,
              array['set','family','featured']
       from c
       on conflict (slug) do update set sale_price = excluded.sale_price
       returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, is_set, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, true, v.sku, v.stock
from p
cross join (values
  ('أسود', 'Black', '#0d0d0d', 'MIL-SET-3-BLK', 6),
  ('كحلي', 'Navy',  '#1b2b4b', 'MIL-SET-3-NVY', 3)
) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

-- CK Signature 24"
with c as (select id from public.collections where slug = 'calvin-klein'),
     p as (
       insert into public.products
         (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, images, material_ar, material_en, weight_kg, sort_order)
       select 'ck-signature-24', c.id,
              'Calvin Klein Signature 24"',
              'Calvin Klein Signature 24"',
              'تصميم Calvin Klein الأنيق بحجم 24 بوصة — يجمع بين المظهر والجودة.',
              'The signature Calvin Klein silhouette at 24" — style meets durability.',
              2800,
              array['https://images.unsplash.com/photo-1581553673739-c4906b5d0de8?w=800&q=80'],
              'ABS مع تشطيب نسيج', 'ABS with textured finish', 3.9, 20
       from c
       on conflict (slug) do update set base_price = excluded.base_price
       returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, size_inches, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, 24, v.sku, v.stock
from p
cross join (values
  ('أسود', 'Black', '#0d0d0d', 'CK-SIG-24-BLK', 9),
  ('بيج', 'Beige', '#d4b483', 'CK-SIG-24-BGE', 2)
) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

-- CK Carry-On 20"
with c as (select id from public.collections where slug = 'calvin-klein'),
     p as (
       insert into public.products
         (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, images, material_ar, material_en, weight_kg, sort_order)
       select 'ck-carry-on-20', c.id,
              'Calvin Klein Carry-On 20"',
              'Calvin Klein Carry-On 20"',
              'حجم الكابين من Calvin Klein — 20 بوصة، خفيف وعملي.',
              'Calvin Klein in carry-on size — lightweight and practical.',
              2200,
              array['https://images.unsplash.com/photo-1581553673739-c4906b5d0de8?w=800&q=80'],
              'ABS مع تشطيب نسيج', 'ABS with textured finish', 2.9, 21
       from c
       on conflict (slug) do update set base_price = excluded.base_price
       returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, size_inches, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, 20, v.sku, v.stock
from p
cross join (values
  ('أسود', 'Black', '#0d0d0d', 'CK-CO-20-BLK', 11),
  ('بيج', 'Beige', '#d4b483', 'CK-CO-20-BGE', 7)
) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

-- CK Weekend Bag
with c as (select id from public.collections where slug = 'calvin-klein'),
     p as (
       insert into public.products
         (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, sale_price, images, material_ar, material_en, weight_kg, sort_order)
       select 'ck-weekend-bag', c.id,
              'Calvin Klein شنطة ويك إند',
              'Calvin Klein Weekend Bag',
              'شنطة يد لرحلات الويك إند — قماش متين مع تفاصيل CK.',
              'A weekend duffel — durable fabric with classic CK details.',
              1400, 1100,
              array['https://images.unsplash.com/photo-1581553673739-c4906b5d0de8?w=800&q=80'],
              'بوليستر متين', 'Heavy-duty polyester', 1.2, 22
       from c
       on conflict (slug) do update set sale_price = excluded.sale_price
       returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.sku, v.stock
from p
cross join (values
  ('أسود', 'Black', '#0d0d0d', 'CK-WKND-BLK', 14),
  ('كحلي', 'Navy',  '#1b2b4b', 'CK-WKND-NVY', 10)
) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

-- Travel Cube Set
with c as (select id from public.collections where slug = 'travel-accessories'),
     p as (
       insert into public.products
         (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, images, material_ar, material_en, sort_order)
       select 'packing-cubes-set', c.id,
              'منظمات سفر طقم 6 قطع',
              'Packing Cubes — 6 Piece Set',
              'منظمات سفر بمقاسات متنوعة لترتيب شنطتك بسهولة.',
              'Packing cubes in mixed sizes to keep your luggage organized.',
              600,
              array['https://images.unsplash.com/photo-1581553673739-c4906b5d0de8?w=800&q=80'],
              'نايلون خفيف', 'Lightweight nylon', 30
       from c
       on conflict (slug) do update set base_price = excluded.base_price
       returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.sku, v.stock
from p
cross join (values
  ('رمادي', 'Grey',  '#7a7a7a', 'PKC-6-GRY', 25),
  ('كحلي', 'Navy',  '#1b2b4b', 'PKC-6-NVY', 18)
) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

-- Toiletry bag
with c as (select id from public.collections where slug = 'travel-accessories'),
     p as (
       insert into public.products
         (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, sale_price, images, material_ar, material_en, sort_order)
       select 'toiletry-bag', c.id,
              'شنطة أدوات الحمام',
              'Toiletry Bag',
              'شنطة مقاومة للماء بداخل مقسم لأدوات السفر الشخصية.',
              'A water-resistant toiletry bag with compartments for travel essentials.',
              350, 280,
              array['https://images.unsplash.com/photo-1581553673739-c4906b5d0de8?w=800&q=80'],
              'بوليستر مقاوم للماء', 'Water-resistant polyester', 31
       from c
       on conflict (slug) do update set sale_price = excluded.sale_price
       returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.sku, v.stock
from p
cross join (values
  ('أسود', 'Black', '#0d0d0d', 'TOI-BLK', 30),
  ('ذهبي', 'Brass', '#b8975a', 'TOI-BRS', 4)
) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

-- TSA Lock
with c as (select id from public.collections where slug = 'travel-accessories'),
     p as (
       insert into public.products
         (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, images, material_ar, material_en, sort_order)
       select 'tsa-lock', c.id,
              'قفل TSA معتمد',
              'TSA-Approved Lock',
              'قفل أمان معتمد دولياً — يحمي شنطتك أثناء السفر.',
              'An internationally certified safety lock for your luggage.',
              180,
              array['https://images.unsplash.com/photo-1581553673739-c4906b5d0de8?w=800&q=80'],
              'سبيكة معدنية', 'Metal alloy', 32
       from c
       on conflict (slug) do update set base_price = excluded.base_price
       returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.sku, v.stock
from p
cross join (values
  ('فضي', 'Silver', '#c0c0c0', 'TSA-SLV', 40),
  ('أسود', 'Black', '#0d0d0d', 'TSA-BLK', 35)
) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;
