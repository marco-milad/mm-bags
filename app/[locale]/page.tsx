import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { getDictionary } from "@/lib/i18n";
import { FounderQuote } from "@/components/shared/FounderQuote";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const t = await getDictionary(locale);

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary-light)] to-[var(--color-primary)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 -z-10 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, rgba(212,180,131,0.4), transparent 55%), radial-gradient(circle at 80% 80%, rgba(184,151,90,0.35), transparent 55%)",
          }}
          aria-hidden
        />
        <div className="mx-auto flex min-h-[80vh] max-w-6xl flex-col items-start justify-center gap-6 px-6 py-24 text-[var(--color-text-inverse)] md:px-12">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-accent-light)]">
            {t.brand.name}
          </p>
          <h1 className="font-display text-5xl leading-[1.05] md:text-7xl">
            {t.brand.tagline}
          </h1>
          <p className="max-w-xl text-base text-white/80 md:text-lg">
            {locale === "ar"
              ? "شنط سفر اخترناها بإيدنا. جودة حقيقية، سعر عادل، خدمة بنفتخر بيها."
              : "Travel luggage we pick personally. Real quality, fair price, service we're proud of."}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href={`/${locale}/catalog`}
              className="rounded-full bg-[var(--color-accent)] px-7 py-3 text-sm font-semibold text-[var(--color-primary)] shadow-lg shadow-black/20 transition hover:bg-[var(--color-accent-light)]"
            >
              {t.home.hero.cta_shop}
            </Link>
            <Link
              href={`/${locale}/about`}
              className="rounded-full border border-white/30 px-7 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {t.home.hero.cta_story}
            </Link>
          </div>
        </div>
      </section>

      {/* Founder strip */}
      <FounderQuote
        locale={locale}
        quote={t.home.founder_quote}
        name={t.brand.founder}
      />

      {/* Collections placeholder */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:px-12">
        <header className="mb-10 flex items-baseline justify-between">
          <h2 className="font-display text-3xl md:text-4xl">{t.home.collections_title}</h2>
          <Link
            href={`/${locale}/catalog`}
            className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
          >
            {locale === "ar" ? "اعرض الكل" : "View all"}
          </Link>
        </header>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { slug: "milano-series", name_ar: "Milano Series", name_en: "Milano Series" },
            { slug: "calvin-klein", name_ar: "Calvin Klein", name_en: "Calvin Klein" },
            { slug: "travel-accessories", name_ar: "إكسسوارات السفر", name_en: "Travel Accessories" },
          ].map((collection) => (
            <Link
              key={collection.slug}
              href={`/${locale}/catalog/${collection.slug}`}
              className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] transition hover:shadow-lg"
            >
              <div
                className="absolute inset-0 bg-gradient-to-br from-[var(--color-surface-2)] to-[var(--color-surface)]"
                aria-hidden
              />
              <div className="relative flex h-full flex-col justify-end p-6">
                <h3 className="font-display text-2xl text-[var(--color-primary)]">
                  {locale === "ar" ? collection.name_ar : collection.name_en}
                </h3>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {locale === "ar" ? "تصفح المجموعة" : "Browse collection"} →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Promise */}
      <section className="bg-[var(--color-surface)] py-16">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <h2 className="mb-10 font-display text-3xl md:text-4xl">
            {t.home.promise_title}
          </h2>
          <div className="grid gap-6 md:grid-cols-4">
            {[
              t.home.promise.quality,
              t.home.promise.price,
              t.home.promise.warranty,
              t.home.promise.support,
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-[var(--color-bg)] p-6 ring-1 ring-[var(--color-border)]"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] font-mono text-sm text-[var(--color-primary)]">
                  0{idx + 1}
                </div>
                <p className="font-semibold text-[var(--color-text)]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center md:px-12">
        <h2 className="font-display text-3xl md:text-4xl">{t.home.newsletter.title}</h2>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          {t.home.newsletter.note}
        </p>
        <form className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            placeholder={t.home.newsletter.placeholder}
            className="flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-3 text-sm placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          <button
            type="submit"
            className="rounded-full bg-[var(--color-primary)] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
          >
            {t.home.newsletter.cta}
          </button>
        </form>
      </section>
    </>
  );
}
