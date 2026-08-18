"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Tag,
  Truck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { preconnect } from "react-dom";
import type { Locale } from "@/lib/i18n-config";
import { KineticDestination } from "./KineticDestination";

const WHATSAPP_NUMBER = (
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+201229749608"
).replace(/\D/g, "");

const RISE = "mm-rise 0.9s cubic-bezier(0.22,1,0.36,1) forwards";

// Hero background video (Supabase Storage, public bucket "videos").
// Desktop-only: it is mounted after hydration on wide, motion-OK
// clients and fades in over the poster once it is actually playing.
// Phones never request a single video byte — they get the poster only.
const HERO_VIDEO_URL =
  "https://nrlcypdrfmjdwuvuaryp.supabase.co/storage/v1/object/public/videos/4684102-hd_1920_1080_25fps.mp4";
// Hero poster (the LCP element). Same photo as before, but hosted in
// our own Supabase Storage so the project's image loader serves it as
// responsive WebP through the render endpoint (≈15–40 KB on phones
// instead of a 424 KB 1920px JPEG from a third-party origin) and
// next/image `priority` preloads it from the <head>.
const HERO_POSTER_URL =
  "https://nrlcypdrfmjdwuvuaryp.supabase.co/storage/v1/object/public/products/site/hero/hero-poster.jpg";
// Video only makes sense on large screens; matches Tailwind's `md`.
const VIDEO_MEDIA_QUERY = "(min-width: 768px)";
// The poster lives on a different origin than the HTML, so the LCP
// request would otherwise pay DNS + TCP + TLS before its first byte.
const HERO_ASSET_ORIGIN = new URL(HERO_POSTER_URL).origin;

export function Hero({
  locale,
  taglineAr,
  taglineEn,
}: {
  locale: Locale;
  taglineAr: string;
  taglineEn: string;
}) {
  // Emits <link rel="preconnect"> in <head> during SSR so the poster's
  // connection is being set up while the HTML is still parsing.
  preconnect(HERO_ASSET_ORIGIN);

  const wrapRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // `reduced` drives parallax / glow on/off (same as before). The video also
  // reads `prefers-reduced-motion` directly so it can stay paused even on
  // touch devices that aren't reduced-motion-flagged.
  const [reduced, setReduced] = useState(false);
  // Whether to mount the <video> at all: desktop-width AND motion-OK.
  // Decided post-mount so SSR never emits the element — phones never
  // even see the URL, let alone download 3 MB of MP4.
  const [wantsVideo, setWantsVideo] = useState(false);
  // Flipped by the video's `playing` event so the poster stays the
  // visible layer until real frames exist (no black/blank flash).
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Honor reduced-motion AND coarse pointers (skip parallax/glow on touch).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const t = window.matchMedia("(pointer: coarse)");
    setReduced(m.matches || t.matches);
    setWantsVideo(!m.matches && window.matchMedia(VIDEO_MEDIA_QUERY).matches);
  }, []);

  // Kick off playback once the (desktop-only) video element exists. The
  // element has no `autoPlay` and `preload="none"`, so nothing is fetched
  // until this explicit play() — the poster is what paints first, always.
  useEffect(() => {
    if (!wantsVideo) return;
    const v = videoRef.current;
    if (!v) return;
    // play() returns a promise that can reject (autoplay-blocked browsers).
    // Swallow — the poster stays visible in that case, which is the same
    // visual result as if the user had reduced motion on.
    v.play().catch(() => undefined);
  }, [wantsVideo]);

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
      {/* Background — parallax target. The poster <Image> is always
          rendered (SSR, `priority` → preloaded from <head>) and is the
          LCP element on every device. On desktop, motion-OK clients the
          <video> mounts after hydration on top of it and fades in once
          it is really playing; phones / reduced-motion / autoplay-blocked
          clients only ever see the poster — the previous static-hero
          behavior, minus the 3 MB download. */}
      <div
        ref={bgRef}
        aria-hidden
        // The 1.18 over-scale is part of the hero's framing on every device
        // (it also gives the parallax head-room). Only the parallax clients
        // — motion-OK, fine pointer, same conditions as the JS `reduced`
        // flag — get `will-change: transform`, so phones / touch /
        // reduced-motion don't pay for a promoted full-viewport layer.
        className="absolute inset-0 -z-20 motion-safe:pointer-fine:will-change-transform"
        style={{ transform: "scale(1.18)" }}
      >
        <Image
          src={HERO_POSTER_URL}
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          quality={70}
          className="object-cover"
        />
        {wantsVideo && (
          <video
            ref={videoRef}
            src={HERO_VIDEO_URL}
            muted
            loop
            playsInline
            preload="none"
            tabIndex={-1}
            onPlaying={() => setVideoPlaying(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              videoPlaying ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
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
      <div className="relative mx-auto flex min-h-[82vh] max-w-[1360px] flex-col items-start justify-center gap-5 px-6 py-12 md:min-h-[88vh] md:px-12 md:py-32">
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

        {/* Starting-price badge — an Egyptian-market conversion cue.
            "How much does it start at?" is the first question a local
            visitor asks; showing it up front cuts the bounce loop to
            the catalog just to check pricing. Value is intentionally
            hardcoded (edit here when the true floor price changes)
            rather than derived from MIN(products.price) so it doesn't
            silently drift on inventory swings. */}
        <div
          className="opacity-0"
          style={{ animation: RISE, animationDelay: "380ms" }}
        >
          {/* Solid semi-opaque fill instead of `backdrop-blur-sm`: the
              badge sits over a full-viewport hero layer, and blurring
              that backdrop on every entrance-animation frame was the
              single most expensive style/layout cost on the page. The
              navy base + brass wash reproduces the previous look over
              the dark gradient without any backdrop-filter. */}
          <span className="inline-flex items-center gap-2 rounded-full border border-brass-500/40 bg-navy-900/60 bg-[linear-gradient(rgba(184,151,90,0.12),rgba(184,151,90,0.12))] px-4 py-1.5 text-sm font-medium text-brass-100">
            <Tag className="h-3.5 w-3.5 text-brass-300" aria-hidden />
            {locale === "ar"
              ? "بتبدأ من 150 ج.م. فقط"
              : "Starting from EGP 150"}
          </span>
        </div>

        {/* Urgency badge — pairs with the price badge above it. The
            "how much?" question is answered; this second pill answers
            "how fast?". Duplicates a Marquee item deliberately (Marco
            called this repetition = emphasis for a first-time visitor
            who may not have watched the ticker cycle around yet). */}
        <div
          className="opacity-0"
          style={{ animation: RISE, animationDelay: "460ms" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brass-400/60 bg-navy-900/60 bg-[linear-gradient(rgba(184,151,90,0.22),rgba(184,151,90,0.22))] px-4 py-1.5 text-sm font-semibold text-brass-50">
            <Rocket className="h-3.5 w-3.5 text-brass-200" aria-hidden />
            {locale === "ar"
              ? "شحن خلال 24 ساعة"
              : "Ships within 24 hours"}
          </span>
        </div>

        <div
          className="mt-2 flex flex-wrap gap-3 opacity-0"
          style={{ animation: RISE, animationDelay: "540ms" }}
        >
          <Link
            href={`/${locale}/categories`}
            className="inline-flex items-center gap-2 rounded-md bg-brass-500 px-7 py-3 text-sm font-semibold text-navy-900 transition hover:bg-brass-600"
          >
            {locale === "ar" ? "تسوق دلوقتي" : "Shop now"}
            <Forward className="h-4 w-4" />
          </Link>
          {/* Secondary CTA is a direct WhatsApp thread with a
              pre-filled Arabic/English greeting. In the Egyptian
              market, WhatsApp is the default "talk-to-a-real-person"
              channel — a first-time visitor who isn't ready to buy
              often WILL message before browsing further. The
              persistent WhatsApp FAB still exists for later-scroll
              intent; this hero-level CTA captures the moment of
              first-question friction. */}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
              locale === "ar"
                ? "أهلاً، محتاج مساعدة في اختيار شنطة من M.M Bags."
                : "Hi, I'd like help picking a bag from M.M Bags.",
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-white/30 px-7 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <MessageCircle className="h-4 w-4" />
            {locale === "ar" ? "كلمنا على واتساب" : "Chat on WhatsApp"}
          </a>
        </div>

        <div
          className="mt-1 opacity-0"
          style={{ animation: RISE, animationDelay: "620ms" }}
        >
          <KineticDestination locale={locale} />
        </div>

        {/* Trust row (hidden on small screens per spec) */}
        <ul
          className="mt-6 hidden flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/70 opacity-0 md:flex"
          style={{ animation: RISE, animationDelay: "740ms" }}
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
