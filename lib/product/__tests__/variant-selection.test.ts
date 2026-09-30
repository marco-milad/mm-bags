import { describe, it, expect } from "vitest";
import type { ProductVariant } from "@/lib/supabase/types";
import { resolveSizeForColor, isVariantPurchasable } from "@/lib/product/variant-selection";

// Minimal variant factory — only the fields the resolver reads matter.
function v(color: string | null, size: number | null, stock: number): ProductVariant {
  return {
    id: `${color}-${size}`,
    product_id: "p1",
    color_hex: color,
    color_ar: null,
    color_en: null,
    size_inches: size,
    size_label_ar: null,
    is_set: false,
    sku: null,
    stock_qty: stock,
    price_override: null,
    store_price_override: null,
    created_at: "",
  } as unknown as ProductVariant;
}

describe("isVariantPurchasable", () => {
  it("is true only when stock > 0", () => {
    expect(isVariantPurchasable(v("black", 20, 3))).toBe(true);
    expect(isVariantPurchasable(v("black", 20, 0))).toBe(false);
  });
});

describe("resolveSizeForColor", () => {
  // black: 20,24 in stock. blue: 20 sold out, 28 in stock.
  const variants = [v("black", 20, 5), v("black", 24, 5), v("blue", 20, 0), v("blue", 28, 3)];

  it("Case A: keeps the current size when the new colour offers it", () => {
    // switch to black keeping 24 -> black has 24
    expect(resolveSizeForColor(variants, "black", 24)).toBe(24);
    // switch to blue keeping 20 -> blue×20 exists (even though OOS) -> keep 20
    expect(resolveSizeForColor(variants, "blue", 20)).toBe(20);
  });

  it("Case B: falls back to an existing size when the current one doesn't exist for the colour", () => {
    // was black×24, switch to blue: blue has no 24 -> prefer in-stock 28
    expect(resolveSizeForColor(variants, "blue", 24)).toBe(28);
  });

  it("Case C: fallback prefers the smallest IN-STOCK size, deterministically", () => {
    const vs = [v("red", 30, 2), v("red", 26, 2), v("red", 22, 0)];
    // 22 is OOS; smallest in-stock is 26 (not the smallest existing 22)
    expect(resolveSizeForColor(vs, "red", 99)).toBe(26);
    // when several in-stock, smallest wins
    const vs2 = [v("red", 30, 1), v("red", 26, 1)];
    expect(resolveSizeForColor(vs2, "red", 99)).toBe(26);
  });

  it("Case D: colour fully sold out -> smallest existing size (non-null, keeps Notify-me reachable)", () => {
    const vs = [v("gray", 34, 0), v("gray", 30, 0)];
    expect(resolveSizeForColor(vs, "gray", 99)).toBe(30);
  });

  it("keeps intent even when the kept size is out of stock", () => {
    // blue×20 is OOS but exists -> keep 20 (variant non-null -> Notify-me, not a jump)
    const res = resolveSizeForColor(variants, "blue", 20);
    expect(res).toBe(20);
  });

  it("returns currentSize for products with no sizes", () => {
    const vs = [v("mono", null, 5)];
    expect(resolveSizeForColor(vs, "mono", null)).toBe(null);
  });

  it("returns currentSize when the colour has no variants at all", () => {
    expect(resolveSizeForColor(variants, "ffffff", 24)).toBe(24);
  });
});
