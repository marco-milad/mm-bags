import type { Insight } from "@/lib/analytics/insights";
import { cn } from "@/lib/utils";

/**
 * Period-over-period change chip. Colour carries meaning, so `goodWhen` says
 * which direction is good: up for visitors/purchases, down for "found nothing".
 * Renders nothing without a baseline — never a fake "0%".
 */
export function Delta({
  value,
  unit = "%",
  goodWhen = "up",
  isAr,
}: {
  value: number | null;
  unit?: "%" | "pt";
  goodWhen?: "up" | "down";
  isAr: boolean;
}) {
  if (value === null) return null;
  const n = (v: number) => v.toLocaleString(isAr ? "ar-EG" : "en-US");
  if (value === 0) {
    return (
      <span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
        {isAr ? "زي الفترة اللي فاتت" : "same as before"}
      </span>
    );
  }
  const up = value > 0;
  const good = goodWhen === "up" ? up : !up;
  const suffix = unit === "%" ? "%" : isAr ? " نقطة" : " pts";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        good
          ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
          : "bg-[var(--color-error)]/10 text-[var(--color-error)]",
      )}
      title={isAr ? "مقارنة بالفترة اللي قبلها بنفس الطول" : "vs the previous period of the same length"}
    >
      {up ? "↑" : "↓"} {n(Math.abs(value))}
      {suffix}
    </span>
  );
}

/** KPI tile: label, big number, change chip, and a plain-language line. */
export function Kpi({
  label,
  value,
  delta,
  sub,
}: {
  label: string;
  value: string;
  delta?: React.ReactNode;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <p className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="font-mono text-2xl font-semibold text-[var(--color-text)]">{value}</p>
        {delta}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{sub}</p>
    </div>
  );
}

const TONE: Record<Insight["tone"], { dot: string; box: string }> = {
  warn: { dot: "bg-[var(--color-warning)]", box: "border-[var(--color-warning)]/30" },
  good: { dot: "bg-[var(--color-success)]", box: "border-[var(--color-success)]/30" },
  info: { dot: "bg-[var(--color-border-dark)]", box: "border-[var(--color-border)]" },
};

/** "What to do today" — the first thing on the page. */
export function InsightsPanel({ insights, isAr }: { insights: Insight[]; isAr: boolean }) {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 md:p-5">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">
        {isAr ? "تعمل إيه النهارده؟" : "What to do today"}
      </h2>
      <ul className="mt-3 space-y-2">
        {insights.map((i, k) => (
          <li
            key={k}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border bg-[var(--color-surface)] px-3 py-2.5 text-sm leading-relaxed text-[var(--color-text)]",
              TONE[i.tone].box,
            )}
          >
            <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", TONE[i.tone].dot)} aria-hidden />
            <span dir="auto">{isAr ? i.ar : i.en}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
