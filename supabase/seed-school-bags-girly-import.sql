-- School bags import from girlyoffer.com (collection: شنط مدارس).
-- 9 products · 48 variants (all color-only) · ~54 images served from cdn.shopify.com.
-- Slug-prefixed with `sb-girly-`. SKU pattern `SB-<source#>-<3-letter color>`.
-- Idempotent: ON CONFLICT updates on slug + SKU.

-- ============ PRODUCTS ============
insert into public.products
  (slug, collection_id, name_ar, name_en, description_ar, description_en,
   base_price, sale_price, material_ar, material_en, images, is_active, sort_order)
values
  ('sb-girly-set-4pc', (select id from public.collections where slug='school-bags'),
   'طقم شنط متكامل للمدرسة والجامعة — ٤ قطع', '4-Piece Complete School & University Set',
   'مش شنطة واحدة — ده طقم كامل يجهّزك ليومك الدراسي في اختيار واحد. تصميم عملي، ستايل موحّد، وتنظيم ذكي يناسب المدرسة والجامعة. متوفر بـ ٤ ألوان.',
   '4-piece school/university set with matching design and smart organization. Available in 4 colors.',
   445, null, 'بوليستر متين', 'Durable polyester',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/1_4b79c271-66be-4d13-a581-3cab296f05e4.jpg?v=1770479444','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/2_fca2027c-5d55-4e61-bd97-3a9bd249a67e.jpg?v=1770479444','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/3_f9a148df-5934-453b-9b11-bc0e42db6706.jpg?v=1770479444','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/4_4de5de8a-caea-467b-823a-033562b31ee8.jpg?v=1770479444','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/1_d718319a-910a-47bb-9e0f-3bdbd5f2eed4.jpg?v=1770480065','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/2_577a5250-bb90-4e7d-8bae-1cccf8310a96.jpg?v=1770480065'],
   true, 100),
  ('sb-girly-129', (select id from public.collections where slug='school-bags'),
   'شنطة الدراسة المثالية لليوم الطويل ❤', 'Long-Day Study Backpack with Bonus Pocket',
   'شنطة ظهر مدرسية تجمع بين العملية والستايل، مصممة لليوم الدراسي الطويل. معاها شنطة صغيرة عملية تحفظ أساسياتك وتكمّل إطلالتك. ٥ ألوان.',
   'Long-day study backpack with a bonus mini pouch for daily essentials. 5 colors.',
   645, null, 'بوليستر مقاوم للماء', 'Water-resistant polyester',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/12_a02396c1-704d-42d9-926c-18a6890ad5ad.png?v=1757525161','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/6_ba9895f4-0f1e-48be-bba5-109d5b9e18f5.jpg?v=1767988566','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/7_b0c5f468-cb45-4af6-ac12-84f0a406c0b1.jpg?v=1767988566','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/9copy.jpg?v=1767988566','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/8_2924a726-1ae6-474f-a1d3-7a1e1ec9e0b1.jpg?v=1767988566','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/10_3f2e2f8c-e7ae-4be5-9d6d-be492e5f61fe.png?v=1767988566'],
   true, 101),
  ('sb-girly-119', (select id from public.collections where slug='school-bags'),
   'شنطة ظهر دراسية بتصميم عصري 🎒', 'Modern Daily Study Backpack',
   'صممت مخصوص لليوم الدراسي الطويل عشان تشيلي كتبك واللابتوب وكل أدواتك ويومك يبقى منظم ومريح. تقسيمات داخلية واسعة وجيوب متعددة. ٥ ألوان.',
   'Designed for long study days — fits books, laptop, and gear with smart internal compartments. 5 colors.',
   600, null, 'بوليستر متين', 'Durable polyester',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/1_a2dd23d3-058f-44e0-b865-60861bee2c9d.jpg?v=1757526697','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/2_2_de1a9989-6f88-4b9c-8751-9ac515e25b59.jpg?v=1757526697','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/3_3b7095de-1069-4dff-b7f2-471cde9a66dd.jpg?v=1757526697','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/4_d06d36c8-3733-4e06-8db8-52d6f132bdb3.jpg?v=1757526697','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/5_6da9533d-0868-4948-93ba-7896d931af8e.jpg?v=1757526697','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/6_4e7080d9-4cc0-4cf7-aed5-15a982e59ab4.jpg?v=1757526697'],
   true, 102),
  ('sb-girly-128', (select id from public.collections where slug='school-bags'),
   'شنطة ظهر بلمسة كيوت وتنظيم عملي', 'Cute & Organized Study Backpack',
   'شنطة ظهر بتصميم عصري وألوان هادئة تناسب المدرسة والدروس، مصممة عشان تتحمل الاستخدام اليومي وحمل الكتب. ٥ ألوان.',
   'Cute everyday school backpack with calm colors and durable construction. 5 colors.',
   625, null, 'بوليستر متين', 'Durable polyester',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/1_06ad209f-351a-474f-9fe4-5caf11f26076.jpg?v=1769052441','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/2_2e5f57f5-9bd9-45d0-91a6-961c5c1445c2.jpg?v=1769052441','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/3_96aa59ca-cd1f-477e-ae0b-533804eddaae.jpg?v=1769052441','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/4_3cd81f20-784d-4c04-ba71-8b31febd5cd7.jpg?v=1769052441','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/5_e435e132-e998-4bb7-a890-d3263aa1ba6d.jpg?v=1769052441','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/6_78d3505b-657b-4661-a089-0225cee0285b.jpg?v=1769052441'],
   true, 103),
  ('sb-girly-133', (select id from public.collections where slug='school-bags'),
   'شنطة ظهر كيوت بألوان كاجوال 🎒', 'Cute Casual Study Backpack',
   'شنطة الظهر من Girly مش بس عملية — كيوت جداً وبتجمع بين التصميم العصري وخامة متينة. هتكون رفيقتك المثالية طول اليوم. ٦ ألوان.',
   'Cute, casual, and durable study backpack with modern design. 6 colors.',
   625, null, 'بوليستر متين', 'Durable polyester',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/AMC_5409.jpg?v=1757690320','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/2_0df8c923-1e00-4c75-977b-4b0a372c72b3.jpg?v=1757690320','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/3_9115f600-c60b-442d-88c4-3bf54c9ec7de.jpg?v=1757690320','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/4_036ad511-ca34-4167-a21c-d144df3aba23.jpg?v=1757690320','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/5_09e0f8c7-3025-4623-91bc-20d67d1a1f40.jpg?v=1757690320','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/6_4db0e89c-b57b-4d69-a7a1-8234fb201ead.jpg?v=1757690320'],
   true, 104),
  ('sb-girly-127', (select id from public.collections where slug='school-bags'),
   'شنطة ظهر عملية بتصميم أنيق ❤', 'Practical & Elegant Study Backpack',
   'شنطة الظهر من Girly هتكون رفيقتك المثالية ليوم دراسي طويل أو مشاوير الجامعة. خامة قوية وخفيفة، تقسيماتها عملية جداً عشان تنظمي كتبك واللابتوب والأغراض الصغيرة. ٥ ألوان.',
   'Practical, elegant study backpack — strong, light, and well-organized. 5 colors.',
   625, null, 'بوليستر متين', 'Durable polyester',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/1_09e34825-4366-43cc-a8ee-2e3392d7f873.jpg?v=1757241308','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/5_5_c2a32a72-13a3-48f4-99a5-721632a5fbab.jpg?v=1757241308','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/5_4_b73f6231-453f-45d1-a2d7-6ba2d51b974a.jpg?v=1757241308','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/5_2_c655bdb4-a8cb-4fee-96ec-3e5610f268b6.jpg?v=1757241308','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/5_3_4da69c7f-eeb8-4d1c-a124-a223e84e0742.jpg?v=1757241308','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/2_fc9f77c3-a71f-4942-bbd9-aec3d928fda1.jpg?v=1757241308'],
   true, 105),
  ('sb-girly-114', (select id from public.collections where slug='school-bags'),
   'شنطة ظهر عملية وأنيقة — إصدار Girly الجديد', 'New Girly Edition — School & University Backpack',
   'إصدار جديد من شنط الظهر العملية والأنيقة من Girly، بتصميم عصري وألوان جديدة تخطف العين. مصممة لتناسب المدرسة والجامعة، وتجمع بين المتانة والراحة والشياكة. ٦ ألوان.',
   'New Girly edition — modern, durable, and stylish for school and university. 6 colors.',
   595, null, 'بوليستر متين', 'Durable polyester',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/AMC_4215.jpg?v=1754751264','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/AMC_4202.jpg?v=1754751264','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/AMC_4209.jpg?v=1756160684','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/AMC_4203.jpg?v=1756160684','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/AMC_4199.jpg?v=1754751264','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/6_b86b429f-e96b-47d9-b977-dd9c41491ccf.jpg?v=1756125658'],
   true, 106),
  ('sb-girly-bunny', (select id from public.collections where slug='school-bags'),
   'شنطة ظهر BUNNY بتصميم أنمي كيوت ✨', 'BUNNY — Anime-Cute School Backpack',
   'اختاري التميز مع شنطة BUNNY بتصميم أنمي عصري وجذاب يناسب البنات اللي بتحب الستايل المرح والمميز. خامات عالية الجودة تجمع بين المتانة والخفة. ٥ ألوان.',
   'BUNNY anime-cute backpack — fun, modern, high-quality. 5 colors.',
   575, null, 'بوليستر متين', 'Durable polyester',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/AMC_4261.jpg?v=1757241391','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/AMC_4258.jpg?v=1757241391','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/AMC_4255.jpg?v=1757241391','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/AMC_4257.jpg?v=1757241391','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/AMC_4237_a0472f7e-3371-403b-84b3-964a53bc373a.jpg?v=1757241391','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/AMC_4238.jpg?v=1754255277'],
   true, 107),
  ('sb-girly-118-korean', (select id from public.collections where slug='school-bags'),
   'شنطة بتصميم كوري كيوت — إصدار خاص', 'Korean-Cute Special Edition Backpack',
   'شنطة ظهر مدرسية بتصميم جذاب ومميز، تجمع بين الشكل الكيوت والعملية في الاستخدام اليومي. مصممة لتناسب المدرسة والجامعة واليوم الدراسي الطويل بخامة قوية. ٧ ألوان.',
   'Korean-cute special edition backpack — modern look, durable build. 7 colors.',
   525, null, 'بوليستر متين', 'Durable polyester',
   array['https://cdn.shopify.com/s/files/1/0601/4782/6923/files/6_5ac6386f-36e8-43d5-8070-46fe0bf910e4.png?v=1754330590','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/3_53565ec6-df2e-42ed-be7b-fc055eaab567.png?v=1754330590','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/1_78f7fee9-a934-4c76-b83a-b3f1becc49ee.png?v=1754330590','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/2_092cf713-4f51-416a-9226-885d92ddc8db.png?v=1754330590','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/4_3540fbdf-b00a-4e38-b94e-0aad34f6a4c3.png?v=1754330590','https://cdn.shopify.com/s/files/1/0601/4782/6923/files/8_2f6621d4-22dc-4a26-a473-41d14e81da6e.png?v=1754330590'],
   true, 108)
on conflict (slug) do update set
  collection_id=excluded.collection_id, name_ar=excluded.name_ar, name_en=excluded.name_en,
  description_ar=excluded.description_ar, description_en=excluded.description_en,
  base_price=excluded.base_price, material_ar=excluded.material_ar, material_en=excluded.material_en,
  images=excluded.images, is_active=excluded.is_active, sort_order=excluded.sort_order, updated_at=now();

-- ============ VARIANTS ============ (48 total — color only, no sizes)
with t as (
  select
    (select id from public.products where slug='sb-girly-set-4pc')      as p_set,
    (select id from public.products where slug='sb-girly-129')          as p_129,
    (select id from public.products where slug='sb-girly-119')          as p_119,
    (select id from public.products where slug='sb-girly-128')          as p_128,
    (select id from public.products where slug='sb-girly-133')          as p_133,
    (select id from public.products where slug='sb-girly-127')          as p_127,
    (select id from public.products where slug='sb-girly-114')          as p_114,
    (select id from public.products where slug='sb-girly-bunny')        as p_115,
    (select id from public.products where slug='sb-girly-118-korean')   as p_118
)
insert into public.product_variants
  (product_id, sku, color_en, color_ar, color_hex, size_inches, size_label_ar, is_set, price_override, stock_qty)
select
  case v.fam
    when 'SET' then t.p_set when '129' then t.p_129 when '119' then t.p_119
    when '128' then t.p_128 when '133' then t.p_133 when '127' then t.p_127
    when '114' then t.p_114 when '115' then t.p_115 when '118' then t.p_118
  end,
  v.sku, v.color_en, v.color_ar, v.color_hex, null::int, v.size_label_ar, v.is_set, v.price_override, v.stock_qty
from t cross join (values
  ('SET','SB-SET-BLK','Black',       'أسود',       '#0d0d0d', 'طقم ٤ قطع'::text, true,  445::numeric, 30),
  ('SET','SB-SET-LAV','Lavender',    'لافندر',     '#c8a8e0', 'طقم ٤ قطع',       true,  445,          30),
  ('SET','SB-SET-CRL','Coral Pink',  'كورال وردي', '#ff7f7f', 'طقم ٤ قطع',       true,  445,          30),
  ('SET','SB-SET-MIN','Mint',        'منت',        '#98d4b5', 'طقم ٤ قطع',       true,  445,          30),
  ('129','SB-129-BEI','Beige',       'بيج',        '#d4b483', null,              false, 645,          25),
  ('129','SB-129-KSH','Kashmir',     'كشمير',      '#b8a380', null,              false, 645,          25),
  ('129','SB-129-LAV','Lavender',    'لافندر',     '#c8a8e0', null,              false, 645,          25),
  ('129','SB-129-BBL','Baby Blue',   'بيبي بلو',   '#aed8e6', null,              false, 645,          25),
  ('129','SB-129-MIN','Mint',        'منت',        '#98d4b5', null,              false, 645,          25),
  ('119','SB-119-SUG','Sugar Pink',  'سكري',       '#f5d0d0', null,              false, 600,          25),
  ('119','SB-119-BEI','Beige',       'بيج',        '#d4b483', null,              false, 600,          25),
  ('119','SB-119-GRA','Gray',        'جراي',       '#999999', null,              false, 600,          25),
  ('119','SB-119-LAV','Lavender',    'لافندر',     '#c8a8e0', null,              false, 600,          25),
  ('119','SB-119-BLK','Black',       'أسود',       '#0d0d0d', null,              false, 600,          25),
  ('128','SB-128-BLK','Black',       'أسود',       '#0d0d0d', null,              false, 625,          25),
  ('128','SB-128-KSH','Kashmir',     'كشمير',      '#b8a380', null,              false, 625,          25),
  ('128','SB-128-MIN','Mint',        'منت',        '#98d4b5', null,              false, 625,          25),
  ('128','SB-128-BRN','Brown',       'بني',        '#6b4423', null,              false, 625,          25),
  ('128','SB-128-BBL','Baby Blue',   'بيبي بلو',   '#aed8e6', null,              false, 625,          25),
  ('133','SB-133-BEI','Beige',       'بيج',        '#d4b483', null,              false, 625,          25),
  ('133','SB-133-BLK','Black',       'أسود',       '#0d0d0d', null,              false, 625,          25),
  ('133','SB-133-KSH','Kashmir',     'كشمير',      '#b8a380', null,              false, 625,          25),
  ('133','SB-133-BBL','Baby Blue',   'بيبي بلو',   '#aed8e6', null,              false, 625,          25),
  ('133','SB-133-LAV','Lavender',    'لافندر',     '#c8a8e0', null,              false, 625,          25),
  ('133','SB-133-MIN','Mint',        'منت',        '#98d4b5', null,              false, 625,          25),
  ('127','SB-127-KSL','Kashmir Light','كشمير فاتح','#d4c4a0', null,               false, 625,          25),
  ('127','SB-127-BBL','Baby Blue',   'بيبي بلو',   '#aed8e6', null,              false, 625,          25),
  ('127','SB-127-LAV','Lavender',    'لافندر',     '#c8a8e0', null,              false, 625,          25),
  ('127','SB-127-BLK','Black',       'أسود',       '#0d0d0d', null,              false, 625,          25),
  ('127','SB-127-BRN','Brown',       'بني',        '#6b4423', null,              false, 625,          25),
  ('114','SB-114-OLV','Olive',       'زيتي',       '#708030', null,              false, 595,          25),
  ('114','SB-114-BRN','Brown',       'بني',        '#6b4423', null,              false, 595,          25),
  ('114','SB-114-LAV','Lavender',    'لافندر',     '#c8a8e0', null,              false, 595,          25),
  ('114','SB-114-KSH','Kashmir',     'كشمير',      '#b8a380', null,              false, 595,          25),
  ('114','SB-114-BLK','Black',       'أسود',       '#0d0d0d', null,              false, 595,          25),
  ('114','SB-114-NAV','Navy',        'كحلي',       '#1b2b4b', null,              false, 595,          25),
  ('115','SB-115-BLK','Black',       'أسود',       '#0d0d0d', null,              false, 575,          25),
  ('115','SB-115-KSH','Kashmir',     'كشمير',      '#b8a380', null,              false, 575,          25),
  ('115','SB-115-BBL','Baby Blue',   'بيبي بلو',   '#aed8e6', null,              false, 575,          25),
  ('115','SB-115-LAV','Lavender',    'لافندر',     '#c8a8e0', null,              false, 575,          25),
  ('115','SB-115-GRA','Gray',        'جراي',       '#999999', null,              false, 575,          25),
  ('118','SB-118-SUG','Sugar Pink',  'سكري',       '#f5d0d0', null,              false, 525,          25),
  ('118','SB-118-LGR','Light Gray',  'جراي فاتح',  '#c7c7c7', null,              false, 525,          25),
  ('118','SB-118-BBL','Baby Blue',   'بيبي بلو',   '#aed8e6', null,              false, 525,          25),
  ('118','SB-118-LVL','Lavender Light','لافندر فاتح','#dbc2ed', null,             false, 525,          25),
  ('118','SB-118-LVD','Lavender Dark','لافندر غامق','#9a6dc1', null,              false, 525,          25),
  ('118','SB-118-BLK','Black',       'أسود',       '#0d0d0d', null,              false, 525,          25),
  ('118','SB-118-BRN','Brown',       'بني',        '#6b4423', null,              false, 525,          25)
) as v(fam, sku, color_en, color_ar, color_hex, size_label_ar, is_set, price_override, stock_qty)
on conflict (sku) do update set
  product_id=excluded.product_id, color_en=excluded.color_en, color_ar=excluded.color_ar,
  color_hex=excluded.color_hex, size_label_ar=excluded.size_label_ar, is_set=excluded.is_set,
  price_override=excluded.price_override, stock_qty=excluded.stock_qty;

-- ============ CLEANUP ============
-- Placeholder cleanup is shared with the backpacks seed (single DELETE covers both collections);
-- see seed-backpacks-girly-import.sql for the DELETE statement.
