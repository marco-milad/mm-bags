import type { Funnel } from "@/lib/admin/analytics";
import { channelLabel } from "@/lib/analytics/channel-labels";
import { formatPriceEGP } from "@/lib/utils";

/**
 * Purchase funnel + abandoned carts + conversion by channel.
 *
 * Server component, pure presentation of analytics_funnel (migration 0024).
 * Rates follow the dashboard rule: "—" = no data, "0%" = measured zero.
 */
export function FunnelReport({ funnel, isAr }: { funnel: Funnel; isAr: boolean }) {
  if (funnel.sessions === 0) return null;

  const n = (v: number) => v.toLocaleString(isAr ? "ar-EG" : "en-US");
  const pct = (v: number | null) => (v === null ? "—" : `${n(v)}%`);
  const money = (v: number) => formatPriceEGP(v, isAr ? "ar" : "en");

  const steps = [
    { label: isAr ? "زيارات" : "Visits", value: funnel.sessions, rate: null as number | null },
    { label: isAr ? "فتحوا منتج" : "Viewed a product", value: funnel.viewed, rate: funnel.viewRate },
    { label: isAr ? "أضافوا للسلة" : "Added to cart", value: funnel.carted, rate: funnel.cartRate },
    { label: isAr ? "اشتروا" : "Purchased", value: funnel.purchased, rate: null },
  ];
  const max = funnel.sessions || 1;

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 md:p-5">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">
        {isAr ? "قمع الشراء" : "Purchase funnel"}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
        {isAr
          ? "من كل الزيارات: كام واحد فتح منتج، كام ضاف للسلة، وكام اشترى فعلاً. النسبة جنب كل خطوة محسوبة من الخطوة اللي قبلها."
          : "Of all visits: how many opened a product, added to cart, and actually bought. The % beside each step is relative to the step before it."}
      </p>

      {/* Headline numbers */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-[var(--color-surface)] p-3">
          <p className="text-xs text-[var(--color-text-secondary)]">
            {isAr ? "معدل الشراء" : "Purchase rate"}
          </p>
          <p className="mt-0.5 font-mono text-xl font-semibold text-[var(--color-text)]">
            {pct(funnel.conversionRate)}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {isAr
              ? `${n(funnel.purchased)} شراء من ${n(funnel.sessions)} زيارة`
              : `${n(funnel.purchased)} purchases of ${n(funnel.sessions)} visits`}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--color-surface)] p-3">
          <p className="text-xs text-[var(--color-text-secondary)]">
            {isAr ? "سلّات متروكة" : "Abandoned carts"}
          </p>
          <p className="mt-0.5 font-mono text-xl font-semibold text-[var(--color-text)]">
            {pct(funnel.abandonmentRate)}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {isAr
              ? `${n(funnel.abandonedVisitors)} من ${n(funnel.cartedVisitors)} زائر ضافوا ومشتروش`
              : `${n(funnel.abandonedVisitors)} of ${n(funnel.cartedVisitors)} visitors carted but didn't buy`}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--color-surface)] p-3">
          <p className="text-xs text-[var(--color-text-secondary)]">
            {isAr ? "إيراد متتبَّع" : "Tracked revenue"}
          </p>
          <p className="mt-0.5 font-mono text-xl font-semibold text-[var(--color-text)]">
            {money(funnel.revenue)}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {isAr
              ? "من الزوّار اللي وافقوا على التتبّع بس — المبيعات الكاملة في صفحة التقارير"
              : "Only visitors who accepted tracking — full sales are on the Reports page"}
          </p>
        </div>
      </div>

      {/* Funnel bars */}
      <ol className="mt-5 space-y-2.5">
        {steps.map((s, i) => (
          <li key={s.label} className="text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--color-text)]">
                <span className="me-1.5 font-mono text-[var(--color-text-secondary)]">{i + 1}.</span>
                {s.label}
              </span>
              <span className="shrink-0 font-mono text-[var(--color-text-secondary)]">
                {n(s.value)}
                {i > 0 && i < 3 && <span className="ms-2">({pct(s.rate)})</span>}
              </span>
            </div>
            <div
              className="mt-1 h-2 rounded-full bg-[var(--color-primary)]/75"
              style={{ width: `${Math.max(2, Math.round((s.value / max) * 100))}%` }}
              aria-hidden
            />
          </li>
        ))}
      </ol>

      {/* Conversion by channel */}
      {funnel.byChannel.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold text-[var(--color-text)]">
            {isAr ? "التحويل حسب مصدر الزيارة" : "Conversion by channel"}
          </h3>
          {/* Mobile: one card per channel */}
          <ul className="mt-2 space-y-2 md:hidden">
            {funnel.byChannel.map((c) => (
              <li
                key={c.channel}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--color-text)]">{channelLabel(c.channel, isAr)}</span>
                  <span className="font-mono text-[var(--color-text)]">{pct(c.conversionRate)}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {isAr
                    ? `${n(c.sessions)} زيارة · ${n(c.purchased)} شراء · ${money(c.revenue)}`
                    : `${n(c.sessions)} visits · ${n(c.purchased)} purchases · ${money(c.revenue)}`}
                </p>
              </li>
            ))}
          </ul>
          {/* Desktop: table */}
          <div className="mt-2 hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--color-text-secondary)]">
                  <th className="py-1.5 text-start font-medium">{isAr ? "القناة" : "Channel"}</th>
                  <th className="py-1.5 text-end font-medium">{isAr ? "زيارات" : "Visits"}</th>
                  <th className="py-1.5 text-end font-medium">{isAr ? "مشتريات" : "Purchases"}</th>
                  <th className="py-1.5 text-end font-medium">{isAr ? "التحويل" : "Conv."}</th>
                  <th className="py-1.5 text-end font-medium">{isAr ? "الإيراد" : "Revenue"}</th>
                </tr>
              </thead>
              <tbody>
                {funnel.byChannel.map((c) => (
                  <tr key={c.channel} className="border-t border-[var(--color-border)]">
                    <td className="py-1.5">{channelLabel(c.channel, isAr)}</td>
                    <td className="py-1.5 text-end font-mono">{n(c.sessions)}</td>
                    <td className="py-1.5 text-end font-mono">{n(c.purchased)}</td>
                    <td className="py-1.5 text-end font-mono">{pct(c.conversionRate)}</td>
                    <td className="py-1.5 text-end font-mono">{money(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
