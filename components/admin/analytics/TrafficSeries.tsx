import type { OverviewSeriesPoint } from "@/lib/admin/analytics";

/**
 * The daily series.
 *
 * Below three data points this renders a table instead of a chart. A bar chart
 * of one point is a rectangle, not information — and week one is exactly the
 * state that gets skipped when only the full-data case is designed for.
 */
export function TrafficSeries({
  series,
  collapseRatio,
  searches,
  isAr,
}: {
  series: OverviewSeriesPoint[];
  collapseRatio: number | null;
  searches: number;
  isAr: boolean;
}) {
  // Same numeral system as the tiles above. Two systems on one page reads
  // like two different reports.
  const n = (v: number) => v.toLocaleString(isAr ? "ar-EG" : "en-US");
  const max = Math.max(1, ...series.map((p) => p.visitors));
  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00Z").toLocaleDateString(isAr ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          {isAr ? "الحركة اليومية" : "Traffic"}
        </h2>
        {collapseRatio !== null && (
          <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">
            {isAr ? "نسبة طيّ البحث" : "collapse ratio"} {n(Math.round(collapseRatio * 100) / 100)}
            <span className="ms-1">
              {/* On a stack with an as-you-type box, a ratio under 1.5 on real
                  volume means the collapse view is not wired in. Here one search
                  is one navigation, so 1.00 is expected and is not flagged. */}
              {collapseRatio < 1.5 && searches > 20
                ? isAr
                  ? "(متوقّع: بحث بالتنقّل)"
                  : "(expected: navigation search)"
                : ""}
            </span>
          </span>
        )}
      </div>

      {series.length === 0 ? (
        <p className="mt-4 text-xs text-[var(--color-text-secondary)]">
          {isAr ? "لا بيانات في هذه الفترة." : "No data in this range."}
        </p>
      ) : series.length < 3 ? (
        <table className="mt-4 w-full text-xs">
          <thead>
            <tr className="text-start text-[var(--color-text-secondary)]">
              <th className="py-1 text-start font-medium">{isAr ? "اليوم" : "Day"}</th>
              <th className="py-1 text-end font-medium">{isAr ? "زوّار" : "Visitors"}</th>
              <th className="py-1 text-end font-medium">{isAr ? "جلسات" : "Sessions"}</th>
              <th className="py-1 text-end font-medium">{isAr ? "صفحات" : "Views"}</th>
              <th className="py-1 text-end font-medium">{isAr ? "بحث" : "Searches"}</th>
            </tr>
          </thead>
          <tbody>
            {series.map((p) => (
              <tr key={p.date} className="border-t border-[var(--color-border)]">
                <td className="py-1.5">{fmtDate(p.date)}</td>
                <td className="py-1.5 text-end font-mono">{n(p.visitors)}</td>
                <td className="py-1.5 text-end font-mono">{n(p.sessions)}</td>
                <td className="py-1.5 text-end font-mono">{n(p.page_views)}</td>
                <td className="py-1.5 text-end font-mono">{n(p.searches)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mt-4 flex h-40 items-end gap-1">
          {series.map((p) => (
            <div key={p.date} className="group relative flex flex-1 flex-col justify-end">
              <div
                className="rounded-t bg-[var(--color-primary)] transition-opacity group-hover:opacity-80"
                style={{ height: `${Math.max(2, (p.visitors / max) * 100)}%` }}
              />
              <span className="pointer-events-none absolute -top-6 start-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--color-text)] px-1.5 py-0.5 font-mono text-[10px] text-white opacity-0 group-hover:opacity-100">
                {fmtDate(p.date)} · {n(p.visitors)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
