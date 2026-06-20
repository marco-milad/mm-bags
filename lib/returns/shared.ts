/**
 * Client-safe schemas, constants, and types for the returns flow.
 *
 * Lives outside any `"server-only"` file so the modal in
 * components/admin/orders/ReturnOrderDialog and the POS-return form
 * can import schemas without dragging the supabase admin client into
 * the browser bundle.
 *
 * Server-side action handlers (lib/admin/return-actions.ts,
 * lib/pos/return-actions.ts) re-import from here and add the auth
 * gate + DB writes on top.
 */

import { z } from "zod";

// ─── Enums — match the CHECK constraints in migration 0010 ─────────

export const RETURN_REASONS = [
  "defective",
  "wrong_size",
  "wrong_color",
  "changed_mind",
  "damaged_in_shipping",
  "other",
] as const;

export type ReturnReason = (typeof RETURN_REASONS)[number];

export const REFUND_METHODS = [
  "cash",
  "card_original",
  "store_credit",
  "bank_transfer",
] as const;

export type RefundMethod = (typeof REFUND_METHODS)[number];

// ─── Schemas ───────────────────────────────────────────────────────

/**
 * One returned line item. variantId is required — restock_atomic
 * needs it to lock the variant row. productId is captured for the
 * stock_movements ledger (denormalised in case the product row is
 * later deleted but the audit trail must survive).
 */
export const returnItemSchema = z.object({
  /** The original `order_items.id` (online) or `pos_sale_items.id`
      (POS) the return is referencing. Used as a back-pointer + to
      validate that the requested qty doesn't exceed what was sold. */
  sourceItemId: z.uuid(),
  variantId: z.uuid(),
  productId: z.uuid(),
  qty: z.number().int().positive(),
  /** Snapshot of the unit price at sale time — usually copied from
      order_items.unit_price (online) or pos_sale_items.unit_price
      (POS). Stored on the return row so the audit trail survives a
      future price change on the variant. */
  unitPrice: z.number().nonnegative(),
});

export type ReturnItemInput = z.input<typeof returnItemSchema>;

const refundAmountSchema = z
  .number()
  .nonnegative()
  .max(9_999_999, "Refund amount is unreasonably high — re-check");

const reasonSchema = z.enum(RETURN_REASONS);
const refundMethodSchema = z.enum(REFUND_METHODS);
const notesSchema = z.string().trim().max(500).optional().nullable();

export const createOrderReturnSchema = z.object({
  orderId: z.uuid(),
  items: z.array(returnItemSchema).min(1, "Pick at least one item to return"),
  reason: reasonSchema,
  refundMethod: refundMethodSchema,
  /** Total to refund to the customer. The UI auto-suggests
      sum(items[].qty * items[].unitPrice) but admin can override
      (e.g. minus a restocking fee, or plus shipping refund). */
  refundAmount: refundAmountSchema,
  notes: notesSchema,
});

export type CreateOrderReturnInput = z.input<typeof createOrderReturnSchema>;

export const createPosReturnSchema = z.object({
  saleId: z.uuid(),
  items: z.array(returnItemSchema).min(1, "Pick at least one item to return"),
  reason: reasonSchema,
  refundMethod: refundMethodSchema,
  refundAmount: refundAmountSchema,
  notes: notesSchema,
});

export type CreatePosReturnInput = z.input<typeof createPosReturnSchema>;

// ─── Action result shape — matches existing admin actions ───────────

export type ReturnActionResult =
  | { ok: true; returnId: string; refundAmount: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

// ─── Reference types used by stock_movements ───────────────────────

export const RETURN_REFERENCE_TYPE_ONLINE = "order_return" as const;
export const RETURN_REFERENCE_TYPE_POS = "pos_return" as const;
