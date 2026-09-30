import type { Locale } from "@/lib/i18n-config";
import type { PlaceOrderErrorCode } from "./schema";

// Locale-specific copy for checkout validation and server errors (H3).
//
// Pure and dependency-free: no React, no server-only imports, no side
// effects — the Zod schemas keep their (Arabic) messages for server-side
// parsing, and the client renders the strings below by locale instead of
// echoing the raw Zod message. Mirrors the inline-ternary i18n used across
// the app, just centralized so checkout copy lives in one place.

type Bilingual = { ar: string; en: string };

/** Fields the checkout shipping/payment forms can surface an error for. */
export type CheckoutField =
  | "name"
  | "phone"
  | "email"
  | "governorate"
  | "city"
  | "street"
  | "building"
  | "notes"
  | "paymentMethod";

const FIELD_MESSAGES: Record<CheckoutField, Bilingual> = {
  name: {
    ar: "الاسم لازم يكون حرفين على الأقل",
    en: "Enter your full name (at least 2 characters)",
  },
  phone: {
    ar: "رقم موبايل غير صحيح — لازم يبدأ بـ 010 / 011 / 012 / 015",
    en: "Invalid mobile number — must start with 010 / 011 / 012 / 015",
  },
  email: {
    ar: "بريد إلكتروني غير صحيح",
    en: "Invalid email address",
  },
  governorate: {
    ar: "اختار المحافظة",
    en: "Select a governorate",
  },
  city: {
    ar: "اكتب اسم المدينة",
    en: "Enter your city / area",
  },
  street: {
    ar: "اكتب عنوان الشارع",
    en: "Enter your street address",
  },
  building: {
    ar: "الحد الأقصى 100 حرف",
    en: "Maximum 100 characters",
  },
  notes: {
    ar: "الحد الأقصى 500 حرف",
    en: "Maximum 500 characters",
  },
  paymentMethod: {
    ar: "اختار طريقة الدفع",
    en: "Choose a payment method",
  },
};

/** Localized message for a checkout form field error. */
export function checkoutFieldMessage(field: CheckoutField, locale: Locale): string {
  return FIELD_MESSAGES[field][locale];
}

// Server-error copy, keyed by the H2 PlaceOrderErrorCode contract. These are
// deliberately GENERIC — INSUFFICIENT_STOCK / PRODUCT_UNAVAILABLE never name a
// product or count (the server no longer needs to expose that to the client).
const SERVER_MESSAGES: Record<PlaceOrderErrorCode, Bilingual> = {
  INVALID_CART: {
    ar: "بيانات الطلب غير صحيحة. راجع سلتك من فضلك.",
    en: "Your order details are invalid. Please review your cart.",
  },
  PRODUCT_UNAVAILABLE: {
    ar: "أحد المنتجات في سلتك لم يعد متاحاً. راجع سلتك من فضلك.",
    en: "An item in your cart is no longer available. Please review your cart.",
  },
  VARIANT_NOT_FOUND: {
    ar: "أحد المنتجات في سلتك لم يعد متاحاً. راجع سلتك من فضلك.",
    en: "An item in your cart is no longer available. Please review your cart.",
  },
  INVALID_QUANTITY: {
    ar: "الكمية المطلوبة غير صحيحة. راجع سلتك من فضلك.",
    en: "The requested quantity is invalid. Please review your cart.",
  },
  INSUFFICIENT_STOCK: {
    ar: "الكمية المطلوبة غير متوفرة حالياً. راجع سلتك من فضلك.",
    en: "Some items are out of stock. Please review your cart.",
  },
  PRICE_CHANGED: {
    ar: "أسعار بعض المنتجات اتغيّرت. حدّثنا سلتك بالأسعار الجديدة — راجِع الإجمالي وأكّد الطلب تاني.",
    en: "Some prices changed. We've updated your cart — please review the new total and place the order again.",
  },
  CHECKOUT_FAILED: {
    ar: "حصلت مشكلة أثناء تنفيذ الطلب. حاول تاني.",
    en: "Something went wrong placing your order. Please try again.",
  },
};

/** Localized message for a placeOrder server error code. */
export function checkoutErrorMessage(code: PlaceOrderErrorCode, locale: Locale): string {
  return SERVER_MESSAGES[code][locale];
}
