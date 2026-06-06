-- Women's bags import from jumia.com.eg (Egypt marketplace).
-- 20 products · 20 variants · 66 unique images served from eg.jumia.is.
-- Split across two collections:
--   - 10 LADIES BAGS (shoulder/tote/ladies-backpack) — sort_order 100-109
--   - 10 HANDBAGS (crossbody/clutch/top-handle)     — sort_order 100-109
-- Slug-prefixed with `jm-`.
-- SKUs: LD-001..010 for ladies bags (NOT LB- — that prefix is reserved for the
-- laptop bags collection, 62 existing variants), HB-001..010 for handbags.
-- Idempotent: ON CONFLICT updates on slug + SKU.

-- ============ LADIES BAGS ============
insert into public.products
  (slug, collection_id, name_ar, name_en, description_ar, description_en,
   base_price, sale_price, material_ar, material_en, images, is_active, sort_order)
values
  ('jm-activ-olive-backpack', (select id from public.collections where slug='ladies-bags'),
   'شنطة ظهر Activ — زيتي', 'Activ Self Pattern Backpack — Olive',
   'شنطة ظهر بوليستر بنقشة ذاتية، جيب أمامي وقفل سوستة. مقاس ٤٥×٣٥ سم. لون زيتي غامق وفاتح.',
   'Polyester backpack with self pattern, front pocket and zip closure. 45×35 cm. Olive duotone.',
   399, null, 'بوليستر', 'Polyester',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/28/3795331/1.jpg?7439','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/28/3795331/2.jpg?7439','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/28/3795331/3.jpg?7439','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/28/3795331/4.jpg?7439'],
   true, 100),
  ('jm-stylish-shoulder-black', (select id from public.collections where slug='ladies-bags'),
   'شنطة كتف أنيقة — أسود', 'Stylish Black Shoulder Bag',
   'شنطة كتف بخامة جلد صناعي بلمسة Patina. مقاس ٣٠×٢٢ سم، جيب أمامي بقفل buckle، جيب داخلي بسوستة. تناسب الجامعة والشغل.',
   'Synthetic leather shoulder bag with Patina finish. 30×22 cm, exterior pocket with buckle, interior zip pocket. University & work.',
   270, null, 'جلد صناعي', 'Synthetic leather',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/05/0178331/1.jpg?2432','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/05/0178331/2.jpg?2432','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/05/0178331/3.jpg?2432','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/05/0178331/4.jpg?2432','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/05/0178331/5.jpg?2432'],
   true, 101),
  ('jm-lcw-leather-backpack', (select id from public.collections where slug='ladies-bags'),
   'شنطة ظهر LC Waikiki جلد', 'LC Waikiki Leather Look Backpack',
   'شنطة ظهر بمظهر جلد فاخر — خامة PVC مع بطانة بوليستر. مساحة واسعة وتصميم خفيف. لون أبيض.',
   'Faux leather backpack — PVC outer with polyester lining. Spacious and lightweight. Optical white.',
   349, null, 'PVC ببطانة بوليستر', 'PVC with polyester lining',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/06/4193331/1.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/06/4193331/2.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/06/4193331/3.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/06/4193331/4.jpg'],
   true, 102),
  ('jm-stylish-shoulder-burgundy', (select id from public.collections where slug='ladies-bags'),
   'شنطة كتف أنيقة — بيرجندي', 'Stylish Burgundy Shoulder Bag',
   'شنطة كتف بخامة جلد صناعي بلمسة Patina. مقاس ٣٠×٢٢ سم، جيب أمامي بـ buckle، جيب داخلي بسوستة. لون بيرجندي.',
   'Synthetic leather shoulder bag with Patina finish. 30×22 cm, buckle front pocket, interior zip pocket. Burgundy.',
   270, null, 'جلد صناعي', 'Synthetic leather',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/72/0178331/1.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/72/0178331/2.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/72/0178331/3.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/72/0178331/4.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/72/0178331/5.jpg'],
   true, 103),
  ('jm-stylish-shoulder-brown', (select id from public.collections where slug='ladies-bags'),
   'شنطة كتف أنيقة — بني', 'Stylish Brown Shoulder Bag',
   'نفس تصميم سلسلة Stylish بلمسة Patina — مقاس ٣٠×٢٢ سم، جيب أمامي بـ buckle. لون بني دافئ.',
   'Same Stylish series with Patina finish — 30×22 cm, buckle front pocket. Warm brown.',
   270, null, 'جلد صناعي', 'Synthetic leather',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/29/5291431/1.jpg?7094','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/29/5291431/2.jpg?7094','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/29/5291431/3.jpg?7094','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/29/5291431/4.jpg?7094'],
   true, 104),
  ('jm-minimalist-chic', (select id from public.collections where slug='ladies-bags'),
   'شنطة كتف بسيطة وأنيقة', 'Minimalist Chic Handbag',
   'شنطة كتف بخامة جلد vegan فاخر — يدين قصيرين وسير طويل. مساحة كبيرة للموبايل والمحفظة والتابلت والمكياج. خفيفة وبتحافظ على شكلها.',
   'Premium vegan leather dual-carry — short handles + shoulder strap. Holds phone, wallet, tablet, makeup. Lightweight with firm shape.',
   500, null, 'جلد vegan', 'Vegan leather',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/58/4023431/1.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/58/4023431/2.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/58/4023431/3.jpg'],
   true, 105),
  ('jm-bs-canvas-tote-black', (select id from public.collections where slug='ladies-bags'),
   'شنطة Tote قماش B.S — أسود', 'B.S Canvas Tote Bag — Black',
   'شنطة Tote نايلون فاخر — مقاس ٢٩×٣٠×١١ سم، جيب داخلي، سوستة كاملة، حمالة كتف ٣٠ سم، ومحفظة هدية. خفيفة ومتينة للاستخدام اليومي.',
   'Premium nylon tote — 29×30×11 cm, internal pocket, full zip, 30 cm strap, matching wallet. Lightweight and durable.',
   400, null, 'نايلون قماش', 'Nylon canvas',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/35/470064/1.jpg?8733','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/35/470064/2.jpg?8733','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/35/470064/3.jpg?8733','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/35/470064/4.jpg?8733','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/35/470064/5.jpg?8733'],
   true, 106),
  ('jm-lcw-braided-shoulder', (select id from public.collections where slug='ladies-bags'),
   'شنطة كتف LC Waikiki مضفّرة', 'LC Waikiki Braided Pattern Shoulder Bag',
   'شنطة كتف جلد صناعي بنقشة مضفّرة — قاعدة بوليستر ١٠٠٪ مع طلاء PVC. لون بني فاخر.',
   'Faux leather shoulder bag with braided pattern — 100% polyester base with PVC coating. Rich brown.',
   699, null, 'بوليستر مع PVC', 'Polyester with PVC',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/04/9582431/1.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/04/9582431/2.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/04/9582431/3.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/04/9582431/4.jpg'],
   true, 107),
  ('jm-bs-boom-shoulder-black', (select id from public.collections where slug='ladies-bags'),
   'شنطة كتف B.S Boom كبيرة — أسود', 'B.S Boom Big Shoulder Bag — Black',
   'شنطة كتف نايلون فاخر — مقاس ٢٦×١٩.٥×١١ بوصة. جيوب متعددة، حمالة جلد، خفيفة وتسع للاب توب.',
   'Premium nylon shoulder bag — 26×19.5×11 inch. Multi compartments, zip pockets, leather handle, laptop-friendly.',
   499, null, 'نايلون فاخر', 'Premium nylon',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/29/177874/1.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/29/177874/2.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/29/177874/3.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/29/177874/4.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/29/177874/5.jpg'],
   true, 108),
  ('jm-black-shoulder-elegant', (select id from public.collections where slug='ladies-bags'),
   'شنطة كتف جلد أنيقة — أسود', 'Elegant Black Leather Shoulder Bag',
   'شنطة كتف جلد عالي الجودة بخياطة دقيقة. مقاس ٣٨×٢٥ سم. مساحة كافية لأساسيات اليوم. مناسبة للعمل والجامعة.',
   'High-grade leather shoulder bag with fine stitching. 38×25 cm. Holds daily essentials. Work & university.',
   389, null, 'جلد طبيعي', 'Genuine leather',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/72/4598331/1.jpg?7504','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/72/4598331/2.jpg?7504','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/72/4598331/3.jpg?7504','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/72/4598331/4.jpg?7504'],
   true, 109)
on conflict (slug) do update set
  collection_id=excluded.collection_id, name_ar=excluded.name_ar, name_en=excluded.name_en,
  description_ar=excluded.description_ar, description_en=excluded.description_en,
  base_price=excluded.base_price, material_ar=excluded.material_ar, material_en=excluded.material_en,
  images=excluded.images, is_active=excluded.is_active, sort_order=excluded.sort_order, updated_at=now();

-- ============ HANDBAGS ============
insert into public.products
  (slug, collection_id, name_ar, name_en, description_ar, description_en,
   base_price, sale_price, material_ar, material_en, images, is_active, sort_order)
values
  ('jm-vintage-envelope-crossbody', (select id from public.collections where slug='handbags'),
   'شنطة كروس فينتاج — أسود', 'Vintage Envelope Crossbody — Black',
   'شنطة كروس بمظهر فينتاج بشكل ظرف. خامة PU جلد ناعم مع بطانة بوليستر، سوستة معدنية. متعددة الاستخدام كروس أو كلتش. مقاس ١٨×٢٠ سم.',
   'Vintage envelope-shape crossbody. Soft PU leather with polyester lining, metal zip. Doubles as clutch or wristlet. 18×20 cm.',
   199, null, 'PU جلد', 'PU leather',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/65/848262/1.jpg?1735'],
   true, 100),
  ('jm-glitter-crossbody-black', (select id from public.collections where slug='handbags'),
   'شنطة كروس بريقة — أسود', 'Glitter Crossbody — Black',
   'شنطة كروس جلد صناعي بنقشة كويلتد ولمعة بريقة. حمالة سلسلة معدنية. تناسب المناسبات الكاجوال والرسمية.',
   'Faux leather crossbody with quilted texture and chain strap. Sophisticated for casual or formal.',
   350, null, 'جلد صناعي', 'Faux leather',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/59/8819001/1.jpg?3792','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/59/8819001/2.jpg?3792','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/59/8819001/3.jpg?3792'],
   true, 101),
  ('jm-glitter-cross-hand-black', (select id from public.collections where slug='handbags'),
   'شنطة كروس وكف بريقة — أسود', 'Glitter Cross-Hand Bag — Black',
   'شنطة بلمعة بريقة وخيارات حمل متعددة. خامة جلد صناعي متين. تنفع كروس أو كف. مساحة عملية.',
   'Glitter finish with versatile carry — crossbody or hand-carry. Durable faux leather.',
   270, null, 'جلد صناعي', 'Faux leather',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/70/7621031/1.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/70/7621031/2.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/70/7621031/3.jpg'],
   true, 102),
  ('jm-crossbody-elegant-black', (select id from public.collections where slug='handbags'),
   'شنطة كروس أنيقة — أسود', 'Elegant Crossbody — Black',
   'شنطة كروس عملية وخفيفة لاستخدام يومي — تسع الموبايل والمحفظة والمفاتيح والمكياج. تصميم عصري للعمل والجامعة والخروجات.',
   'Lightweight everyday crossbody — phone, wallet, keys, cosmetics. Modern look for work, university, outings.',
   265, null, 'جلد صناعي', 'Faux leather',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/46/9771431/1.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/46/9771431/2.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/46/9771431/3.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/46/9771431/4.jpg'],
   true, 103),
  ('jm-leather-tote-black', (select id from public.collections where slug='handbags'),
   'شنطة كتف ويد جلد — أسود', 'Leather Top-Handle Bag — Black',
   'شنطة كتف ويد جلد صناعي عالي الجودة. تصميم شيك وعصري بمساحة كبيرة. تناسب الخروجات الكاجوال والمناسبات.',
   'High-grade faux leather top-handle bag. Chic and roomy. Casual outings and classic events.',
   325, null, 'جلد صناعي', 'Faux leather',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/23/210484/1.jpg'],
   true, 104),
  ('jm-leather-tote-beige', (select id from public.collections where slug='handbags'),
   'شنطة كتف ويد جلد — بيج', 'Leather Top-Handle Bag — Beige',
   'نفس تصميم الكتف واليد بخامة جلد صناعي فاخر. لون بيج. مساحة واسعة لأساسيات اليوم.',
   'Same top-handle design in premium faux leather. Beige. Ample space for daily essentials.',
   325, null, 'جلد صناعي', 'Faux leather',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/92/210484/1.jpg'],
   true, 105),
  ('jm-snake-skin-handbag', (select id from public.collections where slug='handbags'),
   'شنطة يد بنقشة ثعبان — أسود', 'Snake Skin Handbag — Black',
   'شنطة يد PU جلد بنقشة snake skin. مقاس ٤٣×١٢×٣٢ سم. تقسيمات داخلية، جيب خلفي، جيب داخلي بسوستة.',
   'PU leather handbag with snake skin print. 43×12×32 cm. Multi compartments, back pocket, interior zip pocket.',
   449, null, 'PU جلد', 'PU leather',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/07/308342/1.jpg?9674','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/07/308342/2.jpg?9674','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/07/308342/3.jpg?9674'],
   true, 106),
  ('jm-croc-3piece-set', (select id from public.collections where slug='handbags'),
   'طقم ٣ قطع جلد كروكوديل', '3-Piece Crocodile Leather Set',
   'طقم ٣ قطع جلد كروكوديل — شنطة كبيرة + كروس + محفظة كروت. جيوب متعددة، قفل سوستة، تصميم خفيف للاستخدام اليومي.',
   '3-piece croc-print leather set — large bag + crossbody + card wallet. Multi pockets, zip closure, lightweight.',
   490, null, 'جلد كروكوديل صناعي', 'Croc-print leather',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/40/425436/1.jpg?7104'],
   true, 107),
  ('jm-croc-3piece-black', (select id from public.collections where slug='handbags'),
   'طقم ٣ قطع جلد كروكوديل — أسود', '3-Piece Crocodile Leather Set — Black',
   'طقم ٣ قطع جلد كروكوديل أسود — تصميم أنيق، وزن خفيف ٠.٦٥ كجم، لمسة لاكيه لامعة سهلة التنظيف، جيوب متعددة.',
   '3-piece black croc-print leather set — elegant, 0.65 kg, glossy lacquer finish, multi pockets.',
   525, null, 'جلد كروكوديل صناعي', 'Croc-print leather',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/66/3162031/1.jpg'],
   true, 108),
  ('jm-bs-wallet-grey', (select id from public.collections where slug='handbags'),
   'محفظة B.S — رمادي', 'B.S Wallet — Grey',
   'محفظة جلد صناعي بسعة كبيرة. جيبين رئيسيين، ٣ جيوب فرعية (واحد بسوستة وواحد بقفل مغناطيس)، جيب كروت، وغطاء مغناطيس. مقاس ١٧×١٩×٩ سم.',
   'Synthetic leather wallet, large capacity. 2 main + 3 sub pockets (zip + magnetic), card slot, magnetic flap. 17×19×9 cm.',
   300, null, 'جلد صناعي', 'Synthetic leather',
   array['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/84/470064/1.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/84/470064/2.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/84/470064/3.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/84/470064/4.jpg','https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/84/470064/5.jpg'],
   true, 109)
on conflict (slug) do update set
  collection_id=excluded.collection_id, name_ar=excluded.name_ar, name_en=excluded.name_en,
  description_ar=excluded.description_ar, description_en=excluded.description_en,
  base_price=excluded.base_price, material_ar=excluded.material_ar, material_en=excluded.material_en,
  images=excluded.images, is_active=excluded.is_active, sort_order=excluded.sort_order, updated_at=now();

-- ============ VARIANTS ============ (20 total — 1 per product, single-color)
insert into public.product_variants
  (product_id, sku, color_en, color_ar, color_hex, size_inches, size_label_ar, is_set, price_override, stock_qty)
select p.id, v.sku, v.color_en, v.color_ar, v.color_hex,
       null::int, v.size_label_ar, v.is_set, v.price_override, v.stock_qty
from (values
  ('jm-activ-olive-backpack',       'LD-001','Olive',    'زيتي',    '#708030', null::text, false, 399::numeric, 20),
  ('jm-stylish-shoulder-black',     'LD-002','Black',    'أسود',    '#0d0d0d', null,       false, 270,          20),
  ('jm-lcw-leather-backpack',       'LD-003','White',    'أبيض',    '#ffffff', null,       false, 349,          20),
  ('jm-stylish-shoulder-burgundy',  'LD-004','Burgundy', 'بيرجندي', '#800020', null,       false, 270,          20),
  ('jm-stylish-shoulder-brown',     'LD-005','Brown',    'بني',     '#6b4423', null,       false, 270,          20),
  ('jm-minimalist-chic',            'LD-006','Black',    'أسود',    '#0d0d0d', null,       false, 500,          20),
  ('jm-bs-canvas-tote-black',       'LD-007','Black',    'أسود',    '#0d0d0d', null,       false, 400,          20),
  ('jm-lcw-braided-shoulder',       'LD-008','Brown',    'بني',     '#6b4423', null,       false, 699,          15),
  ('jm-bs-boom-shoulder-black',     'LD-009','Black',    'أسود',    '#0d0d0d', null,       false, 499,          20),
  ('jm-black-shoulder-elegant',     'LD-010','Black',    'أسود',    '#0d0d0d', null,       false, 389,          20),
  ('jm-vintage-envelope-crossbody', 'HB-001','Black',    'أسود',    '#0d0d0d', null,       false, 199,          20),
  ('jm-glitter-crossbody-black',    'HB-002','Black',    'أسود',    '#0d0d0d', null,       false, 350,          20),
  ('jm-glitter-cross-hand-black',   'HB-003','Black',    'أسود',    '#0d0d0d', null,       false, 270,          20),
  ('jm-crossbody-elegant-black',    'HB-004','Black',    'أسود',    '#0d0d0d', null,       false, 265,          20),
  ('jm-leather-tote-black',         'HB-005','Black',    'أسود',    '#0d0d0d', null,       false, 325,          20),
  ('jm-leather-tote-beige',         'HB-006','Beige',    'بيج',     '#d4b483', null,       false, 325,          20),
  ('jm-snake-skin-handbag',         'HB-007','Black',    'أسود',    '#0d0d0d', null,       false, 449,          20),
  ('jm-croc-3piece-set',            'HB-008','Brown',    'بني',     '#6b4423', 'طقم ٣ قطع', true, 490,          15),
  ('jm-croc-3piece-black',          'HB-009','Black',    'أسود',    '#0d0d0d', 'طقم ٣ قطع', true, 525,          15),
  ('jm-bs-wallet-grey',             'HB-010','Gray',     'رمادي',   '#999999', null,       false, 300,          25)
) as v(slug, sku, color_en, color_ar, color_hex, size_label_ar, is_set, price_override, stock_qty)
join public.products p on p.slug = v.slug
on conflict (sku) do update set
  product_id=excluded.product_id, color_en=excluded.color_en, color_ar=excluded.color_ar,
  color_hex=excluded.color_hex, size_label_ar=excluded.size_label_ar, is_set=excluded.is_set,
  price_override=excluded.price_override, stock_qty=excluded.stock_qty;

-- ============ CLEANUP ============
-- Drops the original 4 placeholders (tote-bag-classic, crossbody-bag in
-- ladies-bags + handbag-classic, evening-clutch in handbags) and any of their
-- cascading variants. Anything jm-* prefixed is preserved.
delete from public.products
where collection_id in (select id from public.collections where slug in ('ladies-bags','handbags'))
  and slug not like 'jm-%';
