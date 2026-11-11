/**
 * Shipping rules shared by the browser and the server (no I/O here — the
 * zone rows come from lib/shipping/zones.ts, server-only).
 *
 * Courier since 2026-11-11: Urgent. One price per area (no weight or size
 * limits), delivery 28–36 hours after the courier picks the order up, and a
 * cash-collection fee on COD orders that we pass on to the customer as-is.
 */

export const COURIER_NAME = "Urgent";

/** Delivery window, counted from the courier pickup (orders.shipped_at). */
export const DELIVERY_HOURS_MIN = 28;
export const DELIVERY_HOURS_MAX = 36;

/** The courier's COD collection fee: 30 for up to 1,000, then 5 for every
 *  started 1,000 above that (1,500 → 35, 2,000 → 35, 2,001 → 40). */
export const COD_FEE_BASE = 30;
export const COD_FEE_STEP = 5;
export const COD_FEE_BAND = 1000;

export type ShippingZone = {
  id: string;
  code: string;
  governorate_code: string;
  name_ar: string;
  name_en: string;
  fee: number;
  sort_order: number;
};

/** Fee for collecting `amount` in cash (0 for nothing to collect). */
export function collectionFeeFor(amount: number): number {
  if (!(amount > 0)) return 0;
  const bands = Math.max(0, Math.ceil((amount - COD_FEE_BAND) / COD_FEE_BAND));
  return COD_FEE_BASE + COD_FEE_STEP * bands;
}

/**
 * COD fee for an order whose total before the fee is `base`. The courier
 * collects the fee too, so it can push the collected amount over a band
 * (995 + 30 = 1,025 → 35). One step settles it: the fee grows by at most 5
 * and a band is 1,000 wide.
 */
export function codFeeFor(base: number): number {
  const first = collectionFeeFor(base);
  return Math.max(first, collectionFeeFor(base + first));
}

/** Zones of one governorate, in display order. */
export function zonesFor(
  zones: ReadonlyArray<ShippingZone>,
  governorateCode: string | undefined | null,
): ShippingZone[] {
  if (!governorateCode) return [];
  return zones
    .filter((z) => z.governorate_code === governorateCode)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function zoneName(zone: Pick<ShippingZone, "name_ar" | "name_en">, locale: string): string {
  return locale === "ar" ? zone.name_ar : zone.name_en;
}

/** Cheapest and dearest active zone fee (for copy and structured data). */
export function feeRange(zones: ReadonlyArray<Pick<ShippingZone, "fee">>): { min: number; max: number } | null {
  if (zones.length === 0) return null;
  const fees = zones.map((z) => Number(z.fee));
  return { min: Math.min(...fees), max: Math.max(...fees) };
}

const HOUR_MS = 60 * 60 * 1000;

/** Latest expected delivery moment for an order handed over at `shippedAt`. */
export function deliveryDeadline(shippedAt: string | Date): Date {
  return new Date(new Date(shippedAt).getTime() + DELIVERY_HOURS_MAX * HOUR_MS);
}

/** YYYY-MM-DD of `date` in Cairo — for cod_tracking.estimated_delivery. */
export function cairoDateISO(date: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return date.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
}
