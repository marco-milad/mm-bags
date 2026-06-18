"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  addFeaturedProduct,
  removeFeaturedProduct,
  reorderFeaturedProducts,
} from "@/lib/admin/homepage-actions";
import type { AdminLocale } from "@/lib/admin/locale";
import type { ProductWithVariants } from "@/lib/catalog-shared";

export type ProductPickerSummary = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  image: string | null;
  collectionSlug: string | null;
};

export type FeaturedRowVM = {
  /** homepage_featured_products row id — the value remove/reorder send back */
  id: string;
  product: ProductWithVariants;
};

/**
 * Manager for the curated "Featured on homepage" carousel.
 *
 * Mirrors components/admin/products/ImageManager.tsx — the same queued-persist
 * pattern is mandatory here because reorder is multi-click-able and otherwise
 * two fast clicks could land on the server out of order and corrupt the canonical
 * `position` sequence. Every mutation enqueues onto persistQueueRef so the
 * server sees them strictly in click order.
 *
 * Layout: md+ two-pane (left = current, right = picker), single column on mobile.
 */
export function FeaturedProductsManager({
  initialFeatured,
  allProducts,
  locale,
}: {
  initialFeatured: FeaturedRowVM[];
  allProducts: ProductPickerSummary[];
  locale: AdminLocale;
}) {
  const isAr = locale === "ar";
  const [featured, setFeatured] = useState<FeaturedRowVM[]>(initialFeatured);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  // FIFO promise — every mutation chains onto its predecessor so concurrent
  // clicks never race against the server.
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  const featuredIds = useMemo(
    () => new Set(featured.map((r) => r.product.id)),
    [featured],
  );

  const filteredPicker = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter((p) => {
      return (
        p.name_ar.toLowerCase().includes(q) ||
        p.name_en.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
      );
    });
  }, [allProducts, query]);

  function enqueue(action: () => Promise<void>) {
    startTransition(() => {
      persistQueueRef.current = persistQueueRef.current.then(action).catch(
        // Server action errors already log via console.error inside the action;
        // swallow here so a single failure doesn't poison the whole queue.
        () => undefined,
      );
    });
  }

  function persistOrder(next: FeaturedRowVM[]) {
    setFeatured(next);
    const fd = new FormData();
    fd.set("ordered_ids", JSON.stringify(next.map((r) => r.id)));
    enqueue(() => reorderFeaturedProducts(fd));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= featured.length) return;
    const next = [...featured];
    [next[index], next[target]] = [next[target], next[index]];
    persistOrder(next);
  }

  function remove(row: FeaturedRowVM) {
    const next = featured.filter((r) => r.id !== row.id);
    setFeatured(next);
    const fd = new FormData();
    fd.set("id", row.id);
    enqueue(() => removeFeaturedProduct(fd));
  }

  function add(p: ProductPickerSummary) {
    if (featuredIds.has(p.id)) return;
    // Optimistic insert with a temp id; the server will create the row and the
    // next page revalidation will replace this VM with the real one.
    const tempId = `temp-${p.id}-${Date.now()}`;
    const optimistic: FeaturedRowVM = {
      id: tempId,
      product: {
        id: p.id,
        slug: p.slug,
        name_ar: p.name_ar,
        name_en: p.name_en,
        // The picker pane only renders thumb + name, so a partial shape is
        // safe here — we never touch the other fields before the server
        // round-trip refreshes the list with a fully hydrated row.
        images: p.image ? [p.image] : [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- VM-only stub
        product_variants: [] as any,
      } as unknown as ProductWithVariants,
    };
    setFeatured([...featured, optimistic]);
    const fd = new FormData();
    fd.set("product_id", p.id);
    enqueue(() => addFeaturedProduct(fd));
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* LEFT — current featured */}
        <section
          aria-label={isAr ? "المنتجات المميزة حاليًا" : "Currently featured"}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <header className="border-b border-[var(--color-border)] px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {isAr
                ? `المميّزة (${featured.length})`
                : `Featured (${featured.length})`}
            </h2>
          </header>

          {featured.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-[var(--color-text-secondary)]">
              {isAr
                ? "مفيش منتجات مميزة لسه. ضيف من اليمين."
                : "Nothing featured yet. Add from the picker on the right."}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {featured.map((row, idx) => {
                const name = isAr ? row.product.name_ar : row.product.name_en;
                const thumb = row.product.images?.[0] ?? null;
                const isFirst = idx === 0;
                const isLast = idx === featured.length - 1;
                return (
                  <li
                    key={row.id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt={name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--color-text)]">
                        {name}
                      </p>
                      <p className="truncate font-mono text-[10px] text-[var(--color-text-secondary)]">
                        #{idx + 1} · {row.product.slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => move(idx, -1)}
                        disabled={isFirst}
                        aria-label={
                          isAr ? `حرّك ${name} لأعلى` : `Move ${name} up`
                        }
                        // eslint-disable-next-line jsx-a11y/aria-proptypes
                        aria-disabled={isFirst ? "true" : "false"}
                        className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-40"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(idx, +1)}
                        disabled={isLast}
                        aria-label={
                          isAr ? `حرّك ${name} لأسفل` : `Move ${name} down`
                        }
                        // eslint-disable-next-line jsx-a11y/aria-proptypes
                        aria-disabled={isLast ? "true" : "false"}
                        className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-40"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(row)}
                        aria-label={isAr ? `إزالة ${name}` : `Remove ${name}`}
                        className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-error)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* RIGHT — picker */}
        <section
          aria-label={isAr ? "اختر منتج للإضافة" : "Pick a product to add"}
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
            // hide-x-scrollbar to match the rest of the admin shell
            style={{ scrollbarGutter: "stable" }}
          >
            {filteredPicker.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-[var(--color-text-secondary)]">
                {isAr ? "مفيش نتائج" : "No results"}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {filteredPicker.map((p) => {
                  const already = featuredIds.has(p.id);
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
                        onClick={() => add(p)}
                        disabled={already}
                        // eslint-disable-next-line jsx-a11y/aria-proptypes
                        aria-pressed={already ? "true" : "false"}
                        aria-label={
                          already
                            ? isAr
                              ? `${name} مضاف بالفعل`
                              : `${name} already featured`
                            : isAr
                              ? `إضافة ${name}`
                              : `Add ${name}`
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {already ? (
                          <>
                            <Check className="h-3 w-3" />
                            {isAr ? "مضاف" : "Featured"}
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            {isAr ? "إضافة" : "Add"}
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
