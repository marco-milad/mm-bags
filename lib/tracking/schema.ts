import { z } from "zod";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER_NUMBER_RE = /^MM-\d{4}-[A-Z0-9]+$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isOrderNumber(value: string): boolean {
  return ORDER_NUMBER_RE.test(value);
}

export const verifyTrackingSchema = z.object({
  orderIdOrNumber: z
    .string()
    .trim()
    .refine((v) => isUuid(v) || isOrderNumber(v), {
      message: "رقم الطلب غير صحيح",
    }),
  phoneLast4: z.string().trim().regex(/^\d{4}$/, {
    message: "ادخل آخر 4 أرقام من رقم موبايلك",
  }),
});

export type VerifyTrackingInput = z.infer<typeof verifyTrackingSchema>;

/**
 * Machine-readable tracking error codes (H3). Additive — the server keeps
 * returning a human `error` string as a fallback, and the client localizes
 * from this code. NOT_FOUND is used for BOTH "order doesn't exist" and
 * "phone doesn't match" so the two cases stay indistinguishable.
 */
export type TrackingErrorCode = "INVALID_INPUT" | "NOT_FOUND";

// Public-safe shape returned to the client after verification.
export type TrackingTimelineStep =
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered";

export type TrackingResult = {
  orderNumber: string;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  paymentMethod: "card" | "cod";
  total: number;
  createdAt: string;
  estimatedDelivery: string | null;
  recipientName: string;
  recipientPhone: string; // already masked
  governorate: string;
  city: string;
  courierName: string | null;
  trackingNumber: string | null;
  items: {
    name: string;
    qty: number;
    image: string | null;
  }[];
};
