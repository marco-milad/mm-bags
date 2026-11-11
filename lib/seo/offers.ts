/**
 * Pure builders for the commerce parts of Product JSON-LD: price/offer,
 * shipping and returns. Tested in __tests__/offers.test.ts.
 *
 * Prices use the SAME rule as the buy box and checkout
 * (variant.price_override ?? sale_price ?? base_price), so the structured
 * data can never disagree with the visible price (audit T2 — the old schema
 * used the product price and showed 1150 on a page selling at 1,999).
 *
 * Shipping mirrors checkout: the courier's price per area (shipping_zones,
 * 0032), free from 4,000; delivered 28–36 h after pickup. Returns mirror the
 * refund policy page: 14 days, buyer pays return shipping on change of mind
 * (free for defects).
 */
import { FREE_SHIPPING_THRESHOLD } from "@/lib/checkout/schema";
import { EG_GOVERNORATES } from "@/lib/checkout/governorates";
import type { ShippingZone } from "@/lib/shipping/shared";

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

const DELIVERY_TIME = {
  "@type": "ShippingDeliveryTime",
  handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
  transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
};

function detail(value: number, regions?: string[]): Record<string, unknown> {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value, currency: "EGP" },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "EG",
      ...(regions ? { addressRegion: regions } : {}),
    },
    deliveryTime: DELIVERY_TIME,
  };
}

/**
 * Shipping for an item at `price`: free nationwide from the threshold;
 * otherwise one entry per price tier listing its governorates (a
 * governorate is listed at its cheapest area — the area sits on the address,
 * which structured data can't express). No zones → no shipping claim.
 */
export function shippingDetails(
  price: number,
  zones: ReadonlyArray<Pick<ShippingZone, "governorate_code" | "fee">>,
): Record<string, unknown>[] | undefined {
  if (price >= FREE_SHIPPING_THRESHOLD) return [detail(0)];
  const cheapest = new Map<string, number>();
  for (const z of zones) {
    const fee = Number(z.fee);
    const prev = cheapest.get(z.governorate_code);
    if (prev === undefined || fee < prev) cheapest.set(z.governorate_code, fee);
  }
  const byFee = new Map<number, string[]>();
  for (const g of EG_GOVERNORATES) {
    const fee = cheapest.get(g.code);
    if (fee === undefined) continue;
    byFee.set(fee, [...(byFee.get(fee) ?? []), g.iso]);
  }
  if (byFee.size === 0) return undefined;
  return [...byFee.entries()]
    .sort(([a], [b]) => a - b)
    .map(([fee, regions]) => detail(fee, regions));
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
  /** Active shipping areas; empty leaves shippingDetails out. */
  zones: ReadonlyArray<Pick<ShippingZone, "governorate_code" | "fee">>;
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
    shippingDetails: shippingDetails(low, opts.zones),
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
