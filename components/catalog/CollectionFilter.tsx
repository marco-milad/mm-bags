import Link from "next/link";
import type { Locale } from "@/lib/i18n-config";
import type { Collection } from "@/lib/supabase/types";

export function CollectionFilter({
  locale,
  collections,
  activeSlug,
}: {
  locale: Locale;
  collections: Collection[];
  activeSlug?: string;
}) {
  const items = [
    { slug: null, name_ar: "الكل", name_en: "All" },
    ...collections.map((c) => ({ slug: c.slug, name_ar: c.name_ar, name_en: c.name_en })),
  ];

  return (
    <nav
      aria-label={locale === "ar" ? "تصفية حسب التشكيلة" : "Filter by collection"}
      className="scroll-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
    >
      {items.map((item) => {
        const isActive = (item.slug ?? null) === (activeSlug ?? null);
        const href = item.slug
          ? `/${locale}/catalog/${item.slug}`
          : `/${locale}/catalog`;
        return (
          <Link
            key={item.slug ?? "all"}
            href={href}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
              isActive
                ? "bg-[var(--color-primary)] text-white"
                : "border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)]"
            }`}
          >
            {locale === "ar" ? item.name_ar : item.name_en}
          </Link>
        );
      })}
    </nav>
  );
}
