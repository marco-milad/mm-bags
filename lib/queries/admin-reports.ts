import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DailyRevenuePoint } from "./admin-dashboard";

/**
 * Report queries for the /admin/reports page.
 *
 * Five reports:
 *   - Daily revenue (online + POS for one ISO date).
 *   - Monthly revenue (daily breakdown for an ISO year-month, plus
 *     totals for prev-month comparison).
 *   - Best-sellers (product / units / revenue) across a date range.
 *   - Stock value (qty × estimated cost) per product.
 *   - Supplier ledger (purchased / paid / owed).
 *
 * All helpers return plain shapes ready for table render + CSV
 * export. We aggregate in JS rather than via SQL views — see the
 * dashboard query module for the same trade-off rationale.
 */

// ─── Common helpers ──────────────────────────────────────────────────
function dayRange(iso: string): { from: string; to: string } {
  // Returns the [start, exclusive-end) of the ISO date in UTC. Cheap
  // and good enough — Egypt is UTC+2 so a midnight-aligned UTC window
  // is off by 2h, which means "Monday EG" shows the last 2h of "Sunday
  // UTC" sales under Sunday. Acceptable for an internal dashboard.
  const from = `${iso}T00:00:00.000Z`;
  const to = new Date(`${iso}T00:00:00.000Z`);
  to.setUTCDate(to.getUTCDate() + 1);
  return { from, to: to.toISOString() };
}
function monthRange(yyyymm: string): { from: string; to: string } {
  const [y, m] = yyyymm.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const to = new Date(Date.UTC(y, m, 1)).toISOString();
  return { from, to };
}

// ─── 1. Daily revenue ────────────────────────────────────────────────
export type DailyReport = {
  date: string;
  online: { count: number; revenue: number; items: number };
  pos: { count: number; revenue: number; items: number };
  total: number;
  averageOrderValue: number;
};

export async function getDailyReport(iso: string): Promise<DailyReport> {
  const { from, to } = dayRange(iso);
  const admin = getSupabaseAdminClient();

  const [ordersRes, posRes, orderItemsRes, posItemsRes] = await Promise.all([
    admin
      .from("orders")
      .select("id, total")
      .gte("created_at", from)
      .lt("created_at", to)
      .neq("status", "cancelled"),
    admin
      .from("pos_sales")
      .select("id, total")
      .gte("created_at", from)
      .lt("created_at", to),
    // Items joined via the parent's id — Postgrest can't filter children
    // by parent's created_at, so we count via order ids gathered above.
    admin
      .from("order_items")
      .select("qty, order_id"),
    admin
      .from("pos_sale_items")
      .select("qty, sale_id"),
  ]);

  const onlineIds = new Set((ordersRes.data ?? []).map((o) => o.id));
  const posIds = new Set((posRes.data ?? []).map((s) => s.id));
  const onlineItems = (orderItemsRes.data ?? []).reduce(
    (s, r) => (r.order_id && onlineIds.has(r.order_id) ? s + r.qty : s),
    0,
  );
  const posItems = (posItemsRes.data ?? []).reduce(
    (s, r) => (r.sale_id && posIds.has(r.sale_id) ? s + r.qty : s),
    0,
  );

  const online = {
    count: ordersRes.data?.length ?? 0,
    revenue: (ordersRes.data ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0),
    items: onlineItems,
  };
  const pos = {
    count: posRes.data?.length ?? 0,
    revenue: (posRes.data ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0),
    items: posItems,
  };
  const total = online.revenue + pos.revenue;
  const orderCount = online.count + pos.count;
  return {
    date: iso,
    online,
    pos,
    total,
    averageOrderValue: orderCount > 0 ? total / orderCount : 0,
  };
}

// ─── 2. Monthly revenue (incl. previous-month total) ─────────────────
export type MonthlyReport = {
  yyyymm: string;
  daily: DailyRevenuePoint[];
  total: number;
  previousTotal: number;
  deltaPct: number | null;
};

export async function getMonthlyReport(
  yyyymm: string,
): Promise<MonthlyReport> {
  const { from, to } = monthRange(yyyymm);
  const [y, m] = yyyymm.split("-").map(Number);
  const prevYYYYMM = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
  const { from: prevFrom, to: prevTo } = monthRange(prevYYYYMM);

  const admin = getSupabaseAdminClient();
  const [onlineRes, posRes, prevOnlineRes, prevPosRes] = await Promise.all([
    admin
      .from("orders")
      .select("created_at, total, status")
      .gte("created_at", from)
      .lt("created_at", to)
      .neq("status", "cancelled"),
    admin
      .from("pos_sales")
      .select("created_at, total")
      .gte("created_at", from)
      .lt("created_at", to),
    admin
      .from("orders")
      .select("total")
      .gte("created_at", prevFrom)
      .lt("created_at", prevTo)
      .neq("status", "cancelled"),
    admin
      .from("pos_sales")
      .select("total")
      .gte("created_at", prevFrom)
      .lt("created_at", prevTo),
  ]);

  // Build the daily point map (every day in the month).
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dailyMap = new Map<string, DailyRevenuePoint>();
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
    dailyMap.set(iso, { date: iso, online: 0, pos: 0 });
  }
  for (const r of onlineRes.data ?? []) {
    const day = r.created_at?.slice(0, 10);
    if (!day) continue;
    const p = dailyMap.get(day);
    if (p) p.online += Number(r.total ?? 0);
  }
  for (const r of posRes.data ?? []) {
    const day = r.created_at?.slice(0, 10);
    if (!day) continue;
    const p = dailyMap.get(day);
    if (p) p.pos += Number(r.total ?? 0);
  }

  const daily = Array.from(dailyMap.values());
  const total = daily.reduce((s, d) => s + d.online + d.pos, 0);
  const previousTotal =
    (prevOnlineRes.data ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0) +
    (prevPosRes.data ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0);
  const deltaPct =
    previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null;

  return { yyyymm, daily, total, previousTotal, deltaPct };
}

// ─── 3. Best-selling products ────────────────────────────────────────
export type BestSellerRow = {
  productId: string;
  productName: string;
  productSlug: string | null;
  unitsSold: number;
  revenue: number;
};
export type BestSellerSource = "online" | "pos" | "both";

export async function getBestSellers(opts: {
  from: string; // ISO date
  to: string; // ISO date exclusive
  source: BestSellerSource;
  limit?: number;
}): Promise<BestSellerRow[]> {
  const admin = getSupabaseAdminClient();
  const fromISO = `${opts.from}T00:00:00.000Z`;
  const toISO = `${opts.to}T00:00:00.000Z`;

  // Online: gather non-cancelled order ids in range, then sum items by
  // product. POS: same against pos_sales.
  let onlineItems: Array<{
    product_id: string | null;
    qty: number;
    unit_price: number;
    product_name: string;
    product_slug: string | null;
  }> = [];
  let posItems: Array<{
    product_id: string | null;
    qty: number;
    unit_price: number;
    product_name: string;
    product_slug: string | null;
  }> = [];

  if (opts.source !== "pos") {
    const { data: orderIds } = await admin
      .from("orders")
      .select("id")
      .gte("created_at", fromISO)
      .lt("created_at", toISO)
      .neq("status", "cancelled");
    if (orderIds && orderIds.length > 0) {
      const ids = orderIds.map((o) => o.id);
      const { data: items } = await admin
        .from("order_items")
        .select(
          "product_id, qty, unit_price, product:products(name_ar, name_en, slug)",
        )
        .in("order_id", ids);
      const rows = (items ?? []) as unknown as Array<{
        product_id: string | null;
        qty: number;
        unit_price: number;
        product:
          | { name_ar: string; name_en: string; slug: string }
          | Array<{ name_ar: string; name_en: string; slug: string }>
          | null;
      }>;
      onlineItems = rows.map((it) => {
        const p = Array.isArray(it.product) ? it.product[0] : it.product;
        return {
          product_id: it.product_id,
          qty: it.qty,
          unit_price: Number(it.unit_price),
          product_name: p?.name_ar ?? p?.name_en ?? "(deleted)",
          product_slug: p?.slug ?? null,
        };
      });
    }
  }
  if (opts.source !== "online") {
    const { data: saleIds } = await admin
      .from("pos_sales")
      .select("id")
      .gte("created_at", fromISO)
      .lt("created_at", toISO);
    if (saleIds && saleIds.length > 0) {
      const ids = saleIds.map((s) => s.id);
      const { data: items } = await admin
        .from("pos_sale_items")
        .select(
          "product_id, qty, unit_price, product:products(name_ar, name_en, slug)",
        )
        .in("sale_id", ids);
      const rows = (items ?? []) as unknown as Array<{
        product_id: string | null;
        qty: number;
        unit_price: number;
        product:
          | { name_ar: string; name_en: string; slug: string }
          | Array<{ name_ar: string; name_en: string; slug: string }>
          | null;
      }>;
      posItems = rows.map((it) => {
        const p = Array.isArray(it.product) ? it.product[0] : it.product;
        return {
          product_id: it.product_id,
          qty: it.qty,
          unit_price: Number(it.unit_price),
          product_name: p?.name_ar ?? p?.name_en ?? "(deleted)",
          product_slug: p?.slug ?? null,
        };
      });
    }
  }

  const byProduct = new Map<string, BestSellerRow>();
  for (const it of [...onlineItems, ...posItems]) {
    if (!it.product_id) continue;
    const entry = byProduct.get(it.product_id);
    if (entry) {
      entry.unitsSold += it.qty;
      entry.revenue += it.qty * it.unit_price;
    } else {
      byProduct.set(it.product_id, {
        productId: it.product_id,
        productName: it.product_name,
        productSlug: it.product_slug,
        unitsSold: it.qty,
        revenue: it.qty * it.unit_price,
      });
    }
  }

  return Array.from(byProduct.values())
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, opts.limit ?? 50);
}

// ─── 4. Stock value report ───────────────────────────────────────────
export type StockValueRow = {
  productId: string;
  productName: string;
  totalUnits: number;
  /** Avg unit cost across all received purchase-order lines for this
      product. Falls back to base_price when no purchases recorded. */
  avgUnitCost: number;
  stockValue: number;
  unitsSoldLast30: number;
};

export async function getStockValueReport(): Promise<StockValueRow[]> {
  const admin = getSupabaseAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [productsRes, variantsRes, poItemsRes, recentSalesItemsRes, recentPosItemsRes] =
    await Promise.all([
      admin.from("products").select("id, name_ar, name_en, base_price"),
      admin.from("product_variants").select("product_id, stock_qty"),
      admin
        .from("purchase_order_items")
        .select("product_id, qty, unit_cost"),
      admin
        .from("order_items")
        .select("product_id, qty, order:orders!inner(created_at, status)")
        .gte("order.created_at", thirtyDaysAgo)
        .neq("order.status", "cancelled"),
      admin
        .from("pos_sale_items")
        .select("product_id, qty, sale:pos_sales!inner(created_at)")
        .gte("sale.created_at", thirtyDaysAgo),
    ]);

  const stockByProduct = new Map<string, number>();
  for (const v of variantsRes.data ?? []) {
    if (!v.product_id) continue;
    stockByProduct.set(
      v.product_id,
      (stockByProduct.get(v.product_id) ?? 0) + (v.stock_qty ?? 0),
    );
  }

  // Weighted average cost: sum(qty * cost) / sum(qty) across PO lines.
  const costByProduct = new Map<
    string,
    { numerator: number; denominator: number }
  >();
  for (const it of poItemsRes.data ?? []) {
    if (!it.product_id) continue;
    const e = costByProduct.get(it.product_id) ?? { numerator: 0, denominator: 0 };
    e.numerator += it.qty * Number(it.unit_cost);
    e.denominator += it.qty;
    costByProduct.set(it.product_id, e);
  }

  const soldByProduct = new Map<string, number>();
  for (const it of [
    ...((recentSalesItemsRes.data ?? []) as Array<{ product_id: string | null; qty: number }>),
    ...((recentPosItemsRes.data ?? []) as Array<{ product_id: string | null; qty: number }>),
  ]) {
    if (!it.product_id) continue;
    soldByProduct.set(
      it.product_id,
      (soldByProduct.get(it.product_id) ?? 0) + it.qty,
    );
  }

  return (productsRes.data ?? [])
    .map((p) => {
      const totalUnits = stockByProduct.get(p.id) ?? 0;
      const costEntry = costByProduct.get(p.id);
      const avgUnitCost =
        costEntry && costEntry.denominator > 0
          ? costEntry.numerator / costEntry.denominator
          : Number(p.base_price ?? 0);
      return {
        productId: p.id,
        productName: p.name_ar ?? p.name_en,
        totalUnits,
        avgUnitCost,
        stockValue: totalUnits * avgUnitCost,
        unitsSoldLast30: soldByProduct.get(p.id) ?? 0,
      };
    })
    .sort((a, b) => b.stockValue - a.stockValue);
}

// ─── 5. Supplier ledger ──────────────────────────────────────────────
export type SupplierLedgerRow = {
  supplierId: string;
  name: string;
  totalPurchased: number;
  totalPaid: number;
  totalOwed: number;
  poCount: number;
};

export async function getSupplierLedger(): Promise<SupplierLedgerRow[]> {
  const admin = getSupabaseAdminClient();
  const [suppliersRes, posRes] = await Promise.all([
    admin
      .from("suppliers")
      .select("id, name, total_paid, total_owed")
      .order("name", { ascending: true }),
    admin
      .from("purchase_orders")
      .select("supplier_id, total_cost"),
  ]);

  const purchasedBy = new Map<string, { sum: number; count: number }>();
  for (const po of posRes.data ?? []) {
    if (!po.supplier_id) continue;
    const e = purchasedBy.get(po.supplier_id) ?? { sum: 0, count: 0 };
    e.sum += Number(po.total_cost ?? 0);
    e.count += 1;
    purchasedBy.set(po.supplier_id, e);
  }

  return (suppliersRes.data ?? []).map((s) => {
    const entry = purchasedBy.get(s.id) ?? { sum: 0, count: 0 };
    return {
      supplierId: s.id,
      name: s.name,
      totalPurchased: entry.sum,
      totalPaid: Number(s.total_paid ?? 0),
      totalOwed: Number(s.total_owed ?? 0),
      poCount: entry.count,
    };
  });
}

// ─── CSV serialisation ────────────────────────────────────────────────
/**
 * Minimal CSV escaper. Wraps every value in quotes; doubles any
 * internal quote per RFC 4180. Good enough for Excel + Numbers.
 */
export function toCsv(
  header: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>,
): string {
  const esc = (v: string | number | null | undefined): string => {
    const s = v === null || v === undefined ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [header.map(esc).join(",")];
  for (const r of rows) lines.push(r.map(esc).join(","));
  return lines.join("\n");
}
