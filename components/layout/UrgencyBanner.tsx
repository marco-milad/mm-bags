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

  return (
    <div
      role="region"
      aria-label={locale === "ar" ? "إعلان" : "Announcement"}
      className="sticky top-0 z-50 flex h-10 items-center justify-center bg-[var(--color-accent)] px-4 text-[var(--color-primary)]"
    >
      <p className="text-center text-xs font-semibold sm:text-sm">
        {locale === "ar"
          ? "🔥 عرض محدود — شحن مجاني على الطلبات فوق LE 1,500"
          : "🔥 Limited time — Free shipping on orders over LE 1,500"}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={locale === "ar" ? "إخفاء" : "Dismiss"}
        className="absolute rounded-full p-1.5 text-[var(--color-primary)] transition hover:bg-white/20 ltr:right-2 rtl:left-2"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
