import { z } from "zod";

export const POS_PAYMENT_METHODS = [
  "cash",
  "e-wallet",
  "instapay",
  "card",
] as const;

/** Cart line as POSted from the POS client to the server action. */
export const posSaleItemSchema = z.object({
  variantId: z.uuid(),
  productId: z.uuid(),
  qty: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  snapshotName: z.string().min(1).max(200),
  snapshotColor: z.string().max(60).nullable().optional(),
  snapshotSize: z.string().max(40).nullable().optional(),
});

export type PosSaleItemInput = z.infer<typeof posSaleItemSchema>;

export const completeSaleSchema = z
  .object({
    items: z.array(posSaleItemSchema).min(1, "Cart is empty"),
    paymentMethod: z.enum(POS_PAYMENT_METHODS),
    /** Either a flat EGP amount (>0) or a percentage 0-100. The
        client passes the resolved EGP value here — percentage math
        stays on the client. */
    discountAmount: z.number().nonnegative().default(0),
    /** Optional payment reference for non-cash (wallet txn id,
        Instapay ref, card slip number). Empty for cash. */
    paymentRef: z.string().trim().max(60).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((v, ctx) => {
    // Cash sales don't need a reference; digital ones probably do.
    // We don't reject missing refs (an in-person cashier might choose
    // to leave it blank for an internal sale) but we DO reject a ref
    // on a cash sale because it's almost always a mistake.
    if (v.paymentMethod === "cash" && v.paymentRef) {
      ctx.addIssue({
        code: "custom",
        message: "Cash sales should not carry a payment reference",
        path: ["paymentRef"],
      });
    }
  });

export type CompleteSaleInput = z.infer<typeof completeSaleSchema>;

/** Subtotal/total computed identically on client and server so the
    cashier never sees a different number than what gets persisted. */
export function calcTotals(
  items: ReadonlyArray<Pick<PosSaleItemInput, "qty" | "unitPrice">>,
  discountAmount: number,
): { subtotal: number; discount: number; total: number } {
  const subtotal = items.reduce(
    (s, i) => s + i.qty * i.unitPrice,
    0,
  );
  const discount = Math.min(Math.max(0, discountAmount), subtotal);
  return { subtotal, discount, total: subtotal - discount };
}
