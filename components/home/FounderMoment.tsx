"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n-config";

/**
 * Navy block with a giant faint MM watermark, MM avatar (from start), signed
 * Marco quote (from end), and a "Read the full story" link. Split reveal:
 * the two halves slide in from opposite inline edges when scrolled into view.
 */
export function FounderMoment({ locale }: { locale: Locale }) {
  const ref = useRef<HTMLElement>(null);
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
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const Forward = locale === "ar" ? ArrowLeft : ArrowRight;
  // "from inline-start" → in LTR that's negative X (left); in RTL it's positive X (right).
  const startX = locale === "ar" ? 40 : -40;
  const endX = -startX;

  const slide = (x: number) =>
    ({
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : `translateX(${x}px)`,
      transition:
        "opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 700ms cubic-bezier(0.22,1,0.36,1)",
    }) as const;

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden bg-navy-900 py-12 text-paper md:py-32"
    >
      {/* Giant faint MM watermark */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      >
        <span className="font-display select-none text-[28rem] font-bold leading-none text-white/[0.035] md:text-[40rem]">
          MM
        </span>
      </span>

      {/* Brass hairline accent (top) */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 mx-auto h-px max-w-[1200px] bg-brass-500/40"
      />

      <div className="relative z-10 mx-auto grid max-w-[1200px] gap-12 px-6 md:grid-cols-2 md:items-center md:gap-16 md:px-12">
        {/* Avatar — slides in from inline-start */}
        <div
          className="flex justify-center md:justify-start"
          style={slide(startX)}
        >
          <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-full ring-2 ring-brass-500/50 ring-offset-4 ring-offset-navy-900 md:h-56 md:w-56">
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-navy-700 via-navy-800 to-navy-900"
            />
            {/* Marco placeholder: monogram on navy until real portrait lands */}
            <span
              aria-hidden
              className="font-display absolute inset-0 flex items-center justify-center text-7xl font-bold text-brass-400 md:text-8xl"
            >
              MM
            </span>
            {/* Brass plate caption */}
            <span className="absolute inset-x-4 bottom-3 rounded-sm bg-brass-500 px-2 py-1 text-center font-mono text-[9px] uppercase tracking-wider text-navy-900">
              {locale === "ar" ? "ماركو ميلاد · المؤسس" : "Marco Milad · Founder"}
            </span>
          </div>
        </div>

        {/* Quote — slides in from inline-end */}
        <div className="flex flex-col gap-5" style={slide(endX)}>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-brass-300">
            {locale === "ar" ? "كلمة من المؤسس" : "A note from the founder"}
          </p>

          <blockquote className="relative">
            <span
              aria-hidden
              className="font-display absolute -top-6 -translate-y-1 select-none text-7xl leading-none text-brass-500/40 ltr:-left-2 rtl:-right-2"
            >
              {locale === "ar" ? "”" : "“"}
            </span>
            <p className="font-display relative text-2xl leading-snug text-paper md:text-3xl">
              {locale === "ar"
                ? "اخترت كل شنطة بإيدي عشان تسافر معاك راحل البال."
                : "I picked every bag by hand, so they travel with you with peace of mind."}
            </p>
          </blockquote>

          <p className="text-sm text-navy-200">
            {locale === "ar"
              ? "ماركو ميلاد، مطوّر ورائد أعمال من القاهرة. بدأ M.M Bags لأنه دوّر كتير على شنط سفر بجودة حقيقية وسعر معقول في مصر — وملقاش."
              : "Marco Milad, a developer and entrepreneur in Cairo. He started M.M Bags because he searched hard for quality travel bags at fair prices in Egypt — and couldn't find any."}
          </p>

          <Link
            href={`/${locale}/about`}
            className="mt-2 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-brass-400 underline-offset-4 hover:underline hover:text-brass-300"
          >
            {locale === "ar" ? "اقرأ القصة كاملة" : "Read the full story"}
            <Forward className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
