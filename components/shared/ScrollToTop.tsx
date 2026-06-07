"use client";

import { ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n-config";
import { cn } from "@/lib/utils";

/**
 * Bottom-center scroll-to-top FAB. Appears once the user has scrolled
 * past 400 px; fades back out at the top. Position lives above the
 * mobile bottom-nav (bottom-24) and drops to bottom-8 at md+ where
 * there's no bottom-nav. Horizontally centered via left:50% +
 * translateX(-50%), which is RTL-safe (no inline-start/end either way).
 */
const SHOW_AFTER_PX = 400;

export function ScrollToTop({ locale }: { locale: Locale }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };
    // Read once on mount in case the page loads already scrolled.
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollUp = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollUp}
      aria-label={locale === "ar" ? "للأعلى" : "Scroll to top"}
      // Hide when not visible AND make non-interactive so it doesn't catch
      // focus / clicks while invisible. `transition-opacity` gives the
      // fade; pointer-events flip is instant.
      className={cn(
        "fixed bottom-24 left-1/2 z-40 inline-flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-navy-900 text-brass-300 shadow-lg shadow-black/30 transition-opacity duration-300",
        "hover:bg-navy-800 hover:text-brass-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
        "md:bottom-8",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <ChevronUp className="h-5 w-5" strokeWidth={2} />
    </button>
  );
}
