"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/track";

const DWELL_MS = 1_000;

/**
 * Fires one view_item after the visitor has actually stayed on the product for
 * a second.
 *
 * The dwell timer is the point: without it a scroll-past or a mis-tap counts as
 * interest, and the product-demand table then rewards whatever happens to sit
 * where thumbs land. One second is short enough to catch a real look and long
 * enough to drop an accidental one.
 *
 * `active` lets the modal mount this once and start/stop the timer as it opens
 * and closes, rather than mounting and unmounting a tracker.
 *
 * The ref guard covers two things at once: React StrictMode invokes effects
 * twice in development, and a modal reopened for the same product should not
 * re-fire. Server-side dedup (visitor + product per 30 minutes) is the real
 * backstop; this just avoids sending obvious duplicates.
 */
export function ViewItemTracker({
  productId,
  active = true,
}: {
  productId: string;
  active?: boolean;
}) {
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;
    if (sent.current === productId) return;

    const timer = setTimeout(() => {
      sent.current = productId;
      track({ name: "view_item", productId });
    }, DWELL_MS);

    return () => clearTimeout(timer);
  }, [productId, active]);

  return null;
}
