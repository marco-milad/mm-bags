import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getBestSellers,
  getDailyDetailedReport,
  getMonthlyReport,
  getStockValueReport,
  getSupplierLedger,
} from "@/lib/queries/admin-reports";
import {
  getLowStockVariants,
  getMonthlyRevenue,
  getOverduePurchaseOrders,
  getRecentOrders,
  getRecentPosSales,
  getTodayStats,
} from "@/lib/queries/admin-dashboard";
import { getAdminLocale } from "@/lib/admin/locale";
import {
  fmtEGP,
  fmtInt,
  renderDailyPdf,
  renderDashboardPdf,
  renderGenericPdf,
  type GenericColumn,
} from "@/lib/admin/reports/pdf";

export const runtime = "nodejs";

/**
 * PDF export for the admin report tabs. Mirrors `/admin/reports/export`
 * (CSV) — same params, same data-fetch functions, same auth — and
 * returns an attachment PDF. Locale follows the `admin_locale` cookie
 * so the PDF matches whichever language the admin is using in the UI.
 *
 * Daily report uses the rich `renderDailyPdf` layout (summary grid +
 * per-sale detail tables with cashier attribution). The other four
 * tabs use `renderGenericPdf` — same brand header / footer template,
 * simpler single-table body.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  const adminEmail = process.env.ADMIN_EMAIL;
  const role = (user.user_metadata as { role?: string } | null)?.role;
  const isAdmin = role === "admin" || (adminEmail && user.email === adminEmail);
  if (!isAdmin) return new NextResponse("forbidden", { status: 403 });

  const locale = await getAdminLocale();
  const isAr = locale === "ar";
  const meta = user.user_metadata as { full_name?: string; name?: string } | null;
  const adminName =
    meta?.full_name ?? meta?.name ?? user.email?.split("@")[0] ?? "admin";

  const sp = new URL(request.url).searchParams;
  const report = sp.get("report");

  let pdf: Buffer;
  let filename = "report.pdf";

  switch (report) {
    case "dashboard": {
      // Full /admin overview — every panel the admin sees on the
      // dashboard, captured in one printable document. Limits match
      // the page itself (5 recent rows + 5 alerts + 30-day overdue).
      const [stats, monthly, recentOrders, recentPos, lowStock, overdue] =
        await Promise.all([
          getTodayStats(),
          getMonthlyRevenue(),
          getRecentOrders(5),
          getRecentPosSales(5),
          getLowStockVariants(5, 12),
          getOverduePurchaseOrders(30, 5),
        ]);
      pdf = await renderDashboardPdf({
        stats,
        monthly,
        recentOrders,
        recentPos,
        lowStock,
        overdue,
        adminName,
        locale,
      });
      filename = `dashboard-${new Date().toISOString().slice(0, 10)}.pdf`;
      break;
    }
    case "daily": {
      const date = sp.get("date") ?? new Date().toISOString().slice(0, 10);
      const detailed = await getDailyDetailedReport(date);
      pdf = await renderDailyPdf({ report: detailed, adminName, locale });
      filename = `daily-${detailed.date}.pdf`;
      break;
    }
    case "monthly": {
      const month = sp.get("month") ?? new Date().toISOString().slice(0, 7);
      const r = await getMonthlyReport(month);
      const columns: GenericColumn[] = [
        { header: { ar: "التاريخ", en: "Date" } },
        { header: { ar: "أونلاين", en: "Online" }, align: "numeric" },
        { header: { ar: "المحل", en: "POS" }, align: "numeric" },
        { header: { ar: "الإجمالي", en: "Total" }, align: "numeric" },
      ];
      const rows = r.daily.map((d) => [
        d.date,
        fmtEGP(d.online, locale),
        fmtEGP(d.pos, locale),
        fmtEGP(d.online + d.pos, locale),
      ]);
      const sumOnline = r.daily.reduce((s, d) => s + d.online, 0);
      const sumPos = r.daily.reduce((s, d) => s + d.pos, 0);
      const footer = [
        isAr ? "الإجمالي" : "Total",
        fmtEGP(sumOnline, locale),
        fmtEGP(sumPos, locale),
        fmtEGP(sumOnline + sumPos, locale),
      ];
      const subtitle = isAr
        ? `شهر ${r.yyyymm} — مقارنة بالشهر السابق: ${
            r.deltaPct === null
              ? "—"
              : `${r.deltaPct >= 0 ? "+" : ""}${r.deltaPct.toFixed(1)}%`
          }`
        : `Month ${r.yyyymm} — vs previous: ${
            r.deltaPct === null
              ? "—"
              : `${r.deltaPct >= 0 ? "+" : ""}${r.deltaPct.toFixed(1)}%`
          }`;
      pdf = await renderGenericPdf({
        title: { ar: "تقرير الإيراد الشهري", en: "Monthly revenue report" },
        subtitle,
        columns,
        rows,
        footer,
        adminName,
        locale,
      });
      filename = `monthly-${r.yyyymm}.pdf`;
      break;
    }
    case "best-sellers": {
      const today = new Date().toISOString().slice(0, 10);
      const defaultFrom = new Date(Date.now() - 30 * 86400_000)
        .toISOString()
        .slice(0, 10);
      const from = sp.get("from") ?? defaultFrom;
      const to = sp.get("to") ?? today;
      const source =
        sp.get("source") === "online" || sp.get("source") === "pos"
          ? (sp.get("source") as "online" | "pos")
          : ("both" as const);
      const r = await getBestSellers({ from, to, source, limit: 500 });
      const columns: GenericColumn[] = [
        { header: { ar: "#", en: "#" }, align: "center" },
        { header: { ar: "المنتج", en: "Product" } },
        { header: { ar: "القطع", en: "Units" }, align: "numeric" },
        { header: { ar: "الإيراد", en: "Revenue" }, align: "numeric" },
      ];
      const rows = r.map((row, i) => [
        String(i + 1),
        row.productName,
        fmtInt(row.unitsSold, locale),
        fmtEGP(row.revenue, locale),
      ]);
      const totalUnits = r.reduce((s, row) => s + row.unitsSold, 0);
      const totalRev = r.reduce((s, row) => s + row.revenue, 0);
      const sourceLabelAr = source === "both" ? "أونلاين + محل" : source === "online" ? "أونلاين" : "محل";
      const sourceLabelEn = source === "both" ? "Online + POS" : source === "online" ? "Online" : "POS";
      pdf = await renderGenericPdf({
        title: { ar: "الأكثر مبيعاً", en: "Best sellers" },
        subtitle: isAr
          ? `من ${from} إلى ${to} · ${sourceLabelAr}`
          : `${from} → ${to} · ${sourceLabelEn}`,
        columns,
        rows,
        footer: [
          "",
          isAr ? "الإجمالي" : "Total",
          fmtInt(totalUnits, locale),
          fmtEGP(totalRev, locale),
        ],
        adminName,
        locale,
      });
      filename = `best-sellers-${from}-${to}.pdf`;
      break;
    }
    case "stock": {
      const r = await getStockValueReport();
      const columns: GenericColumn[] = [
        { header: { ar: "المنتج", en: "Product" } },
        { header: { ar: "القطع", en: "Units" }, align: "numeric" },
        { header: { ar: "متوسط التكلفة", en: "Avg cost" }, align: "numeric" },
        { header: { ar: "قيمة المخزون", en: "Stock value" }, align: "numeric" },
        { header: { ar: "اتباع آخر 30 يوم", en: "Sold 30d" }, align: "numeric" },
      ];
      const rows = r.map((row) => [
        row.productName,
        fmtInt(row.totalUnits, locale),
        fmtEGP(row.avgUnitCost, locale),
        fmtEGP(row.stockValue, locale),
        fmtInt(row.unitsSoldLast30, locale),
      ]);
      const totalUnits = r.reduce((s, row) => s + row.totalUnits, 0);
      const totalValue = r.reduce((s, row) => s + row.stockValue, 0);
      const totalSold = r.reduce((s, row) => s + row.unitsSoldLast30, 0);
      pdf = await renderGenericPdf({
        title: { ar: "تقرير قيمة المخزون", en: "Stock value report" },
        subtitle: new Date().toLocaleDateString(
          isAr ? "ar-EG" : "en-US",
          { year: "numeric", month: "long", day: "numeric", timeZone: "Africa/Cairo" },
        ),
        columns,
        rows,
        footer: [
          isAr ? "الإجمالي" : "Total",
          fmtInt(totalUnits, locale),
          "",
          fmtEGP(totalValue, locale),
          fmtInt(totalSold, locale),
        ],
        adminName,
        locale,
      });
      filename = "stock-value.pdf";
      break;
    }
    case "suppliers": {
      const r = await getSupplierLedger();
      const columns: GenericColumn[] = [
        { header: { ar: "المورد", en: "Supplier" } },
        { header: { ar: "أوامر الشراء", en: "POs" }, align: "numeric" },
        { header: { ar: "المشتريات", en: "Purchased" }, align: "numeric" },
        { header: { ar: "المدفوع", en: "Paid" }, align: "numeric" },
        { header: { ar: "المستحق", en: "Owed" }, align: "numeric" },
      ];
      const rows = r.map((row) => [
        row.name,
        fmtInt(row.poCount, locale),
        fmtEGP(row.totalPurchased, locale),
        fmtEGP(row.totalPaid, locale),
        fmtEGP(row.totalOwed, locale),
      ]);
      const totalPurchased = r.reduce((s, row) => s + row.totalPurchased, 0);
      const totalPaid = r.reduce((s, row) => s + row.totalPaid, 0);
      const totalOwed = r.reduce((s, row) => s + row.totalOwed, 0);
      const totalPos = r.reduce((s, row) => s + row.poCount, 0);
      pdf = await renderGenericPdf({
        title: { ar: "سجل الموردين", en: "Supplier ledger" },
        subtitle: new Date().toLocaleDateString(
          isAr ? "ar-EG" : "en-US",
          { year: "numeric", month: "long", day: "numeric", timeZone: "Africa/Cairo" },
        ),
        columns,
        rows,
        footer: [
          isAr ? "الإجمالي" : "Total",
          fmtInt(totalPos, locale),
          fmtEGP(totalPurchased, locale),
          fmtEGP(totalPaid, locale),
          fmtEGP(totalOwed, locale),
        ],
        adminName,
        locale,
      });
      filename = "suppliers.pdf";
      break;
    }
    default:
      return new NextResponse("unknown report", { status: 400 });
  }

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
