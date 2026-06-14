"use client";

import { Eye } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { Locale } from "@/lib/i18n-config";
import type { ProductWithVariants } from "@/lib/catalog-shared";

// Lazy-load the modal body. It's a non-trivial component (Dialog + Radix
// portal + image grid + selectors) that we don't want to ship until a
// customer actually clicks Quick View. `ssr: false` because the body uses
// the cart store, which is browser-only.
const QuickViewModal = dynamic(
  () => import("./QuickViewModal").then((m) => m.QuickViewModal),
  { ssr: false },
);

/**
 * Hover-revealed "Quick view" button. Rendered inside ProductCard's image
 * container. Calls preventDefault/stopPropagation so the click doesn't
 * also navigate the surrounding <Link>.
 *
 * Desktop-only: the design brief calls for `hidden md:flex` here because
 * mobile catalog cards already give one-tap access to the full PDP and a
 * modal on a small screen is a worse UX than the dedicated page.
 */
export function QuickViewTrigger({
  product,
  locale,
}: {
  product: ProductWithVariants;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  // First-open guard so the dynamic import isn't requested until needed.
  // Once mounted we leave it mounted so subsequent open/close is instant.
  const [mounted, setMounted] = useState(false);

  const isRTL = locale === "ar";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMounted(true);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={isRTL ? "عرض سريع" : "Quick view"}
        // Positioned over the bottom of the image. Hover-revealed via the
        // ProductCard's `group` class. Hidden entirely below md.
        className="absolute bottom-3 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-1.5 rounded-full bg-[var(--color-bg)]/95 px-4 py-2 text-xs font-semibold text-[var(--color-text)] shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-[var(--color-primary)] hover:text-white focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 md:inline-flex md:translate-y-2 md:opacity-0"
      >
        <Eye className="h-3.5 w-3.5" />
        {isRTL ? "عرض سريع" : "Quick view"}
      </button>

      {mounted && (
        <QuickViewModal
          product={product}
          locale={locale}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
