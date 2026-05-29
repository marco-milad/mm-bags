import type { Locale } from "@/lib/i18n-config";
import type { ReviewSummary } from "@/lib/queries/reviews";
import { ReviewStars } from "./ReviewStars";

export function ReviewsBreakdown({
  summary,
  locale,
}: {
  summary: ReviewSummary;
  locale: Locale;
}) {
  return (
    <div className="grid gap-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:grid-cols-[auto_1fr] md:items-center">
      <div className="flex flex-col items-center gap-1.5 text-center md:items-start md:text-start">
        <p className="font-display text-5xl text-[var(--color-primary)]">
          {summary.total === 0
            ? "—"
            : summary.average.toFixed(1)}
        </p>
        <ReviewStars value={summary.average} size="md" />
        <p className="text-xs text-[var(--color-text-secondary)]">
          {summary.total === 0
            ? locale === "ar"
              ? "لسه مفيش تقييمات"
              : "No reviews yet"
            : locale === "ar"
              ? `بناءً على ${summary.total} تقييم`
              : `Based on ${summary.total} review${summary.total > 1 ? "s" : ""}`}
        </p>
      </div>

      <ul className="flex flex-col gap-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = summary.counts[star as 1 | 2 | 3 | 4 | 5];
          const pct = summary.total === 0 ? 0 : (count / summary.total) * 100;
          return (
            <li
              key={star}
              className="flex items-center gap-2 text-xs"
              aria-label={`${star} stars: ${count}`}
            >
              <span className="w-3 font-mono text-[var(--color-text-secondary)]">{star}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-border)]">
                <span
                  className="block h-full rounded-full bg-[var(--color-accent)] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="w-6 text-end font-mono text-[var(--color-text-secondary)]">
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
