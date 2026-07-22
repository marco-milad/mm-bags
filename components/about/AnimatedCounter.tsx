"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedCounter({
  target,
  durationMs = 900,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  target: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
  /** Number of decimals to show (e.g. 1 for "4.8"). Default 0 = integer w/ thousands. */
  decimals?: number;
}) {
  // Initial state = target so the very first render (SSR + client
  // hydration) shows the real number. The previous `useState(0)` meant
  // every page load flashed "0 governorates / 0 sold / 0.0 rating"
  // before scroll — a devastating first impression for a trust strip.
  // Now the honest value is present immediately; the animation below
  // is a subtle "settle" (target*0.85 → target) that only fires when
  // the strip scrolls into view AND the user hasn't opted out of
  // motion. If it never fires, the number is still correct.
  const [value, setValue] = useState(target);
  const ref = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Reduced-motion users get the static value — no animation.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            // Subtle settle: start slightly BELOW target (85%) and
            // ease up. Never dips to 0 the way the old count-up did,
            // so the display always reads as a real value.
            const from = target * 0.85;
            const start = performance.now();
            const tick = (now: number) => {
              const elapsed = now - start;
              const progress = Math.min(1, elapsed / durationMs);
              // ease-out cubic — fast start, gentle settle
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(from + (target - from) * eased);
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [target, durationMs]);

  const display =
    decimals > 0
      ? value.toFixed(decimals)
      : Math.round(value).toLocaleString("en-US");

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
