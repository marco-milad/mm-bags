"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n-config";

const CITIES = ["Rome", "Milan", "Dubai", "Tokyo", "Paris", "Cape Town"] as const;
const SWAP_MS = 2200;

/**
 * "From Cairo to ⟨city⟩" with the city slot-swapping every ~2s.
 * City names stay Latin (LTR) even inside the Arabic phrase — they're treated
 * like brand names, per the design system spec.
 */
export function KineticDestination({ locale }: { locale: Locale }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((n) => (n + 1) % CITIES.length), SWAP_MS);
    return () => clearInterval(t);
  }, [paused]);

  const before = locale === "ar" ? "من القاهرة إلى" : "From Cairo to";

  return (
    <p
      className="inline-flex items-baseline gap-2 text-base text-white/85 md:text-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span>{before}</span>
      <span
        // overflow:hidden slot so the swap reads like a vertical slot machine
        className="relative inline-flex h-[1.2em] min-w-[5.5rem] overflow-hidden align-baseline md:min-w-[7rem]"
        aria-live="polite"
      >
        <span
          key={i}
          dir="ltr"
          className="font-display absolute inset-0 italic text-brass-300"
          style={{ animation: "mm-slotUp 0.45s cubic-bezier(0.22,1,0.36,1)" }}
        >
          {CITIES[i]}
        </span>
      </span>
    </p>
  );
}
