import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Order,
  PosSale,
  ProductVariant,
  PurchaseOrder,
} from "@/lib/supabase/types";
import {
  cairoDateOf,
  cairoMidnightUtcMs,
  cairoTodayParts,
} from "./cairo-tz";

/**
 * Server-side aggregations for the admin overview dashboard.
 *
 * Each helper returns a small, plain-object shape so the page (a
 * server component) can compose them without leaking the
 * `getSupabaseAdminClient` query shape downstream. The dashboard runs
 * all of them in Promise.all — one round-trip's worth of latency for
 * the whole screen.
 *
 * NOTE on aggregation strategy. PostgREST cannot GROUP BY without an
 * RPC, so the helpers below pull a narrow column set for the time
 * window and sum/bucket in JS. With our current volume (orders + POS
 * sales counted in tens per day) this is single-digit ms and keeps
 * the SQL surface tiny. We can switch to a materialised view later
 * once daily volume justifies it.
 */

// ─── Today's stats (revenue + counts) ────────────────────────────────
export type TodayStats = {
  totalRevenue: number;
  online: { count: number; revenue: number };
  pos: { count: number; revenue: number };
  pendingOrders: number;
  pendingReviews: number;
};

export async function getTodayStats(): Promise<TodayStats> {
  const admin = getSupabaseAdminClient();
  // "Today" = the calendar day in Cairo. With a UTC server, the naïve
  // `new Date().toISOString().slice(0,10)` flips to tomorrow's date at
  // 22:00 Cairo (EEST) / 23:00 Cairo (EET), so the dashboard would
  // briefly show an empty "today" every evening. Cairo midnight as a
  // UTC instant keeps the window honest year-round, DST included.
  const { y, m, d } = cairoTodayParts();
  const startOfDay = new Date(cairoMidnightUtcMs(y, m, d)).toISOString();

  const [onlineRes, posRes, pendingOrdersRes, pendingReviewsRes] =
    await Promise.all([
      admin
        .from("orders")
        .select("total, status")
        .gte("created_at", startOfDay)
        .neq("status", "cancelled"),
      admin
        .from("pos_sales")
        .select("total")
        .gte("created_at", startOfDay),
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      admin
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("is_approved", false),
    ]);

  const online = {
    count: onlineRes.data?.length ?? 0,
    revenue: (onlineRes.data ?? []).reduce(
      (s, r) => s + Number(r.total ?? 0),
      0,
    ),
  };
  const pos = {
    count: posRes.data?.length ?? 0,
    revenue: (posRes.data ?? []).reduce(
      (s, r) => s + Number(r.total ?? 0),
      0,
    ),
  };

  return {
    totalRevenue: online.revenue + pos.revenue,
    online,
    pos,
    pendingOrders: pendingOrdersRes.count ?? 0,
    pendingReviews: pendingReviewsRes.count ?? 0,
  };
}

// ─── Monthly revenue chart data ───────────────────────────────────────
export type DailyRevenuePoint = {
  date: string; // YYYY-MM-DD
  online: number;
  pos: number;
};

export async function getMonthlyRevenue(): Promise<DailyRevenuePoint[]> {
  const admin = getSupabaseAdminClient();
  // Current month boundaries in Cairo time. Without this, around the
  // last-of-month → 1st transition the server (UTC) and the till
  // (Cairo) disagree on which month a 22:00-Cairo sale belongs to.
  const { y, m } = cairoTodayParts();
  const monthStart = new Date(cairoMidnightUtcMs(y, m, 1)).toISOString();
  // Upper bound prevents next-month sales bleeding into the query when
  // the dashboard runs in the early hours of the 1st (the chart drops
  // them anyway because their cairoDateOf key isn't in dailyMap, but
  // without `.lt` we'd pull megabytes of rows we silently throw away).
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const monthEnd = new Date(cairoMidnightUtcMs(nextY, nextM, 1)).toISOString();

  const [orders, posSales] = await Promise.all([
    admin
      .from("orders")
      .select("created_at, total, status")
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd)
      .neq("status", "cancelled"),
    admin
      .from("pos_sales")
      .select("created_at, total")
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd),
  ]);

  // Bucket by YYYY-MM-DD in Cairo; one entry per day of the current
  // month so the chart never has gaps. Days-in-month is a calendar
  // fact independent of timezone, so plain UTC date math is fine for
  // building the keys.
  const dailyMap = new Map<string, DailyRevenuePoint>();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
    dailyMap.set(iso, { date: iso, online: 0, pos: 0 });
  }

  for (const row of orders.data ?? []) {
    if (!row.created_at) continue;
    // Bucket by Cairo wall-clock date — see admin-reports.ts for the
    // 01:30-Cairo / 22:30-UTC example that motivates this.
    const day = cairoDateOf(row.created_at);
    const point = dailyMap.get(day);
    if (point) point.online += Number(row.total ?? 0);
  }
  for (const row of posSales.data ?? []) {
    if (!row.created_at) continue;
    const day = cairoDateOf(row.created_at);
    const point = dailyMap.get(day);
    if (point) point.pos += Number(row.total ?? 0);
  }

  return Array.from(dailyMap.values());
}

// ─── Recent activity ──────────────────────────────────────────────────
export type RecentOrder = Pick<
  Order,
  "id" | "order_number" | "status" | "total" | "created_at" | "shipping_address"
>;
export type RecentPosSale = Pick<
  PosSale,
  "id" | "sale_number" | "total" | "payment_method" | "created_at"
>;

export async function getRecentOrders(limit = 5): Promise<RecentOrder[]> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("orders")
    .select("id, order_number, status, total, created_at, shipping_address")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as RecentOrder[];
}

export async function getRecentPosSales(limit = 5): Promise<RecentPosSale[]> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("pos_sales")
    .select("id, sale_number, total, payment_method, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as RecentPosSale[];
}

// ─── Alerts ──────────────────────────────────────────────────────────
export type LowStockVariant = {
  variantId: string;
  productName: string;
  productSlug: string;
  colorAr: string | null;
  colorHex: string | null;
  sizeInches: number | null;
  stockQty: number;
};

export async function getLowStockVariants(
  threshold = 5,
  limit = 20,
): Promise<LowStockVariant[]> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("product_variants")
    .select(
      "id, color_ar, color_hex, size_inches, stock_qty, product:products!inner(name_ar, slug, is_active)",
    )
    .lte("stock_qty", threshold)
    .order("stock_qty", { ascending: true })
    .limit(limit);

  return (data ?? []).flatMap((row) => {
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    if (!product || !product.is_active) return [];
    return [
      {
        variantId: row.id,
        productName: product.name_ar,
        productSlug: product.slug,
        colorAr: row.color_ar,
        colorHex: row.color_hex,
        sizeInches: row.size_inches,
        stockQty: row.stock_qty ?? 0,
      },
    ];
  }) as LowStockVariant[];
}

export type OverduePurchaseOrder = Pick<
  PurchaseOrder,
  "id" | "supplier_id" | "amount_owed" | "total_cost" | "created_at"
> & { supplier_name: string | null };

export async function getOverduePurchaseOrders(
  daysOverdue = 30,
  limit = 10,
): Promise<OverduePurchaseOrder[]> {
  const admin = getSupabaseAdminClient();
  const cutoff = new Date(Date.now() - daysOverdue * 86400_000).toISOString();
  const { data } = await admin
    .from("purchase_orders")
    .select(
      "id, supplier_id, amount_owed, total_cost, created_at, supplier:suppliers(name)",
    )
    .gt("amount_owed", 0)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(limit);

  return (data ?? []).map((r) => {
    const supplier = Array.isArray(r.supplier) ? r.supplier[0] : r.supplier;
    return {
      id: r.id,
      supplier_id: r.supplier_id,
      amount_owed: r.amount_owed,
      total_cost: r.total_cost,
      created_at: r.created_at,
      supplier_name: supplier?.name ?? null,
    };
  }) as OverduePurchaseOrder[];
}

// ─── High return rate alert ──────────────────────────────────────────
export type HighReturnProduct = {
  productId: string;
  productSlug: string;
  productName: string;
  unitsSold: number; // total qty sold in window (online + POS)
  unitsReturned: number; // total qty returned in window
  returnRatePct: number; // unitsReturned / unitsSold * 100, rounded to 1 dp
};

/**
 * Products whose return rate exceeds `thresholdPct` in the last
 * `daysWindow` days AND have at least `minUnitsSold` units sold (so a
 * 1-of-1 outlier doesn't dominate the list). Sorted by returnRatePct
 * desc. Returns up to `limit`.
 *
 * PostgREST doesn't expose UNION ALL, so we issue four small `select`s
 * (sales+returns × online+POS), aggregate in JS, then JOIN products for
 * the winning rows only. At our volume this is single-digit ms and
 * keeps the query surface tiny.
 */
export async function getHighReturnProducts(
  daysWindow = 30,
  thresholdPct = 10,
  minUnitsSold = 3,
  limit = 5,
): Promise<HighReturnProduct[]> {
  const admin = getSupabaseAdminClient();
  const cutoff = new Date(Date.now() - daysWindow * 86400_000).toISOString();

  const [
    onlineSalesRes,
    posSalesRes,
    onlineReturnsRes,
    posReturnsRes,
  ] = await Promise.all([
    admin
      .from("order_items")
      .select("product_id, qty, order:orders!inner(created_at, status)")
      .gte("order.created_at", cutoff)
      .neq("order.status", "cancelled"),
    admin
      .from("pos_sale_items")
      .select("product_id, qty, sale:pos_sales!inner(created_at)")
      .gte("sale.created_at", cutoff),
    admin
      .from("order_return_items")
      .select("product_id, qty, return:order_returns!inner(created_at)")
      .gte("return.created_at", cutoff),
    admin
      .from("pos_return_items")
      .select("product_id, qty, return:pos_returns!inner(created_at)")
      .gte("return.created_at", cutoff),
  ]);

  // Aggregate qty per product across both sales channels.
  const soldByProduct = new Map<string, number>();
  for (const row of onlineSalesRes.data ?? []) {
    if (!row.product_id) continue;
    soldByProduct.set(
      row.product_id,
      (soldByProduct.get(row.product_id) ?? 0) + Number(row.qty ?? 0),
    );
  }
  for (const row of posSalesRes.data ?? []) {
    if (!row.product_id) continue;
    soldByProduct.set(
      row.product_id,
      (soldByProduct.get(row.product_id) ?? 0) + Number(row.qty ?? 0),
    );
  }

  const returnedByProduct = new Map<string, number>();
  for (const row of onlineReturnsRes.data ?? []) {
    if (!row.product_id) continue;
    returnedByProduct.set(
      row.product_id,
      (returnedByProduct.get(row.product_id) ?? 0) + Number(row.qty ?? 0),
    );
  }
  for (const row of posReturnsRes.data ?? []) {
    if (!row.product_id) continue;
    returnedByProduct.set(
      row.product_id,
      (returnedByProduct.get(row.product_id) ?? 0) + Number(row.qty ?? 0),
    );
  }

  // Compute candidates: only products with both enough sales volume
  // (so 1-of-1 doesn't dominate) AND at least one return.
  type Candidate = { productId: string; unitsSold: number; unitsReturned: number; returnRatePct: number };
  const candidates: Candidate[] = [];
  for (const [productId, unitsReturned] of returnedByProduct.entries()) {
    const unitsSold = soldByProduct.get(productId) ?? 0;
    if (unitsSold < minUnitsSold) continue;
    if (unitsReturned <= 0) continue;
    const rate = (unitsReturned / unitsSold) * 100;
    if (rate < thresholdPct) continue;
    candidates.push({
      productId,
      unitsSold,
      unitsReturned,
      returnRatePct: Math.round(rate * 10) / 10,
    });
  }

  candidates.sort((a, b) => b.returnRatePct - a.returnRatePct);
  const top = candidates.slice(0, limit);
  if (top.length === 0) return [];

  // JOIN products for the surviving rows only.
  const { data: products } = await admin
    .from("products")
    .select("id, name_ar, slug")
    .in(
      "id",
      top.map((c) => c.productId),
    );

  const productMap = new Map<string, { name_ar: string; slug: string }>();
  for (const p of products ?? []) {
    productMap.set(p.id, { name_ar: p.name_ar, slug: p.slug });
  }

  return top.flatMap((c) => {
    const p = productMap.get(c.productId);
    if (!p) return [];
    return [
      {
        productId: c.productId,
        productSlug: p.slug,
        productName: p.name_ar,
        unitsSold: c.unitsSold,
        unitsReturned: c.unitsReturned,
        returnRatePct: c.returnRatePct,
      },
    ];
  });
}

// ─── Type re-export for callers that need raw rows (unused today but
//   re-exported so a future filter can import without two paths). ──
export type { ProductVariant };
