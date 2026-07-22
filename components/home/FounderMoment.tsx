"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
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
            {/* Warmer brass-tinted gradient — replaces the flat navy
                stack with a subtle brass wash top-left → deep navy
                bottom-right. Reads as "portrait frame" rather than
                the previous "empty-state" flat fill. */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-brass-900/30 via-navy-800 to-navy-900"
            />
            {/* Subtle grain — SVG turbulence at low opacity, blended
                into the gradient. Small viewport (176–224 px sq) so
                the feTurbulence cost is negligible. Reads as a
                printed / handcrafted texture, not the perfect-fill
                blankness the old gradient had. Filter id is prefixed
                so it can't collide with other SVGs on the page. */}
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full mix-blend-overlay opacity-30"
            >
              <filter id="fm-avatar-grain">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.9"
                  numOctaves="2"
                />
              </filter>
              <rect width="100%" height="100%" filter="url(#fm-avatar-grain)" />
            </svg>
            {/* Brand logo — same navbar mark used in the Footer /
                Admin sidebar (the `-light` variant is the light-on-
                dark version, matched to this section's navy bg).
                Centered inside the circular frame; the horizontal
                wordmark is scaled to ~65% of the circle diameter so
                it breathes without touching the ring. Ships from
                /public so no image loader / remote fetch overhead. */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src="/assets/logos/logo-navbar-light.svg"
                alt="M.M Bags"
                width={232}
                height={64}
                className="h-auto w-28 md:w-36"
                priority={false}
              />
            </div>
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

          {/* Signature strip — italic name flanked by brass hairlines.
              Serves the same purpose a handwritten signature would on
              a printed letter: it puts a human name at the end of the
              quote without needing a photograph. Cheap trust primitive
              that costs nothing but reads intimate. */}
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-px flex-1 bg-brass-500/30"
            />
            <span className="font-display text-lg italic text-brass-300 md:text-xl">
              — {locale === "ar" ? "ماركو" : "Marco"} —
            </span>
            <span
              aria-hidden
              className="h-px flex-1 bg-brass-500/30"
            />
          </div>

          <p className="text-sm leading-relaxed text-navy-200">
            {locale === "ar"
              ? "M.M Bags تأسست في 1998 من محافظة سوهاج. اليوم بيدير البراند ماركو ميلاد، مطوّر ورائد أعمال، بنفس الشغف الأصلي — جودة حقيقية، سعر عادل، وخدمة بنفتخر بيها."
              : "M.M Bags was founded in 1998 in Sohag governorate. Today it's run by Marco Milad — a developer and entrepreneur — with the same original passion: real quality, fair pricing, and service we're proud of."}
          </p>

          {/* Credibility pill — the concrete facts anchor the section
              in something the visitor can verify. Two branches in
              Sohag governorate + the 1998 founding date give the
              brand a real physical + temporal footprint that pure
              copy can't. Update either value in place if operations
              change. */}
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brass-500/40 bg-brass-500/10 px-3 py-1 text-[11px] font-medium text-brass-100">
            <MapPin className="h-3 w-3 text-brass-300" aria-hidden />
            {locale === "ar"
              ? "لدينا فرعين في محافظة سوهاج · تأسست 1998"
              : "Two branches in Sohag governorate · Est. 1998"}
          </span>

          {/* Promoted CTA — outlined brass button instead of the
              previous small underline link. FounderMoment's whole job
              is to hand the reader off to /about; a stronger affordance
              matches that intent. Hover fills solid brass for the
              "committed" state. */}
          <Link
            href={`/${locale}/about`}
            className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-brass-500/60 px-6 py-3 text-sm font-semibold text-brass-300 transition hover:bg-brass-500 hover:text-navy-900"
          >
            {locale === "ar" ? "اقرأ القصة كاملة" : "Read the full story"}
            <Forward className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
