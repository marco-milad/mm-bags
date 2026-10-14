/**
 * Pure builders for the commerce parts of Product JSON-LD: price/offer,
 * shipping and returns. Tested in __tests__/offers.test.ts.
 *
 * Prices use the SAME rule as the buy box and checkout
 * (variant.price_override ?? sale_price ?? base_price), so the structured
 * data can never disagree with the visible price (audit T2 — the old schema
 * used the product price and showed 1150 on a page selling at 1,999).
 *
 * Shipping/returns mirror lib/checkout/schema.ts and the refund policy page:
 * flat 50 EGP (free from 1,500), 2–5 days nationwide; 14-day returns, buyer
 * pays ~50 EGP return shipping on change of mind (free for defects).
 */
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/checkout/schema";

export type OfferVariant = { price_override: number | null; stock_qty: number | null };

export function variantPrices(
  variants: ReadonlyArray<OfferVariant>,
  base: number,
  sale: number | null,
): number[] {
  const fallback = sale ?? base;
  if (variants.length === 0) return [fallback];
  return variants.map((v) => (v.price_override ?? fallback));
}

const money = (n: number) => n.toFixed(2);

export function shippingDetails(price: number): Record<string, unknown> {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: price >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE,
      currency: "EGP",
    },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "EG" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 5, unitCode: "DAY" },
    },
  };
}

export const RETURN_POLICY: Record<string, unknown> = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "EG",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 14,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/ReturnShippingFees",
  returnShippingFeesAmount: { "@type": "MonetaryAmount", value: 50, currency: "EGP" },
};

/**
 * One Offer when every size costs the same, otherwise an AggregateOffer with
 * the real low/high range. Availability = any size in stock.
 */
export function buildOffers(opts: {
  url: string;
  variants: ReadonlyArray<OfferVariant>;
  base: number;
  sale: number | null;
  sellerName: string;
}): Record<string, unknown> {
  const prices = variantPrices(opts.variants, opts.base, opts.sale);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const inStock = opts.variants.length === 0 || opts.variants.some((v) => (v.stock_qty ?? 0) > 0);
  const common = {
    url: opts.url,
    priceCurrency: "EGP",
    availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: opts.sellerName },
    shippingDetails: shippingDetails(low),
    hasMerchantReturnPolicy: RETURN_POLICY,
  };
  if (low === high) return { "@type": "Offer", price: money(low), ...common };
  return {
    "@type": "AggregateOffer",
    lowPrice: money(low),
    highPrice: money(high),
    offerCount: prices.length,
    ...common,
  };
}

/** Collections whose items are branded third-party goods (authorised, per the owner). */
const BRAND_BY_COLLECTION: Record<string, string> = {
  "calvin-klein": "Calvin Klein",
  "lv-collection": "Louis Vuitton",
};

export function brandFor(collectionSlug: string | null | undefined, house: string): string {
  return (collectionSlug && BRAND_BY_COLLECTION[collectionSlug]) || house;
}
