"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MapPin, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n-config";
import { KineticDestination } from "./KineticDestination";

const RISE = "mm-rise 0.9s cubic-bezier(0.22,1,0.36,1) forwards";

export function Hero({
  locale,
  taglineAr,
  taglineEn,
}: {
  locale: Locale;
  taglineAr: string;
  taglineEn: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  // Honor reduced-motion AND coarse pointers (skip parallax/glow on touch).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const t = window.matchMedia("(pointer: coarse)");
    setReduced(m.matches || t.matches);
  }, []);

  // Parallax: translate the bg image by scrollY * 0.26.
  useEffect(() => {
    if (reduced) return;
    const bg = bgRef.current;
    if (!bg) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY * 0.26;
        bg.style.transform = `translate3d(0, ${y}px, 0) scale(1.18)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  // Cursor brass-glow follows pointer via CSS vars.
  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      wrap.style.setProperty("--mx", `${e.clientX - r.left}px`);
      wrap.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    wrap.addEventListener("pointermove", onMove);
    return () => wrap.removeEventListener("pointermove", onMove);
  }, [reduced]);

  const Forward = locale === "ar" ? ArrowLeft : ArrowRight;
  const headline = locale === "ar" ? taglineAr : taglineEn;
  const subcopy =
    locale === "ar"
      ? "شنط سفر اخترناها بإيدنا. جودة حقيقية، سعر عادل، خدمة بنفتخر بيها."
      : "Bags we picked by hand. Real quality, fair price, service we're proud of.";

  return (
    <section
      ref={wrapRef}
      className="relative isolate overflow-hidden bg-navy-900 text-paper"
      style={{
        // brass glow position (fallback hides off-screen until pointer enters)
        ["--mx" as never]: "-9999px",
        ["--my" as never]: "-9999px",
      }}
    >
      {/* Background image — parallax target */}
      <div
        ref={bgRef}
        aria-hidden
        className="absolute inset-0 -z-20 will-change-transform"
        style={{ transform: "scale(1.18)" }}
      >
        <Image
          src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1920&q=90"
          alt=""
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
      </div>

      {/* Navy gradient overlay (darker at the text-anchor edge, lighter at the opposite) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            locale === "ar"
              ? "linear-gradient(270deg, rgba(11,19,34,0.92) 0%, rgba(15,26,48,0.75) 45%, rgba(15,26,48,0.35) 100%)"
              : "linear-gradient(90deg, rgba(11,19,34,0.92) 0%, rgba(15,26,48,0.75) 45%, rgba(15,26,48,0.35) 100%)",
        }}
      />

      {/* Cursor brass-glow (desktop only) */}
      {!reduced && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-90 transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(420px circle at var(--mx) var(--my), rgba(184,151,90,0.22), transparent 65%)",
          }}
        />
      )}

      {/* Content */}
      <div className="relative mx-auto flex min-h-[82vh] max-w-[1360px] flex-col items-start justify-center gap-5 px-6 py-24 md:min-h-[88vh] md:px-12 md:py-32">
        <p
          className="font-mono text-[11px] uppercase tracking-[0.3em] text-brass-300 opacity-0"
          style={{ animation: RISE, animationDelay: "50ms" }}
        >
          M.M Bags
        </p>

        <h1
          className="font-display max-w-3xl text-5xl leading-[1.05] opacity-0 md:text-7xl"
          style={{ animation: RISE, animationDelay: "160ms" }}
        >
          {headline}
        </h1>

        <p
          className="max-w-xl text-base text-white/80 opacity-0 md:text-lg"
          style={{ animation: RISE, animationDelay: "300ms" }}
        >
          {subcopy}
        </p>

        <div
          className="mt-2 flex flex-wrap gap-3 opacity-0"
          style={{ animation: RISE, animationDelay: "420ms" }}
        >
          <Link
            href={`/${locale}/categories`}
            className="inline-flex items-center gap-2 rounded-md bg-brass-500 px-7 py-3 text-sm font-semibold text-navy-900 transition hover:bg-brass-600"
          >
            {locale === "ar" ? "تسوق دلوقتي" : "Shop now"}
            <Forward className="h-4 w-4" />
          </Link>
          <Link
            href={`/${locale}/about`}
            className="inline-flex items-center gap-2 rounded-md border border-white/30 px-7 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            {locale === "ar" ? "اكتشف القصة" : "Discover the story"}
          </Link>
        </div>

        <div
          className="mt-1 opacity-0"
          style={{ animation: RISE, animationDelay: "540ms" }}
        >
          <KineticDestination locale={locale} />
        </div>

        {/* Trust row (hidden on small screens per spec) */}
        <ul
          className="mt-6 hidden flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/70 opacity-0 md:flex"
          style={{ animation: RISE, animationDelay: "660ms" }}
        >
          <li className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-brass-300" />
            {locale === "ar" ? "بنشحن لكل ٢٧ محافظة" : "Ships to 27 governorates"}
          </li>
          <li aria-hidden className="text-white/30">·</li>
          <li className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-brass-300" />
            {locale === "ar" ? "ضمان ١٤ يوم" : "14-day guarantee"}
          </li>
          <li aria-hidden className="text-white/30">·</li>
          <li className="inline-flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-brass-300" />
            {locale === "ar" ? "الدفع عند الاستلام" : "Cash on delivery"}
          </li>
        </ul>
      </div>

      {/* Scroll cue */}
      <a
        href="#after-hero"
        aria-label={locale === "ar" ? "اسحب لأسفل" : "Scroll"}
        className="absolute bottom-6 left-1/2 hidden h-10 w-6 -translate-x-1/2 items-end justify-center rounded-full border border-white/30 pb-1.5 md:flex"
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-brass-400 motion-reduce:animate-none"
          style={{ animation: "mm-scroll-cue 1.5s ease-in-out infinite" }}
        />
      </a>

      {/* Local keyframes for the scroll cue (not generated by Tailwind utility) */}
      <style>{`
        @keyframes mm-scroll-cue {
          0%, 100% { transform: translateY(0); opacity: 0.9; }
          50% { transform: translateY(8px); opacity: 0.4; }
        }
      `}</style>
    </section>
  );
}
