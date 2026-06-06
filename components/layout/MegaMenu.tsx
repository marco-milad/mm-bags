"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n-config";
import type { ProductWithVariants } from "@/lib/catalog-shared";
import { effectivePrice } from "@/lib/catalog-shared";
import { categoryLucideIcon } from "@/lib/categories-config";
import type { TopLevelCategory } from "@/lib/queries/categories";
import { cn, formatPriceEGP } from "@/lib/utils";

// Grace period before the dropdown closes after the cursor leaves both the
// trigger and the panel. Long enough to absorb a typical mouse traverse from
// trigger → panel without the menu flickering shut mid-motion.
const CLOSE_DELAY_MS = 180;

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
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // Schedule a close after a short delay. Calling cancelClose() inside the
  // mouseenter handlers on the trigger wrapper *or* the panel cancels this,
  // so the menu only really closes when the cursor has left both for the
  // full delay window.
  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  const openMenu = () => {
    cancelClose();
    setOpen(true);
  };

  const closeNow = () => {
    cancelClose();
    setOpen(false);
  };

  // Esc closes immediately; also handles cleanup if Esc fires mid-grace-window.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNow();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Cancel any pending close timer on unmount so it can't fire setState on a
  // dead component (e.g. when a link navigation tears the menu down mid-grace).
  useEffect(() => () => cancelClose(), []);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => (open ? closeNow() : openMenu())}
        aria-expanded={open}
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

      {/* Hover bridge — invisible, fills the visual gap between the trigger
          button (which is vertically centered inside the navbar's h-16) and
          the panel that sits just below the navbar. As a child of the
          wrapper, hovering it keeps the wrapper considered "still hovered"
          and short-circuits the close timer. -inset-x-4 widens the catch
          area a few pixels past the trigger's edges for diagonal motions;
          h-8 reaches all the way to the navbar's bottom edge. */}
      {open && (
        <span
          aria-hidden
          className="pointer-events-auto absolute -inset-x-4 top-full h-8"
        />
      )}

      {/* Full-width panel — pinned directly under the navbar with a 1px
          overlap so the panel's top border merges with the navbar's bottom
          border, leaving zero visible seam.
          NOTE on positioning: the navbar header must not have a
          `backdrop-filter` / `transform` / `filter` on it. Any of those
          values creates a containing block for `position: fixed` descendants
          per CSS spec, which would offset this panel by the full
          banner-h + 4rem distance and produce a visible gap. The Navbar's
          header is `bg-[var(--color-bg)]` (no backdrop-blur) for that reason. */}
      <div
        role="region"
        aria-hidden={!open}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
        className={cn(
          "fixed inset-x-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl transition duration-200",
          "top-[calc(var(--mm-banner-h,0px)+4rem-1px)]",
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
              {categories.map((cat) => {
                const Icon = categoryLucideIcon(cat.slug);
                return (
                  <li key={cat.slug}>
                    <Link
                      href={`/${locale}/catalog/${cat.slug}`}
                      onClick={closeNow}
                      className="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 transition hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] transition group-hover:bg-[var(--color-accent)] group-hover:text-[var(--color-primary)]">
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
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
                );
              })}
            </ul>

            <Link
              href={`/${locale}/catalog`}
              onClick={closeNow}
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
                        onClick={closeNow}
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
