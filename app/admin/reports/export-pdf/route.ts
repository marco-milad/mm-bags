import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getBestSellers,
  getDailyReport,
  getMonthlyReport,
  getStockValueReport,
  getSupplierLedger,
} from "@/lib/queries/admin-reports";
import { getAdminLocale } from "@/lib/admin/locale";
import { buildReportPdf, type PdfColumn, type PdfRow } from "@/lib/admin/reports/pdf";

export const runtime = "nodejs";

/**
 * PDF export for the admin report tabs. Mirrors `/admin/reports/export`
 * (CSV) — same params, same data-fetch functions, same auth — and
 * returns an attachment PDF. Locale follows the `admin_locale` cookie
 * so the PDF matches whichever language the admin is using in the UI.
 *
 * GET /admin/reports/export-pdf?report=daily&date=YYYY-MM-DD
 *                              ?report=monthly&month=YYYY-MM
 *                              ?report=best-sellers&from=...&to=...&source=...
 *                              ?report=stock
 *                              ?report=suppliers
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
  // Admin name for the footer signature. Falls back to the email if no
  // display name is set on the auth user.
  const meta = user.user_metadata as { full_name?: string; name?: string } | null;
  const adminName =
    meta?.full_name ?? meta?.name ?? user.email?.split("@")[0] ?? "admin";

  const sp = new URL(request.url).searchParams;
  const report = sp.get("report");

  let title = "";
  let dateRange = "";
  let columns: PdfColumn[] = [];
  let rows: PdfRow[] = [];
  let totals: ReadonlyArray<string | number | null> | undefined;
  let filename = "report.pdf";

  switch (report) {
    case "daily": {
      const date = sp.get("date") ?? new Date().toISOString().slice(0, 10);
      const r = await getDailyReport(date);
      title = isAr ? "إيراد يومي" : "Daily revenue";
      dateRange = isAr ? `تاريخ ${r.date}` : `Date: ${r.date}`;
      columns = [
        { header: isAr ? "البند" : "Metric" },
        { header: isAr ? "القيمة" : "Value", isNumeric: true },
      ];
      rows = [
        [isAr ? "طلبات أونلاين" : "Online orders", r.online.count],
        [isAr ? "إيراد أونلاين" : "Online revenue (EGP)", r.online.revenue],
        [isAr ? "قطع أونلاين" : "Online items", r.online.items],
        [isAr ? "بيعات المحل" : "POS sales", r.pos.count],
        [isAr ? "إيراد المحل" : "POS revenue (EGP)", r.pos.revenue],
        [isAr ? "قطع المحل" : "POS items", r.pos.items],
        [isAr ? "متوسط قيمة الطلب" : "Avg order value (EGP)", r.averageOrderValue],
      ];
      totals = [isAr ? "الإجمالي" : "Total revenue (EGP)", r.total];
      filename = `daily-${r.date}.pdf`;
      break;
    }
    case "monthly": {
      const month = sp.get("month") ?? new Date().toISOString().slice(0, 7);
      const r = await getMonthlyReport(month);
      title = isAr ? "إيراد شهري" : "Monthly revenue";
      dateRange = isAr ? `شهر ${r.yyyymm}` : `Month: ${r.yyyymm}`;
      columns = [
        { header: isAr ? "التاريخ" : "Date" },
        { header: isAr ? "أونلاين" : "Online (EGP)", isNumeric: true },
        { header: isAr ? "المحل" : "POS (EGP)", isNumeric: true },
        { header: isAr ? "الإجمالي" : "Total (EGP)", isNumeric: true },
      ];
      rows = r.daily.map((d) => [d.date, d.online, d.pos, d.online + d.pos]);
      const sumOnline = r.daily.reduce((s, d) => s + d.online, 0);
      const sumPos = r.daily.reduce((s, d) => s + d.pos, 0);
      totals = [isAr ? "الإجمالي" : "Total", sumOnline, sumPos, sumOnline + sumPos];
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
      title = isAr ? "الأكثر مبيعاً" : "Best sellers";
      dateRange = isAr ? `من ${from} إلى ${to}` : `${from} → ${to}`;
      columns = [
        { header: "#" },
        { header: isAr ? "المنتج" : "Product" },
        { header: isAr ? "القطع" : "Units", isNumeric: true },
        { header: isAr ? "الإيراد" : "Revenue (EGP)", isNumeric: true },
      ];
      rows = r.map((row, i) => [i + 1, row.productName, row.unitsSold, row.revenue]);
      const totalUnits = r.reduce((s, row) => s + row.unitsSold, 0);
      const totalRev = r.reduce((s, row) => s + row.revenue, 0);
      totals = ["", isAr ? "الإجمالي" : "Total", totalUnits, totalRev];
      filename = `best-sellers-${from}-${to}.pdf`;
      break;
    }
    case "stock": {
      const r = await getStockValueReport();
      title = isAr ? "قيمة المخزون" : "Stock value";
      dateRange = new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      columns = [
        { header: isAr ? "المنتج" : "Product" },
        { header: isAr ? "القطع" : "Units", isNumeric: true },
        { header: isAr ? "متوسط التكلفة" : "Avg cost (EGP)", isNumeric: true },
        { header: isAr ? "قيمة المخزون" : "Stock value (EGP)", isNumeric: true },
        { header: isAr ? "اتباع آخر 30 يوم" : "Sold last 30d", isNumeric: true },
      ];
      rows = r.map((row) => [
        row.productName,
        row.totalUnits,
        row.avgUnitCost,
        row.stockValue,
        row.unitsSoldLast30,
      ]);
      const totalUnits = r.reduce((s, row) => s + row.totalUnits, 0);
      const totalValue = r.reduce((s, row) => s + row.stockValue, 0);
      const totalSold = r.reduce((s, row) => s + row.unitsSoldLast30, 0);
      totals = [isAr ? "الإجمالي" : "Total", totalUnits, "", totalValue, totalSold];
      filename = "stock-value.pdf";
      break;
    }
    case "suppliers": {
      const r = await getSupplierLedger();
      title = isAr ? "سجل الموردين" : "Supplier ledger";
      dateRange = new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      columns = [
        { header: isAr ? "المورد" : "Supplier" },
        { header: isAr ? "أوامر الشراء" : "POs", isNumeric: true },
        { header: isAr ? "المشتريات" : "Purchased (EGP)", isNumeric: true },
        { header: isAr ? "المدفوع" : "Paid (EGP)", isNumeric: true },
        { header: isAr ? "المستحق" : "Owed (EGP)", isNumeric: true },
      ];
      rows = r.map((row) => [
        row.name,
        row.poCount,
        row.totalPurchased,
        row.totalPaid,
        row.totalOwed,
      ]);
      const totalPurchased = r.reduce((s, row) => s + row.totalPurchased, 0);
      const totalPaid = r.reduce((s, row) => s + row.totalPaid, 0);
      const totalOwed = r.reduce((s, row) => s + row.totalOwed, 0);
      const totalPos = r.reduce((s, row) => s + row.poCount, 0);
      totals = [
        isAr ? "الإجمالي" : "Total",
        totalPos,
        totalPurchased,
        totalPaid,
        totalOwed,
      ];
      filename = "suppliers.pdf";
      break;
    }
    default:
      return new NextResponse("unknown report", { status: 400 });
  }

  const pdfBytes = buildReportPdf({
    title,
    dateRange,
    columns,
    rows,
    totals,
    adminName,
    locale,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
