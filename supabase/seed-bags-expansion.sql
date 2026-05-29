-- Expansion seed for M.M Bags multi-category catalogue.
-- Run AFTER 0001_init.sql + 0002_collections_parent_slug.sql + seed.sql.
-- Adds: travel-bags parent + 5 new top-level categories + 13 new products + ~35 variants.
-- Idempotent on slug / SKU.

-- ============ HIERARCHY ============

insert into public.collections (slug, name_ar, name_en, description_ar, description_en, sort_order, parent_slug)
values ('travel-bags', 'شنط السفر', 'Travel Bags',
        'شنط سفر بكل المقاسات والمواد — من الكابين للأطقم الكاملة.',
        'Travel luggage in every size and material — cabin to full sets.',
        1, null)
on conflict (slug) do update set
  name_ar = excluded.name_ar, name_en = excluded.name_en,
  description_ar = excluded.description_ar, description_en = excluded.description_en,
  sort_order = excluded.sort_order, parent_slug = excluded.parent_slug;

insert into public.collections (slug, name_ar, name_en, description_ar, description_en, sort_order, parent_slug) values
  ('backpacks',   'شنط الظهر',     'Backpacks',    'شنط ظهر للشغل والجامعة والرحلات اليومية.', 'Backpacks for work, university, and everyday adventures.', 4, null),
  ('school-bags', 'شنط المدارس',   'School Bags',  'شنط مدارس بكل المراحل — متينة، مريحة، وبألوان تعجب أولادك.', 'School bags for every grade — durable, comfortable, kid-approved colors.', 5, null),
  ('ladies-bags', 'شنط الحريم',    'Ladies Bags',  'شنط نسائية بتصاميم مختلفة — توت، كروسبودي، وأكتر.', 'Women''s bags in diverse styles — totes, crossbody, and more.', 6, null),
  ('handbags',    'شنط اليد',      'Handbags',     'شنط يد كلاسيك وعصرية لكل المناسبات.', 'Classic and modern handbags for every occasion.', 7, null),
  ('laptop-bags', 'شنط لاب توب',   'Laptop Bags',  'حماية كاملة لجهازك — مقاسات 13" / 15" / 17".', 'Full laptop protection — sizes 13" / 15" / 17".', 8, null)
on conflict (slug) do update set
  name_ar = excluded.name_ar, name_en = excluded.name_en,
  description_ar = excluded.description_ar, description_en = excluded.description_en,
  sort_order = excluded.sort_order, parent_slug = excluded.parent_slug;

update public.collections set parent_slug = 'travel-bags'
where slug in ('milano-series', 'calvin-klein', 'travel-accessories');

-- ============ PRODUCTS + VARIANTS ============
-- (Full block — see Supabase audit log for the executed seed batch.
-- Reproduced here for reference / re-running on a fresh DB.)

-- BACKPACKS (3)
with c as (select id from public.collections where slug = 'backpacks'),
     p as (
       insert into public.products (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, sale_price, images, material_ar, material_en, weight_kg, sort_order)
       select 'pro-business-backpack', c.id, 'شنطة ظهر برو للأعمال', 'Pro Business Backpack',
              'شنطة ظهر أنيقة للشغل — جيب لاب توب 15"، تنظيم داخلي، وقماش مقاوم للماء.',
              'Sleek work backpack — 15" laptop sleeve, internal organization, water-resistant fabric.',
              850, 750,
              array['https://picsum.photos/seed/mm-bp-pro-a/800/800', 'https://picsum.photos/seed/mm-bp-pro-b/800/800'],
              'بوليستر مقاوم للماء', 'Water-resistant polyester', 1.1, 40
       from c on conflict (slug) do update set sale_price = excluded.sale_price returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.sku, v.stock from p
cross join (values ('أسود','Black','#0d0d0d','BP-PRO-BLK',10), ('كحلي','Navy','#1b2b4b','BP-PRO-NVY',3)) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

with c as (select id from public.collections where slug = 'backpacks'),
     p as (
       insert into public.products (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, images, material_ar, material_en, weight_kg, sort_order)
       select 'casual-daypack', c.id, 'شنطة ظهر يومية', 'Casual Daypack',
              'شنطة ظهر خفيفة لاستخدامك اليومي — مساحة كافية للابتوب والكتب.',
              'A light everyday daypack — fits a laptop, books, and the essentials.',
              480,
              array['https://picsum.photos/seed/mm-bp-day-a/800/800', 'https://picsum.photos/seed/mm-bp-day-b/800/800'],
              'نايلون متين', 'Heavy-duty nylon', 0.7, 41
       from c on conflict (slug) do update set base_price = excluded.base_price returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.sku, v.stock from p
cross join (values ('رمادي','Grey','#7a7a7a','BP-DAY-GRY',15), ('زيتي','Olive','#556b2f','BP-DAY-OLV',7), ('أسود','Black','#0d0d0d','BP-DAY-BLK',0)) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

with c as (select id from public.collections where slug = 'backpacks'),
     p as (
       insert into public.products (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, images, material_ar, material_en, weight_kg, sort_order)
       select 'mini-backpack', c.id, 'شنطة ظهر صغيرة', 'Mini Backpack',
              'شنطة ظهر صغيرة أنيقة — مثالية للخروجات اليومية والسفر القصير.',
              'Stylish mini backpack — perfect for daily outings and short trips.',
              320,
              array['https://picsum.photos/seed/mm-bp-mini-a/800/800', 'https://picsum.photos/seed/mm-bp-mini-b/800/800'],
              'جلد صناعي', 'Vegan leather', 0.5, 42
       from c on conflict (slug) do update set base_price = excluded.base_price returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.sku, v.stock from p
cross join (values ('وردي','Pink','#e8a4a4','BP-MINI-PNK',12), ('بيج','Beige','#d4b483','BP-MINI-BGE',8), ('بني','Brown','#6b4423','BP-MINI-BRN',2)) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

-- SCHOOL BAGS (3)
with c as (select id from public.collections where slug = 'school-bags'),
     p as (
       insert into public.products (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, images, material_ar, material_en, sort_order)
       select 'school-bag-primary', c.id, 'شنطة المرحلة الابتدائية', 'Primary School Bag',
              'شنطة مدرسية متينة بألوان مرحة لطلاب الابتدائي — حزام مبطن وعدة جيوب.',
              'A sturdy primary-school bag in cheerful colors — padded straps and multiple pockets.',
              350,
              array['https://picsum.photos/seed/mm-sb-prim-a/800/800', 'https://picsum.photos/seed/mm-sb-prim-b/800/800'],
              'بوليستر متين', 'Heavy-duty polyester', 50
       from c on conflict (slug) do update set base_price = excluded.base_price returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.sku, v.stock from p
cross join (values ('أحمر','Red','#c0392b','SB-PRIM-RED',14), ('أزرق','Blue','#2980b9','SB-PRIM-BLU',11), ('وردي','Pink','#e8a4a4','SB-PRIM-PNK',4)) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

with c as (select id from public.collections where slug = 'school-bags'),
     p as (
       insert into public.products (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, images, material_ar, material_en, sort_order)
       select 'school-bag-prep', c.id, 'شنطة المرحلة الإعدادية', 'Middle School Bag',
              'شنطة عملية لطلاب الإعدادي — مقاسات وألوان عصرية، جيوب جانبية للزجاجات.',
              'A practical middle-school bag — modern sizing and colors, side pockets for bottles.',
              480,
              array['https://picsum.photos/seed/mm-sb-prep-a/800/800', 'https://picsum.photos/seed/mm-sb-prep-b/800/800'],
              'بوليستر متين', 'Heavy-duty polyester', 51
       from c on conflict (slug) do update set base_price = excluded.base_price returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.sku, v.stock from p
cross join (values ('أسود','Black','#0d0d0d','SB-PREP-BLK',16), ('كحلي','Navy','#1b2b4b','SB-PREP-NVY',9), ('بنفسجي','Purple','#7e3a93','SB-PREP-PRP',3)) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

with c as (select id from public.collections where slug = 'school-bags'),
     p as (
       insert into public.products (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, sale_price, images, material_ar, material_en, sort_order)
       select 'school-bag-university', c.id, 'شنطة الجامعة', 'University Bag',
              'شنطة جامعية أنيقة بحجم اللاب توب — للذكور والإناث، تصميم محايد.',
              'A sleek university bag with a laptop sleeve — unisex, neutral design.',
              720, 620,
              array['https://picsum.photos/seed/mm-sb-uni-a/800/800', 'https://picsum.photos/seed/mm-sb-uni-b/800/800'],
              'قماش مقاوم للماء', 'Water-resistant canvas', 52
       from c on conflict (slug) do update set sale_price = excluded.sale_price returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.sku, v.stock from p
cross join (values ('أسود','Black','#0d0d0d','SB-UNI-BLK',13), ('رمادي','Grey','#7a7a7a','SB-UNI-GRY',6)) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

-- LADIES BAGS (2)
with c as (select id from public.collections where slug = 'ladies-bags'),
     p as (
       insert into public.products (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, images, material_ar, material_en, sort_order)
       select 'tote-bag-classic', c.id, 'شنطة توت كلاسيك', 'Classic Tote Bag',
              'شنطة توت واسعة بتصميم كلاسيك — مناسبة للشغل والخروج.',
              'A spacious classic tote — perfect for work and outings.',
              950,
              array['https://picsum.photos/seed/mm-lb-tote-a/800/800', 'https://picsum.photos/seed/mm-lb-tote-b/800/800'],
              'جلد صناعي فاخر', 'Premium vegan leather', 60
       from c on conflict (slug) do update set base_price = excluded.base_price returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.sku, v.stock from p
cross join (values ('بيج','Beige','#d4b483','LB-TOTE-BGE',9), ('أسود','Black','#0d0d0d','LB-TOTE-BLK',11), ('بني','Brown','#6b4423','LB-TOTE-BRN',4)) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

with c as (select id from public.collections where slug = 'ladies-bags'),
     p as (
       insert into public.products (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, images, material_ar, material_en, sort_order)
       select 'crossbody-bag', c.id, 'شنطة كروسبودي', 'Crossbody Bag',
              'شنطة كروسبودي صغيرة وعملية — حزام قابل للتعديل، جيوب متعددة.',
              'A practical crossbody bag — adjustable strap, multiple pockets.',
              650,
              array['https://picsum.photos/seed/mm-lb-cross-a/800/800', 'https://picsum.photos/seed/mm-lb-cross-b/800/800'],
              'جلد صناعي', 'Vegan leather', 61
       from c on conflict (slug) do update set base_price = excluded.base_price returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.sku, v.stock from p
cross join (values ('أحمر','Red','#c0392b','LB-CROSS-RED',7), ('أسود','Black','#0d0d0d','LB-CROSS-BLK',13), ('تان','Tan','#a87c4f','LB-CROSS-TAN',2)) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

-- HANDBAGS (2)
with c as (select id from public.collections where slug = 'handbags'),
     p as (
       insert into public.products (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, sale_price, images, material_ar, material_en, sort_order)
       select 'handbag-classic', c.id, 'شنطة يد كلاسيك', 'Classic Handbag',
              'شنطة يد بتصميم كلاسيك راقي — مقابض جلدية وتفاصيل معدنية ذهبية.',
              'A refined classic handbag — leather handles and gold metal hardware.',
              1200, 980,
              array['https://picsum.photos/seed/mm-hb-classic-a/800/800', 'https://picsum.photos/seed/mm-hb-classic-b/800/800'],
              'جلد صناعي فاخر', 'Premium vegan leather', 70
       from c on conflict (slug) do update set sale_price = excluded.sale_price returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.sku, v.stock from p
cross join (values ('أسود','Black','#0d0d0d','HB-CLS-BLK',12), ('بني','Brown','#6b4423','HB-CLS-BRN',5)) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

with c as (select id from public.collections where slug = 'handbags'),
     p as (
       insert into public.products (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, images, material_ar, material_en, sort_order)
       select 'evening-clutch', c.id, 'كلتش سهرة', 'Evening Clutch',
              'كلتش سهرة أنيق بتصميم بسيط وراقي — مثالي للمناسبات.',
              'An elegant evening clutch — simple, refined, perfect for occasions.',
              420,
              array['https://picsum.photos/seed/mm-hb-clutch-a/800/800', 'https://picsum.photos/seed/mm-hb-clutch-b/800/800'],
              'ساتان مع تطريز', 'Satin with embellishment', 71
       from c on conflict (slug) do update set base_price = excluded.base_price returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.sku, v.stock from p
cross join (values ('ذهبي','Gold','#b8975a','HB-CLT-GLD',8), ('أسود','Black','#0d0d0d','HB-CLT-BLK',10), ('فضي','Silver','#c0c0c0','HB-CLT-SLV',1)) as v(color_ar, color_en, color_hex, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

-- LAPTOP BAGS (3, with size variants)
with c as (select id from public.collections where slug = 'laptop-bags'),
     p as (
       insert into public.products (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, images, material_ar, material_en, weight_kg, sort_order)
       select 'laptop-briefcase', c.id, 'شنطة لاب توب بريفكيس', 'Laptop Briefcase',
              'شنطة لاب توب احترافية بتصميم بريفكيس — تتسع لجهاز حتى 17 بوصة + الإكسسوارات.',
              'A professional briefcase-style laptop bag — fits up to 17" plus accessories.',
              1100,
              array['https://picsum.photos/seed/mm-lap-brief-a/800/800', 'https://picsum.photos/seed/mm-lap-brief-b/800/800'],
              'جلد صناعي', 'Vegan leather', 1.4, 80
       from c on conflict (slug) do update set base_price = excluded.base_price returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, size_inches, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.size_inches, v.sku, v.stock from p
cross join (values ('أسود','Black','#0d0d0d',13,'LAP-BRF-13-BLK',6), ('أسود','Black','#0d0d0d',15,'LAP-BRF-15-BLK',11), ('أسود','Black','#0d0d0d',17,'LAP-BRF-17-BLK',3)) as v(color_ar, color_en, color_hex, size_inches, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

with c as (select id from public.collections where slug = 'laptop-bags'),
     p as (
       insert into public.products (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, images, material_ar, material_en, weight_kg, sort_order)
       select 'laptop-sleeve', c.id, 'كفر لاب توب', 'Laptop Sleeve',
              'كفر بسيط وخفيف لحماية جهازك — بطانة داخلية ناعمة.',
              'A simple lightweight sleeve to protect your device — soft interior lining.',
              380,
              array['https://picsum.photos/seed/mm-lap-sleeve-a/800/800', 'https://picsum.photos/seed/mm-lap-sleeve-b/800/800'],
              'نيوبرين مبطن', 'Padded neoprene', 0.3, 81
       from c on conflict (slug) do update set base_price = excluded.base_price returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, size_inches, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.size_inches, v.sku, v.stock from p
cross join (values ('رمادي','Grey','#7a7a7a',13,'LAP-SLV-13-GRY',18), ('رمادي','Grey','#7a7a7a',15,'LAP-SLV-15-GRY',14)) as v(color_ar, color_en, color_hex, size_inches, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;

with c as (select id from public.collections where slug = 'laptop-bags'),
     p as (
       insert into public.products (slug, collection_id, name_ar, name_en, description_ar, description_en, base_price, sale_price, images, material_ar, material_en, weight_kg, sort_order)
       select 'laptop-backpack', c.id, 'شنطة ظهر لاب توب', 'Laptop Backpack',
              'شنطة ظهر مخصصة للاب توب — جيب مبطن مقاوم للصدمات + جيوب تنظيم.',
              'A laptop-focused backpack — padded shock-resistant compartment plus organization pockets.',
              820, 720,
              array['https://picsum.photos/seed/mm-lap-bp-a/800/800', 'https://picsum.photos/seed/mm-lap-bp-b/800/800'],
              'بوليستر مقاوم للماء', 'Water-resistant polyester', 1.0, 82
       from c on conflict (slug) do update set sale_price = excluded.sale_price returning id
     )
insert into public.product_variants (product_id, color_ar, color_en, color_hex, size_inches, sku, stock_qty)
select p.id, v.color_ar, v.color_en, v.color_hex, v.size_inches, v.sku, v.stock from p
cross join (values ('أسود','Black','#0d0d0d',15,'LAP-BP-15-BLK',10), ('أسود','Black','#0d0d0d',17,'LAP-BP-17-BLK',4), ('كحلي','Navy','#1b2b4b',15,'LAP-BP-15-NVY',8)) as v(color_ar, color_en, color_hex, size_inches, sku, stock)
on conflict (sku) do update set stock_qty = excluded.stock_qty;
