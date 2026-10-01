import Link from "next/link";
import type { SearchReport as Report } from "@/lib/admin/analytics";
import type { SynonymRow } from "@/lib/admin/synonyms";
import { deleteSynonym } from "@/lib/admin/synonyms";
import { AddSynonymForm } from "@/components/admin/analytics/AddSynonymForm";

/**
 * The action panel and the term tables.
 *
 * "Searched, found nothing" and "Results shown, nothing opened" are two
 * different failures with two different fixes:
 *
 *   found nothing   → the catalogue does not name the thing the way the shopper
 *                     does (add a synonym), or does not stock it at all
 *   nothing opened  → the search answers, but with the wrong products
 *
 * CTR here is Algolia's definition — searches with at least one click over ALL
 * tracked searches, zero-result ones included. CTR and no-click rate therefore
 * do NOT sum to 100%, and are never presented as complements.
 */
export function SearchReport({
  report,
  synonyms,
  isAr,
}: {
  report: Report;
  synonyms: SynonymRow[];
  isAr: boolean;
}) {
  const n = (v: number) => v.toLocaleString(isAr ? "ar-EG" : "en-US");
  const hasAny =
    report.topTerms.length + report.zeroTerms.length + report.noClickTerms.length > 0;

  if (!hasAny) {
    return (
      <section className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--color-text)]">
          {isAr ? "لسه محدش بحث." : "No searches yet."}
        </p>
        <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-[var(--color-text-secondary)]">
          {isAr
            ? "البحث في الموقع بيحصل لما حد يكتب في صندوق البحث ويروح لصفحة الكتالوج. الرقم صفر يعني محدش عمل كده لسه — مش يعني إن التتبّع مش شغّال."
            : "Search here means someone typed in the search box and landed on the catalog. Zero means nobody has done that yet — not that tracking is broken."}
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Highest-value output in the project for a catalogue this size. */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 md:p-5">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {isAr ? "بحثوا ومالقوش" : "Searched, found nothing"}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {isAr
              ? "إمّا مش عندنا المنتج، وإمّا عندنا بس باسم تاني — والمرادف بيحلّ التانية."
              : "Either we do not stock it, or we do but under another name — a synonym fixes the second."}
          </p>
          {report.zeroTerms.length === 0 ? (
            <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
              {isAr ? "كل عمليات البحث لقت نتائج." : "Every search returned results."}
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {report.zeroTerms.map((t) => (
                <li
                  key={t.query_norm}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                >
                  <span dir="auto" className="truncate font-medium text-[var(--color-text)]">
                    {t.query_norm}
                  </span>
                  {/* The raw sample is where Arabizi (kaba, shanta, 7aga) is discovered. */}
                  {t.sample_raw && t.sample_raw !== t.query_norm && (
                    <span dir="auto" className="truncate text-xs text-[var(--color-text-secondary)]">
                      ({t.sample_raw})
                    </span>
                  )}
                  <span className="ms-auto shrink-0 font-mono text-[var(--color-text-secondary)]">
                    {n(t.searches)}
                  </span>
                  <AddSynonymForm term={t.query_norm} isAr={isAr} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 md:p-5">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {isAr ? "لقوا نتائج وما فتحوش" : "Results shown, nothing opened"}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {isAr
              ? "بنردّ على البحث ده — بس بالمنتجات الغلط."
              : "We answer these searches, but with the wrong things."}
          </p>
          {report.noClickTerms.length === 0 ? (
            <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
              {isAr ? "كل بحث بنتائج اتفتح منه حاجة." : "Every answered search got a click."}
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {report.noClickTerms.map((t) => (
                <li
                  key={t.query_norm}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                >
                  <span dir="auto" className="truncate text-[var(--color-text)]">
                    {t.query_norm}
                  </span>
                  <span className="ms-auto font-mono text-[var(--color-text-secondary)]">
                    {n(t.searches)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 md:p-5">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">
          {isAr ? "أكتر ما بيدوّروا عليه" : "Top searches"}
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {isAr
            ? "الكلمات اللي الناس بتدوّر عليها أكتر، والمنتج اللي بيفتحوه أكتر من نتايج كل كلمة."
            : "What people search for most, and the product they open most from each search."}
        </p>
        {/* Mobile: one card per term */}
        <ul className="mt-3 space-y-2 md:hidden">
          {report.topTerms.map((t) => (
            <li
              key={t.query_norm}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span dir="auto" className="truncate font-medium text-[var(--color-text)]">
                  {t.query_norm}
                </span>
                <span className="shrink-0 font-mono text-[var(--color-text-secondary)]">
                  {isAr ? `${n(t.searches)} بحث` : `${n(t.searches)} searches`}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {isAr
                  ? `مالقوش: ${n(t.zero_results)} · فتحوا منتج: ${n(t.clicks)}`
                  : `Found nothing: ${n(t.zero_results)} · Opened a product: ${n(t.clicks)}`}
              </p>
              {t.top_product_slug && (
                <Link
                  href={`/${isAr ? "ar" : "en"}/products/${t.top_product_slug}`}
                  target="_blank"
                  dir="auto"
                  className="mt-1 block truncate text-xs text-[var(--color-primary)] hover:underline"
                >
                  {isAr ? t.top_product_ar : t.top_product_en}
                </Link>
              )}
            </li>
          ))}
        </ul>
        {/* Desktop: table */}
        <div className="mt-3 hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--color-text-secondary)]">
                <th className="px-2 py-1.5 text-start font-medium">{isAr ? "الكلمة" : "Term"}</th>
                <th className="px-2 py-1.5 text-end font-medium">{isAr ? "بحث" : "Searches"}</th>
                <th className="px-2 py-1.5 text-end font-medium">{isAr ? "مالقوش" : "Found nothing"}</th>
                <th className="px-2 py-1.5 text-end font-medium">{isAr ? "اتفتح" : "Opened"}</th>
                <th className="px-2 py-1.5 text-start font-medium">{isAr ? "أكتر منتج" : "Top product"}</th>
              </tr>
            </thead>
            <tbody>
              {report.topTerms.map((t) => (
                <tr key={t.query_norm} className="border-t border-[var(--color-border)]">
                  <td className="max-w-[180px] truncate px-2 py-1.5 text-start">
                    <span dir="auto">{t.query_norm}</span>
                  </td>
                  <td className="px-2 py-1.5 text-end font-mono">{n(t.searches)}</td>
                  <td className="px-2 py-1.5 text-end font-mono">{n(t.zero_results)}</td>
                  <td className="px-2 py-1.5 text-end font-mono">{n(t.clicks)}</td>
                  <td className="max-w-[220px] truncate px-2 py-1.5 text-start">
                    {t.top_product_slug ? (
                      <Link
                        href={`/${isAr ? "ar" : "en"}/products/${t.top_product_slug}`}
                        target="_blank"
                        dir="auto"
                        className="hover:underline"
                      >
                        {isAr ? t.top_product_ar : t.top_product_en}
                      </Link>
                    ) : (
                      <span className="text-[var(--color-text-secondary)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Only rendered when non-empty — an empty synonyms box is noise. */}
      {synonyms.length > 0 && (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 md:p-5">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {isAr ? "المرادفات" : "Synonyms"}
          </h3>
          <ul className="mt-3 space-y-1.5">
            {synonyms.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              >
                <span dir="auto">{s.term}</span>
                <span className="text-[var(--color-text-secondary)]">←</span>
                <span dir="auto" className="font-medium">{s.maps_to}</span>
                <form action={deleteSynonym} className="ms-auto">
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    className="rounded px-2 py-0.5 text-xs text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
                  >
                    {isAr ? "حذف" : "Remove"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
