import { describe, expect, it } from "vitest";
import { buildOffers, returnPolicy, shippingDetails, variantPrices } from "../offers";

const zones = [
  { governorate_code: "cairo", fee: 155 },
  { governorate_code: "cairo", fee: 165 },
  { governorate_code: "giza", fee: 155 },
  { governorate_code: "sohag", fee: 135 },
];
const base = { url: "https://x.test/ar/products/p", sellerName: "M.M Bags", zones };

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

  it("leaves shipping out when no areas are known", () => {
    const o = buildOffers({ ...base, zones: [], variants: [], base: 500, sale: null });
    expect(o.shippingDetails).toBeUndefined();
  });

  it("carries shipping and the 14-day return policy", () => {
    const o = buildOffers({ ...base, variants: [], base: 500, sale: null });
    expect(o.shippingDetails).toBeTruthy();
    expect((o.hasMerchantReturnPolicy as Record<string, unknown>).merchantReturnDays).toBe(14);
  });
});

describe("returnPolicy", () => {
  it("prices the return leg at the typical area fee", () => {
    const amount = returnPolicy(zones).returnShippingFeesAmount as Record<string, unknown>;
    expect(amount.value).toBe(155);
  });

  it("claims no amount without areas", () => {
    expect(returnPolicy([]).returnShippingFeesAmount).toBeUndefined();
  });
});

describe("shippingDetails", () => {
  const rate = (d: Record<string, unknown>) => (d.shippingRate as Record<string, unknown>).value;
  const regions = (d: Record<string, unknown>) =>
    (d.shippingDestination as Record<string, unknown>).addressRegion;

  it("lists each price tier with its governorates, at their cheapest area", () => {
    const d = shippingDetails(3999, zones)!;
    expect(d.map(rate)).toEqual([135, 155]);
    expect(regions(d[0])).toEqual(["EG-SHG"]);
    expect(regions(d[1])).toEqual(["EG-C", "EG-GZ"]);
  });

  it("is free nationwide from 4,000, like checkout", () => {
    const d = shippingDetails(4000, zones)!;
    expect(d).toHaveLength(1);
    expect(rate(d[0])).toBe(0);
    expect(regions(d[0])).toBeUndefined();
  });
});
