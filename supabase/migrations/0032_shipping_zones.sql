-- 0032 — Shipping price per area (courier: Urgent, 2026-11-11).
--
-- The flat EGP 50 shipping fee is replaced by the courier's price for the
-- customer's area. Each governorate has one or more zones (e.g. Cairo vs
-- Shorouk/Badr/New Capital, Hurghada vs Marsa Alam). Checkout reads the
-- active zones server-side and placeOrder re-reads the chosen zone's fee —
-- the browser never decides the price.
--
-- Orders also record:
--   shipping_zone_id — which zone was charged (null for older orders / POS)
--   cod_fee          — the courier's cash-collection fee passed to the
--                      customer (30 up to 1,000 + 5 per extra 1,000)
--   shipped_at       — when the order was handed to the courier; the
--                      28–36 h delivery clock starts here.
--
-- Security: RLS on, no policies → only the service role (server code) can
-- read or write zones, the same model as orders.
--
-- Prices from the courier's sheet (photo, confirmed by Marco 2026-11-11).
-- Rows marked needs_review were NOT on the sheet (cut off / missing) and
-- carry the highest listed price until Marco confirms them in /admin/shipping.

BEGIN;

CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL UNIQUE,
  governorate_code text NOT NULL,
  name_ar          text NOT NULL,
  name_en          text NOT NULL,
  fee              numeric(10,2) NOT NULL CHECK (fee >= 0 AND fee <= 5000),
  sort_order       int NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  needs_review     boolean NOT NULL DEFAULT false,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipping_zones_governorate_idx
  ON public.shipping_zones (governorate_code, sort_order);

ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shipping_zones FROM anon, authenticated;
GRANT ALL ON public.shipping_zones TO service_role;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_zone_id uuid REFERENCES public.shipping_zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cod_fee numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz;

INSERT INTO public.shipping_zones (code, governorate_code, name_ar, name_en, fee, sort_order, needs_review) VALUES
  -- Upper Egypt (the shop is in Tama, Sohag)
  ('sohag',          'sohag',          'سوهاج (كل المراكز، ومنها طما وجهينة)', 'Sohag (all districts incl. Tama, Juhayna)', 135, 0, false),
  ('assiut',         'assiut',         'أسيوط (ومنها الغنايم)',               'Assiut (incl. El Ghanayem)',                135, 0, false),
  ('qena',           'qena',           'قنا / نجع حمادي',                    'Qena / Nag Hammadi',                        135, 0, false),
  ('luxor',          'luxor',          'الأقصر',                             'Luxor',                                     135, 0, false),
  ('aswan',          'aswan',          'أسوان بمراكزها',                      'Aswan (all districts)',                     175, 0, false),
  ('fayoum',         'fayoum',         'الفيوم',                             'Fayoum',                                    145, 0, false),
  ('beni-suef',      'beni-suef',      'بني سويف',                           'Beni Suef',                                 145, 0, false),
  ('minya',          'minya',          'المنيا',                             'Minya',                                     145, 0, false),
  -- Greater Cairo
  ('cairo',          'cairo',          'القاهرة',                            'Cairo',                                     155, 0, false),
  ('cairo-east',     'cairo',          'الشروق / بدر / العاصمة الإدارية',      'Shorouk / Badr / New Capital',              165, 1, false),
  ('giza',           'giza',           'الجيزة',                             'Giza',                                      155, 0, false),
  ('qalyubia',       'qalyubia',       'القليوبية (بنها)',                    'Qalyubia (Banha)',                          155, 0, false),
  -- Alexandria, Delta, Canal
  ('alexandria',     'alexandria',     'الإسكندرية',                          'Alexandria',                                155, 0, false),
  ('beheira',        'beheira',        'البحيرة / دمنهور',                    'Beheira / Damanhour',                       155, 0, false),
  ('sharqia',        'sharqia',        'الشرقية / الزقازيق',                  'Sharqia / Zagazig',                         155, 0, false),
  ('gharbia',        'gharbia',        'الغربية (طنطا، المحلة)',              'Gharbia (Tanta, El Mahalla)',               155, 0, false),
  ('kafr-el-sheikh', 'kafr-el-sheikh', 'كفر الشيخ / دسوق',                    'Kafr El Sheikh / Desouk',                   155, 0, false),
  ('monufia',        'monufia',        'المنوفية / شبين الكوم',               'Monufia / Shebin El Kom',                   155, 0, false),
  ('damietta',       'damietta',       'دمياط',                              'Damietta',                                  155, 0, false),
  ('dakahlia',       'dakahlia',       'الدقهلية / المنصورة',                 'Dakahlia / Mansoura',                       155, 0, false),
  ('ismailia',       'ismailia',       'الإسماعيلية',                         'Ismailia',                                  155, 0, false),
  ('qantara',        'ismailia',       'القنطرة',                            'El Qantara',                                165, 1, false),
  ('port-said',      'port-said',      'بورسعيد / بورفؤاد',                   'Port Said / Port Fouad',                    165, 0, false),
  ('suez',           'suez',           'السويس',                             'Suez',                                      155, 0, false),
  ('ain-sokhna',     'suez',           'العين السخنة',                        'Ain Sokhna',                                220, 1, false),
  -- Red Sea
  ('hurghada',       'red-sea',        'الغردقة',                            'Hurghada',                                  195, 0, false),
  ('marsa-alam',     'red-sea',        'مرسى علم',                           'Marsa Alam',                                215, 1, false),
  ('red-sea-other',  'red-sea',        'باقي مدن البحر الأحمر (سفاجا، القصير، رأس غارب)', 'Other Red Sea towns (Safaga, El Quseir, Ras Gharib)', 270, 2, true),
  -- South Sinai
  ('sharm',          'south-sinai',    'شرم الشيخ',                          'Sharm El Sheikh',                           210, 0, false),
  ('ras-sedr',       'south-sinai',    'رأس سدر / أبو زنيمة / أبو رديس',       'Ras Sedr / Abu Zenima / Abu Rudeis',        220, 1, false),
  ('dahab',          'south-sinai',    'دهب / نويبع',                         'Dahab / Nuweiba',                           270, 2, false),
  ('south-sinai-other','south-sinai',  'باقي جنوب سيناء (الطور، سانت كاترين، طابا)', 'Rest of South Sinai (El Tor, St Catherine, Taba)', 270, 3, true),
  -- Matrouh, frontier
  ('matrouh',        'matrouh',        'مرسى مطروح / الساحل الشمالي',          'Marsa Matrouh / North Coast',               225, 0, false),
  ('north-sinai',    'north-sinai',    'شمال سيناء (العريش)',                 'North Sinai (El Arish)',                    270, 0, true),
  ('new-valley',     'new-valley',     'الوادي الجديد',                        'New Valley',                                270, 0, true)
ON CONFLICT (code) DO NOTHING;

COMMIT;
