import { z } from "zod";
import { GOVERNORATE_CODES } from "./governorates";
import { effectiveWebPrice } from "@/lib/catalog-shared";

export const FREE_SHIPPING_THRESHOLD = 1500;
export const SHIPPING_FEE = 50;
export const COD_FEE = 25;

/** Max units of a single variant per cart line (mirrors the cart store's
 *  MAX_QTY). Centralized so the Zod schema and the server-side validator
 *  agree on the ceiling. */
export const MAX_LINE_QTY = 99;

/** Price-comparison tolerance (half a piastre) — same epsilon the POS
 *  price-diff badge uses, so rounding noise never reads as a price change. */
const PRICE_EPSILON = 0.005;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const shippingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "الاسم لازم يكون حرفين على الأقل" })
    .max(100),
  phone: z
    .string()
    .trim()
    .regex(/^01[0125]\d{8}$/, {
      message: "رقم موبايل غير صحيح — لازم يبدأ بـ 010 / 011 / 012 / 015",
    }),
  email: z
    .union([z.literal(""), z.string().email({ message: "بريد إلكتروني غير صحيح" })])
    .optional(),
  governorate: z.enum(GOVERNORATE_CODES as [string, ...string[]], {
    message: "اختار المحافظة",
  }),
  city: z.string().trim().min(2, { message: "اكتب اسم المدينة" }).max(100),
  street: z.string().trim().min(3, { message: "اكتب عنوان الشارع" }).max(200),
  building: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

// Payment methods creatable from the customer checkout. The DB CHECK
// constraint still allows 'card' for backwards-compat with any
// historical row, but new orders can only be COD or InstaPay until
// the Paymob integration lands.
export const CHECKOUT_PAYMENT_METHODS = ["cod", "instapay"] as const;
export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

export const paymentSchema = z.object({
  paymentMethod: z.enum(CHECKOUT_PAYMENT_METHODS, {
    message: "اختار طريقة الدفع",
  }),
});

export const checkoutSchema = shippingSchema.extend(paymentSchema.shape);

export type ShippingValues = z.infer<typeof shippingSchema>;
export type CheckoutValues = z.infer<typeof checkoutSchema>;

export const cartLineSchema = z.object({
  variantId: z.string().uuid(),
  productId: z.string().uuid(),
  qty: z.number().int().positive().max(MAX_LINE_QTY),
  // Client-supplied price is a HINT only (used to detect a stale cart).
  // The server re-derives the authoritative price from the DB and never
  // trusts this value for money — see validateCartLines below.
  unitPrice: z.number().nonnegative(),
  name_ar: z.string(),
  name_en: z.string(),
  image: z.string().nullable(),
  color_ar: z.string().nullable(),
  color_en: z.string().nullable(),
  color_hex: z.string().nullable(),
  size_inches: z.number().int().nullable(),
});

export const placeOrderInputSchema = z.object({
  checkout: checkoutSchema,
  items: z.array(cartLineSchema).min(1, { message: "السلة فاضية" }),
});

export type PlaceOrderInput = z.infer<typeof placeOrderInputSchema>;

export function calcTotals(
  items: { qty: number; unitPrice: number }[],
  paymentMethod: CheckoutPaymentMethod,
) {
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  // Only COD carries the collection surcharge; InstaPay is a direct
  // bank transfer with no per-order fee we need to pass through.
  const codFee = paymentMethod === "cod" ? COD_FEE : 0;
  const total = subtotal + shippingFee + codFee;
  return { subtotal, shippingFee, codFee, total };
}

// ============================================================
// Server-side cart validation (H2 — price & stock integrity)
// ============================================================
// The client cart lives in localStorage and can be tampered with or go
// stale. Before an order is created the server re-validates every line
// against the database: existence, availability, stock, and — most
// importantly — PRICE. The client price is never used for money.
//
// This function is intentionally PURE (no I/O): it takes the client lines
// plus the authoritative DB rows and returns the validated, server-priced
// result. The DB fetch lives in lib/checkout/validate-cart.ts. Keeping the
// logic pure makes it unit-testable without a database.

/** Machine-readable outcome codes the checkout UI can branch on. */
export type PlaceOrderErrorCode =
  | "INVALID_CART"
  | "PRODUCT_UNAVAILABLE"
  | "VARIANT_NOT_FOUND"
  | "INVALID_QUANTITY"
  | "INSUFFICIENT_STOCK"
  | "PRICE_CHANGED"
  | "CHECKOUT_FAILED";

/** The subset of a cart line the validator needs. Full cart lines
 *  (with snapshot name/image) satisfy this structurally. */
export type ClientCartLine = {
  variantId: string;
  productId: string;
  qty: number;
  /** What the shopper saw — a hint for stale-price detection only. */
  unitPrice: number;
};

/** Authoritative variant + its parent product, as read from the DB. */
export type AuthoritativeVariant = {
  id: string;
  product_id: string | null;
  stock_qty: number;
  price_override: number | null;
  product: {
    id: string;
    is_active: boolean;
    name_ar: string;
    name_en: string;
    base_price: number;
    sale_price: number | null;
  } | null;
};

/** A fully validated line priced from the database. */
export type ValidatedLine = {
  variantId: string;
  productId: string;
  qty: number;
  /** Authoritative unit price (DB), never the client's. */
  unitPrice: number;
  lineTotal: number;
};

/** A line whose DB price no longer matches what the shopper saw. */
export type RepricedLine = {
  variantId: string;
  oldUnitPrice: number;
  newUnitPrice: number;
};

export type ValidateCartLinesResult =
  | { ok: true; lines: ValidatedLine[]; subtotal: number }
  | {
      ok: false;
      code:
        | "PRODUCT_UNAVAILABLE"
        | "VARIANT_NOT_FOUND"
        | "INVALID_QUANTITY"
        | "INSUFFICIENT_STOCK"
        | "PRICE_CHANGED";
      /** The offending variant (for VARIANT/PRODUCT/QTY/STOCK failures). */
      variantId?: string;
      /** Product name for a user-facing message, when the row was found. */
      productName?: { ar: string; en: string };
      /** Units actually in stock (for INSUFFICIENT_STOCK). */
      available?: number;
      /** Fresh authoritative prices the UI must apply (for PRICE_CHANGED). */
      reprice?: RepricedLine[];
    };

/**
 * Validate client cart lines against authoritative DB rows.
 *
 * Precedence: a hard failure (missing/unavailable/invalid-qty/out-of-stock)
 * on any line is returned immediately and wins over a price change — an
 * unavailable item matters more than a reprice. Only when every line clears
 * the hard checks do we consider price drift; if any line's DB price differs
 * from the client hint beyond PRICE_EPSILON we return PRICE_CHANGED carrying
 * the fresh prices so the UI can update the cart and re-confirm.
 *
 * On success, every returned line is priced from the database — the client
 * price is discarded entirely.
 */
export function validateCartLines(
  clientLines: ReadonlyArray<ClientCartLine>,
  dbVariants: ReadonlyArray<AuthoritativeVariant>,
): ValidateCartLinesResult {
  const byId = new Map(dbVariants.map((v) => [v.id, v]));
  const lines: ValidatedLine[] = [];
  const reprice: RepricedLine[] = [];

  for (const line of clientLines) {
    const variant = byId.get(line.variantId);
    if (!variant) {
      return { ok: false, code: "VARIANT_NOT_FOUND", variantId: line.variantId };
    }

    const product = variant.product;
    if (!product || product.is_active !== true) {
      return {
        ok: false,
        code: "PRODUCT_UNAVAILABLE",
        variantId: line.variantId,
        productName: product
          ? { ar: product.name_ar, en: product.name_en }
          : undefined,
      };
    }

    if (!Number.isInteger(line.qty) || line.qty <= 0 || line.qty > MAX_LINE_QTY) {
      return {
        ok: false,
        code: "INVALID_QUANTITY",
        variantId: line.variantId,
        productName: { ar: product.name_ar, en: product.name_en },
      };
    }

    const available = variant.stock_qty ?? 0;
    if (available < line.qty) {
      return {
        ok: false,
        code: "INSUFFICIENT_STOCK",
        variantId: line.variantId,
        productName: { ar: product.name_ar, en: product.name_en },
        available,
      };
    }

    const unitPrice = effectiveWebPrice(product, variant);
    // Number.isFinite guard: a missing/NaN client hint must not read as a
    // price change (it just means "no hint") — the authoritative price is
    // used regardless.
    if (
      Number.isFinite(line.unitPrice) &&
      Math.abs(unitPrice - line.unitPrice) > PRICE_EPSILON
    ) {
      reprice.push({
        variantId: line.variantId,
        oldUnitPrice: line.unitPrice,
        newUnitPrice: unitPrice,
      });
    }

    lines.push({
      variantId: line.variantId,
      productId: product.id,
      qty: line.qty,
      unitPrice,
      lineTotal: round2(unitPrice * line.qty),
    });
  }

  if (reprice.length > 0) {
    return { ok: false, code: "PRICE_CHANGED", reprice };
  }

  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  return { ok: true, lines, subtotal };
}
