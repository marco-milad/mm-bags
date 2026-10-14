import Link from "next/link";
import { SITE_FOUNDER } from "@/lib/seo/site";
import { formatGuideDate, type Guide } from "@/lib/guides";
import type { Bi, Cell, GuideBlock } from "@/lib/guides/types";
import { Body, Bullet, RelatedLinks, Section } from "@/components/policy/PolicyComponents";

/**
 * Renders a buying guide from data (lib/guides). Server component: every
 * table and FAQ answer is in the HTML, which is what crawlers and answer
 * engines read. Visual rhythm matches the policy pages.
 */
export function GuideArticle({ guide, locale }: { guide: Guide; locale: "ar" | "en" }) {
  const isAr = locale === "ar";
  const t = (b: Bi) => (isAr ? b.ar : b.en);

  return (
    <article className="bg-[var(--color-bg)]" dir={isAr ? "rtl" : "ltr"}>
      <header className="mx-auto max-w-3xl px-4 pt-10 pb-8 md:px-6 md:pt-16 md:pb-10">
        <nav aria-label={isAr ? "مسار الصفحة" : "Breadcrumb"} className="text-xs text-[var(--color-text-secondary)]">
          <Link href={`/${locale}`} className="hover:text-[var(--color-text)]">
            {isAr ? "الرئيسية" : "Home"}
          </Link>
          <span aria-hidden className="mx-1.5">/</span>
          <Link href={`/${locale}/guides`} className="hover:text-[var(--color-text)]">
            {isAr ? "أدلة الشراء" : "Buying guides"}
          </Link>
        </nav>
        <h1 className="mt-5 font-serif text-3xl leading-tight text-[var(--color-text)] md:text-5xl">
          {t(guide.title)}
        </h1>
        <p className="mt-4 text-xs text-[var(--color-text-secondary)]">
          {isAr ? "كتبه " : "By "}
          <Link href={`/${locale}/about`} className="font-medium text-[var(--color-text)] underline-offset-4 hover:underline">
            {isAr ? "ماركو ميلاد" : SITE_FOUNDER}
          </Link>
          {isAr ? "، M.M Bags — طما، سوهاج" : ", M.M Bags — Tama, Sohag"}
          <span aria-hidden className="mx-1.5">·</span>
          <time dateTime={guide.updated}>
            {isAr ? "آخر تحديث: " : "Last updated: "}
            {formatGuideDate(guide.updated, locale)}
          </time>
        </p>

        {/* The answer first: the paragraph engines quote. */}
        <div className="mt-6 rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--color-accent-dark)]">
            {isAr ? "الخلاصة" : "In short"}
          </p>
          <p className="mt-2 text-[15px] leading-7 text-[var(--color-text)]">{t(guide.summary)}</p>
        </div>

        {guide.sections.length > 2 && (
          <nav aria-label={isAr ? "محتوى الصفحة" : "On this page"} className="mt-6">
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
              {isAr ? "في الصفحة دي" : "On this page"}
            </p>
            <ol className="mt-2 flex flex-wrap gap-2">
              {guide.sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="inline-flex min-h-9 items-center rounded-full border border-[var(--color-border)] px-3 text-xs text-[var(--color-text)] hover:border-[var(--color-accent)]"
                  >
                    {t(s.title)}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#faq"
                  className="inline-flex min-h-9 items-center rounded-full border border-[var(--color-border)] px-3 text-xs text-[var(--color-text)] hover:border-[var(--color-accent)]"
                >
                  {isAr ? "أسئلة شائعة" : "FAQ"}
                </a>
              </li>
            </ol>
          </nav>
        )}
      </header>

      <div className="mx-auto max-w-3xl space-y-10 px-4 pb-20 md:px-6 md:pb-24">
        {guide.sections.map((s) => (
          <div key={s.id} id={s.id} className="scroll-mt-24">
            <Section title={t(s.title)}>
              {s.blocks.map((b, i) => (
                <GuideBlockView key={i} block={b} locale={locale} />
              ))}
            </Section>
          </div>
        ))}

        <div id="faq" className="scroll-mt-24">
          <Section title={isAr ? "أسئلة شائعة" : "Frequently asked questions"}>
            <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)]">
              {guide.faq.map((f) => (
                <details key={f.q.en} className="group px-5 py-4">
                  <summary className="cursor-pointer list-none text-[15px] font-semibold text-[var(--color-text)] [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start justify-between gap-3">
                      <span>{t(f.q)}</span>
                      <span aria-hidden className="text-[var(--color-accent-dark)] transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-2 text-[15px] leading-7 text-[var(--color-text-secondary)]">{t(f.a)}</p>
                </details>
              ))}
            </div>
          </Section>
        </div>

        {guide.sources && guide.sources.length > 0 && (
          <Section title={isAr ? "المصادر" : "Sources"}>
            <ul className="space-y-1.5 text-sm">
              {guide.sources.map((s) => (
                <li key={s.url} dir="ltr" className={isAr ? "text-end" : undefined}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="break-words text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {guide.related && guide.related.length > 0 && (
          <RelatedLinks
            isAr={isAr}
            items={guide.related.map((r) => ({ href: `/${locale}${r.href}`, ar: r.label.ar, en: r.label.en }))}
          />
        )}
      </div>
    </article>
  );
}

function cellText(c: Cell, isAr: boolean): string {
  return typeof c === "string" ? c : isAr ? c.ar : c.en;
}

function GuideBlockView({ block, locale }: { block: GuideBlock; locale: "ar" | "en" }) {
  const isAr = locale === "ar";
  switch (block.kind) {
    case "p":
      return <Body isAr={isAr}>{isAr ? block.text.ar : block.text.en}</Body>;
    case "list":
      return (
        <ul className="space-y-2">
          {block.items.map((it) => (
            <Bullet key={it.en} isAr={isAr}>
              {isAr ? it.ar : it.en}
            </Bullet>
          ))}
        </ul>
      );
    case "callout":
      return (
        <p className="rounded-xl border-s-4 border-[var(--color-accent-dark)] bg-[var(--color-surface)] px-4 py-3 text-[15px] leading-7 text-[var(--color-text)]">
          {isAr ? block.text.ar : block.text.en}
        </p>
      );
    case "cta":
      return (
        <Link
          href={`/${locale}${block.href}`}
          className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
        >
          {isAr ? block.label.ar : block.label.en}
          <span aria-hidden className="ms-2">{isAr ? "←" : "→"}</span>
        </Link>
      );
    case "table":
      return (
        <figure className="space-y-2">
          {/* The table scrolls inside its own box so the page never scrolls sideways on a phone. */}
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]" tabIndex={0} role="region" aria-label={isAr ? block.caption.ar : block.caption.en}>
            {/* Wide tables scroll; 2–3 column tables fit a 390px phone as they are. */}
            <table className={`w-full border-collapse text-sm ${block.head.length > 3 ? "min-w-[560px]" : ""}`}>
              <caption className="sr-only">{isAr ? block.caption.ar : block.caption.en}</caption>
              <thead className="bg-[var(--color-surface)]">
                <tr>
                  {block.head.map((h, i) => (
                    <th key={i} scope="col" className="px-3 py-2.5 text-start font-semibold text-[var(--color-text)]">
                      {cellText(h, isAr)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className="border-t border-[var(--color-border)]">
                    {row.map((c, i) =>
                      i === 0 ? (
                        <th key={i} scope="row" className="px-3 py-2.5 text-start font-medium text-[var(--color-text)]">
                          {cellText(c, isAr)}
                        </th>
                      ) : (
                        <td key={i} className="px-3 py-2.5 text-[var(--color-text-secondary)]">
                          {cellText(c, isAr)}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.note && (
            <figcaption className="text-xs leading-6 text-[var(--color-text-secondary)]">
              {isAr ? block.note.ar : block.note.en}
            </figcaption>
          )}
        </figure>
      );
  }
}
