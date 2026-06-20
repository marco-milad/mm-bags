"use client";

import Image from "next/image";
import { Check, Star, X } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  clearFeaturedSpotlight,
  setFeaturedSpotlight,
} from "@/lib/admin/homepage-actions";
import type { AdminLocale } from "@/lib/admin/locale";
import type { ProductPickerSummary } from "./FeaturedProductsManager";

/**
 * Manager for the homepage "spotlight" section — the single product
 * rendered by components/home/FeaturedProduct.tsx ("Most-wanted this
 * season"). Sibling to FeaturedProductsManager (which manages the
 * best-sellers carousel as a list); this surface only ever holds one
 * product, so the UX is single-select instead of add/remove/reorder.
 *
 * Same picker shape as the best-sellers manager (search input + thumbed
 * rows + "Set" button per row) so the admin learns one pattern once.
 * The currently-set product is pinned at the top with a "Currently set"
 * pill so it's obvious what the homepage is showing right now.
 */
export function FeaturedSpotlightManager({
  initialProductId,
  allProducts,
  locale,
}: {
  initialProductId: string | null;
  allProducts: ProductPickerSummary[];
  locale: AdminLocale;
}) {
  const isAr = locale === "ar";
  const [currentId, setCurrentId] = useState<string | null>(initialProductId);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  // FIFO queue — mirrors FeaturedProductsManager so two fast clicks
  // can't race past each other server-side.
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  const filteredPicker = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? allProducts.filter(
          (p) =>
            p.name_ar.toLowerCase().includes(q) ||
            p.name_en.toLowerCase().includes(q) ||
            p.slug.toLowerCase().includes(q),
        )
      : allProducts;
    // Pin the currently-set product to the top regardless of search
    // order so the admin always sees "what's live" first.
    if (!currentId) return base;
    const current = base.find((p) => p.id === currentId);
    if (!current) return base;
    return [current, ...base.filter((p) => p.id !== currentId)];
  }, [allProducts, query, currentId]);

  const currentProduct =
    currentId === null
      ? null
      : allProducts.find((p) => p.id === currentId) ?? null;

  function enqueue(action: () => Promise<void>) {
    startTransition(() => {
      persistQueueRef.current = persistQueueRef.current
        .then(action)
        .catch(() => undefined);
    });
  }

  function setSpotlight(p: ProductPickerSummary) {
    if (currentId === p.id) return;
    setCurrentId(p.id);
    const fd = new FormData();
    fd.set("product_id", p.id);
    enqueue(() => setFeaturedSpotlight(fd));
  }

  function clear() {
    if (currentId === null) return;
    setCurrentId(null);
    enqueue(() => clearFeaturedSpotlight());
  }

  return (
    <div className="space-y-4">
      {pending && (
        <p
          role="status"
          aria-live="polite"
          className="text-[11px] text-[var(--color-text-secondary)]"
        >
          {isAr ? "جاري الحفظ…" : "saving…"}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2 [&>*]:min-w-0">
        {/* LEFT — current spotlight */}
        <section
          aria-label={isAr ? "المنتج في البقعة الضوئية حاليًا" : "Current spotlight"}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <header className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {isAr ? "المعروض حاليًا" : "Currently set"}
            </h2>
            {currentProduct && (
              <button
                type="button"
                onClick={clear}
                aria-label={isAr ? "إزالة" : "Clear spotlight"}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] transition hover:border-[var(--color-error)] hover:text-[var(--color-error)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)]"
              >
                <X className="h-3 w-3" />
                {isAr ? "إزالة" : "Clear"}
              </button>
            )}
          </header>

          {currentProduct ? (
            <div className="flex items-center gap-3 px-3 py-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
                {currentProduct.image ? (
                  <Image
                    src={currentProduct.image}
                    alt={isAr ? currentProduct.name_ar : currentProduct.name_en}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--color-text)]">
                  {isAr ? currentProduct.name_ar : currentProduct.name_en}
                </p>
                <p className="truncate font-mono text-[10px] text-[var(--color-text-secondary)]">
                  {currentProduct.slug}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent-dark)]">
                  <Star className="h-3 w-3 fill-current" />
                  {isAr ? "ظاهر على الصفحة الرئيسية" : "Live on homepage"}
                </p>
              </div>
            </div>
          ) : (
            <p className="px-3 py-8 text-center text-xs text-[var(--color-text-secondary)]">
              {isAr
                ? "مفيش منتج محدد لسه. اختار من اليمين."
                : "Nothing set. Pick from the right."}
            </p>
          )}
        </section>

        {/* RIGHT — picker */}
        <section
          aria-label={isAr ? "اختر منتج" : "Pick a product"}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <header className="space-y-2 border-b border-[var(--color-border)] px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {isAr ? "كل المنتجات" : "All products"}
            </h2>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isAr ? "ابحث عن منتج..." : "Search products..."}
              aria-label={isAr ? "ابحث عن منتج" : "Search products"}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
          </header>

          <div
            className="max-h-[28rem] overflow-y-auto"
            style={{ scrollbarGutter: "stable" }}
          >
            {filteredPicker.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-[var(--color-text-secondary)]">
                {isAr ? "مفيش نتائج" : "No results"}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {filteredPicker.map((p) => {
                  const isCurrent = p.id === currentId;
                  const name = isAr ? p.name_ar : p.name_en;
                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bg)]">
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt={name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--color-text)]">
                          {name}
                        </p>
                        <p className="truncate font-mono text-[10px] text-[var(--color-text-secondary)]">
                          {p.slug}
                          {p.collectionSlug ? ` · ${p.collectionSlug}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSpotlight(p)}
                        disabled={isCurrent}
                        // eslint-disable-next-line jsx-a11y/aria-proptypes
                        aria-pressed={isCurrent ? "true" : "false"}
                        aria-label={
                          isCurrent
                            ? isAr
                              ? `${name} هو المعروض حاليًا`
                              : `${name} is currently set`
                            : isAr
                              ? `اختار ${name}`
                              : `Set ${name}`
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isCurrent ? (
                          <>
                            <Check className="h-3 w-3" />
                            {isAr ? "حالياً" : "Current"}
                          </>
                        ) : (
                          <>
                            <Star className="h-3 w-3" />
                            {isAr ? "اختار" : "Set"}
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
