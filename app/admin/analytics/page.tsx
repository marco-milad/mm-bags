import Link from "next/link";
import {
  getAcquisition,
  getFunnel,
  getLive,
  getOverview,
  getPreviousFunnel,
  getPreviousOverview,
  getProductDemand,
  getSearchReport,
  type RangeKey,
} from "@/lib/admin/analytics";
import { THRESHOLDS, buildInsights, deltaPct, deltaPoints } from "@/lib/analytics/insights";
import { Delta, InsightsPanel, Kpi } from "@/components/admin/analytics/Summary";
import { getAdminLocale } from "@/lib/admin/locale";
import { LivePanel } from "@/components/admin/analytics/LivePanel";
import { TrafficSeries } from "@/components/admin/analytics/TrafficSeries";
import { AcquisitionReport } from "@/components/admin/analytics/AcquisitionReport";
import { FunnelReport } from "@/components/admin/analytics/FunnelReport";
import { ProductDemand } from "@/components/admin/analytics/ProductDemand";
import { SearchReport } from "@/components/admin/analytics/SearchReport";
import { listSynonyms } from "@/lib/admin/synonyms";
import { cn } from "@/lib/utils";

// Never ISR-cached: this reads the event log and must not be shared.
export const dynamic = "force-dynamic";

const RANGES: ReadonlyArray<{ id: RangeKey; ar: string; en: string }> = [
  { id: "7d", ar: "آخر ٧ أيام", en: "Last 7 days" },
  { id: "30d", ar: "آخر ٣٠ يوم", en: "Last 30 days" },
  { id: "all", ar: "كل الوقت", en: "All time" },
];

function isRange(v: unknown): v is RangeKey {
  return v === "7d" || v === "30d" || v === "all";
}

export default async function AnalyticsPage({
  searchParams,
}: PageProps<"/admin/analytics">) {
  const sp = await searchParams;
  const range: RangeKey = isRange(sp?.range) ? sp.range : "30d";
  const locale = await getAdminLocale();
  const isAr = locale === "ar";

  // getOverview/getLive each call requireAdmin() before touching the
  // service-role client.
  const [overview, live, demand, report, synonyms, acquisition, funnel, prevOverview, prevFunnel] =
    await Promise.all([
      getOverview(range),
      getLive(),
      getProductDemand(range),
      getSearchReport(range),
      listSynonyms(),
      getAcquisition(range),
      getFunnel(range),
      // Same-length window just before this one; null for "all time".
      getPreviousOverview(range),
      getPreviousFunnel(range),
    ]);

  const n = (v: number) => v.toLocaleString(isAr ? "ar-EG" : "en-US");
  const hasAnyData = overview.pageViews > 0 || overview.visitors > 0;
  const pctText = (v: number | null) => (v === null ? "—" : `${n(v)}%`);
  const zeroRate = overview.searches > 0 ? overview.zeroResultRate : null;
  const prevZeroRate =
    prevOverview && prevOverview.searches > 0 ? prevOverview.zeroResultRate : null;

  // No arrow when either period is too small to compare: 2 → 18 product
  // opens is "+800%", which is noise, not news.
  const enough = (cur: number, prev: number | null | undefined) =>
    prev != null && cur >= THRESHOLDS.trafficBaseline && prev >= THRESHOLDS.trafficBaseline;
  const pctDelta = (cur: number, prev: number | null | undefined) =>
    enough(cur, prev) ? deltaPct(cur, prev) : null;
  const ptDelta = (
    cur: number | null,
    prev: number | null | undefined,
    curBase: number,
    prevBase: number | null | undefined,
  ) => (enough(curBase, prevBase) ? deltaPoints(cur, prev) : null);

  const insights = buildInsights({
    visitors: overview.visitors,
    prevVisitors: prevOverview?.visitors ?? null,
    purchased: funnel.purchased,
    conversionRate: funnel.conversionRate,
    cartedVisitors: funnel.cartedVisitors,
    abandonmentRate: funnel.abandonmentRate,
    zeroTerms: report.zeroTerms,
    products: demand,
  });

  return (
    <div className="space-y-5 md:space-y-6 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text)]">
            {isAr ? "التحليلات" : "Analytics"}
          </h1>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            {isAr
              ? "إزاي الزوّار بيلاقوا المحل، بيدوّروا على إيه، وبيشتروا إيه. الأسهم بتقارن بالفترة اللي قبلها بنفس الطول."
              : "How visitors find the shop, what they look for, and what they buy. Arrows compare with the previous period of the same length."}
          </p>
        </div>
        <nav className="flex w-full gap-1 rounded-lg sm:w-auto border border-[var(--color-border)] p-1">
          {RANGES.map((r) => (
            <Link
              key={r.id}
              href={`/admin/analytics?range=${r.id}`}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center rounded-md px-3 text-sm transition-colors sm:flex-none md:min-h-0 md:py-1.5 md:text-xs",
                r.id === range
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]",
              )}
            >
              {isAr ? r.ar : r.en}
            </Link>
          ))}
        </nav>
      </header>

      {!hasAnyData ? (
        // The 0-event state is explicit rather than a grid of zeros: at this
        // point nothing is broken, there is simply nothing yet.
        <section className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-8 text-center">
          <p className="text-sm font-medium text-[var(--color-text)]">
            {isAr ? "لسه مفيش بيانات." : "No data yet."}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[var(--color-text-secondary)]">
            {isAr
              ? "التتبّع يبدأ من أول زيارة بعد النشر. الأرقام هنا لا تُحسب بأثر رجعي، فأول مقارنة شهر بشهر تكون بعد شهرين."
              : "Tracking starts with the first visit after deploy. Nothing is backfilled, so the first month-over-month comparison is two months out."}
          </p>
        </section>
      ) : (
        <>
          <InsightsPanel insights={insights} isAr={isAr} />

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label={isAr ? "الزوّار" : "Visitors"}
              value={n(overview.visitors)}
              delta={<Delta value={pctDelta(overview.visitors, prevOverview?.visitors)} isAr={isAr} />}
              sub={
                isAr
                  ? `${n(overview.newVisitors)} أول مرة · ${n(overview.sessions)} زيارة`
                  : `${n(overview.newVisitors)} first-time · ${n(overview.sessions)} visits`
              }
            />
            <Kpi
              label={isAr ? "فتحوا منتجات" : "Product views"}
              value={n(overview.productOpens)}
              delta={<Delta value={pctDelta(overview.productOpens, prevOverview?.productOpens)} isAr={isAr} />}
              sub={isAr ? `من ${n(overview.pageViews)} صفحة اتفتحت` : `of ${n(overview.pageViews)} pages viewed`}
            />
            <Kpi
              label={isAr ? "معدل الشراء" : "Purchase rate"}
              value={pctText(funnel.conversionRate)}
              delta={
                <Delta
                  value={ptDelta(funnel.conversionRate, prevFunnel?.conversionRate, funnel.sessions, prevFunnel?.sessions)}
                  unit="pt"
                  isAr={isAr}
                />
              }
              sub={
                isAr
                  ? `${n(funnel.purchased)} شراء من ${n(funnel.sessions)} زيارة`
                  : `${n(funnel.purchased)} purchases of ${n(funnel.sessions)} visits`
              }
            />
            <Kpi
              label={isAr ? "بحثوا ومالقوش" : "Found nothing"}
              value={pctText(zeroRate)}
              delta={
                <Delta value={ptDelta(zeroRate, prevZeroRate, overview.searches, prevOverview?.searches)} unit="pt" goodWhen="down" isAr={isAr} />
              }
              sub={
                isAr
                  ? `${n(overview.zeroResults)} من ${n(overview.searches)} بحث — الأقل أحسن`
                  : `${n(overview.zeroResults)} of ${n(overview.searches)} searches — lower is better`
              }
            />
          </section>

          <TrafficSeries series={overview.series} isAr={isAr} />

          <FunnelReport funnel={funnel} isAr={isAr} />

          {/* Has a decision attached (add a synonym), so it sits high. */}
          <SearchReport report={report} synonyms={synonyms} isAr={isAr} />

          <AcquisitionReport acquisition={acquisition} isAr={isAr} />

          <ProductDemand rows={demand} isAr={isAr} />
        </>
      )}

      <LivePanel initial={live} isAr={isAr} />
    </div>
  );
}
