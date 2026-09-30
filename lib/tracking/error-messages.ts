import type { Locale } from "@/lib/i18n-config";
import type { TrackingErrorCode } from "./schema";

// Locale-specific copy for order-tracking validation and server errors (H3).
// Pure and dependency-free (no React, no server-only imports, no side effects).

type Bilingual = { ar: string; en: string };

/** Fields the tracking form can surface an error for. */
export type TrackingField = "orderIdOrNumber" | "phoneLast4";

const FIELD_MESSAGES: Record<TrackingField, Bilingual> = {
  orderIdOrNumber: {
    ar: "رقم الطلب غير صحيح",
    en: "Invalid order number",
  },
  phoneLast4: {
    ar: "ادخل آخر 4 أرقام من رقم موبايلك",
    en: "Enter the last 4 digits of your phone number",
  },
};

/** Localized message for a tracking form field error. */
export function trackingFieldMessage(field: TrackingField, locale: Locale): string {
  return FIELD_MESSAGES[field][locale];
}

// Server-error copy. NOT_FOUND is deliberately identical for "order doesn't
// exist" and "phone doesn't match" so the reply can never be used to
// enumerate orders — the anti-enumeration guard lives in the shared code.
const SERVER_MESSAGES: Record<TrackingErrorCode, Bilingual> = {
  INVALID_INPUT: {
    ar: "بيانات غير صحيحة. تأكد من رقم الطلب والموبايل.",
    en: "Invalid details. Check the order number and phone.",
  },
  NOT_FOUND: {
    ar: "البيانات مش متطابقة. تأكد من رقم الطلب والموبايل.",
    en: "The details don't match. Check the order number and phone.",
  },
};

/** Localized message for a tracking server error code. */
export function trackingErrorMessage(code: TrackingErrorCode, locale: Locale): string {
  return SERVER_MESSAGES[code][locale];
}
