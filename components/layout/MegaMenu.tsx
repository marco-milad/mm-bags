"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n-config";
import type { ProductWithVariants } from "@/lib/catalog-shared";
import { effectivePrice } from "@/lib/catalog-shared";
import { categoryIcon } from "@/lib/categories-config";
import type { TopLevelCategory } from "@/lib/queries/categories";
import { cn, formatPriceEGP } from "@/lib/utils";

export function MegaMenu({
  locale,
  triggerLabel,
  shopAllLabel,
  featuredLabel,
  categories,
  featured,
}: {
  locale: Locale;
  triggerLabel: string;
  shopAllLabel: string;
  featuredLabel: string;
  categories: TopLevelCategory[];
  featured: ProductWithVariants[];
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on route change (the Link inside the panel triggers navigation).
  // Also close on Escape for accessibility.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open ? "true" : "false"}
        aria-haspopup="true"
        className="inline-flex items-center gap-1 text-sm hover:text-[var(--color-accent-dark)]"
      >
        {triggerLabel}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Full-width panel — positioned below the navbar via fixed + header-height offset */}
      <div
        role="region"
        aria-hidden={!open}
        className={cn(
          "fixed inset-x-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl transition duration-200",
          "top-[calc(var(--mm-banner-h,0px)+4rem)]",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 md:px-12 lg:grid-cols-[1fr_320px]">
          {/* LEFT — categories */}
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
              {locale === "ar" ? "كل التشكيلات" : "All categories"}
            </p>
            <ul className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/${locale}/catalog/${cat.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 transition hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] text-xl">
                      {categoryIcon(cat.slug)}
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="text-sm font-semibold text-[var(--color-text)]">
                        {locale === "ar" ? cat.name_ar : cat.name_en}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {cat.productCount}{" "}
                        {locale === "ar"
                          ? "منتج"
                          : cat.productCount === 1
                            ? "product"
                            : "products"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href={`/${locale}/catalog`}
              onClick={() => setOpen(false)}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
            >
              {shopAllLabel}
              <span aria-hidden>{locale === "ar" ? "←" : "→"}</span>
            </Link>
          </div>

          {/* RIGHT — featured products */}
          {featured.length > 0 && (
            <aside className="border-t border-[var(--color-border)] pt-6 lg:border-s lg:border-t-0 lg:ps-8 lg:pt-0">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
                {featuredLabel}
              </p>
              <ul className="space-y-3">
                {featured.map((p) => {
                  const name = locale === "ar" ? p.name_ar : p.name_en;
                  const price = effectivePrice(p);
                  const hasSale =
                    p.sale_price !== null && p.sale_price < p.base_price;
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/${locale}/products/${p.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-[var(--color-surface)]"
                      >
                        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-2)]">
                          {p.images?.[0] && (
                            <Image
                              src={p.images[0]}
                              alt={name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          )}
                        </span>
                        <span className="flex-1">
                          <span className="block line-clamp-1 text-sm font-medium text-[var(--color-text)]">
                            {name}
                          </span>
                          <span className="flex items-baseline gap-1.5">
                            <span className="font-mono text-sm font-semibold text-[var(--color-primary)]">
                              {formatPriceEGP(price, locale)}
                            </span>
                            {hasSale && (
                              <span className="font-mono text-[10px] text-[var(--color-text-secondary)] line-through">
                                {formatPriceEGP(p.base_price, locale)}
                              </span>
                            )}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
