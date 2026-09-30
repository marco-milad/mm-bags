import type { ProductVariant } from "@/lib/supabase/types";

/**
 * A variant is purchasable when it exists and has stock. Product-level
 * active state is already enforced upstream (the PDP only renders for active
 * products) and variants carry no separate active flag, so stock is the only
 * storefront gate here — the same definition `pickInitialVariant` and the
 * swatch/size "stocked" checks already use.
 */
export function isVariantPurchasable(v: ProductVariant): boolean {
  return (v.stock_qty ?? 0) > 0;
}

/**
 * Resolve the size to show after the colour changes so the selection never
 * lands on a colour×size combination that doesn't exist (the H1 dead-end,
 * where `selectedVariant` becomes null and neither Add-to-cart nor Notify-me
 * renders).
 *
 * Rules, in order:
 *  1. No sizes for this colour (or product has no sizes) → keep `currentSize`.
 *  2. The current size still exists for the new colour → keep it, respecting
 *     the shopper's intent. This holds even when that specific combination is
 *     out of stock: the variant still exists, so the Notify-me form shows
 *     instead of a dead-end.
 *  3. Otherwise pick a size that actually exists for the colour — the
 *     smallest in-stock size, or, only when the colour is entirely sold out,
 *     the smallest existing size (so a valid variant is still selected and
 *     Notify-me is available).
 *
 * Deterministic: sizes are compared ascending, matching the size picker's
 * own sort order.
 */
export function resolveSizeForColor(
  variants: ProductVariant[],
  colorHex: string,
  currentSize: number | null,
): number | null {
  const forColor = variants.filter((v) => v.color_hex === colorHex);
  if (forColor.length === 0) return currentSize;

  if (
    currentSize != null &&
    forColor.some((v) => v.size_inches === currentSize)
  ) {
    return currentSize;
  }

  const sortedSizes = (list: ProductVariant[]): number[] =>
    list
      .map((v) => v.size_inches)
      .filter((s): s is number => typeof s === "number")
      .sort((a, b) => a - b);

  const inStock = sortedSizes(forColor.filter(isVariantPurchasable));
  if (inStock.length > 0) return inStock[0];

  const anySize = sortedSizes(forColor);
  return anySize.length > 0 ? anySize[0] : (forColor[0]?.size_inches ?? null);
}
