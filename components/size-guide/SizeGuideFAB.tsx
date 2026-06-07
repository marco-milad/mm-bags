"use client";

import { Ruler, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n-config";
import { SizeGuideModalLazy } from "./SizeGuideModalLazy";
import {
  useSizeGuideUxHydrated,
  useSizeGuideUxStore,
} from "@/store/size-guide-ux";

const PULSE_DELAY_MS = 15_000;

// Travel-bag-only catalog slugs where the Size Guide is contextually
// relevant. Soft-bag collections (backpacks, school, ladies, handbags,
// laptop) get nothing — the guide is about luggage sizing for trips, not
// daily-carry capacity.
const TRAVEL_CATALOG_SLUGS = new Set([
  "travel-bags",
  "milano-series",
  "calvin-klein",
  "travel-accessories",
]);

// Product slugs that belong to a travel-bag family. We match by slug prefix
// rather than walking a join to product.collection because this runs on
// every route change and we already have the slug in the URL.
const TRAVEL_PRODUCT_PREFIXES = ["bs-milano-", "ck-"];

// Path-based visibility. Show ONLY on travel-bag catalogs + travel-bag
// product detail pages.
function matchesAllowedPath(pathname: string | null): {
  visible: boolean;
  isProduct: boolean;
} {
  if (!pathname) return { visible: false, isProduct: false };

  // /{locale}/catalog/{slug}
  const catalogMatch = pathname.match(/^\/(?:ar|en)\/catalog\/([^/]+)$/);
  if (catalogMatch && TRAVEL_CATALOG_SLUGS.has(catalogMatch[1])) {
    return { visible: true, isProduct: false };
  }

  // /{locale}/products/{slug}
  const productMatch = pathname.match(/^\/(?:ar|en)\/products\/([^/]+)$/);
  if (productMatch && TRAVEL_PRODUCT_PREFIXES.some((p) => productMatch[1].startsWith(p))) {
    return { visible: true, isProduct: true };
  }

  return { visible: false, isProduct: false };
}

export function SizeGuideFAB({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const { visible, isProduct } = matchesAllowedPath(pathname);

  const completed = useSizeGuideUxStore((s) => s.completed);
  const hydrated = useSizeGuideUxHydrated();

  const [showPulse, setShowPulse] = useState(false);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Smart trigger: 15s on a product page when not already completed.
  // Reset both pulse and timer whenever the pathname changes.
  useEffect(() => {
    setShowPulse(false);
    setTooltipDismissed(false);

    if (!hydrated || !isProduct || completed) return;

    timerRef.current = setTimeout(() => setShowPulse(true), PULSE_DELAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, hydrated, isProduct, completed]);

  if (!visible) return null;

  const tooltipVisible = showPulse && !tooltipDismissed;

  return (
    // Wrapper owns positioning + becomes the anchor for the tooltip.
    // The tooltip must NOT be a child of the trigger <button> (nested <button>
    // is invalid HTML), so it lives as a sibling inside this relative container.
    <div className="group fixed bottom-24 left-4 z-40 md:bottom-6 md:left-6">
      <SizeGuideModalLazy locale={locale}>
        <button
          type="button"
          onClick={() => {
            setShowPulse(false);
            setTooltipDismissed(true);
          }}
          aria-label={locale === "ar" ? "دليل المقاسات" : "Size guide"}
          className="relative inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-3 py-3 text-sm font-semibold text-[var(--color-primary)] shadow-lg shadow-black/20 transition hover:scale-105 hover:bg-[var(--color-accent-light)] md:px-5"
        >
          {showPulse && (
            <span
              aria-hidden
              className="absolute inset-0 -z-10 animate-ping rounded-full bg-[var(--color-accent)]/60"
            />
          )}
          <Ruler className="h-5 w-5" />
          <span className="hidden md:inline">
            {locale === "ar" ? "دليل المقاسات" : "Size guide"}
          </span>
        </button>
      </SizeGuideModalLazy>

      {tooltipVisible && (
        <Tooltip
          locale={locale}
          onDismiss={() => {
            setTooltipDismissed(true);
            setShowPulse(false);
          }}
        />
      )}
    </div>
  );
}

function Tooltip({
  locale,
  onDismiss,
}: {
  locale: Locale;
  onDismiss: () => void;
}) {
  return (
    <div
      role="tooltip"
      // Floats above the button, anchored to the wrapper's left edge.
      className="pointer-events-auto absolute bottom-full left-0 mb-3 flex w-max max-w-[78vw] items-start gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-medium text-white shadow-xl shadow-black/30 sm:max-w-xs"
    >
      <span className="leading-snug">
        {locale === "ar"
          ? "محتاج مساعدة في اختيار المقاس؟"
          : "Need help picking a size?"}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={locale === "ar" ? "إخفاء" : "Dismiss"}
        className="-mr-1 mt-0.5 rounded-full p-0.5 text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-3 w-3" />
      </button>
      {/* Arrow pointing down to the button */}
      <span
        aria-hidden
        className="absolute left-4 top-full -mt-px h-2 w-2 rotate-45 bg-[var(--color-primary)]"
      />
    </div>
  );
}
