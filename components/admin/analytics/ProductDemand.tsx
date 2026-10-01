import Link from "next/link";
import type { DemandRow } from "@/lib/admin/analytics";
import { THRESHOLDS } from "@/lib/analytics/insights";

/**
 * Product demand — per product: seen in search → clicked → opened → added to
 * cart → ordered.
 *
 * Sorted by opens (what shoppers actually look at), top 10 up front and the
 * rest behind a native <details> so the section stays scannable. Products that
 * are opened a lot but never carted get a flag — the same rule as the
 * "What to do today" panel, so the two never disagree.
 *
 * Desktop: table. Mobile: one card per product (an 8-column table in ~300px
 * is unreadable). "—" = not enough data, "0%" = measured zero.
 */
const TOP = 10;

export function ProductDemand({ rows, isAr }: { rows: DemandRow[]; isAr: boolean }) {
  const n = (v: number) => v.toLocaleString(isAr ? "ar-EG" : "en-US");
  const pct = (v: number | null) => (v === null ? "—" : `${n(v)}%`);
  const stuck = (r: DemandRow) =>
    r.opens >= THRESHOLDS.stuckProductOpens && r.carts === 0 && r.orders === 0;

  const sorted = [...rows].sort(
    (a, b) => b.opens - a.opens || b.orders - a.orders || b.impressions - a.impressions,
  );
  const top = sorted.slice(0, TOP);
  const rest = sorted.slice(TOP);

  const name = (r: DemandRow) => (
    <Link
      href={`/${isAr ? "ar" : "en"}/products/${r.slug}`}
      target="_blank"
      dir="auto"
      className="hover:underline"
    >
      {isAr ? r.name_ar : r.name_en}
    </Link>
  );
  const flag = (r: DemandRow) =>
    stuck(r) ? (
      <span className="ms-2 inline-block rounded-full bg-[var(--color-warning)]/15 px-2 py-0.5 text-xs text-[var(--color-warning)]">
        {isAr ? "بيتفتح ومش بيتباع" : "viewed, not selling"}
      </span>
    ) : null;

  const tableRows = (list: DemandRow[]) =>
    list.map((r) => (
      <tr key={r.id} className="border-t border-[var(--color-border)]">
        <td className="max-w-[280px] py-2">
          <span className="line-clamp-1">{name(r)}</span>
          {flag(r)}
        </td>
        <td className="py-2 text-end font-mono">{n(r.opens)}</td>
        <td className="py-2 text-end font-mono">{n(r.carts)}</td>
        <td className="py-2 text-end font-mono">{n(r.orders)}</td>
        <td className="py-2 text-end font-mono">{pct(r.openToOrder)}</td>
        <td className="py-2 text-end font-mono text-[var(--color-text-secondary)]">
          {n(r.impressions)} / {n(r.clicks)}
        </td>
      </tr>
    ));

  const cards = (list: DemandRow[]) =>
    list.map((r) => (
      <li
        key={r.id}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm"
      >
        <div className="font-medium text-[var(--color-text)]">
          {name(r)}
          {flag(r)}
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <dt className="text-[var(--color-text-secondary)]">{isAr ? "اتفتح" : "Opened"}</dt>
            <dd className="font-mono text-sm text-[var(--color-text)]">{n(r.opens)}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-secondary)]">{isAr ? "للسلة" : "To cart"}</dt>
            <dd className="font-mono text-sm text-[var(--color-text)]">{n(r.carts)}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-secondary)]">{isAr ? "اتباع" : "Sold"}</dt>
            <dd className="font-mono text-sm text-[var(--color-text)]">{n(r.orders)}</dd>
          </div>
        </dl>
      </li>
    ));

  const header = (
    <thead>
      <tr className="text-[var(--color-text-secondary)]">
        <th className="py-2 text-start font-medium">{isAr ? "المنتج" : "Product"}</th>
        <th className="py-2 text-end font-medium">{isAr ? "اتفتح" : "Opened"}</th>
        <th className="py-2 text-end font-medium">{isAr ? "اتضاف للسلة" : "Added to cart"}</th>
        <th className="py-2 text-end font-medium">{isAr ? "قطع اتباعت" : "Units sold"}</th>
        <th className="py-2 text-end font-medium">{isAr ? "من الفتح للبيع" : "View → sale"}</th>
        <th className="py-2 text-end font-medium">{isAr ? "ظهر / اتضغط في البحث" : "Search shown / clicked"}</th>
      </tr>
    </thead>
  );

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 md:p-5">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">
        {isAr ? "أداء المنتجات" : "Product performance"}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
        {isAr
          ? "لكل منتج: اتفتح كام مرة، اتضاف للسلة كام مرة، واتباع منه كام قطعة. مرتّبين من الأكتر مشاهدة. «—» يعني لسه مفيش بيانات كفاية."
          : "For each product: how often it was opened, added to cart, and how many units sold — most-viewed first. “—” means not enough data yet."}
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
          {isAr ? "لسه محدش فتح أو اشترى منتج في الفترة دي." : "No product was opened or ordered in this period yet."}
        </p>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="mt-4 space-y-2 md:hidden">{cards(top)}</ul>
          {/* Desktop: table */}
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              {header}
              <tbody>{tableRows(top)}</tbody>
            </table>
          </div>

          {rest.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer py-2 text-sm font-medium text-[var(--color-primary)]">
                {isAr ? `عرض باقي المنتجات (${n(rest.length)})` : `Show all products (${n(rest.length)} more)`}
              </summary>
              <ul className="mt-2 space-y-2 md:hidden">{cards(rest)}</ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  {header}
                  <tbody>{tableRows(rest)}</tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}
