"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics/track";

/**
 * Fires one page_view per pathname.
 *
 * Mounted once in the [locale] layout, so it survives client navigation and
 * re-fires on each route change rather than only on a hard load.
 *
 * The ref guard is what makes it one view per path: React StrictMode invokes
 * effects twice in development, and without it every page would count double
 * there and nobody would notice until the numbers were compared against
 * something real.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;
    // Read campaign tags off the (landing) URL. Internal navigations carry no
    // utm_*, so these are naturally set only on the entry page_view.
    const qs = new URLSearchParams(window.location.search);
    track({
      name: "page_view",
      utmSource: qs.get("utm_source") ?? undefined,
      utmMedium: qs.get("utm_medium") ?? undefined,
      utmCampaign: qs.get("utm_campaign") ?? undefined,
    });
  }, [pathname]);

  return null;
}
