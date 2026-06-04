"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n-config";

const STORAGE_KEY = "mm-urgency-dismissed";

export function UrgencyBanner({ locale }: { locale: Locale }) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid layout shift

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    setDismissed(window.sessionStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  // The navbar reads `--mm-banner-h` to offset its sticky `top` so the two
  // sticky bars don't collide. Bumped to 2.5rem when visible, 0 when dismissed.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (mounted && !dismissed) {
      root.style.setProperty("--mm-banner-h", "2.5rem");
    } else {
      root.style.setProperty("--mm-banner-h", "0px");
    }
    return () => {
      root.style.setProperty("--mm-banner-h", "0px");
    };
  }, [mounted, dismissed]);

  if (!mounted || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    }
  };

  // Per the design-system spec: navy-900 background with brass-200 text.
  // 12.5px centered, three trust devices separated by middots.
  const items =
    locale === "ar"
      ? ["شحن مجاني على الطلبات فوق ١٬٥٠٠ ج.م.", "الدفع عند الاستلام", "بنشحن لكل ٢٧ محافظة"]
      : ["Free shipping over LE 1,500", "Cash on delivery", "Ships to all 27 governorates"];

  return (
    <div
      role="region"
      aria-label={locale === "ar" ? "إعلان" : "Announcement"}
      className="sticky top-0 z-50 flex h-10 items-center justify-center bg-navy-900 px-10 text-brass-200"
    >
      <p className="flex items-center justify-center gap-2 text-center text-[12.5px] font-medium sm:gap-3">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 sm:gap-3">
            {i > 0 && <span aria-hidden className="text-brass-400/50">·</span>}
            <span>{item}</span>
          </span>
        ))}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={locale === "ar" ? "إخفاء" : "Dismiss"}
        className="absolute rounded-full p-1.5 text-brass-200 transition hover:bg-white/10 hover:text-paper ltr:right-2 rtl:left-2"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
