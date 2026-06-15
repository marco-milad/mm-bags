import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Order,
  PosSale,
  ProductVariant,
  PurchaseOrder,
} from "@/lib/supabase/types";

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

/** Returns the ISO date (YYYY-MM-DD) of "today" in the server's local TZ. */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** First day of "today"'s month, ISO date. */
function monthStartISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export async function getTodayStats(): Promise<TodayStats> {
  const admin = getSupabaseAdminClient();
  const startOfDay = `${todayISO()}T00:00:00.000Z`;

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
  const monthStart = `${monthStartISO()}T00:00:00.000Z`;

  const [orders, posSales] = await Promise.all([
    admin
      .from("orders")
      .select("created_at, total, status")
      .gte("created_at", monthStart)
      .neq("status", "cancelled"),
    admin
      .from("pos_sales")
      .select("created_at, total")
      .gte("created_at", monthStart),
  ]);

  // Bucket by YYYY-MM-DD; one entry per day of the current month so
  // the chart never has gaps.
  const dailyMap = new Map<string, DailyRevenuePoint>();
  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(now.getFullYear(), now.getMonth(), d)
      .toISOString()
      .slice(0, 10);
    dailyMap.set(iso, { date: iso, online: 0, pos: 0 });
  }

  for (const row of orders.data ?? []) {
    const day = row.created_at?.slice(0, 10);
    if (!day) continue;
    const point = dailyMap.get(day);
    if (point) point.online += Number(row.total ?? 0);
  }
  for (const row of posSales.data ?? []) {
    const day = row.created_at?.slice(0, 10);
    if (!day) continue;
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

// ─── Type re-export for callers that need raw rows (unused today but
//   re-exported so a future filter can import without two paths). ──
export type { ProductVariant };
