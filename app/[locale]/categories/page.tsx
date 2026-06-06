import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { hasLocale } from "@/lib/i18n-config";
import { categoryLucideIcon } from "@/lib/categories-config";
import { getTopLevelCategoriesWithCounts } from "@/lib/queries/categories";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Categories",
  description:
    "كل تشكيلات M.M Bags — شنط السفر، الظهر، المدارس، الحريم، اليد، واللاب توب.",
};

export default async function CategoriesPage({
  params,
}: PageProps<"/[locale]/categories">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const categories = await getTopLevelCategoriesWithCounts();
  const Forward = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <article>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-navy-900 text-paper">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 30%, rgba(212,180,131,0.4), transparent 50%), radial-gradient(circle at 75% 75%, rgba(184,151,90,0.35), transparent 50%)",
          }}
        />
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-4 px-6 py-20 md:px-12 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-brass-300">
            {locale === "ar" ? "كل تشكيلاتنا" : "All categories"}
          </p>
          <h1 className="font-display max-w-3xl text-4xl leading-[1.1] md:text-6xl">
            {locale === "ar" ? "اكتشف كل تشكيلاتنا" : "Discover all our collections"}
          </h1>
          <p className="max-w-2xl text-sm text-navy-200 md:text-base">
            {locale === "ar"
              ? "من شنط السفر للمدارس واللاب توب — كل اللي محتاجه في مكان واحد."
              : "From travel luggage to school and laptop bags — everything you need in one place."}
          </p>
        </div>
      </section>

      {/* Category grid — each card is image-led with a brass icon plate */}
      <section className="mx-auto max-w-[1200px] px-6 py-16 md:px-12 md:py-20">
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const Icon = categoryLucideIcon(cat.slug);
            return (
              <li key={cat.slug}>
                <Link
                  href={`/${locale}/catalog/${cat.slug}`}
                  className="group relative flex aspect-[4/5] flex-col overflow-hidden rounded-2xl bg-navy-900 ring-1 ring-line transition hover:shadow-xl hover:ring-brass-300"
                >
                  {/* Cover image — pulled live from the first active product in
                      the collection's scope (parent + children), falls back to
                      the Unsplash placeholder when no products exist yet. */}
                  <Image
                    src={cat.coverImage}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                  />

                  {/* Navy gradient for text legibility */}
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-navy-900/95 via-navy-900/55 to-navy-900/20 transition-opacity duration-500 group-hover:from-navy-900"
                  />

                  {/* Brass-wash on hover */}
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-60"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 30% 30%, rgba(184,151,90,0.5), transparent 60%)",
                    }}
                  />

                  {/* Icon plate top-start */}
                  <span
                    aria-hidden
                    className="absolute top-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-navy-900/50 text-brass-300 backdrop-blur transition duration-300 group-hover:bg-brass-500 group-hover:text-navy-900 ltr:left-5 rtl:right-5"
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>

                  {/* Bottom info block */}
                  <div className="relative mt-auto space-y-1 p-6 text-paper">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-brass-300">
                      {cat.productCount}{" "}
                      {locale === "ar"
                        ? "منتج"
                        : cat.productCount === 1
                          ? "product"
                          : "products"}
                    </p>
                    <h2 className="font-display text-2xl leading-tight md:text-3xl">
                      {locale === "ar" ? cat.name_ar : cat.name_en}
                    </h2>
                    <p className="text-xs text-paper/60">
                      {locale === "ar" ? cat.name_en : cat.name_ar}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brass-300 transition group-hover:gap-2.5 group-hover:text-brass-200">
                      {locale === "ar" ? "تسوق الآن" : "Shop now"}
                      <Forward className="h-4 w-4" />
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </article>
  );
}
