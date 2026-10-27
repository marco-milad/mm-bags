import type { Retention } from "@/lib/admin/analytics";
import { pct } from "@/lib/analytics/paths";

/**
 * Who comes back — consented visitors only, because recognising a return
 * visit needs the analytics cookie. Weekly cohorts (Cairo weeks) and, for the
 * selected window, the share of returning visitors and of purchases made on
 * a return visit. Server component.
 */
export function RetentionReport({ retention, isAr }: { retention: Retention; isAr: boolean }) {
  if (retention.visitors === 0 && retention.cohorts.length === 0) return null;
  const n = (v: number) => v.toLocaleString(isAr ? "ar-EG" : "en-US");
  const pctText = (v: number | null) => (v === null ? "—" : isAr ? `${n(v)}٪` : `${v}%`);
  const weekLabel = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(isAr ? "ar-EG" : "en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          {isAr ? "مين بيرجع تاني" : "Who comes back"}
        </h2>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
          {isAr
            ? "محسوب على اللي وافقوا على الكوكيز بس — من غيرها مستحيل نعرف إن نفس الشخص رجع."
            : "Consented visitors only — without the cookie there's no way to know the same person came back."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">{isAr ? "زوّار راجعين" : "Returning visitors"}</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[var(--color-text)]">
            {pctText(pct(retention.returning, retention.visitors))}
          </p>
          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
            {isAr
              ? `${n(retention.returning)} من ${n(retention.visitors)} زائر`
              : `${n(retention.returning)} of ${n(retention.visitors)} visitors`}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">
            {isAr ? "اشتروا في زيارة تانية" : "Bought on a return visit"}
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[var(--color-text)]">
            {pctText(pct(retention.returningPurchases, retention.purchases))}
          </p>
          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
            {isAr
              ? `${n(retention.returningPurchases)} من ${n(retention.purchases)} طلب متتبَّع`
              : `${n(retention.returningPurchases)} of ${n(retention.purchases)} tracked orders`}
          </p>
        </div>
      </div>

      {retention.cohorts.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
          <table className="w-full min-w-[480px] text-xs">
            <caption className="px-4 pt-3 text-start text-[11px] text-[var(--color-text-secondary)]">
              {isAr
                ? "كل سطر = الزوّار اللي جم أول مرة في الأسبوع ده، وكام واحد منهم رجع بعد ١، ٢، ٣، ٤ أسابيع."
                : "Each row = visitors whose first visit was that week, and how many came back 1–4 weeks later."}
            </caption>
            <thead className="text-[var(--color-text-secondary)]">
              <tr>
                <th scope="col" className="px-4 py-2 text-start font-medium">{isAr ? "أسبوع أول زيارة" : "First-visit week"}</th>
                <th scope="col" className="px-2 py-2 text-end font-medium">{isAr ? "زوّار" : "Visitors"}</th>
                {[1, 2, 3, 4].map((k) => (
                  <th key={k} scope="col" className="px-2 py-2 text-end font-medium">
                    {isAr ? `أسبوع ${n(k)}` : `Week ${k}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {retention.cohorts.map((c) => (
                <tr key={c.week} className="border-t border-[var(--color-border)]">
                  <th scope="row" className="px-4 py-1.5 text-start font-normal text-[var(--color-text)]">
                    {weekLabel(c.week)}
                  </th>
                  <td className="px-2 py-1.5 text-end font-mono">{n(c.visitors)}</td>
                  {([c.w1, c.w2, c.w3, c.w4] as const).map((v, i) => (
                    <td key={i} className="px-2 py-1.5 text-end font-mono text-[var(--color-text-secondary)]">
                      {/* A week that hasn't happened yet is blank, not 0%. */}
                      {c.weeksElapsed >= i + 1 ? pctText(pct(v, c.visitors)) : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
