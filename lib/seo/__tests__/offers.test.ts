import { describe, expect, it } from "vitest";
import { brandFor, buildOffers, shippingDetails, variantPrices } from "../offers";

const base = { url: "https://x.test/ar/products/p", sellerName: "M.M Bags" };

describe("variantPrices", () => {
  it("uses the same rule as the buy box: override → sale → base", () => {
    expect(variantPrices([{ price_override: 1999, stock_qty: 1 }, { price_override: null, stock_qty: 1 }], 1500, 1150))
      .toEqual([1999, 1150]);
  });

  it("falls back to the product price when there are no variants", () => {
    expect(variantPrices([], 900, null)).toEqual([900]);
  });
});

describe("buildOffers", () => {
  it("emits one Offer when every size costs the same", () => {
    const o = buildOffers({ ...base, variants: [{ price_override: 745, stock_qty: 3 }, { price_override: 745, stock_qty: 0 }], base: 900, sale: null });
    expect(o["@type"]).toBe("Offer");
    expect(o.price).toBe("745.00");
    expect(o.availability).toBe("https://schema.org/InStock");
  });

  it("emits an AggregateOffer with the real range when sizes differ (the 1150-vs-1999 bug)", () => {
    const o = buildOffers({ ...base, variants: [{ price_override: 1999, stock_qty: 2 }, { price_override: 2499, stock_qty: 0 }], base: 1500, sale: 1150 });
    expect(o["@type"]).toBe("AggregateOffer");
    expect(o.lowPrice).toBe("1999.00");
    expect(o.highPrice).toBe("2499.00");
    expect(o.offerCount).toBe(2);
  });

  it("is OutOfStock only when no size has stock", () => {
    const o = buildOffers({ ...base, variants: [{ price_override: null, stock_qty: 0 }], base: 500, sale: null });
    expect(o.availability).toBe("https://schema.org/OutOfStock");
  });

  it("always carries shipping and the 14-day return policy", () => {
    const o = buildOffers({ ...base, variants: [], base: 500, sale: null });
    expect(o.shippingDetails).toBeTruthy();
    expect((o.hasMerchantReturnPolicy as Record<string, unknown>).merchantReturnDays).toBe(14);
  });
});

describe("shippingDetails", () => {
  it("matches checkout: 50 EGP, free from 1,500", () => {
    const rate = (p: number) => ((shippingDetails(p).shippingRate as Record<string, unknown>).value);
    expect(rate(1499)).toBe(50);
    expect(rate(1500)).toBe(0);
  });
});

describe("brandFor", () => {
  it("names third-party brands by collection, otherwise the house brand", () => {
    expect(brandFor("calvin-klein", "M.M Bags")).toBe("Calvin Klein");
    expect(brandFor("lv-collection", "M.M Bags")).toBe("Louis Vuitton");
    expect(brandFor("travel-bags", "M.M Bags")).toBe("M.M Bags");
    expect(brandFor(null, "M.M Bags")).toBe("M.M Bags");
  });
});
