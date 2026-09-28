import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  validateCartLines,
  type AuthoritativeVariant,
  type ClientCartLine,
  type ValidateCartLinesResult,
} from "./schema";

/** Result of validateCart: either the pure validator's outcome, or a
 *  CHECKOUT_FAILED when the DB read itself failed. */
export type ValidateCartResult =
  | ValidateCartLinesResult
  | { ok: false; code: "CHECKOUT_FAILED" };

/**
 * Fetch the authoritative variant + product rows for a client cart and
 * run the pure validator against them. Uses the admin (service-role)
 * client so it can see inactive/hidden products in order to REJECT them
 * (RLS would otherwise hide an inactive product and make it look merely
 * missing). Two small reads instead of a nested embed keeps the typing
 * trivial and the query obvious.
 */
export async function validateCart(
  clientLines: ReadonlyArray<ClientCartLine>,
): Promise<ValidateCartResult> {
  const variantIds = Array.from(new Set(clientLines.map((l) => l.variantId)));
  if (variantIds.length === 0) {
    // A well-formed order always has at least one line (Zod enforces it);
    // an empty set here means a malformed payload slipped through.
    return { ok: false, code: "CHECKOUT_FAILED" };
  }

  const admin = getSupabaseAdminClient();

  const { data: variants, error: variantsErr } = await admin
    .from("product_variants")
    .select("id, product_id, stock_qty, price_override")
    .in("id", variantIds);

  if (variantsErr) {
    console.error("[validateCart] variant read failed:", variantsErr.message);
    return { ok: false, code: "CHECKOUT_FAILED" };
  }

  const productIds = Array.from(
    new Set(
      (variants ?? [])
        .map((v) => v.product_id)
        .filter((id): id is string => id != null),
    ),
  );

  const productById = new Map<
    string,
    NonNullable<AuthoritativeVariant["product"]>
  >();

  if (productIds.length > 0) {
    const { data: products, error: productsErr } = await admin
      .from("products")
      .select("id, is_active, name_ar, name_en, base_price, sale_price")
      .in("id", productIds);

    if (productsErr) {
      console.error("[validateCart] product read failed:", productsErr.message);
      return { ok: false, code: "CHECKOUT_FAILED" };
    }
    for (const p of products ?? []) {
      productById.set(p.id, p);
    }
  }

  const dbVariants: AuthoritativeVariant[] = (variants ?? []).map((v) => ({
    id: v.id,
    product_id: v.product_id,
    stock_qty: v.stock_qty,
    price_override: v.price_override,
    product: v.product_id ? (productById.get(v.product_id) ?? null) : null,
  }));

  return validateCartLines(clientLines, dbVariants);
}
