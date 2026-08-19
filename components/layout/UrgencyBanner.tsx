"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n-config";

const STORAGE_KEY = "mm-urgency-dismissed";

/**
 * Synchronous, parser-executed guard rendered INSIDE the banner. For
 * sessions that already dismissed the banner it hides the wrapper and
 * zeroes the navbar offset BEFORE first paint; otherwise it publishes
 * the banner height. Either way the page never reflows because of this
 * component — which is the whole point: the previous implementation
 * mounted the banner only after hydration ("start hidden to avoid
 * layout shift") and thereby *caused* a full-page 40px shift on every
 * load. That was the site-wide CLS 0.045.
 */
const DISMISS_GUARD = `(function(){try{var d=sessionStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)})==="1";var s=document.currentScript;var w=s&&s.parentElement;if(d&&w){w.style.display="none";}document.documentElement.style.setProperty("--mm-banner-h",d?"0px":"2.5rem");}catch(e){}})();`;

export function UrgencyBanner({ locale }: { locale: Locale }) {
  // Rendered in SSR (visible) so the banner is part of the very first
  // paint — no post-hydration insertion, no layout shift. The inline
  // guard above handles the "already dismissed this session" case
  // before paint; this state only takes over from hydration onwards.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Sync React state with the pre-paint guard's decision. If the
    // guard hid the wrapper, unmounting it here changes nothing
    // visually (display was already none).
    setDismissed(window.sessionStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  // The navbar reads `--mm-banner-h` to offset its sticky `top` so the
  // two sticky bars don't collide. The pre-paint guard sets the initial
  // value; this effect keeps it in sync after a same-session dismiss.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--mm-banner-h", dismissed ? "0px" : "2.5rem");
    return () => {
      root.style.setProperty("--mm-banner-h", "0px");
    };
  }, [dismissed]);

  if (dismissed) return null;

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
      <script dangerouslySetInnerHTML={{ __html: DISMISS_GUARD }} />
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
