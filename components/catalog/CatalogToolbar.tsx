"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "@/lib/i18n-config";
import { CATALOG_SORTS, type CatalogSort } from "@/lib/catalog-shared";

const SORT_LABELS: Record<CatalogSort, { ar: string; en: string }> = {
  featured: { ar: "المختارة", en: "Featured" },
  newest: { ar: "الأحدث", en: "Newest" },
  "price-asc": { ar: "السعر: من الأقل", en: "Price: low to high" },
  "price-desc": { ar: "السعر: من الأعلى", en: "Price: high to low" },
};

export function CatalogToolbar({
  locale,
  count,
  currentSort,
}: {
  locale: Locale;
  count: number;
  currentSort: CatalogSort;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const onSortChange = (value: string) => {
    const next = new URLSearchParams(searchParams?.toString());
    if (value === "featured") next.delete("sort");
    else next.set("sort", value);
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 border-y border-[var(--color-border)] py-3">
      <p className="text-sm text-[var(--color-text-secondary)]">
        {locale === "ar" ? `${count} منتج` : `${count} products`}
      </p>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-[var(--color-text-secondary)]">
          {locale === "ar" ? "ترتيب:" : "Sort:"}
        </span>
        <select
          value={currentSort}
          onChange={(e) => onSortChange(e.target.value)}
          disabled={isPending}
          className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          {CATALOG_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort][locale]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
