import Link from "next/link";
import { Download } from "lucide-react";
import {
  getBestSellers,
  getDailyReport,
  getMonthlyReport,
  getStockValueReport,
  getSupplierLedger,
} from "@/lib/queries/admin-reports";
import { RevenueChart } from "@/components/admin/dashboard/RevenueChart";
import { getAdminLocale, type AdminLocale } from "@/lib/admin/locale";
import { cn, formatPriceEGP } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Tab = "daily" | "monthly" | "best-sellers" | "stock" | "suppliers";

const TABS: ReadonlyArray<{ id: Tab; label_en: string; label_ar: string }> = [
  { id: "daily", label_en: "Daily revenue", label_ar: "إيراد يومي" },
  { id: "monthly", label_en: "Monthly revenue", label_ar: "إيراد شهري" },
  { id: "best-sellers", label_en: "Best sellers", label_ar: "الأكثر مبيعاً" },
  { id: "stock", label_en: "Stock value", label_ar: "قيمة المخزون" },
  { id: "suppliers", label_en: "Supplier ledger", label_ar: "سجل الموردين" },
];

/**
 * /admin/reports — five report tabs.
 *
 * Each tab fetches its own dataset server-side using the date/range
 * query params, renders a small header form + a table (and a chart
 * where appropriate), and links to /admin/reports/export with the
 * same params for CSV download.
 */
export default async function ReportsPage({
  searchParams,
}: PageProps<"/admin/reports">) {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";
  const sp = await searchParams;
  const tabParam = typeof sp?.tab === "string" ? sp.tab : "daily";
  const tab: Tab = (TABS.find((t) => t.id === tabParam)?.id ?? "daily") as Tab;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-[var(--color-text)]">
          {isAr ? "التقارير" : "Reports"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {isAr
            ? "إيراد يومي / شهري، الأكثر مبيعاً، قيمة المخزون، سجل الموردين. كل تقرير بيتصدّر CSV."
            : "Daily / monthly revenue, best-sellers, stock value, supplier ledger. Every report exports as CSV."}
        </p>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-[var(--color-border)]">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/reports?tab=${t.id}`}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition",
              t.id === tab
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]",
            )}
          >
            {isAr ? t.label_ar : t.label_en}
          </Link>
        ))}
      </nav>

      {tab === "daily" && (
        <DailyTab
          date={typeof sp?.date === "string" ? sp.date : undefined}
          locale={locale}
        />
      )}
      {tab === "monthly" && (
        <MonthlyTab
          month={typeof sp?.month === "string" ? sp.month : undefined}
          locale={locale}
        />
      )}
      {tab === "best-sellers" && (
        <BestSellersTab
          from={typeof sp?.from === "string" ? sp.from : undefined}
          to={typeof sp?.to === "string" ? sp.to : undefined}
          source={
            sp?.source === "online" || sp?.source === "pos"
              ? (sp.source as "online" | "pos")
              : "both"
          }
          locale={locale}
        />
      )}
      {tab === "stock" && <StockTab locale={locale} />}
      {tab === "suppliers" && <SuppliersTab locale={locale} />}
    </div>
  );
}

// ─── Tab 1: Daily ────────────────────────────────────────────────────
async function DailyTab({
  date,
  locale,
}: {
  date?: string;
  locale: AdminLocale;
}) {
  const isAr = locale === "ar";
  const iso = date ?? new Date().toISOString().slice(0, 10);
  const r = await getDailyReport(iso);
  return (
    <section className="space-y-4">
      <form action="/admin/reports" className="flex items-end gap-2">
        <input type="hidden" name="tab" value="daily" />
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "التاريخ" : "Date"}
          </span>
          <input
            type="date"
            name="date"
            defaultValue={iso}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          {isAr ? "تطبيق" : "Apply"}
        </button>
        <ExportLink
          href={`/admin/reports/export?report=daily&date=${iso}`}
          locale={locale}
        />
      </form>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat
          label={isAr ? "إجمالي الإيراد" : "Total revenue"}
          value={formatPriceEGP(r.total)}
          tone="primary"
        />
        <Stat
          label={isAr ? "أونلاين" : "Online"}
          value={formatPriceEGP(r.online.revenue)}
          sub={
            isAr
              ? `${r.online.count} طلب · ${r.online.items} قطعة`
              : `${r.online.count} orders · ${r.online.items} items`
          }
        />
        <Stat
          label={isAr ? "المحل" : "POS"}
          value={formatPriceEGP(r.pos.revenue)}
          sub={
            isAr
              ? `${r.pos.count} بيعة · ${r.pos.items} قطعة`
              : `${r.pos.count} sales · ${r.pos.items} items`
          }
        />
        <Stat
          label={isAr ? "متوسط الطلب" : "Avg order value"}
          value={formatPriceEGP(r.averageOrderValue)}
        />
      </div>
    </section>
  );
}

// ─── Tab 2: Monthly ──────────────────────────────────────────────────
async function MonthlyTab({
  month,
  locale,
}: {
  month?: string;
  locale: AdminLocale;
}) {
  const isAr = locale === "ar";
  const yyyymm = month ?? new Date().toISOString().slice(0, 7);
  const r = await getMonthlyReport(yyyymm);
  return (
    <section className="space-y-4">
      <form action="/admin/reports" className="flex items-end gap-2">
        <input type="hidden" name="tab" value="monthly" />
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "الشهر" : "Month"}
          </span>
          <input
            type="month"
            name="month"
            defaultValue={yyyymm}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          {isAr ? "تطبيق" : "Apply"}
        </button>
        <ExportLink
          href={`/admin/reports/export?report=monthly&month=${yyyymm}`}
          locale={locale}
        />
      </form>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat
          label={isAr ? "الشهر ده" : "This month"}
          value={formatPriceEGP(r.total)}
          tone="primary"
        />
        <Stat
          label={isAr ? "الشهر اللي فات" : "Previous month"}
          value={formatPriceEGP(r.previousTotal)}
          tone="muted"
        />
        <Stat
          label={isAr ? "مقارنة بالسابق" : "vs Previous"}
          value={
            r.deltaPct === null
              ? "—"
              : `${r.deltaPct >= 0 ? "+" : ""}${r.deltaPct.toFixed(1)}%`
          }
          tone={
            r.deltaPct === null
              ? "muted"
              : r.deltaPct >= 0
                ? "success"
                : "error"
          }
        />
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
        <p className="mb-3 text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
          {isAr ? "التفصيل اليومي" : "Daily breakdown"}
        </p>
        <RevenueChart data={r.daily} locale={locale} />
      </div>
    </section>
  );
}

// ─── Tab 3: Best sellers ─────────────────────────────────────────────
async function BestSellersTab({
  from,
  to,
  source,
  locale,
}: {
  from?: string;
  to?: string;
  source: "online" | "pos" | "both";
  locale: AdminLocale;
}) {
  const isAr = locale === "ar";
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 30 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const fromISO = from ?? defaultFrom;
  const toISO = to ?? today;
  const rows = await getBestSellers({
    from: fromISO,
    to: toISO,
    source,
    limit: 50,
  });
  return (
    <section className="space-y-4">
      <form action="/admin/reports" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="tab" value="best-sellers" />
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "من" : "From"}
          </span>
          <input
            type="date"
            name="from"
            defaultValue={fromISO}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "إلى" : "To"}
          </span>
          <input
            type="date"
            name="to"
            defaultValue={toISO}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "المصدر" : "Source"}
          </span>
          <select
            name="source"
            defaultValue={source}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="both">{isAr ? "الاتنين" : "Both"}</option>
            <option value="online">{isAr ? "أونلاين فقط" : "Online only"}</option>
            <option value="pos">{isAr ? "المحل فقط" : "POS only"}</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          {isAr ? "تطبيق" : "Apply"}
        </button>
        <ExportLink
          href={`/admin/reports/export?report=best-sellers&from=${fromISO}&to=${toISO}&source=${source}`}
          locale={locale}
        />
      </form>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th>#</Th>
              <Th>{isAr ? "المنتج" : "Product"}</Th>
              <Th className="text-end">{isAr ? "القطع" : "Units"}</Th>
              <Th className="text-end">{isAr ? "الإيراد" : "Revenue"}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.productId} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
                  {i + 1}
                </td>
                <td className="px-3 py-2">
                  {r.productSlug ? (
                    <Link
                      href={`/ar/products/${r.productSlug}`}
                      target="_blank"
                      className="text-[var(--color-text)] hover:underline"
                    >
                      {r.productName}
                    </Link>
                  ) : (
                    <span>{r.productName}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-end font-mono text-sm">
                  {r.unitsSold}
                </td>
                <td className="px-3 py-2 text-end font-mono text-sm font-semibold text-[var(--color-primary)]">
                  {formatPriceEGP(r.revenue)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]">
                  {isAr ? "لا يوجد مبيعات في الفترة دي." : "No sales in this window."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Tab 4: Stock value ──────────────────────────────────────────────
async function StockTab({ locale }: { locale: AdminLocale }) {
  const isAr = locale === "ar";
  const rows = await getStockValueReport();
  const totalValue = rows.reduce((s, r) => s + r.stockValue, 0);
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <Stat
          label={isAr ? "إجمالي قيمة المخزون" : "Total inventory value"}
          value={formatPriceEGP(totalValue)}
          tone="primary"
        />
        <ExportLink href="/admin/reports/export?report=stock" locale={locale} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th>{isAr ? "المنتج" : "Product"}</Th>
              <Th className="text-end">{isAr ? "القطع" : "Units"}</Th>
              <Th className="text-end">{isAr ? "متوسط التكلفة" : "Avg cost"}</Th>
              <Th className="text-end">{isAr ? "قيمة المخزون" : "Stock value"}</Th>
              <Th className="text-end">{isAr ? "اتباع آخر 30 يوم" : "Sold last 30d"}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.productId} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2">{r.productName}</td>
                <td className="px-3 py-2 text-end font-mono text-sm">
                  {r.totalUnits}
                </td>
                <td className="px-3 py-2 text-end font-mono text-sm text-[var(--color-text-secondary)]">
                  {formatPriceEGP(r.avgUnitCost)}
                </td>
                <td className="px-3 py-2 text-end font-mono text-sm font-semibold">
                  {formatPriceEGP(r.stockValue)}
                </td>
                <td className="px-3 py-2 text-end font-mono text-sm">
                  {r.unitsSoldLast30}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Tab 5: Supplier ledger ──────────────────────────────────────────
async function SuppliersTab({ locale }: { locale: AdminLocale }) {
  const isAr = locale === "ar";
  const rows = await getSupplierLedger();
  const owedTotal = rows.reduce((s, r) => s + r.totalOwed, 0);
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <Stat
          label={isAr ? "إجمالي المستحق للموردين" : "Total owed to suppliers"}
          value={formatPriceEGP(owedTotal)}
          tone={owedTotal > 0 ? "error" : "muted"}
        />
        <ExportLink
          href="/admin/reports/export?report=suppliers"
          locale={locale}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th>{isAr ? "المورد" : "Supplier"}</Th>
              <Th className="text-end">{isAr ? "أوامر الشراء" : "POs"}</Th>
              <Th className="text-end">{isAr ? "المشتريات" : "Purchased"}</Th>
              <Th className="text-end">{isAr ? "المدفوع" : "Paid"}</Th>
              <Th className="text-end">{isAr ? "المستحق" : "Owed"}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.supplierId} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-end font-mono text-sm">
                  {r.poCount}
                </td>
                <td className="px-3 py-2 text-end font-mono text-sm">
                  {formatPriceEGP(r.totalPurchased)}
                </td>
                <td className="px-3 py-2 text-end font-mono text-sm text-[var(--color-success)]">
                  {formatPriceEGP(r.totalPaid)}
                </td>
                <td className="px-3 py-2 text-end font-mono text-sm">
                  <span
                    className={
                      r.totalOwed > 0
                        ? "text-[var(--color-error)]"
                        : "text-[var(--color-text-secondary)]"
                    }
                  >
                    {formatPriceEGP(r.totalOwed)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Shared UI bits ─────────────────────────────────────────────────
function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "primary" | "success" | "error" | "muted";
}) {
  const color =
    tone === "primary"
      ? "text-[var(--color-primary)]"
      : tone === "success"
        ? "text-[var(--color-success)]"
        : tone === "error"
          ? "text-[var(--color-error)]"
          : tone === "muted"
            ? "text-[var(--color-text-secondary)]"
            : "text-[var(--color-text)]";
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${color}`}>
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
          {sub}
        </p>
      )}
    </div>
  );
}

function ExportLink({ href, locale }: { href: string; locale: AdminLocale }) {
  const isAr = locale === "ar";
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
    >
      <Download className="h-3.5 w-3.5" />
      {isAr ? "تصدير CSV" : "Export CSV"}
    </a>
  );
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={
        "px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider " +
        (className ?? "")
      }
    >
      {children}
    </th>
  );
}
