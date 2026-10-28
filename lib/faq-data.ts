/**
 * FAQ content. Bilingual at the leaf so the page can switch locale without
 * threading translations through a dictionary file for a static page.
 *
 * Keep new categories in sync with the FAQ_CATEGORIES order — the page tabs
 * render in this order.
 */

export type FAQCategoryId =
  | "shipping"
  | "payment"
  | "returns"
  | "products"
  | "orders";

export type FAQCategory = {
  id: FAQCategoryId;
  ar: string;
  en: string;
};

export type FAQItem = {
  category: FAQCategoryId;
  qAr: string;
  qEn: string;
  aAr: string;
  aEn: string;
};

export const FAQ_CATEGORIES: ReadonlyArray<FAQCategory> = [
  { id: "shipping", ar: "الشحن والتوصيل", en: "Shipping & Delivery" },
  { id: "payment", ar: "الدفع", en: "Payment" },
  { id: "returns", ar: "الإرجاع والضمان", en: "Returns & Warranty" },
  { id: "products", ar: "المنتجات", en: "Products" },
  { id: "orders", ar: "الطلبات", en: "Orders" },
];

export const FAQ_ITEMS: ReadonlyArray<FAQItem> = [
  // ─── Shipping & Delivery ────────────────────────────────────────────
  {
    category: "shipping",
    qAr: "كام يوم التوصيل؟",
    qEn: "How long does delivery take?",
    aAr: "التوصيل بياخد من 2 لـ 5 أيام عمل حسب المحافظة.",
    aEn: "Delivery takes 2–5 business days depending on the governorate.",
  },
  {
    category: "shipping",
    qAr: "بتوصلوا لكل المحافظات؟",
    qEn: "Do you ship to every governorate?",
    aAr: "آه، بنوصل لكل 27 محافظة في مصر.",
    aEn: "Yes — we deliver to all 27 governorates across Egypt.",
  },
  {
    category: "shipping",
    qAr: "الشحن بكام؟",
    qEn: "How much is shipping?",
    aAr: "الشحن بـ LE 50، ومجاني للطلبات اللي فوق LE 1,500.",
    aEn: "Shipping is LE 50, and free on orders over LE 1,500.",
  },
  {
    category: "shipping",
    qAr: "M.M Bags مقرها فين؟",
    qEn: "Where is M.M Bags based?",
    aAr: "M.M Bags متجر مصري من سوهاج من سنة 1998، ليه فرعين في مدينة طما (شارع الشهداء وشارع العزراء) مفتوحين يوميًا من 11 الصبح لـ 10 بالليل، وبيشحن أونلاين لكل محافظات مصر.",
    aEn: "M.M Bags is an Egyptian store from Sohag, founded in 1998, with two branches in Tama (Shohada Street and Al-Ozraa Street) open daily 11 AM – 10 PM, and it ships online to every governorate in Egypt.",
  },

  // ─── Payment ────────────────────────────────────────────────────────
  {
    category: "payment",
    qAr: "طرق الدفع المتاحة؟",
    qEn: "What payment methods do you accept?",
    aAr: "في M.M Bags تقدر تدفع كاش عند الاستلام، أو تحويل InstaPay. الدفع بالكارت والتقسيط مش متاحين حاليًا.",
    aEn: "M.M Bags accepts cash on delivery or an InstaPay transfer. Card payments and instalments aren't available at the moment.",
  },
  {
    category: "payment",
    qAr: "الدفع عند الاستلام بكام رسوم إضافية؟",
    qEn: "Are there extra fees for cash on delivery?",
    aAr: "في رسوم إضافية LE 25 على طلبات الدفع عند الاستلام. التحويل بـ InstaPay ملوش رسوم.",
    aEn: "An extra LE 25 fee applies to cash-on-delivery orders. InstaPay transfers have no fee.",
  },
  {
    category: "payment",
    qAr: "إزاي أدفع بـ InstaPay؟",
    qEn: "How do I pay with InstaPay?",
    aAr: "اختار InstaPay في صفحة الدفع وأكّد الطلب، هيظهرلك حساب InstaPay والمبلغ، حوّل وابعت صورة الإيصال على واتساب. الطلب بيتحجز لك ساعتين عمل لحد ما التحويل يوصل.",
    aEn: "Choose InstaPay at checkout and confirm the order; you'll see the InstaPay account and amount. Transfer, then send the receipt on WhatsApp. The order is held for two business hours while the transfer arrives.",
  },

  // ─── Returns & Warranty ─────────────────────────────────────────────
  {
    category: "returns",
    qAr: "سياسة الإرجاع إيه؟",
    qEn: "What is your return policy?",
    aAr: "عندك 14 يوم من الاستلام ترجع فيهم المنتج أو تستبدله، طالما بحالته الأصلية ومعاه الفاتورة.",
    aEn: "You have 14 days from delivery to return or exchange the product, as long as it's unused, in its original packaging, with the invoice.",
  },
  {
    category: "returns",
    qAr: "مين بيدفع شحن الإرجاع؟",
    qEn: "Who pays for return shipping?",
    aAr: "لو غيّرت رأيك أو عايز مقاس أو لون تاني، بتدفع شحن الإرجاع (في حدود 50 ج.م لمعظم المحافظات). لو فيه عيب تصنيع أو المنتج وصل تالف، M.M Bags بتتحمّل المصاريف كلها.",
    aEn: "If you changed your mind or want another size or colour, you pay the return shipping (about LE 50 for most governorates). If there's a manufacturing defect or it arrived damaged, M.M Bags covers it in full.",
  },
  {
    category: "returns",
    qAr: "إزاي أرجع منتج؟",
    qEn: "How do I return a product?",
    aAr: "تواصل معانا على WhatsApp وهنرتب الإرجاع.",
    aEn: "Message us on WhatsApp and we'll arrange the return.",
  },
  {
    category: "returns",
    qAr: "في ضمان على المنتجات؟",
    qEn: "Is there a warranty on products?",
    aAr: "آه، ضمان سنة كاملة على عيوب التصنيع.",
    aEn: "Yes — a full one-year warranty against manufacturing defects.",
  },

  // ─── Products ───────────────────────────────────────────────────────
  {
    category: "products",
    // Not "100% original": the CK / LV collections are inspired designs
    // (owner, 2026-10-28), and this answer is also in the FAQPage JSON-LD.
    qAr: "المنتجات مضمونة؟",
    qEn: "Are the products guaranteed?",
    aAr: "آه، كل منتج عليه ضمان سنة ضد عيوب الصناعة، وتقدر ترجعه خلال 14 يوم. منتجات تشكيلتي Calvin Klein و LV تصميمات مستوحاة (inspired)، مش من إنتاج البراندات دي.",
    aEn: "Yes — every product has a one-year warranty against manufacturing defects and a 14-day return window. The Calvin Klein and LV collections are inspired designs, not made by those brands.",
  },
  {
    category: "products",
    qAr: "في مقاسات مختلفة؟",
    qEn: "Do you offer different sizes?",
    aAr: "آه — المقاسات بتختلف حسب الموديل، والمقاسات المتاحة لكل شنطة مكتوبة في صفحتها، بالإضافة لطواقم كاملة.",
    aEn: "Yes — sizes vary by model; each bag's page lists the sizes it comes in, plus full luggage sets.",
  },
  {
    category: "products",
    qAr: "إيه مقاس شنطة الكابينة المسموح في الطيارة؟",
    qEn: "What size cabin bag is allowed on a plane?",
    // Kept in step with lib/guides/cabin-by-airline.ts (checked 2026-10-14).
    aAr: "مفيش مقاس واحد لكل الشركات، والمقاس دايمًا شامل العجل. مصر للطيران 55 × 40 × 23 سم ولحد 8 كيلو، والعربية للطيران 55 × 40 × 20 سم و7 كيلو. مقاس IATA ‏56 × 45 × 25 مرجع عام مش قاعدة، وأكبر من حد شركات كتير. التفاصيل في دليل «مقاس ووزن شنطة الكابينة»، وراجع شروط شركتك قبل السفر.",
    aEn: "There's no single size for every airline, and sizes always include wheels. EgyptAir allows 55 × 40 × 23 cm and up to 8 kg; Air Arabia 55 × 40 × 20 cm and 7 kg. IATA's 56 × 45 × 25 is a general reference, not a rule, and is bigger than many airlines allow. Details are in our \"Cabin bag size and weight\" guide — always check your airline's rules before you fly.",
  },
  {
    category: "products",
    qAr: "إزاي أختار المقاس المناسب؟",
    qEn: "How do I pick the right size?",
    aAr: "استخدم دليل المقاسات الذكي على صفحة كل منتج سفر.",
    aEn: "Use the smart Size Guide on any travel-bag product page.",
  },

  // ─── Orders ─────────────────────────────────────────────────────────
  {
    category: "orders",
    qAr: "إزاي أتابع طلبي؟",
    qEn: "How do I track my order?",
    aAr: "من خلال صفحة /track أو الرابط في رسالة التأكيد.",
    aEn: "Through the /track page or the link in your confirmation message.",
  },
  {
    category: "orders",
    qAr: "أقدر أغير طلبي بعد ما أكده؟",
    qEn: "Can I change my order after confirming it?",
    aAr: "تواصل معانا خلال ساعة من تأكيد الطلب وهنقدر نعدله.",
    aEn: "Contact us within one hour of confirming and we can update it.",
  },
  {
    category: "orders",
    qAr: "طلبي تأخر، أعمل إيه؟",
    qEn: "My order is delayed — what should I do?",
    aAr: "تواصل معانا على WhatsApp فوراً وهنتابع الشحنة معاك.",
    aEn: "Message us on WhatsApp right away and we'll track the shipment with you.",
  },
];
