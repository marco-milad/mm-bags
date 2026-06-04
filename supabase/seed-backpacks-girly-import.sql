-- Backpacks import from girlyoffer.com (collection: باك).
-- 9 products · 43 variants (all color-only, except BP-074 which is a backpack+crossbody set)
-- ~53 images served from cdn.shopify.com.
-- Slug-prefixed with `bp-girly-`. SKU pattern `BP-<source#>-<3-letter color>`.
-- Idempotent: ON CONFLICT updates on slug + SKU.

-- ============ PRODUCTS ============
insert into public.products
  (slug, collection_id, name_ar, name_en, description_ar, description_en,
   base_price, sale_price, material_ar, material_en, images, is_active, sort_order)
values
  ('bp-girly-denim', (select id from public.collections where slug='backpacks'),
   'شنطة ظهر Denim Touch مستوردة 🤍', 'Imported Denim Touch Backpack',
   'شنطة ظهر بتصميم عملي مميز يجمع بين الـ casual style والراحة في الاستخدام اليومي مع تفاصيل denim look ومساحة عملية لاحتياجاتك اليومية. لونين.',
   'Imported casual backpack with denim-look details and practical daily space. 2 colors.',
   745, null, 'قماش بلمسة دنيم', 'Denim-look fabric',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPTImageMay14_2026_11_07_55AM.png?v=1778947169','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPTImageMay14_2026_11_03_06AM.png?v=1778947170','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPT_Image_May_14_2026_11_27_04_AM_1.png?v=1778947231','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPT_Image_May_14_2026_11_27_04_AM_2.png?v=1778947231','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPT_Image_May_14_2026_11_27_05_AM_3.png?v=1778947231','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPT_Image_May_14_2026_11_27_05_AM_4.png?v=1778947232'],
   true, 100),
  ('bp-girly-137-multi', (select id from public.collections where slug='backpacks'),
   'شنطة ظهر متعددة الاستخدام — Multi-Purpose', 'Imported Multi-Purpose Backpack',
   'شنطة ظهر بتصميم عملي عصري مناسبة لكل تفاصيل يومك — من الشغل للدراسة وحتى السفر. خفيفة ومريحة مع تقسيمات ذكية. ٤ ألوان.',
   'Versatile lightweight backpack for work, study, and travel. Smart compartments. 4 colors.',
   485, null, 'بوليستر مقاوم للماء', 'Water-resistant polyester',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/1_0ef647a3-a471-4f9a-b893-06ebac059c48.jpg?v=1777310790','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/2_75caff23-bd1c-44d7-88a5-a0a1f7860f58.jpg?v=1777310790','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/3_7eba6ffc-5d26-4444-9761-15c76012477a.jpg?v=1777310790','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/4_f55d44f5-8e15-4a82-81d0-cf4d6ed6fcb6.jpg?v=1777310790','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/5_3.png?v=1777310791','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/5_4.png?v=1777310790'],
   true, 101),
  ('bp-girly-74-set', (select id from public.collections where slug='backpacks'),
   'شنطة باك + شنطة كروس — طقم 💼✨', 'Backpack + Crossbody Set',
   'شنطة باك + شنطة كروس — عملية وأناقة في طقم واحد. خامة ووتر بروف عالية الجودة. شنطة الكروس متعددة الاستخدام، تقدري تلبسيها لوحدها أو تعلقيها في الباك. ١١ لون.',
   'Backpack + crossbody bag set — waterproof, versatile. Wear the crossbody alone or attach it. 11 colors.',
   595, null, 'بوليستر ووتر بروف', 'Waterproof polyester',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/1_7df820ca-25bc-4a14-b4f1-64a3c1b39294.jpg?v=1750264406','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/0_2_20c26bac-a9a2-4bdc-80b4-ccce2b2aad73.jpg?v=1750264406','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/0_3_f40fdb23-4076-4cb7-ba58-8f9a6dbd670f.jpg?v=1750264406','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/1_2_copy_2.jpg?v=1756909563','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/1_6_copy111.jpg?v=1756909648','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/1_5_copy.jpg?v=1756909648'],
   true, 102),
  ('bp-girly-149-urban', (select id from public.collections where slug='backpacks'),
   'شنطة Backpack مستوردة — ستايل مودرن', 'Imported Urban Style Backpack',
   'شنطة ظهر بتصميم عملي وعصري يناسب يومك بكل تفاصيله. خامة جلد ناعمة مع مساحة واسعة وتقسيمات متعددة. ٤ ألوان.',
   'Imported urban-style backpack — soft leather, roomy with multi-compartments. 4 colors.',
   665, null, 'جلد ناعم', 'Soft leather',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/4_b2c32f99-2217-4daf-90af-928827acd91c.png?v=1779295664','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/3_d9b6b4e9-cb2b-4895-9115-9ec2df538b0d.png?v=1779295664','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/2_afe1b3a9-6636-45b1-86d4-fd88e6f7a8fc.png?v=1779295665','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/1_639d77c2-f4e7-40db-8e34-26829311fc1f.png?v=1779295664','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/4_13.png?v=1779295741','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/4_6.png?v=1779295749'],
   true, 103),
  ('bp-girly-96-leather-stylish', (select id from public.collections where slug='backpacks'),
   'شنطة ظهر جلد فاخرة بمطبوعات Stylish', 'Stylish Leather Backpack',
   'شنطة ظهر مستوردة بتصميم minimal عصري ولمسة casual chic. خفيفة وعملية بمساحة واسعة، تصميم مريح يناسب الجامعة والشغل والخروجات. ٥ ألوان.',
   'Stylish leather backpack — minimal modern look, casual chic. 5 colors.',
   595, null, 'جلد فاخر', 'Premium leather',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPTImageMay15_2026_04_21_49PM_4.png?v=1779022115','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPTImageMay15_2026_04_21_49PM_2.png?v=1779022115','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPTImageMay15_2026_04_21_48PM_1.png?v=1779022115','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPTImageMay15_2026_04_21_49PM_3.png?v=1779022115','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPTImageMay15_2026_04_21_50PM_5.png?v=1779022116','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPT_Image_May_17_2026_12_00_56_PM.png?v=1779023761'],
   true, 104),
  ('bp-girly-130-leather-premium', (select id from public.collections where slug='backpacks'),
   'شنطة ظهر جلد premium', 'Premium Leather Backpack',
   'شنطة ظهر بتصميم أنيق ولمسة عصرية، مثالية ليومك — جامعة، شغل، أو خروجة. خامة جلد ناعم وقوي، تصميم عملي بجيوب متعددة. ٣ ألوان.',
   'Premium leather backpack — soft yet strong, multi-pocket. Built for university and work. 3 colors.',
   625, null, 'جلد فاخر', 'Premium leather',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/1_4e7e560c-a492-4445-97aa-31efb29c2172.png?v=1754007638','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/3_89afdeae-c48b-4faf-b775-95d687a2f9ff.png?v=1754007638','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/4_4ae159cc-98d4-4a03-82ea-aaa7a2ff53b7.png?v=1754007637','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/9_aa999093-0a78-4396-818c-5ee4502b561a.png?v=1754007896','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/10_2c5737ad-3670-438f-99a3-0d740da1cb93.png?v=1754007896','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/13_96e161c6-c2db-429a-9a99-9884d7454a5d.png?v=1754007896'],
   true, 105),
  ('bp-girly-77-leather-art', (select id from public.collections where slug='backpacks'),
   'حقيبة ظهر جلد بنقشة فنية', 'Artistic Leather Backpack',
   'حقيبة تجمع بين الأناقة العملية والتفاصيل الراقية. صُممت لترافقك في كل يوم بإطلالة متكاملة، ولمسة جلد فنية تُبرز ذوقك الرفيع. ٥ ألوان.',
   'Artistic-print leather backpack — refined details, daily companion. 5 colors.',
   625, null, 'جلد بنقشة فنية', 'Leather with artistic print',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/3_2_69c2e361-d7a9-4249-8760-f90715732c82.jpg?v=1759837750','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/4_4fcf189f-a443-499e-b560-26ef1cbfe9bc.jpg?v=1759837750','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/5_e24b33dc-5f26-4d7d-8065-edd091f40ced.jpg?v=1759837750','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/3_33f4bb69-06ce-43b4-91cc-f3ba03ddb849.jpg?v=1759837750','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/6_2_9d350b69-f5e4-4757-8618-f9766fd650ff.jpg?v=1759837750','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/1_b84657a4-1c36-4e05-ab21-39ffd714c6c4.jpg?v=1759837750'],
   true, 106),
  ('bp-girly-147-leather-smart', (select id from public.collections where slug='backpacks'),
   'شنطة ظهر جلد بمساحة ذكية', 'Smart Daily Leather Backpack',
   'شنطة ظهر جلد بتصميم بسيط وأنيق يناسب الاستخدام اليومي ويضيف لمسة عصرية لإطلالتك. مساحة عملية وتنظيم مريح. ٣ ألوان.',
   'Smart leather backpack with simple, elegant daily design. 3 colors.',
   545, null, 'جلد فاخر', 'Premium leather',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/IMG_6181.jpg?v=1772978219','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/IMG_6182.jpg?v=1772978219','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/IMG_6183.jpg?v=1772978219','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/9_8cd9f8b2-d233-410d-b057-ef94d5e6991e.jpg?v=1772978257','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/19_f2d2c951-13c0-45b3-a5fe-d247181fc1a0.jpg?v=1772978257'],
   true, 107),
  ('bp-girly-141-elegant', (select id from public.collections where slug='backpacks'),
   'حقيبة ظهر Elegant & Premium', 'Elegant & Premium Imported Backpack',
   'حقيبة Backpack فاخرة بتصميم هندسي أنيق يعكس الذوق الراقي والتفاصيل الدقيقة. مصممة لتجمع بين العملية والفخامة، مع مساحة داخلية منظمة. ٦ ألوان.',
   'Elegant & premium imported backpack — geometric design, refined details, organized interior. 6 colors.',
   745, null, 'جلد فاخر', 'Premium leather',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPTImageMay1_2026_01_10_56PM_6.png','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPTImageMay1_2026_01_10_55PM_1.png','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPTImageMay1_2026_01_10_56PM_5.png','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPTImageMay1_2026_01_10_55PM_3.png','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPTImageMay1_2026_01_10_55PM_4.png','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/ChatGPTImageMay1_2026_01_10_55PM_2.png'],
   true, 108)
on conflict (slug) do update set
  collection_id=excluded.collection_id, name_ar=excluded.name_ar, name_en=excluded.name_en,
  description_ar=excluded.description_ar, description_en=excluded.description_en,
  base_price=excluded.base_price, material_ar=excluded.material_ar, material_en=excluded.material_en,
  images=excluded.images, is_active=excluded.is_active, sort_order=excluded.sort_order, updated_at=now();

-- ============ VARIANTS ============ (43 total — color only, except BP-074 set)
with t as (
  select
    (select id from public.products where slug='bp-girly-denim')                  as p_denim,
    (select id from public.products where slug='bp-girly-137-multi')              as p_137,
    (select id from public.products where slug='bp-girly-74-set')                 as p_74,
    (select id from public.products where slug='bp-girly-149-urban')              as p_149,
    (select id from public.products where slug='bp-girly-96-leather-stylish')     as p_96,
    (select id from public.products where slug='bp-girly-130-leather-premium')    as p_130,
    (select id from public.products where slug='bp-girly-77-leather-art')         as p_77,
    (select id from public.products where slug='bp-girly-147-leather-smart')      as p_147,
    (select id from public.products where slug='bp-girly-141-elegant')            as p_141
)
insert into public.product_variants
  (product_id, sku, color_en, color_ar, color_hex, size_inches, size_label_ar, is_set, price_override, stock_qty)
select
  case v.fam
    when 'DNM' then t.p_denim when '137' then t.p_137 when '074' then t.p_74
    when '149' then t.p_149 when '096' then t.p_96  when '130' then t.p_130
    when '077' then t.p_77  when '147' then t.p_147 when '141' then t.p_141
  end,
  v.sku, v.color_en, v.color_ar, v.color_hex, null::int, v.size_label_ar, v.is_set, v.price_override, v.stock_qty
from t cross join (values
  ('DNM','BP-DNM-BLK','Black',       'أسود',       '#0d0d0d', null::text, false, 745::numeric, 25),
  ('DNM','BP-DNM-BLU','Blue',        'أزرق',       '#2c5e9e', null,       false, 745,          25),
  ('137','BP-137-LAV','Lavender',    'لافندر',     '#c8a8e0', null,       false, 485,          25),
  ('137','BP-137-HAV','Havana',      'هافان',      '#c19a6b', null,       false, 485,          25),
  ('137','BP-137-KSH','Kashmir',     'كشمير',      '#b8a380', null,       false, 485,          25),
  ('137','BP-137-BEI','Beige',       'بيج',        '#d4b483', null,       false, 485,          25),
  ('074','BP-074-BLK','Black',       'أسود',       '#0d0d0d', 'باك + كروس', true,  595,         20),
  ('074','BP-074-COF','Coffee',      'كافيه',      '#6f4e37', 'باك + كروس', true,  595,         20),
  ('074','BP-074-BUR','Burgundy',    'بيرجندي',    '#800020', 'باك + كروس', true,  595,         20),
  ('074','BP-074-MAU','Mauve',       'موف',        '#b784a7', 'باك + كروس', true,  595,         20),
  ('074','BP-074-LAV','Lavender',    'لافندر',     '#c8a8e0', 'باك + كروس', true,  595,         20),
  ('074','BP-074-NAV','Navy',        'كحلي',       '#1b2b4b', 'باك + كروس', true,  595,         20),
  ('074','BP-074-BBL','Baby Blue',   'بيبي بلو',   '#aed8e6', 'باك + كروس', true,  595,         20),
  ('074','BP-074-KSH','Kashmir',     'كشمير',      '#b8a380', 'باك + كروس', true,  595,         20),
  ('074','BP-074-MIN','Mint',        'منت',        '#98d4b5', 'باك + كروس', true,  595,         20),
  ('074','BP-074-GRA','Gray',        'جراي',       '#999999', 'باك + كروس', true,  595,         20),
  ('074','BP-074-BEI','Beige',       'بيج',        '#d4b483', 'باك + كروس', true,  595,         20),
  ('149','BP-149-KSH','Kashmir',     'كشمير',      '#b8a380', null,       false, 665,          25),
  ('149','BP-149-BBL','Baby Blue',   'بيبي بلو',   '#aed8e6', null,       false, 665,          25),
  ('149','BP-149-BRN','Brown',       'بني',        '#6b4423', null,       false, 665,          25),
  ('149','BP-149-BLK','Black',       'أسود',       '#0d0d0d', null,       false, 665,          25),
  ('096','BP-096-BLK','Black',       'أسود',       '#0d0d0d', null,       false, 595,          25),
  ('096','BP-096-WHT','White',       'أبيض',       '#ffffff', null,       false, 595,          25),
  ('096','BP-096-BEI','Beige',       'بيج',        '#d4b483', null,       false, 595,          25),
  ('096','BP-096-BRN','Brown',       'بني',        '#6b4423', null,       false, 595,          25),
  ('096','BP-096-HAV','Havana',      'هافان',      '#c19a6b', null,       false, 595,          25),
  ('130','BP-130-BRN','Brown',       'بني',        '#6b4423', null,       false, 625,          25),
  ('130','BP-130-BLK','Black',       'أسود',       '#0d0d0d', null,       false, 625,          25),
  ('130','BP-130-OFW','Off white',   'أوف وايت',   '#f5f0e6', null,       false, 625,          25),
  ('077','BP-077-HAV','Havana',      'هافان',      '#c19a6b', null,       false, 625,          25),
  ('077','BP-077-BRN','Brown',       'بني',        '#6b4423', null,       false, 625,          25),
  ('077','BP-077-BLK','Black',       'أسود',       '#0d0d0d', null,       false, 625,          25),
  ('077','BP-077-SUG','Sugar Pink',  'سكري',       '#f5d0d0', null,       false, 625,          25),
  ('077','BP-077-KSH','Kashmir',     'كشمير',      '#b8a380', null,       false, 625,          25),
  ('147','BP-147-BEI','Beige',       'بيج',        '#d4b483', null,       false, 545,          25),
  ('147','BP-147-BLK','Black',       'أسود',       '#0d0d0d', null,       false, 545,          25),
  ('147','BP-147-BRN','Brown',       'بني',        '#6b4423', null,       false, 545,          25),
  ('141','BP-141-BLK','Black',       'أسود',       '#0d0d0d', null,       false, 745,          25),
  ('141','BP-141-NAV','Navy',        'كحلي',       '#1b2b4b', null,       false, 745,          25),
  ('141','BP-141-OFW','Off white',   'أوف وايت',   '#f5f0e6', null,       false, 745,          25),
  ('141','BP-141-BEI','Beige',       'بيج',        '#d4b483', null,       false, 745,          25),
  ('141','BP-141-KSH','Kashmir',     'كشمير',      '#b8a380', null,       false, 745,          25),
  ('141','BP-141-COF','Coffee',      'كافيه',      '#6f4e37', null,       false, 745,          25)
) as v(fam, sku, color_en, color_ar, color_hex, size_label_ar, is_set, price_override, stock_qty)
on conflict (sku) do update set
  product_id=excluded.product_id, color_en=excluded.color_en, color_ar=excluded.color_ar,
  color_hex=excluded.color_hex, size_label_ar=excluded.size_label_ar, is_set=excluded.is_set,
  price_override=excluded.price_override, stock_qty=excluded.stock_qty;

-- ============ CLEANUP ============
-- Single DELETE covers both school-bags and backpacks placeholders.
delete from public.products
where collection_id in (select id from public.collections where slug in ('school-bags','backpacks'))
  and slug not like 'sb-girly-%' and slug not like 'bp-girly-%';
