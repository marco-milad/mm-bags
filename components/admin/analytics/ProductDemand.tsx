import Link from "next/link";
import type { DemandRow } from "@/lib/admin/analytics";

/**
 * Product demand.
 *
 * The two rate columns separate two different problems that look identical in
 * a single "views" number:
 *
 *   low impressions        nobody is looking for this — a DISCOVERY problem
 *   high impressions, low CTR   they see it and skip — a MERCHANDISING problem
 *                               (photo, price, title)
 *
 * Different actions, so both definitions are printed above the table rather
 * than left for the reader to infer.
 */
export function ProductDemand({
  rows,
  isAr,
  hasSearch,
}: {
  rows: DemandRow[];
  isAr: boolean;
  /** False until search logging ships; impressions/CTR are structurally 0 then. */
  hasSearch: boolean;
}) {
  const n = (v: number) => v.toLocaleString(isAr ? "ar-EG" : "en-US");
  // — means "no data". 0% means "measured zero". Never swapped.
  const pct = (v: number | null) => (v === null ? "—" : `${n(v)}%`);

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">
        {isAr ? "طلب المنتجات" : "Product demand"}
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
        {isAr
          ? "ظهر في النتائج ≠ اتضغط من النتائج ≠ اتفتح ≠ اتشرى. «—» تعني لا بيانات، و«٠٪» تعني صفر مقيس."
          : "appeared in results ≠ clicked from results ≠ opened ≠ bought. “—” means no data; “0%” means measured zero."}
      </p>
      {!hasSearch && (
        <p className="mt-2 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-2 py-1.5 text-[11px] text-[var(--color-warning)]">
          {isAr
            ? "أعمدة «ظهر» و«اتضغط» فاضية لأن تسجيل البحث لسه ما اتركّبش — مش لأن محدش شاف المنتجات."
            : "“Shown” and “Clicked” are empty because search logging has not shipped yet — not because nobody saw these."}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-4 text-xs text-[var(--color-text-secondary)]">
          {isAr
            ? "لسه مفيش منتج اتفتح أو اتشرى في الفترة دي."
            : "No product was opened or ordered in this range yet."}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="text-[var(--color-text-secondary)]">
                <th className="py-1.5 text-start font-medium">
                  {isAr ? "المنتج" : "Product"}
                </th>
                <th className="py-1.5 text-end font-medium">{isAr ? "ظهر" : "Shown"}</th>
                <th className="py-1.5 text-end font-medium">
                  {isAr ? "اتضغط" : "Clicked"}
                </th>
                <th className="py-1.5 text-end font-medium">{isAr ? "النسبة" : "CTR"}</th>
                {/* Honest label: this codebase opens products both as a page and
                    as a quick-view modal, so "opened" covers both. */}
                <th className="py-1.5 text-end font-medium">{isAr ? "اتفتح" : "Opened"}</th>
                <th className="py-1.5 text-end font-medium">{isAr ? "اتشرى" : "Ordered"}</th>
                <th className="py-1.5 text-end font-medium">
                  {isAr ? "فتح ← شراء" : "Opened → ordered"}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--color-border)]">
                  <td className="max-w-[220px] truncate py-1.5">
                    <Link
                      href={`/ar/products/${r.slug}`}
                      target="_blank"
                      dir="auto"
                      className="hover:underline"
                    >
                      {isAr ? r.name_ar : r.name_en}
                    </Link>
                  </td>
                  <td className="py-1.5 text-end font-mono">{n(r.impressions)}</td>
                  <td className="py-1.5 text-end font-mono">{n(r.clicks)}</td>
                  <td className="py-1.5 text-end font-mono">{pct(r.ctr)}</td>
                  <td className="py-1.5 text-end font-mono">{n(r.opens)}</td>
                  <td className="py-1.5 text-end font-mono">{n(r.orders)}</td>
                  <td className="py-1.5 text-end font-mono">{pct(r.openToOrder)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
