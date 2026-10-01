import Link from "next/link";
import {
  getAcquisition,
  getFunnel,
  getLive,
  getOverview,
  getProductDemand,
  getSearchReport,
  type RangeKey,
} from "@/lib/admin/analytics";
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

/**
 * Every tile carries its definition. A tile labelled just "Users" cannot be
 * defended when the owner asks what it means, so the sub-line is part of the
 * tile, not decoration.
 */
function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold text-[var(--color-text)]">
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
        {sub}
      </p>
    </div>
  );
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
  const [overview, live, demand, report, synonyms, acquisition, funnel] =
    await Promise.all([
      getOverview(range),
      getLive(),
      getProductDemand(range),
      getSearchReport(range),
      listSynonyms(),
      getAcquisition(range),
      getFunnel(range),
    ]);

  const n = (v: number) => v.toLocaleString(isAr ? "ar-EG" : "en-US");
  const hasAnyData = overview.pageViews > 0 || overview.visitors > 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text)]">
            {isAr ? "التحليلات" : "Analytics"}
          </h1>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            {isAr
              ? "كل الأرقام بتوقيت القاهرة، وتبدأ من يوم تركيب التتبّع."
              : "All dates are Cairo time. Numbers start the day tracking shipped."}
          </p>
        </div>
        <nav className="flex gap-1 rounded-lg border border-[var(--color-border)] p-1">
          {RANGES.map((r) => (
            <Link
              key={r.id}
              href={`/admin/analytics?range=${r.id}`}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
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

      <LivePanel initial={live} isAr={isAr} />

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
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label={isAr ? "الزوّار" : "Visitors"}
              value={n(overview.visitors)}
              sub={
                isAr
                  ? `${n(overview.newVisitors)} جديد · ${n(overview.sessions)} جلسة — العدد لكل جهاز، والعائدون رقم أدنى لا حقيقة`
                  : `${n(overview.newVisitors)} new · ${n(overview.sessions)} sessions — counted per device; returning is a floor, not a truth`
              }
            />
            <Tile
              label={isAr ? "مشاهدات الصفحات" : "Page views"}
              value={n(overview.pageViews)}
              sub={
                isAr
                  ? `${n(overview.productOpens)} فتح منتج`
                  : `${n(overview.productOpens)} product opens`
              }
            />
            <Tile
              label={isAr ? "عمليات البحث" : "Searches"}
              value={n(overview.searches)}
              sub={
                isAr
                  ? "الكتابة المتتابعة تُحسب مرة واحدة"
                  : "as-you-type typing counts once"
              }
            />
            <Tile
              label={isAr ? "مالقوش حاجة" : "Found nothing"}
              value={`${n(overview.zeroResultRate)}%`}
              sub={
                isAr
                  ? `${n(overview.zeroResults)} من ${n(overview.searches)} بحث`
                  : `${n(overview.zeroResults)} of ${n(overview.searches)} searches`
              }
            />
          </section>

          <TrafficSeries
            series={overview.series}
            collapseRatio={overview.collapseRatio}
            searches={overview.searches}
            isAr={isAr}
          />

          <FunnelReport funnel={funnel} isAr={isAr} />

          <AcquisitionReport acquisition={acquisition} isAr={isAr} />

          {/* "What to act on" sits above the demand table on purpose: it is
              the section with a decision attached to it. */}
          <SearchReport report={report} synonyms={synonyms} isAr={isAr} />

          <ProductDemand
            rows={demand}
            isAr={isAr}
            hasSearch={overview.searches > 0}
          />
        </>
      )}

      <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
        {isAr
          ? "ملاحظة: البحث في الموقع تنقّل لصفحة الكتالوج وليس بحثًا أثناء الكتابة، فنسبة الطيّ 1.00 هي القيمة الصحيحة هنا لا إشارة خطأ."
          : "Note: search here is a navigation to the catalog, not an as-you-type box, so a collapse ratio of 1.00 is the correct value rather than a warning."}
      </p>
    </div>
  );
}
