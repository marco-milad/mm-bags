import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { cairoDayStartISO, cairoMidnightUtcMs } from "@/lib/queries/cairo-tz";

/**
 * Strict YMD validator. Accepts only real calendar dates — rejects
 * `2026-02-29`, `2026-13-01`, `2026-04-31`, etc. that the shape-only
 * regex would let through and that `new Date(...)` would silently
 * normalize to a different day (causing the date filter to surface
 * the WRONG day's sales while the UI labels them as the queried one).
 */
function parseStrictYMD(
  input: string,
): { y: number; m: number; d: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const [y, m, d] = input.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    return null;
  }
  return { y, m, d };
}

/**
 * Server queries for the POS-returns admin screen.
 *
 * Two surfaces:
 *   - `findPosSalesForReturn({ query, date })` — search the cashier
 *     uses to locate the original sale. Filters by sale_number (ilike),
 *     by a specific Cairo day (date), or by BOTH ANDed together.
 *   - `getReturnableQuantitiesForPosSale(saleId)` — once a sale is
 *     picked, return the full breakdown of line items + how many
 *     units are still returnable (sold − already-returned).
 */

export type PosSaleSearchResult = {
  id: string;
  saleNumber: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
  returnsTotal: number;
  hasReturns: boolean;
};

export type PosSaleSearchFilters = {
  /** Substring match on sale_number (ilike). Optional. */
  query?: string;
  /** Cairo calendar date (YYYY-MM-DD). Returns every sale rung up on
      this day in Cairo time, regardless of when UTC midnight lands.
      Optional. */
  date?: string;
};

/**
 * Filters pos_sales by sale_number and/or Cairo day. Returns up to
 * 50 most-recent matches when a date is set (a busy day can have a
 * lot of sales) or 10 when only the text search is used.
 *
 * If both filters are empty, returns an empty list — the caller's
 * responsibility to surface a "type something" hint to the operator.
 *
 * Why Cairo time: the dashboard + reports already align day buckets
 * to Africa/Cairo (see lib/queries/cairo-tz.ts), so picking the date
 * "2026-06-20" must mean "every sale Marco rang up on the till
 * during that calendar day in Cairo", NOT the UTC window of the
 * same name.
 */
export async function findPosSalesForReturn(
  filters: PosSaleSearchFilters,
): Promise<PosSaleSearchResult[]> {
  const trimmedQuery = filters.query?.trim() ?? "";
  const rawDate = filters.date?.trim() ?? "";
  // Validate up-front. An invalid date string is treated as no date
  // filter at all (instead of silently bypassing the .gte/.lt while
  // still tripping the larger 50-row limit, which would return the
  // 50 most-recent sales as if they belonged to the queried day).
  const ymd = rawDate ? parseStrictYMD(rawDate) : null;
  if (!trimmedQuery && !ymd) return [];

  const admin = getSupabaseAdminClient();
  let q = admin
    .from("pos_sales")
    .select(
      "id, sale_number, created_at, total, payment_method, returns_total, has_returns",
    )
    .order("created_at", { ascending: false });

  if (trimmedQuery) {
    // Strip wildcard / parenthesis chars so a stray "%" from a paste
    // doesn't turn into an ilike escape sequence.
    const safe = trimmedQuery.replace(/[*,()%_]/g, " ");
    q = q.ilike("sale_number", `%${safe}%`);
  }

  if (ymd) {
    // Cairo midnight today → Cairo midnight tomorrow, expressed as
    // UTC instants. Computing the next calendar day via the parsed
    // components (then re-probing Cairo's offset) handles DST
    // transitions correctly — across spring-forward / fall-back the
    // day is 23 / 25 hours wall-clock, not a flat 24.
    const from = cairoDayStartISO(rawDate);
    const next = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + 1));
    const to = new Date(
      cairoMidnightUtcMs(
        next.getUTCFullYear(),
        next.getUTCMonth() + 1,
        next.getUTCDate(),
      ),
    ).toISOString();
    q = q.gte("created_at", from).lt("created_at", to);
  }

  // 50 rows when a VALID date filter is set (a busy till day can have
  // many sales), 10 when only a text search is provided. Reading the
  // validated `ymd` here — not the raw input — so a malformed date
  // doesn't widen the cap.
  q = q.limit(ymd ? 50 : 10);

  const { data, error } = await q;
  if (error) {
    throw new Error(`findPosSalesForReturn failed: ${error.message}`);
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    saleNumber: r.sale_number,
    createdAt: r.created_at,
    total: r.total,
    paymentMethod: r.payment_method,
    returnsTotal: r.returns_total ?? 0,
    hasReturns: r.has_returns ?? false,
  }));
}

export type ReturnablePosLine = {
  saleItemId: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantLabel: string | null;
  originalQty: number;
  returnedQty: number;
  remainingQty: number;
  unitPrice: number;
};

export async function getReturnableQuantitiesForPosSale(
  saleId: string,
): Promise<{
  sale: {
    id: string;
    saleNumber: string;
    createdAt: string;
    total: number;
    paymentMethod: string;
  };
  lines: ReturnablePosLine[];
} | null> {
  const admin = getSupabaseAdminClient();

  // Sale header — bail if it doesn't exist.
  const { data: saleRow, error: saleErr } = await admin
    .from("pos_sales")
    .select("id, sale_number, created_at, total, payment_method")
    .eq("id", saleId)
    .maybeSingle();
  if (saleErr) {
    throw new Error(
      `getReturnableQuantitiesForPosSale failed: ${saleErr.message}`,
    );
  }
  if (!saleRow) return null;

  // Items + joined product/variant for label rendering.
  const { data: itemsRaw, error: itemsErr } = await admin
    .from("pos_sale_items")
    .select(
      "id, qty, unit_price, snapshot_name, snapshot_color, snapshot_size, product_id, variant_id, " +
        "product:products(name_ar, name_en), " +
        "variant:product_variants(color_ar, color_en, size_inches, size_label_ar)",
    )
    .eq("sale_id", saleId)
    .order("id", { ascending: true });
  if (itemsErr) {
    throw new Error(
      `getReturnableQuantitiesForPosSale items failed: ${itemsErr.message}`,
    );
  }

  type RawLine = {
    id: string;
    qty: number;
    unit_price: number;
    snapshot_name: string | null;
    snapshot_color: string | null;
    snapshot_size: string | null;
    product_id: string | null;
    variant_id: string | null;
    product: { name_ar: string | null; name_en: string | null } | null;
    variant: {
      color_ar: string | null;
      color_en: string | null;
      size_inches: number | null;
      size_label_ar: string | null;
    } | null;
  };
  const items = (itemsRaw ?? []) as unknown as RawLine[];

  // Sum already-returned qty per sale_item_id.
  const saleItemIds = items.map((i) => i.id);
  let returnedByItemId = new Map<string, number>();
  if (saleItemIds.length > 0) {
    const { data: priorReturns, error: priorErr } = await admin
      .from("pos_return_items")
      .select("sale_item_id, qty")
      .in("sale_item_id", saleItemIds);
    if (priorErr) {
      throw new Error(
        `getReturnableQuantitiesForPosSale priors failed: ${priorErr.message}`,
      );
    }
    returnedByItemId = (priorReturns ?? []).reduce((acc, row) => {
      if (!row.sale_item_id) return acc;
      acc.set(row.sale_item_id, (acc.get(row.sale_item_id) ?? 0) + row.qty);
      return acc;
    }, new Map<string, number>());
  }

  const lines: ReturnablePosLine[] = items.map((it) => {
    const productName =
      it.snapshot_name ??
      it.product?.name_ar ??
      it.product?.name_en ??
      "—";

    const colorBits = [
      it.snapshot_color,
      it.variant?.color_ar ?? it.variant?.color_en,
    ].filter(Boolean) as string[];
    const sizeBits = [
      it.snapshot_size,
      it.variant?.size_label_ar,
      it.variant?.size_inches ? `${it.variant.size_inches}"` : null,
    ].filter(Boolean) as string[];
    const variantLabel =
      [colorBits[0], sizeBits[0]].filter(Boolean).join(" · ") || null;

    const returned = returnedByItemId.get(it.id) ?? 0;
    return {
      saleItemId: it.id,
      productId: it.product_id,
      variantId: it.variant_id,
      productName,
      variantLabel,
      originalQty: it.qty,
      returnedQty: returned,
      remainingQty: Math.max(0, it.qty - returned),
      unitPrice: it.unit_price,
    };
  });

  return {
    sale: {
      id: saleRow.id,
      saleNumber: saleRow.sale_number,
      createdAt: saleRow.created_at,
      total: saleRow.total,
      paymentMethod: saleRow.payment_method,
    },
    lines,
  };
}
