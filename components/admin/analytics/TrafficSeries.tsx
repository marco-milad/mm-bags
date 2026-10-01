import type { OverviewSeriesPoint } from "@/lib/admin/analytics";

/**
 * Daily visitors.
 *
 * Fix (was always blank): every bar sized itself as a % of a column that had
 * no definite height, so it resolved to 0. Columns are now `h-full` of the
 * fixed-height track, which makes the % heights real.
 *
 * Touch-friendly by design — no hover-only information: a summary line, date
 * ticks, on-bar values when there are few days, and a native <details>
 * day-by-day table that works with no JS on any device.
 */
export function TrafficSeries({
  series,
  isAr,
}: {
  series: OverviewSeriesPoint[];
  isAr: boolean;
}) {
  const n = (v: number) => v.toLocaleString(isAr ? "ar-EG" : "en-US");
  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00Z").toLocaleDateString(isAr ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  const max = Math.max(1, ...series.map((p) => p.visitors));
  const peak = series.reduce<OverviewSeriesPoint | null>(
    (best, p) => (!best || p.visitors > best.visitors ? p : best),
    null,
  );
  const avg = series.length
    ? Math.round(series.reduce((s, p) => s + p.visitors, 0) / series.length)
    : 0;
  const showValues = series.length <= 14;
  const ticks =
    series.length > 2
      ? [series[0], series[Math.floor((series.length - 1) / 2)], series[series.length - 1]]
      : series;

  const DayTable = (
    <table className="mt-2 w-full text-xs">
      <thead>
        <tr className="text-[var(--color-text-secondary)]">
          <th className="py-1.5 text-start font-medium">{isAr ? "اليوم" : "Day"}</th>
          <th className="py-1.5 text-end font-medium">{isAr ? "زوّار" : "Visitors"}</th>
          <th className="py-1.5 text-end font-medium">{isAr ? "زيارات" : "Visits"}</th>
          <th className="py-1.5 text-end font-medium">{isAr ? "صفحات" : "Pages"}</th>
          <th className="py-1.5 text-end font-medium">{isAr ? "بحث" : "Searches"}</th>
        </tr>
      </thead>
      <tbody>
        {[...series].reverse().map((p) => (
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
  );

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 md:p-5">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">
        {isAr ? "الزوّار يوم بيوم" : "Visitors per day"}
      </h2>

      {series.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          {isAr ? "مفيش زيارات في الفترة دي." : "No visits in this period."}
        </p>
      ) : series.length < 3 ? (
        // Two bars aren't a trend — a table says more.
        DayTable
      ) : (
        <>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {isAr
              ? `أعلى يوم: ${fmtDate(peak!.date)} (${n(peak!.visitors)} زائر) · المتوسط: ${n(avg)} زائر في اليوم`
              : `Best day: ${fmtDate(peak!.date)} (${n(peak!.visitors)} visitors) · Average: ${n(avg)}/day`}
          </p>

          <div
            className="mt-4 flex h-40 items-end gap-[3px]"
            role="img"
            aria-label={isAr ? "رسم بياني لعدد الزوّار يوميًا" : "Bar chart of daily visitors"}
          >
            {series.map((p) => {
              // 85% cap leaves headroom for the value label above the tallest bar.
              const h = Math.max(2, (p.visitors / max) * 85);
              return (
                <div
                  key={p.date}
                  className="relative h-full min-w-0 flex-1"
                  title={`${fmtDate(p.date)} · ${n(p.visitors)}`}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t bg-[var(--color-primary)]"
                    style={{ height: `${h}%` }}
                  />
                  {showValues && (
                    <span
                      className="absolute inset-x-0 text-center font-mono text-[11px] text-[var(--color-text-secondary)]"
                      style={{ bottom: `calc(${h}% + 2px)` }}
                    >
                      {n(p.visitors)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-1.5 flex justify-between text-xs text-[var(--color-text-secondary)]">
            {ticks.map((p) => (
              <span key={p.date}>{fmtDate(p.date)}</span>
            ))}
          </div>

          <details className="mt-3 text-sm">
            <summary className="cursor-pointer py-2 text-xs font-medium text-[var(--color-primary)]">
              {isAr ? "عرض الأرقام يوم بيوم" : "Show day-by-day numbers"}
            </summary>
            <div className="overflow-x-auto">{DayTable}</div>
          </details>
        </>
      )}
    </section>
  );
}
