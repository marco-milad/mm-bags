import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Code2, HandHeart, Tag } from "lucide-react";
import { hasLocale } from "@/lib/i18n-config";
import { aboutPageSchema } from "@/lib/seo/jsonld";
import { absoluteUrl, localeAlternates } from "@/lib/seo/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { AnimatedCounter } from "@/components/about/AnimatedCounter";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const isAr = locale === "ar";
  return {
    title: isAr ? "قصتنا | M.M Bags" : "Our story | M.M Bags",
    description: isAr
      ? "M.M Bags تأسست في 1998 بمحافظة سوهاج — قصة براند عائلي بيديره ماركو ميلاد، مطور ورائد أعمال، بجودة حقيقية وسعر عادل."
      : "M.M Bags was founded in 1998 in Sohag governorate — the story of a family brand now run by Marco Milad, a developer and entrepreneur, with real quality at a fair price.",
    alternates: localeAlternates("/about"),
  };
}

const PROMISES = [
  {
    icon: HandHeart,
    ar: { title: "جودة مختارة بإيدنا", body: "كل شنطة بنختارها ونجربها قبل ما نعرضها عليك." },
    en: { title: "Hand-picked quality", body: "Every bag is tested by us before it lands on the store." },
  },
  {
    icon: Tag,
    ar: { title: "سعر عادل دايماً", body: "بنشتري مباشرة من المصنّع، عشان نديك أحسن سعر مفيش وسطاء." },
    en: { title: "Always fair pricing", body: "We source direct from the maker so the price stays fair." },
  },
  {
    icon: Code2,
    ar: {
      title: "تجربة تسوق أسهل بالتكنولوجيا",
      body: "موقع سريع، تجربة موبايل ممتازة، ومتابعة شفافة لكل طلب.",
    },
    en: {
      title: "Smarter shopping experience",
      body: "Fast site, mobile-first experience, transparent order tracking.",
    },
  },
] as const;

const NUMBERS: ReadonlyArray<{
  value: number;
  prefix?: string;
  ar: string;
  en: string;
}> = [
  { value: 50_000, prefix: "+", ar: "منتج مباع", en: "products sold" },
  { value: 5_000, prefix: "+", ar: "عميل سعيد", en: "happy customers" },
  { value: 27, ar: "محافظة بنوصلها", en: "governorates we ship to" },
  // Since 1998 — kept dynamic-free so the number displayed stays the
  // number the copy elsewhere on the site says. Bump this in place if
  // the founding date shifts. The prefix "+" reads as "27 and more".
  { value: 27, prefix: "+", ar: "سنة في السوق", en: "years in the market" },
];

export default async function AboutPage({ params }: PageProps<"/[locale]"> & {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const isRTL = locale === "ar";
  const Forward = isRTL ? ArrowLeft : ArrowRight;

  const aboutSchema = aboutPageSchema({
    url: absoluteUrl(`/${locale}/about`),
    description: isRTL
      ? "M.M Bags تأسست في 1998 بمحافظة سوهاج — قصة براند عائلي بيديره ماركو ميلاد، مطور ورائد أعمال، بجودة حقيقية وسعر عادل."
      : "M.M Bags was founded in 1998 in Sohag governorate — the story of a family brand now run by Marco Milad, a developer and entrepreneur.",
  });

  return (
    <article>
      <JsonLd data={aboutSchema} />
      {/* 1. HERO */}
      <section className="relative isolate overflow-hidden bg-[var(--color-primary)] text-white">
        <PhotoBlock
          variant="hero"
          caption={locale === "ar" ? "صورة الموجود قريباً" : "Photo coming soon"}
        />
        <div className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col items-start justify-end gap-4 px-6 pb-16 pt-24 md:px-12 md:pb-24">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-accent-light)]">
            {locale === "ar" ? "قصتنا" : "Our story"}
          </p>
          <h1 className="max-w-3xl font-display text-4xl leading-[1.1] md:text-6xl">
            {locale === "ar"
              ? "أنا ماركو، ومعايا M.M Bags"
              : "I'm Marco, and this is M.M Bags"}
          </h1>
        </div>
      </section>

      {/* 2. FOUNDER STORY */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:px-12">
        <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
          <div className="flex flex-col gap-5">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-accent-dark)]">
              {locale === "ar" ? "الجيل الحالي" : "The current chapter"}
            </p>
            <h2 className="font-display text-3xl md:text-4xl">
              {locale === "ar" ? "ماركو ميلاد" : "Marco Milad"}
            </h2>
            <p className="text-sm leading-relaxed text-[var(--color-text)] md:text-base">
              {locale === "ar"
                ? "M.M Bags اتأسست في 1998 من محافظة سوهاج — مشروع عائلي بدأ بفرع واحد صغير في مدينة طما بيقدّم شنط جودة حقيقية بأسعار عادلة لأهل الصعيد. بعد أكتر من 25 سنة، البراند بقاله فرعين في طما (شارع الشهداء وشارع العزراء)، ودلوقتي بيتوسّع online لكل محافظات مصر."
                : "M.M Bags was founded in 1998 in Sohag governorate — a family project that started with a single small store in Tama, offering real-quality bags at fair prices to Upper Egypt. More than 25 years later, the brand has two branches in Tama (Shohada Street and Al-Ozraa Street) and is now expanding online to reach every governorate in Egypt."}
            </p>
            <p className="text-sm leading-relaxed text-[var(--color-text)] md:text-base">
              {locale === "ar"
                ? "أنا ماركو ميلاد — مطور ورائد أعمال، وبنكمّل الرحلة اللي بدأتها العيلة بنفس الشغف الأصلي. خلفيتي في التكنولوجيا بتخلي المتجر مختلف online — أسرع، أذكى، وأصدق. مفيش وعود فاضية، مفيش أسعار مبالغ فيها."
                : "I'm Marco Milad — a developer and entrepreneur, continuing the journey the family started with the same original passion. My tech background makes the online store different — faster, smarter, more honest. No empty promises, no inflated prices."}
            </p>
            <blockquote className="mt-2 border-s-4 border-[var(--color-accent)] bg-[var(--color-surface)] p-5 text-sm italic leading-relaxed text-[var(--color-text)] md:text-base">
              {locale === "ar"
                ? "بختار كل شنطة بإيدي عشان تسافر معاك راحل البال — بنفس الاهتمام اللي بدأنا بيه من أول يوم."
                : "I hand-pick every bag so it travels with you in peace of mind — with the same care we've had since day one."}
              <footer className="mt-3 font-mono text-xs not-italic uppercase tracking-wider text-[var(--color-text-secondary)]">
                — {locale === "ar" ? "ماركو ميلاد" : "Marco Milad"}
              </footer>
            </blockquote>
          </div>

          <PhotoBlock
            variant="portrait"
            caption={locale === "ar" ? "صورة الموجود قريباً" : "Photo coming soon"}
          />
        </div>
      </section>

      {/* 3. M.M PROMISE */}
      <section className="bg-[var(--color-surface)] py-20">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <header className="mb-10 flex flex-col gap-2">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-accent-dark)]">
              {locale === "ar" ? "وعدنا ليك" : "Our promise"}
            </p>
            <h2 className="font-display text-3xl md:text-4xl">
              {locale === "ar" ? "وعد M.M Bags" : "The M.M Promise"}
            </h2>
          </header>
          <ul className="grid gap-6 md:grid-cols-3">
            {PROMISES.map((p, i) => {
              const Icon = p.icon;
              const copy = locale === "ar" ? p.ar : p.en;
              return (
                <li
                  key={i}
                  className="flex flex-col gap-3 rounded-2xl bg-[var(--color-bg)] p-6 ring-1 ring-[var(--color-border)]"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-primary)]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="font-display text-xl text-[var(--color-text)]">
                    {copy.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {copy.body}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 4. BY THE NUMBERS */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:px-12">
        <header className="mb-10 flex flex-col gap-2 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-accent-dark)]">
            {locale === "ar" ? "بالأرقام" : "By the numbers"}
          </p>
          <h2 className="font-display text-3xl md:text-4xl">
            {locale === "ar" ? "رحلتنا حتى دلوقتي" : "Our journey so far"}
          </h2>
        </header>

        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {NUMBERS.map((stat, i) => (
            <li
              key={i}
              className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 text-center md:p-8"
            >
              <p className="font-display text-4xl text-[var(--color-primary)] md:text-5xl">
                <AnimatedCounter target={stat.value} prefix={stat.prefix ?? ""} />
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] md:text-sm">
                {locale === "ar" ? stat.ar : stat.en}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. CTA */}
      <section className="bg-[var(--color-primary)] py-20 text-white">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 text-center md:px-12">
          <h2 className="font-display text-3xl md:text-5xl">
            {locale === "ar" ? "جاهز تسافر؟" : "Ready to travel?"}
          </h2>
          <p className="text-sm text-white/80 md:text-base">
            {locale === "ar"
              ? "اختار من تشكيلاتنا — Milano · Calvin Klein · إكسسوارات السفر."
              : "Pick from our collections — Milano · Calvin Klein · travel accessories."}
          </p>
          <Link
            href={`/${locale}/catalog`}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-8 py-3.5 text-sm font-semibold text-[var(--color-primary)] shadow-lg shadow-black/20 transition hover:bg-[var(--color-accent-light)]"
          >
            {locale === "ar" ? "تسوق دلوقتي" : "Shop now"}
            <Forward className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </article>
  );
}

function PhotoBlock({
  variant,
  caption,
}: {
  variant: "hero" | "portrait";
  caption: string;
}) {
  if (variant === "hero") {
    return (
      <div
        aria-hidden
        className="absolute inset-0 -z-10 flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary-light)] to-[var(--color-primary)]"
      >
        <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, rgba(212,180,131,0.4), transparent 55%), radial-gradient(circle at 80% 80%, rgba(184,151,90,0.35), transparent 55%)",
        }} />
        <div className="relative flex flex-col items-center gap-2 text-white/40">
          <span className="font-display text-7xl text-[var(--color-accent-light)]/30">
            MM
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em]">
            {caption}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)]">
      <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{
        backgroundImage:
          "radial-gradient(circle at 30% 30%, rgba(212,180,131,0.5), transparent 60%)",
      }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/50">
        <span className="font-display text-6xl text-[var(--color-accent-light)]/40">
          MM
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em]">
          {caption}
        </span>
      </div>
    </div>
  );
}
