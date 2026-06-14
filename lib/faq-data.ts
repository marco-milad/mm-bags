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
    qAr: "في شحن سريع؟",
    qEn: "Is express shipping available?",
    aAr: "آه، متاح في القاهرة والجيزة خلال 24 ساعة.",
    aEn: "Yes — available in Cairo and Giza within 24 hours.",
  },

  // ─── Payment ────────────────────────────────────────────────────────
  {
    category: "payment",
    qAr: "طرق الدفع المتاحة؟",
    qEn: "What payment methods do you accept?",
    aAr: "بنقبل الدفع بالكارت أو كاش عند الاستلام.",
    aEn: "We accept card payments and cash on delivery.",
  },
  {
    category: "payment",
    qAr: "الدفع عند الاستلام بكام رسوم إضافية؟",
    qEn: "Are there extra fees for cash on delivery?",
    aAr: "في رسوم إضافية LE 25 على طلبات الدفع عند الاستلام.",
    aEn: "An extra LE 25 fee applies to cash-on-delivery orders.",
  },
  {
    category: "payment",
    qAr: "في تقسيط؟",
    qEn: "Do you offer installments?",
    aAr: "آه، التقسيط متاح عن طريق Valu و Sympl.",
    aEn: "Yes — installments are available via Valu and Sympl.",
  },

  // ─── Returns & Warranty ─────────────────────────────────────────────
  {
    category: "returns",
    qAr: "سياسة الإرجاع إيه؟",
    qEn: "What is your return policy?",
    aAr: "عندك 14 يوم من الاستلام ترجع فيهم المنتج.",
    aEn: "You have 14 days from delivery to return the product.",
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
    qAr: "المنتجات أصلية؟",
    qEn: "Are the products authentic?",
    aAr: "آه، كل المنتجات أصلية 100% ومضمونة.",
    aEn: "Yes — every product is 100% authentic and guaranteed.",
  },
  {
    category: "products",
    qAr: "في مقاسات مختلفة؟",
    qEn: "Do you offer different sizes?",
    aAr: 'آه — متاح 20" و 24" و 28"، بالإضافة لطواقم كاملة.',
    aEn: 'Yes — available in 20", 24", and 28", plus full luggage sets.',
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
