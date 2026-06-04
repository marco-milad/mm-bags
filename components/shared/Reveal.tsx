"use client";

import { useEffect, useRef, useState } from "react";

type Variant = "rise" | "scale";

const FROM: Record<Variant, string> = {
  rise: "translateY(26px)",
  scale: "scale(0.94)",
};

/**
 * Wraps children and reveals them when scrolled into view.
 * IntersectionObserver fires once at ~16% visibility, then disconnects.
 * Honors prefers-reduced-motion via the global rule in globals.css.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  variant = "rise",
  as = "div",
  threshold = 0.16,
}: {
  children: React.ReactNode;
  className?: string;
  /** ms before the transition starts after entering view */
  delay?: number;
  variant?: Variant;
  as?: "div" | "li" | "section" | "article";
  threshold?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  const Tag = as as "div";
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : FROM[variant],
        transition:
          "opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 700ms cubic-bezier(0.22,1,0.36,1)",
        transitionDelay: `${delay}ms`,
        willChange: visible ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}
