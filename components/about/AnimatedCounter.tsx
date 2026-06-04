"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedCounter({
  target,
  durationMs = 1500,
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
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const start = performance.now();
            const tick = (now: number) => {
              const elapsed = now - start;
              const progress = Math.min(1, elapsed / durationMs);
              // ease-out cubic — fast at first, gentle settle
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(target * eased);
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
