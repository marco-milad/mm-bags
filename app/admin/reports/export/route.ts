import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  getBestSellers,
  getDailyReport,
  getMonthlyReport,
  getReturnsAnalytics,
  getStockValueReport,
  getSupplierLedger,
  toCsv,
} from "@/lib/queries/admin-reports";
import { cairoDateOf, cairoTodayISO } from "@/lib/queries/cairo-tz";

export const runtime = "nodejs";

/**
 * CSV export for the report tabs.
 *
 * GET /admin/reports/export?report=daily&date=YYYY-MM-DD
 *                          ?report=monthly&month=YYYY-MM
 *                          ?report=best-sellers&from=...&to=...&source=...
 *                          ?report=stock
 *                          ?report=suppliers
 *
 * Returns the CSV with Content-Disposition: attachment so the browser
 * triggers a download. Admin auth delegated to the shared helper so
 * user_metadata.role is NOT trusted.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(["admin", "manager"]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "forbidden";
    return new NextResponse(msg.toLowerCase(), {
      status: msg === "UNAUTHORIZED" ? 401 : 403,
    });
  }

  const sp = new URL(request.url).searchParams;
  const report = sp.get("report");
  let csv = "";
  let filename = "report.csv";

  switch (report) {
    case "daily": {
      const date = sp.get("date") ?? cairoTodayISO();
      const r = await getDailyReport(date);
      csv = toCsv(
        ["metric", "value"],
        [
          ["date", r.date],
          ["online_orders", r.online.count],
          ["online_revenue_egp", r.online.revenue],
          ["online_items", r.online.items],
          ["pos_orders", r.pos.count],
          ["pos_revenue_egp", r.pos.revenue],
          ["pos_items", r.pos.items],
          ["total_revenue_egp", r.total],
          ["average_order_value_egp", r.averageOrderValue],
        ],
      );
      filename = `daily-${r.date}.csv`;
      break;
    }
    case "monthly": {
      const month = sp.get("month") ?? cairoTodayISO().slice(0, 7);
      const r = await getMonthlyReport(month);
      csv = toCsv(
        ["date", "online_egp", "pos_egp", "total_egp"],
        r.daily.map((d) => [d.date, d.online, d.pos, d.online + d.pos]),
      );
      filename = `monthly-${r.yyyymm}.csv`;
      break;
    }
    case "best-sellers": {
      const from = sp.get("from") ?? defaultFromIso();
      const to = sp.get("to") ?? cairoTodayISO();
      const source =
        sp.get("source") === "online" || sp.get("source") === "pos"
          ? (sp.get("source") as "online" | "pos")
          : ("both" as const);
      const r = await getBestSellers({ from, to, source, limit: 500 });
      csv = toCsv(
        ["product", "units_sold", "revenue_egp"],
        r.map((row) => [row.productName, row.unitsSold, row.revenue]),
      );
      filename = `best-sellers-${from}-${to}.csv`;
      break;
    }
    case "stock": {
      const r = await getStockValueReport();
      csv = toCsv(
        [
          "product",
          "stock_units",
          "avg_unit_cost_egp",
          "stock_value_egp",
          "units_sold_last_30d",
        ],
        r.map((row) => [
          row.productName,
          row.totalUnits,
          row.avgUnitCost,
          row.stockValue,
          row.unitsSoldLast30,
        ]),
      );
      filename = "stock-value.csv";
      break;
    }
    case "suppliers": {
      const r = await getSupplierLedger();
      csv = toCsv(
        [
          "supplier",
          "purchase_orders",
          "total_purchased_egp",
          "total_paid_egp",
          "total_owed_egp",
        ],
        r.map((row) => [
          row.name,
          row.poCount,
          row.totalPurchased,
          row.totalPaid,
          row.totalOwed,
        ]),
      );
      filename = "suppliers.csv";
      break;
    }
    case "returns": {
      // Top returned products is the most operationally useful slice —
      // tells Marco which SKUs to look at first. Headers + totals row
      // for context; the other dimensions (reason / method) are visible
      // in the UI and the PDF.
      const month = sp.get("month") ?? cairoTodayISO().slice(0, 7);
      const r = await getReturnsAnalytics(month);
      csv = toCsv(
        ["product", "qty_returned", "refund_total_egp"],
        r.topReturnedProducts.map((p) => [
          p.productName,
          p.returnCount,
          p.refundTotal,
        ]),
      );
      filename = `returns-${month}.csv`;
      break;
    }
    default:
      return new NextResponse("unknown report", { status: 400 });
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function defaultFromIso(): string {
  // Default best-sellers window: last 30 days, expressed as the Cairo
  // calendar date 30 days back so it matches the picker default.
  return cairoDateOf(new Date(Date.now() - 30 * 86400_000));
}
