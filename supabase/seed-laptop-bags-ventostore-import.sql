-- Laptop bag/sleeve import from ventostore.net.
-- 10 consolidated products · 56 variants · ~60 unique images served from cdn.shopify.com.
-- ventostore lists 13-14" and 15-16" of the same family as separate Shopify products
-- (17 source pages total); we merge each family into one product with size+color variants.
-- Slug-prefixed with `lb-`. Idempotent: ON CONFLICT updates on slug + SKU.

-- ============ PRODUCTS ============
insert into public.products
  (slug, collection_id, name_ar, name_en, description_ar, description_en,
   base_price, sale_price, material_ar, material_en, images, is_active, sort_order)
values
  (
    'lb-teddy-sleeve',
    (select id from public.collections where slug = 'laptop-bags'),
    'كفر لاب توب — Teddy',
    'Teddy Laptop Sleeve',
    'كفر لاب توب بتصميم أنيق وتخطيط داخلي ذكي. خامة مقاومة للماء وحماية متقدمة ضد الصدمات. مناسب للعمل والاستخدام اليومي. متوفر بمقاسي ١٣-١٤ بوصة و ١٥-١٦ بوصة وبـ ٤ ألوان.',
    'Elegant-shaped laptop sleeve with a smart interior layout, waterproof exterior, and shockproof padding. Business-ready in 13-14" and 15-16" sizes, 4 colors each.',
    1549, null,
    'بوليستر مقاوم للماء مع حشوة ضد الصدمات',
    'Waterproof polyester with shockproof padding',
    array[
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_2908.jpg?v=1775417827',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_2909.jpg?v=1775417827',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_2910.jpg?v=1775417827',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_2911.jpg?v=1775417827',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_2912.jpg?v=1775417827',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_2913.jpg?v=1775417829'
    ],
    true, 100
  ),
  (
    'lb-minimal-classic',
    (select id from public.collections where slug = 'laptop-bags'),
    'كفر لاب توب — كلاسيكي بسيط',
    'Minimal Classic Sleeve',
    'كفر لاب توب بتصميم كلاسيكي بسيط — حماية ضد الصدمات، خامة مقاومة للماء، تخطيط ذكي للجيوب. متوفر بمقاسي ١٣-١٤ و ١٥-١٦ بوصة وبـ ٣ ألوان رصينة.',
    'Minimal classic sleeve — shockproof padding, water-resistant fabric, smart pocket layout. Available in 13-14" and 15-16" sizes, 3 neutral colors.',
    1449, null,
    'بوليستر مقاوم للماء',
    'Water-resistant polyester',
    array[
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_2925.jpg?v=1775418644',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_2926.jpg?v=1775418644',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_2932.jpg?v=1775418644',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_2929.jpg?v=1775418644',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_2935.jpg?v=1775417840',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_2936.jpg?v=1775417840'
    ],
    true, 101
  ),
  (
    'lb-elegant-shape',
    (select id from public.collections where slug = 'laptop-bags'),
    'كفر لاب توب — شكل أنيق',
    'Elegant Shape Laptop Sleeve',
    'كفر لاب توب بشكل أنيق وتخطيط داخلي ذكي. حماية ضد الصدمات، خامة مقاومة للماء، مناسب للأعمال. متوفر بمقاسي ١٣-١٤ و ١٥-١٦ بوصة وبـ ٥ ألوان.',
    'Elegant-shape sleeve with smart interior layout, shockproof padding, water-resistant material. Business-ready in 13-14" and 15-16" sizes, 5 colors.',
    1599, null,
    'بوليستر مقاوم للماء مع حشوة ضد الصدمات',
    'Waterproof polyester with shockproof padding',
    array[
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0550.jpg?v=1763582732',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_2954.jpg?v=1775416897',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_2952.jpg?v=1775416897',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_05492.jpg?v=1775416897',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0551.jpg?v=1775416897',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0553.jpg?v=1775416959'
    ],
    true, 102
  ),
  (
    'lb-himawari',
    (select id from public.collections where slug = 'laptop-bags'),
    'شنطة لاب توب — Himawari',
    'Himawari Laptop Bag',
    'شنطة لاب توب Himawari بحزام قابل للفصل — مقاس ٣٧ × ٢٨ سم، مصممة للابات ١٣-١٤ بوصة. متوفرة بـ ٣ ألوان.',
    'Himawari laptop bag with detachable shoulder strap — 37 × 28 cm, fits 13-14" laptops. 3 colors available.',
    1699, null,
    'بوليستر متين',
    'Durable polyester',
    array[
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/Torba-etui-Himawari-2513-na-laptopa-15-6-z-odpinanym-paskiem-30151-640x640.webp?v=1770397649',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/Torba-etui-Himawari-2513-na-laptopa-15-6-z-odpinanym-paskiem-30153-640x640.webp?v=1770397182',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/Torba-etui-Himawari-2513-na-laptopa-15-6-z-odpinanym-paskiem-30147-640x640.webp?v=1770397649',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/Torba-etui-Himawari-2513-na-laptopa-15-6-z-odpinanym-paskiem-30152-640x640.webp?v=1770397649',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/Torba-etui-Himawari-2513-na-laptopa-15-6-z-odpinanym-paskiem-30156-640x640.webp?v=1770397182',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/Torba-etui-Himawari-2513-na-laptopa-15-6-z-odpinanym-paskiem-30149-640x640.webp?v=1770397649'
    ],
    true, 103
  ),
  (
    'lb-elegant-versatile',
    (select id from public.collections where slug = 'laptop-bags'),
    'كفر لاب توب — متعدد الاستخدامات',
    'Elegant Versatile Laptop Sleeve',
    'كفر لاب توب متعدد الاستخدامات بتصميم Tote — متعدد الطبقات، سعة كبيرة، حشوة ضد الصدمات، خامة بوليستر مقاومة للماء. متوفر بمقاسي ١٣-١٤ و ١٥-١٦ بوصة.',
    'Versatile tote-style laptop sleeve — multi-layer, large capacity, shockproof padding, waterproof polyester. Available in 13-14" (3 colors) and 15-16" (2 colors).',
    999, null,
    'بوليستر مقاوم للماء',
    'Water-resistant polyester',
    array[
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0536_82449aff-0843-4a8b-8fdb-75c7febdb6ec.jpg?v=1764107613',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/He40aeab218554bcf823340c5c2b6518b1_b7f16ad5-c621-48ab-8059-3676ab864bb3.jpg?v=1764107613',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/H16a80fbb16064d29b91c0b198ae35f54J.jpg?v=1764107613',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0538_912035f7-0279-460a-b8f6-a56db86da31b.jpg?v=1763050257',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0540_652ffc9a-7102-4d2c-a671-99271edfe43b.jpg?v=1763050257',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0535_86270cfa-c4f7-4877-8314-0cb3694f80ef.jpg?v=1764107613'
    ],
    true, 104
  ),
  (
    'lb-sleek-style',
    (select id from public.collections where slug = 'laptop-bags'),
    'كفر لاب توب — أنيق',
    'Sleek Style Laptop Sleeve',
    'كفر لاب توب بتصميم أنيق — جيوب متعددة الطبقات، طبقة مقاومة للماء، بطانة ناعمة ضد الصدمات، هيكل متين. متوفر بمقاسي ١٣-١٤ و ١٥-١٦ بوصة وبـ ٥ ألوان.',
    'Sleek-style sleeve — multi-layer compartments, water-resistant coating, soft shockproof lining, durable structure. Available in 13-14" and 15-16" sizes, 5 colors each.',
    1499, null,
    'بوليستر مقاوم للماء',
    'Water-resistant polyester',
    array[
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0547.jpg?v=1763582719',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0545.jpg?v=1770502176',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0542.jpg?v=1770502176',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0543.jpg?v=1770502176',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0544.jpg?v=1770502176',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_2956.jpg?v=1775417169'
    ],
    true, 105
  ),
  (
    'lb-minimalist',
    (select id from public.collections where slug = 'laptop-bags'),
    'كفر لاب توب — تصميم بسيط',
    'Minimalist Design Laptop Sleeve',
    'كفر لاب توب بتصميم بسيط — سعة كبيرة، حشوة ضد الصدمات، طبقة خارجية مقاومة للماء، خفيف الوزن. متوفر بمقاسي ١٣-١٤ و ١٥-١٦ بوصة وبـ ٣ ألوان.',
    'Minimalist design sleeve — large capacity, shockproof cushioning, waterproof exterior, lightweight feel. Available in 13-14" and 15-16" sizes, 3 colors each.',
    1499, null,
    'بوليستر مقاوم للماء',
    'Water-resistant polyester',
    array[
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0597.jpg?v=1770502269',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/d3780324-cf4b-487d-b89f-15ce9b5104b2.jpg?v=1770502269',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/He54d2c3ec722493fb800208cebc7af5dr.jpg?v=1770502269',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0670.jpg?v=1770502269',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0596.jpg?v=1764111163',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0667.jpg?v=1764111163'
    ],
    true, 106
  ),
  (
    'lb-contemporary',
    (select id from public.collections where slug = 'laptop-bags'),
    'كفر لاب توب — تصميم عصري',
    'Contemporary Design Laptop Sleeve',
    'كفر لاب توب بتصميم عصري — طبقات وظيفية، قماش مقاوم للماء، بطانة داخلية ضد الصدمات. مناسب للاستخدام اليومي. مقاس ١٣-١٤ بوصة، ٣ ألوان.',
    'Contemporary design sleeve — functional layers, waterproof fabric, shockproof interior. Built for everyday use. 13-14" size, 3 colors.',
    1499, null,
    'بوليستر مقاوم للماء',
    'Water-resistant polyester',
    array[
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0587.jpg?v=1770502110',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0590.jpg?v=1770502110',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0581.jpg?v=1770502110',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0582.jpg?v=1770502110',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0583.jpg?v=1770502110',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0584.jpg?v=1770502110'
    ],
    true, 107
  ),
  (
    'lb-stylish-look',
    (select id from public.collections where slug = 'laptop-bags'),
    'كفر لاب توب — مظهر شيك',
    'Stylish Look Laptop Sleeve',
    'كفر لاب توب بمظهر شيك — جيوب داخلية متعددة، خامة مقاومة للماء، بطانة ضد الصدمات، مثالي للعمل والسفر. مقاس ١٥-١٦ بوصة، ٣ ألوان.',
    'Stylish look sleeve — multi-compartment interior, waterproof material, shockproof lining. Perfect for work and travel. 15-16" size, 3 colors.',
    1499, null,
    'بوليستر مقاوم للماء',
    'Water-resistant polyester',
    array[
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0559.jpg?v=1768327120',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0560.jpg?v=1768327120',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/9b90c5f0-f848-4877-a392-abc648f6803c.jpg?v=1768327120',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0561.jpg?v=1762976040'
    ],
    true, 108
  ),
  (
    'lb-elegant-texture',
    (select id from public.collections where slug = 'laptop-bags'),
    'كفر لاب توب — ملمس فاخر',
    'Elegant Texture Laptop Sleeve',
    'كفر لاب توب بملمس فاخر — مساحة داخلية واسعة، بوليستر متين، حشوة ضد الصدمات، خامة مقاومة للماء. مقاس ١٥-١٦ بوصة، لونين.',
    'Elegant texture sleeve — spacious interior, durable polyester, shockproof padding, water-resistant finish. 15-16" size, 2 colors.',
    1199, null,
    'بوليستر مقاوم للماء',
    'Water-resistant polyester',
    array[
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0564.jpg?v=1762976141',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0565.jpg?v=1762976142',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0566.jpg?v=1762976142',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0567.jpg?v=1762976142',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0568.jpg?v=1762976142',
      'https://cdn.shopify.com/s/files/1/0911/1627/4029/files/IMG_0569.jpg?v=1762976142'
    ],
    true, 109
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
-- 56 variants across 10 products, 14 distinct color × hex pairs.
with target as (
  select
    (select id from public.products where slug = 'lb-teddy-sleeve')        as ted,
    (select id from public.products where slug = 'lb-minimal-classic')     as mcl,
    (select id from public.products where slug = 'lb-elegant-shape')       as els,
    (select id from public.products where slug = 'lb-himawari')            as him,
    (select id from public.products where slug = 'lb-elegant-versatile')   as elv,
    (select id from public.products where slug = 'lb-sleek-style')         as slk,
    (select id from public.products where slug = 'lb-minimalist')          as min,
    (select id from public.products where slug = 'lb-contemporary')        as con,
    (select id from public.products where slug = 'lb-stylish-look')        as stl,
    (select id from public.products where slug = 'lb-elegant-texture')     as elt
)
insert into public.product_variants
  (product_id, sku, color_en, color_ar, color_hex,
   size_inches, size_label_ar, is_set, price_override, stock_qty)
select
  case v.fam
    when 'TED' then t.ted when 'MCL' then t.mcl when 'ELS' then t.els
    when 'HIM' then t.him when 'ELV' then t.elv when 'SLK' then t.slk
    when 'MIN' then t.min when 'CON' then t.con when 'STL' then t.stl
    when 'ELT' then t.elt
  end,
  v.sku, v.color_en, v.color_ar, v.color_hex,
  v.size_inches, v.size_label_ar, v.is_set, v.price_override, v.stock_qty
from target t
cross join (values
  -- Teddy: 4 colors × 2 sizes = 8
  ('TED','LB-TED-S-OFW','off white',    'أوف وايت',     '#f5f0e6', 13::int, '١٣-١٤ بوصة', false, 1549::numeric, 25),
  ('TED','LB-TED-S-MGN','mint Green',   'أخضر نعناعي',  '#98d4b5', 13,      '١٣-١٤ بوصة', false, 1549,          25),
  ('TED','LB-TED-S-PUR','Purple',       'بنفسجي',       '#7e3a93', 13,      '١٣-١٤ بوصة', false, 1549,          25),
  ('TED','LB-TED-S-GRN','Green',        'أخضر',         '#5a8268', 13,      '١٣-١٤ بوصة', false, 1549,          25),
  ('TED','LB-TED-M-OFW','off white',    'أوف وايت',     '#f5f0e6', 15,      '١٥-١٦ بوصة', false, 1749,          25),
  ('TED','LB-TED-M-MGN','mint Green',   'أخضر نعناعي',  '#98d4b5', 15,      '١٥-١٦ بوصة', false, 1749,          25),
  ('TED','LB-TED-M-PUR','Purple',       'بنفسجي',       '#7e3a93', 15,      '١٥-١٦ بوصة', false, 1749,          25),
  ('TED','LB-TED-M-GRN','Green',        'أخضر',         '#5a8268', 15,      '١٥-١٦ بوصة', false, 1749,          25),
  -- Minimal Classic: 3 × 2 = 6
  ('MCL','LB-MCL-S-GRA','Gray',         'رمادي',        '#999999', 13,      '١٣-١٤ بوصة', false, 1449,          25),
  ('MCL','LB-MCL-S-DGR','Dark gray',    'رمادي غامق',   '#4a4a4a', 13,      '١٣-١٤ بوصة', false, 1449,          25),
  ('MCL','LB-MCL-S-BLK','Black',        'أسود',         '#0d0d0d', 13,      '١٣-١٤ بوصة', false, 1449,          25),
  ('MCL','LB-MCL-M-GRA','Gray',         'رمادي',        '#999999', 15,      '١٥-١٦ بوصة', false, 1649,          25),
  ('MCL','LB-MCL-M-DGR','Dark gray',    'رمادي غامق',   '#4a4a4a', 15,      '١٥-١٦ بوصة', false, 1649,          25),
  ('MCL','LB-MCL-M-BLK','Black',        'أسود',         '#0d0d0d', 15,      '١٥-١٦ بوصة', false, 1649,          25),
  -- Elegant Shape: 5 × 2 = 10
  ('ELS','LB-ELS-S-GRA','Gray',         'رمادي',        '#999999', 13,      '١٣-١٤ بوصة', false, 1599,          25),
  ('ELS','LB-ELS-S-MGN','mint Green',   'أخضر نعناعي',  '#98d4b5', 13,      '١٣-١٤ بوصة', false, 1599,          25),
  ('ELS','LB-ELS-S-PNK','Pink',         'وردي',         '#e8a4a4', 13,      '١٣-١٤ بوصة', false, 1599,          25),
  ('ELS','LB-ELS-S-LBL','Light Blue',   'سماوي فاتح',   '#b0d4e6', 13,      '١٣-١٤ بوصة', false, 1599,          25),
  ('ELS','LB-ELS-S-LGR','Light Gray',   'رمادي فاتح',   '#c7c7c7', 13,      '١٣-١٤ بوصة', false, 1599,          25),
  ('ELS','LB-ELS-M-GRA','Gray',         'رمادي',        '#999999', 15,      '١٥-١٦ بوصة', false, 1799,          25),
  ('ELS','LB-ELS-M-MGN','mint Green',   'أخضر نعناعي',  '#98d4b5', 15,      '١٥-١٦ بوصة', false, 1799,          25),
  ('ELS','LB-ELS-M-PNK','Pink',         'وردي',         '#e8a4a4', 15,      '١٥-١٦ بوصة', false, 1799,          25),
  ('ELS','LB-ELS-M-LBL','Light Blue',   'سماوي فاتح',   '#b0d4e6', 15,      '١٥-١٦ بوصة', false, 1599,          25),
  ('ELS','LB-ELS-M-LGR','Light Gray',   'رمادي فاتح',   '#c7c7c7', 15,      '١٥-١٦ بوصة', false, 1599,          25),
  -- Himawari: 3 colors, single size (13" / 37×28cm)
  ('HIM','LB-HIM-S-MGN','mint Green',   'أخضر نعناعي',  '#98d4b5', 13,      '١٣ بوصة',    false, 1699,          20),
  ('HIM','LB-HIM-S-RED','Red',          'أحمر',         '#c0392b', 13,      '١٣ بوصة',    false, 1699,          20),
  ('HIM','LB-HIM-S-BLK','Black',        'أسود',         '#0d0d0d', 13,      '١٣ بوصة',    false, 1699,          20),
  -- Elegant Versatile: asymmetric (3 for 13-14, 2 for 15-16) = 5
  ('ELV','LB-ELV-S-GRN','Green',        'أخضر',         '#5a8268', 13,      '١٣-١٤ بوصة', false,  999,          25),
  ('ELV','LB-ELV-S-BEI','Beige',        'بيج',          '#d4b483', 13,      '١٣-١٤ بوصة', false,  999,          25),
  ('ELV','LB-ELV-S-GRA','Gray',         'رمادي',        '#999999', 13,      '١٣-١٤ بوصة', false,  999,          25),
  ('ELV','LB-ELV-M-GRA','Gray',         'رمادي',        '#999999', 15,      '١٥-١٦ بوصة', false, 1199,          25),
  ('ELV','LB-ELV-M-GRN','Green',        'أخضر',         '#5a8268', 15,      '١٥-١٦ بوصة', false, 1199,          25),
  -- Sleek Style: 5 × 2 = 10
  ('SLK','LB-SLK-S-MGN','mint Green',   'أخضر نعناعي',  '#98d4b5', 13,      '١٣-١٤ بوصة', false, 1499,          25),
  ('SLK','LB-SLK-S-GRA','Gray',         'رمادي',        '#999999', 13,      '١٣-١٤ بوصة', false, 1499,          25),
  ('SLK','LB-SLK-S-BLK','Black',        'أسود',         '#0d0d0d', 13,      '١٣-١٤ بوصة', false, 1499,          25),
  ('SLK','LB-SLK-S-BEI','Beige',        'بيج',          '#d4b483', 13,      '١٣-١٤ بوصة', false, 1499,          25),
  ('SLK','LB-SLK-S-CBE','Classic Beige','بيج كلاسيك',   '#c8b89e', 13,      '١٣-١٤ بوصة', false, 1499,          25),
  ('SLK','LB-SLK-M-GRA','Gray',         'رمادي',        '#999999', 15,      '١٥-١٦ بوصة', false, 1699,          25),
  ('SLK','LB-SLK-M-BLK','Black',        'أسود',         '#0d0d0d', 15,      '١٥-١٦ بوصة', false, 1699,          25),
  ('SLK','LB-SLK-M-BEI','Beige',        'بيج',          '#d4b483', 15,      '١٥-١٦ بوصة', false, 1699,          25),
  ('SLK','LB-SLK-M-MGN','mint Green',   'أخضر نعناعي',  '#98d4b5', 15,      '١٥-١٦ بوصة', false, 1699,          25),
  ('SLK','LB-SLK-M-CBE','Classic Beige','بيج كلاسيك',   '#c8b89e', 15,      '١٥-١٦ بوصة', false, 1699,          25),
  -- Minimalist: 3 × 2 = 6
  ('MIN','LB-MIN-S-GRN','Green',        'أخضر',         '#5a8268', 13,      '١٣-١٤ بوصة', false, 1499,          25),
  ('MIN','LB-MIN-S-GRA','Gray',         'رمادي',        '#999999', 13,      '١٣-١٤ بوصة', false, 1499,          25),
  ('MIN','LB-MIN-S-BLK','Black',        'أسود',         '#0d0d0d', 13,      '١٣-١٤ بوصة', false, 1499,          25),
  ('MIN','LB-MIN-M-GRN','Green',        'أخضر',         '#5a8268', 15,      '١٥-١٦ بوصة', false, 1699,          25),
  ('MIN','LB-MIN-M-GRA','Gray',         'رمادي',        '#999999', 15,      '١٥-١٦ بوصة', false, 1699,          25),
  ('MIN','LB-MIN-M-BLK','Black',        'أسود',         '#0d0d0d', 15,      '١٥-١٦ بوصة', false, 1699,          25),
  -- Contemporary: 3 colors, 13-14" only
  ('CON','LB-CON-S-GRN','Green',        'أخضر',         '#5a8268', 13,      '١٣-١٤ بوصة', false, 1499,          25),
  ('CON','LB-CON-S-GRA','Gray',         'رمادي',        '#999999', 13,      '١٣-١٤ بوصة', false, 1499,          25),
  ('CON','LB-CON-S-BLK','Black',        'أسود',         '#0d0d0d', 13,      '١٣-١٤ بوصة', false, 1499,          25),
  -- Stylish Look: 3 colors, 15-16" only
  ('STL','LB-STL-M-GRA','Gray',         'رمادي',        '#999999', 15,      '١٥-١٦ بوصة', false, 1499,          25),
  ('STL','LB-STL-M-OLV','Olive',        'زيتي',         '#708030', 15,      '١٥-١٦ بوصة', false, 1499,          25),
  ('STL','LB-STL-M-BLK','Black',        'أسود',         '#0d0d0d', 15,      '١٥-١٦ بوصة', false, 1499,          25),
  -- Elegant Texture: 2 colors, 15-16" only
  ('ELT','LB-ELT-M-GRA','Gray',         'رمادي',        '#999999', 15,      '١٥-١٦ بوصة', false, 1199,          25),
  ('ELT','LB-ELT-M-BLK','Black',        'أسود',         '#0d0d0d', 15,      '١٥-١٦ بوصة', false, 1199,          25)
) as v(fam, sku, color_en, color_ar, color_hex, size_inches, size_label_ar, is_set, price_override, stock_qty)
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
-- Remove the 3 placeholder laptop bag products from seed.sql.
delete from public.products
where collection_id = (select id from public.collections where slug = 'laptop-bags')
  and slug not like 'lb-%';
