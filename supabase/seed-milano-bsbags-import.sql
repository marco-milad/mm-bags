-- Milano product import from bsbags-eg.com (Marco's existing Shopify store).
-- 5 products · 123 variants · ~50 images served from cdn.shopify.com.
-- Slug-prefixed with `bs-` to avoid colliding with the placeholder Milano
-- products seeded in seed.sql (milano-cabin-20, milano-medium-24, milano-set-3pc).
-- Idempotent: ON CONFLICT updates on slug + SKU.

-- ============ PRODUCTS ============
insert into public.products
  (slug, collection_id, name_ar, name_en, description_ar, description_en,
   base_price, images, material_ar, material_en, weight_kg, sort_order)
values
  ('bs-milano-classic',
   (select id from public.collections where slug = 'milano-series'),
   'ميلانو كلاسيك',
   'Milano Classic',
   'طقم سفر ميلانو الكلاسيك — سيليكون مقاوم للكسر، عجلات مزدوجة ٣٦٠ درجة، قفل رقمي، سوستة توسيع. المقاسات ٢٠ و ٢٤ و ٢٨.',
   'Milano Classic travel set — impact-resistant silicone, dual 360° wheels, digital combination lock, expandable zipper. Sizes 20, 24, and 28.',
   3149,
   array[
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-8878.jpg?v=1748279440',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-4827.jpg?v=1748279440',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1216.jpg?v=1748279440',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1213.jpg?v=1748279440',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-4830.jpg?v=1748279440',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1230.jpg?v=1749121757',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1226_2.jpg?v=1749121757',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-4049.jpg?v=1773151815',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-5174.jpg?v=1775408206',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-5168.jpg?v=1775408374',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-6638.jpg?v=1778004586'
   ],
   'سيليكون مقاوم للكسر', 'Impact-resistant silicone', 11.0, 100),

  ('bs-milano-308',
   (select id from public.collections where slug = 'milano-series'),
   'ميلانو ٣٠٨',
   'Milano 308',
   'طقم سفر ميلانو ٣٠٨ — خامة سيليكون مستوردة مقاومة للكسر، عجلات مزدوجة ٣٦٠ درجة، قفل رقمي، سوستة توسيع. المقاسات ٢٢ و ٢٦ و ٣٠.',
   'Milano 308 travel set — imported impact-resistant silicone, dual 360° wheels, digital combination lock, expandable zipper. Sizes 22, 26, and 30.',
   899,
   array[
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-0330.jpg?v=1746966950',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-0336.jpg?v=1746966950',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-0335.jpg?v=1746966950',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-0343.jpg?v=1746966950',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/08_gold.jpg?v=1747051961',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/08_rose_gold.jpg?v=1747051966',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-0810_4bffb359-f527-4f70-b06e-786dfdfa06a6.jpg?v=1765469969',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-0809_3208cd3e-55d7-4f07-8806-2a0ff833a730.jpg?v=1765469969',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-0811_d84b1662-f45c-418c-9e82-37bb0d548be9.jpg?v=1765469969',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1629.jpg?v=1767983984',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1630.jpg?v=1767983984'
   ],
   'سيليكون مستورد', 'Imported silicone', 4.5, 101),

  ('bs-milano-189',
   (select id from public.collections where slug = 'milano-series'),
   'ميلانو ١٨٩',
   'Milano 189',
   'طقم سفر ميلانو ١٨٩ — خامة فايبر عالية الجودة، عجلات مزدوجة ٣٦٠ درجة، قفل رقمي، سوستة توسيع. المقاسات ٢٠ و ٢٤ و ٢٨.',
   'Milano 189 travel set — high-quality fibre material, dual 360° wheels, digital combination lock, expandable zipper. Sizes 20, 24, and 28.',
   2899,
   array[
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1550.jpg?v=1767783302',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1548.jpg?v=1767783302',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1546.jpg?v=1767783392',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1547.jpg?v=1767783392',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1551.jpg?v=1767783393',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1539.jpg?v=1767783514',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1555.jpg?v=1767783560',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1542.jpg?v=1767783560',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1554.jpg?v=1767783302',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1553.jpg?v=1767783302',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1540.jpg?v=1767783517',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-1541.jpg?v=1767783513'
   ],
   'فايبر عالي الجودة', 'High-quality fibre', 8.0, 102),

  ('bs-milano-302',
   (select id from public.collections where slug = 'milano-series'),
   'ميلانو ٣٠٢',
   'Milano 302',
   'طقم سفر ميلانو ٣٠٢ — سيليكون مستورد مقاوم للصدمات، عجلات مزدوجة ٣٦٠ درجة، قفل رقمي، سوستة توسيع. المقاسات ٢٢ و ٢٦ و ٣٠.',
   'Milano 302 travel set — imported impact-resistant silicone, dual 360° wheels, digital combination lock, expandable zipper. Sizes 22, 26, and 30.',
   3299,
   array[
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-0344_23f77ed2-4406-46ca-adad-ef8e4b9fff3e.jpg?v=1763982978',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-0339_053aaa21-1e42-44e1-b829-ba3c2161d137.jpg?v=1763982978',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-0341.jpg?v=1763982852',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-0343_52363ba0-f2d1-4f20-bd03-18ca216b55f2.jpg?v=1763982709',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-0340.jpg?v=1763982852',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-0168.jpg?v=1763982709',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-0342.jpg?v=1763982852'
   ],
   'سيليكون مستورد', 'Imported silicone', 8.0, 103),

  ('bs-milano-309',
   (select id from public.collections where slug = 'milano-series'),
   'ميلانو ٣٠٩',
   'Milano 309',
   'طقم سفر ميلانو ٣٠٩ — سيليكون مستورد، عجلات مزدوجة ٣٦٠ درجة، قفل رقمي، سوستة توسيع. المقاسات ٢٢ و ٢٦ و ٣٠.',
   'Milano 309 travel set — imported silicone, dual 360° wheels, digital combination lock, expandable zipper. Sizes 22, 26, and 30.',
   899,
   array[
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/na_09_840ab183-a6f5-49a3-a8e7-be6fe3c09e71.jpg?v=1747655568',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/bl_09.jpg?v=1747656595',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/br_09.jpg?v=1747656598',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/roo.jpg?v=1747656666',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-5169_2.jpg?v=1775427643',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/pu_09.jpg?v=1775427643',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/go_09.jpg?v=1775427643',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/si_09.jpg?v=1775427643',
     'https://cdn.shopify.com/s/files/1/0709/7116/2789/files/IMG-5171_2.jpg?v=1775427718'
   ],
   'سيليكون مستورد', 'Imported silicone', 4.5, 104)
on conflict (slug) do update set
  name_ar = excluded.name_ar, name_en = excluded.name_en,
  description_ar = excluded.description_ar, description_en = excluded.description_en,
  base_price = excluded.base_price, images = excluded.images,
  material_ar = excluded.material_ar, material_en = excluded.material_en,
  weight_kg = excluded.weight_kg, sort_order = excluded.sort_order,
  collection_id = excluded.collection_id;

-- ============ VARIANTS (123 total) ============
-- Color → AR/hex mapping baked into the CASE expressions so the VALUES list
-- only carries data-shape per-variant.

insert into public.product_variants
  (product_id, color_ar, color_en, color_hex, size_inches, size_label_ar, is_set, sku, stock_qty, price_override)
select
  p.id,
  case v.color_en
    when 'Petroluem' then 'بترولي'
    when 'Navy'      then 'كحلي'
    when 'Black'     then 'أسود'
    when 'Silver'    then 'فضي'
    when 'Pink'      then 'وردي'
    when 'Beige'     then 'بيج'
    when 'Red'       then 'أحمر'
    when 'Rose gold' then 'روز جولد'
    when 'Purple'    then 'بنفسجي'
    when 'Green'     then 'أخضر زيتي'
    when 'Gray'      then 'رمادي'
    when 'Baby blue' then 'سماوي'
    when 'Gold'      then 'ذهبي'
  end,
  v.color_en,
  case v.color_en
    when 'Petroluem' then '#2c5e6a'
    when 'Navy'      then '#1b2b4b'
    when 'Black'     then '#0d0d0d'
    when 'Silver'    then '#c0c0c0'
    when 'Pink'      then '#e8a4a4'
    when 'Beige'     then '#d4b483'
    when 'Red'       then '#c0392b'
    when 'Rose gold' then '#b76e79'
    when 'Purple'    then '#7e3a93'
    when 'Green'     then '#556b2f'
    when 'Gray'      then '#7a7a7a'
    when 'Baby blue' then '#89cff0'
    when 'Gold'      then '#c9ac74'
  end,
  v.size_inches,
  v.size_label_ar,
  v.is_set,
  v.sku,
  v.stock,
  v.price
from
  (values
    -- bs-milano-classic (22 variants)
    ('bs-milano-classic', 'Petroluem', null::int, 'طقم ٥ قطع', true,  'BS-MCLA-001', 0,  4375::numeric),
    ('bs-milano-classic', 'Navy',      null,      'طقم ٥ قطع', true,  'BS-MCLA-002', 8,  4049),
    ('bs-milano-classic', 'Black',     null,      'طقم ٥ قطع', true,  'BS-MCLA-003', 8,  4200),
    ('bs-milano-classic', 'Silver',    null,      'طقم ٥ قطع', true,  'BS-MCLA-004', 8,  4175),
    ('bs-milano-classic', 'Pink',      null,      'طقم ٥ قطع', true,  'BS-MCLA-005', 8,  4225),
    ('bs-milano-classic', 'Petroluem', null,      'طقم ٣ قطع', true,  'BS-MCLA-006', 8,  3500),
    ('bs-milano-classic', 'Navy',      null,      'طقم ٣ قطع', true,  'BS-MCLA-007', 8,  3149),
    ('bs-milano-classic', 'Black',     null,      'طقم ٣ قطع', true,  'BS-MCLA-008', 8,  3149),
    ('bs-milano-classic', 'Silver',    null,      'طقم ٣ قطع', true,  'BS-MCLA-009', 8,  3149),
    ('bs-milano-classic', 'Pink',      null,      'طقم ٣ قطع', true,  'BS-MCLA-010', 8,  3149),
    ('bs-milano-classic', 'Beige',     null,      'طقم ٥ قطع', true,  'BS-MCLA-011', 8,  4150),
    ('bs-milano-classic', 'Beige',     null,      'طقم ٣ قطع', true,  'BS-MCLA-012', 8,  3149),
    ('bs-milano-classic', 'Red',       null,      'طقم ٥ قطع', true,  'BS-MCLA-013', 8,  4175),
    ('bs-milano-classic', 'Red',       null,      'طقم ٣ قطع', true,  'BS-MCLA-014', 8,  3149),
    ('bs-milano-classic', 'Rose gold', null,      'طقم ٥ قطع', true,  'BS-MCLA-015', 8,  4225),
    ('bs-milano-classic', 'Rose gold', null,      'طقم ٣ قطع', true,  'BS-MCLA-016', 8,  3150),
    ('bs-milano-classic', 'Purple',    null,      'طقم ٥ قطع', true,  'BS-MCLA-017', 8,  4175),
    ('bs-milano-classic', 'Purple',    null,      'طقم ٣ قطع', true,  'BS-MCLA-018', 8,  3149),
    ('bs-milano-classic', 'Green',     null,      'طقم ٥ قطع', true,  'BS-MCLA-019', 8,  3249),
    ('bs-milano-classic', 'Green',     null,      'طقم ٣ قطع', true,  'BS-MCLA-020', 8,  3249),
    ('bs-milano-classic', 'Gray',      null,      'طقم ٥ قطع', true,  'BS-MCLA-021', 8,  4225),
    ('bs-milano-classic', 'Gray',      null,      'طقم ٣ قطع', true,  'BS-MCLA-022', 8,  3149),

    -- bs-milano-308 (44 variants — 11 colors × {3pc, 22, 26, 30})
    ('bs-milano-308', 'Petroluem', null, 'طقم ٣ قطع',           true,  'BS-M308-001', 8, 3299),
    ('bs-milano-308', 'Petroluem', 22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M308-002', 8, 899),
    ('bs-milano-308', 'Petroluem', 26,   'الشنطة الوسط ٢٦',     false, 'BS-M308-003', 8, 1349),
    ('bs-milano-308', 'Petroluem', 30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M308-004', 8, 1649),
    ('bs-milano-308', 'Silver',    null, 'طقم ٣ قطع',           true,  'BS-M308-005', 8, 3299),
    ('bs-milano-308', 'Silver',    22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M308-006', 8, 899),
    ('bs-milano-308', 'Silver',    26,   'الشنطة الوسط ٢٦',     false, 'BS-M308-007', 8, 1349),
    ('bs-milano-308', 'Silver',    30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M308-008', 8, 1650),
    ('bs-milano-308', 'Black',     null, 'طقم ٣ قطع',           true,  'BS-M308-009', 8, 3700),
    ('bs-milano-308', 'Black',     22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M308-010', 8, 999),
    ('bs-milano-308', 'Black',     26,   'الشنطة الوسط ٢٦',     false, 'BS-M308-011', 8, 1475),
    ('bs-milano-308', 'Black',     30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M308-012', 8, 1800),
    ('bs-milano-308', 'Navy',      null, 'طقم ٣ قطع',           true,  'BS-M308-013', 8, 3299),
    ('bs-milano-308', 'Navy',      22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M308-014', 8, 899),
    ('bs-milano-308', 'Navy',      26,   'الشنطة الوسط ٢٦',     false, 'BS-M308-015', 8, 1350),
    ('bs-milano-308', 'Navy',      30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M308-016', 8, 1650),
    ('bs-milano-308', 'Rose gold', null, 'طقم ٣ قطع',           true,  'BS-M308-017', 8, 3299),
    ('bs-milano-308', 'Rose gold', 22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M308-018', 8, 899),
    ('bs-milano-308', 'Rose gold', 26,   'الشنطة الوسط ٢٦',     false, 'BS-M308-019', 8, 1350),
    ('bs-milano-308', 'Rose gold', 30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M308-020', 8, 1650),
    ('bs-milano-308', 'Beige',     null, 'طقم ٣ قطع',           true,  'BS-M308-021', 8, 3299),
    ('bs-milano-308', 'Beige',     22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M308-022', 8, 899),
    ('bs-milano-308', 'Beige',     26,   'الشنطة الوسط ٢٦',     false, 'BS-M308-023', 8, 1350),
    ('bs-milano-308', 'Beige',     30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M308-024', 8, 1650),
    ('bs-milano-308', 'Pink',      null, 'طقم ٣ قطع',           true,  'BS-M308-025', 8, 3299),
    ('bs-milano-308', 'Pink',      22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M308-026', 8, 899),
    ('bs-milano-308', 'Pink',      26,   'الشنطة الوسط ٢٦',     false, 'BS-M308-027', 8, 1350),
    ('bs-milano-308', 'Pink',      30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M308-028', 8, 1650),
    ('bs-milano-308', 'Purple',    null, 'طقم ٣ قطع',           true,  'BS-M308-029', 8, 3299),
    ('bs-milano-308', 'Purple',    22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M308-030', 8, 899),
    ('bs-milano-308', 'Purple',    26,   'الشنطة الوسط ٢٦',     false, 'BS-M308-031', 8, 1350),
    ('bs-milano-308', 'Purple',    30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M308-032', 8, 1650),
    ('bs-milano-308', 'Green',     null, 'طقم ٣ قطع',           true,  'BS-M308-033', 8, 3450),
    ('bs-milano-308', 'Green',     22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M308-034', 8, 1000),
    ('bs-milano-308', 'Green',     26,   'الشنطة الوسط ٢٦',     false, 'BS-M308-035', 8, 1600),
    ('bs-milano-308', 'Green',     30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M308-036', 8, 1800),
    ('bs-milano-308', 'Baby blue', null, 'طقم ٣ قطع',           true,  'BS-M308-037', 8, 3450),
    ('bs-milano-308', 'Baby blue', 22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M308-038', 8, 1000),
    ('bs-milano-308', 'Baby blue', 26,   'الشنطة الوسط ٢٦',     false, 'BS-M308-039', 8, 1500),
    ('bs-milano-308', 'Baby blue', 30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M308-040', 8, 1750),
    ('bs-milano-308', 'Red',       null, 'طقم ٣ قطع',           true,  'BS-M308-041', 8, 3299),
    ('bs-milano-308', 'Red',       22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M308-042', 8, 1000),
    ('bs-milano-308', 'Red',       26,   'الشنطة الوسط ٢٦',     false, 'BS-M308-043', 8, 1400),
    ('bs-milano-308', 'Red',       30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M308-044', 8, 1700),

    -- bs-milano-189 (6 variants — color only, full 3pc set each)
    ('bs-milano-189', 'Black',     null, 'طقم ٣ قطع', true, 'BS-M189-001', 8, 3025),
    ('bs-milano-189', 'Rose gold', null, 'طقم ٣ قطع', true, 'BS-M189-002', 8, 3025),
    ('bs-milano-189', 'Pink',      null, 'طقم ٣ قطع', true, 'BS-M189-003', 8, 3025),
    ('bs-milano-189', 'Navy',      null, 'طقم ٣ قطع', true, 'BS-M189-004', 8, 2899),
    ('bs-milano-189', 'Silver',    null, 'طقم ٣ قطع', true, 'BS-M189-005', 8, 2899),
    ('bs-milano-189', 'Beige',     null, 'طقم ٣ قطع', true, 'BS-M189-006', 8, 2899),

    -- bs-milano-302 (7 variants — all 3pc sets, all priced 3299)
    ('bs-milano-302', 'Rose gold', null, 'طقم ٣ قطع', true, 'BS-M302-001', 8, 3299),
    ('bs-milano-302', 'Pink',      null, 'طقم ٣ قطع', true, 'BS-M302-002', 8, 3299),
    ('bs-milano-302', 'Navy',      null, 'طقم ٣ قطع', true, 'BS-M302-003', 8, 3299),
    ('bs-milano-302', 'Petroluem', null, 'طقم ٣ قطع', true, 'BS-M302-004', 8, 3299),
    ('bs-milano-302', 'Silver',    null, 'طقم ٣ قطع', true, 'BS-M302-005', 8, 3299),
    ('bs-milano-302', 'Black',     null, 'طقم ٣ قطع', true, 'BS-M302-006', 8, 3299),
    ('bs-milano-302', 'Gold',      null, 'طقم ٣ قطع', true, 'BS-M302-007', 8, 3299),

    -- bs-milano-309 (44 variants — 9 colors × {5pc, 3pc, 22, 26, 30})
    ('bs-milano-309', 'Black',     null, 'طقم ٥ قطع',           true,  'BS-M309-001', 8, 4549),
    ('bs-milano-309', 'Black',     null, 'طقم ٣ قطع',           true,  'BS-M309-002', 8, 3499),
    ('bs-milano-309', 'Black',     22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M309-003', 8, 999),
    ('bs-milano-309', 'Black',     26,   'الشنطة الوسط ٢٦',     false, 'BS-M309-004', 8, 1475),
    ('bs-milano-309', 'Black',     30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M309-005', 8, 1750),
    ('bs-milano-309', 'Purple',    null, 'طقم ٥ قطع',           true,  'BS-M309-006', 8, 4299),
    ('bs-milano-309', 'Purple',    null, 'طقم ٣ قطع',           true,  'BS-M309-007', 8, 3299),
    ('bs-milano-309', 'Purple',    22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M309-008', 8, 899),
    ('bs-milano-309', 'Purple',    26,   'الشنطة الوسط ٢٦',     false, 'BS-M309-009', 8, 1350),
    ('bs-milano-309', 'Purple',    30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M309-010', 8, 1650),
    ('bs-milano-309', 'Silver',    null, 'طقم ٥ قطع',           true,  'BS-M309-011', 8, 4299),
    ('bs-milano-309', 'Silver',    null, 'طقم ٣ قطع',           true,  'BS-M309-012', 8, 3299),
    ('bs-milano-309', 'Silver',    22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M309-013', 8, 899),
    ('bs-milano-309', 'Silver',    26,   'الشنطة الوسط ٢٦',     false, 'BS-M309-014', 8, 1349),
    ('bs-milano-309', 'Silver',    30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M309-015', 8, 1650),
    ('bs-milano-309', 'Navy',      null, 'طقم ٥ قطع',           true,  'BS-M309-016', 8, 4299),
    ('bs-milano-309', 'Navy',      null, 'طقم ٣ قطع',           true,  'BS-M309-017', 8, 3299),
    ('bs-milano-309', 'Navy',      22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M309-018', 8, 899),
    ('bs-milano-309', 'Navy',      26,   'الشنطة الوسط ٢٦',     false, 'BS-M309-019', 8, 1349),
    ('bs-milano-309', 'Navy',      30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M309-020', 8, 1650),
    ('bs-milano-309', 'Beige',     null, 'طقم ٥ قطع',           true,  'BS-M309-021', 8, 4299),
    ('bs-milano-309', 'Beige',     null, 'طقم ٣ قطع',           true,  'BS-M309-022', 8, 3299),
    ('bs-milano-309', 'Beige',     22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M309-023', 8, 899),
    ('bs-milano-309', 'Beige',     26,   'الشنطة الوسط ٢٦',     false, 'BS-M309-024', 8, 1349),
    ('bs-milano-309', 'Beige',     30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M309-025', 8, 1650),
    ('bs-milano-309', 'Red',       null, 'طقم ٥ قطع',           true,  'BS-M309-026', 8, 4299),
    ('bs-milano-309', 'Red',       null, 'طقم ٣ قطع',           true,  'BS-M309-027', 8, 3299),
    ('bs-milano-309', 'Red',       22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M309-028', 8, 899),
    ('bs-milano-309', 'Red',       26,   'الشنطة الوسط ٢٦',     false, 'BS-M309-029', 8, 1350),
    ('bs-milano-309', 'Red',       30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M309-030', 8, 1650),
    ('bs-milano-309', 'Rose gold', null, 'طقم ٥ قطع',           true,  'BS-M309-031', 8, 4400),
    ('bs-milano-309', 'Rose gold', null, 'طقم ٣ قطع',           true,  'BS-M309-032', 8, 3299),
    ('bs-milano-309', 'Rose gold', 22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M309-033', 8, 899),
    ('bs-milano-309', 'Rose gold', 26,   'الشنطة الوسط ٢٦',     false, 'BS-M309-034', 8, 1350),
    ('bs-milano-309', 'Rose gold', 30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M309-035', 8, 1650),
    ('bs-milano-309', 'Petroluem', null, 'طقم ٥ قطع',           true,  'BS-M309-036', 8, 4299),
    ('bs-milano-309', 'Petroluem', null, 'طقم ٣ قطع',           true,  'BS-M309-037', 8, 3299),
    ('bs-milano-309', 'Petroluem', 22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M309-038', 8, 899),
    ('bs-milano-309', 'Petroluem', 26,   'الشنطة الوسط ٢٦',     false, 'BS-M309-039', 8, 1350),
    ('bs-milano-309', 'Petroluem', 30,   'الشنطة الكبيرة ٣٠',   false, 'BS-M309-040', 8, 1650),
    ('bs-milano-309', 'Pink',      null, 'طقم ٥ قطع',           true,  'BS-M309-041', 8, 4299),
    ('bs-milano-309', 'Pink',      null, 'طقم ٣ قطع',           true,  'BS-M309-042', 8, 3399),
    ('bs-milano-309', 'Pink',      22,   'الشنطة الصغيرة ٢٢',   false, 'BS-M309-043', 8, 949),
    ('bs-milano-309', 'Pink',      26,   'الشنطة الوسط ٢٦',     false, 'BS-M309-044', 8, 1400)
  ) as v(product_slug, color_en, size_inches, size_label_ar, is_set, sku, stock, price)
join public.products p on p.slug = v.product_slug
on conflict (sku) do update set
  stock_qty = excluded.stock_qty,
  price_override = excluded.price_override,
  color_ar = excluded.color_ar,
  color_hex = excluded.color_hex,
  size_inches = excluded.size_inches,
  size_label_ar = excluded.size_label_ar,
  is_set = excluded.is_set;
