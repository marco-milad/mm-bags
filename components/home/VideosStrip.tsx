"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n-config";
import { cn } from "@/lib/utils";

type Card = {
  src: string;
  ar: string;
  en: string;
};

// All three clips live in the public Supabase Storage bucket "videos".
// Card 1 is the only portrait-native source — the other two are landscape
// 640p iStock clips that crop nicely into the same 9:16 card aspect.
const CARDS: ReadonlyArray<Card> = [
  {
    src: "https://nrlcypdrfmjdwuvuaryp.supabase.co/storage/v1/object/public/videos/8044819-hd_1080_1920_25fps.mp4",
    ar: "سافر بأناقة",
    en: "Travel in Style",
  },
  {
    src: "https://nrlcypdrfmjdwuvuaryp.supabase.co/storage/v1/object/public/videos/istockphoto-1432567491-640_adpp_is.mp4",
    ar: "شنطتك رفيقتك",
    en: "Your Bag, Your Journey",
  },
  {
    src: "https://nrlcypdrfmjdwuvuaryp.supabase.co/storage/v1/object/public/videos/istockphoto-2199388953-640_adpp_is.mp4",
    ar: "جودة تدوم",
    en: "Quality that Lasts",
  },
];

export function VideosStrip({ locale }: { locale: Locale }) {
  const isRTL = locale === "ar";
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [muted, setMuted] = useState(true);

  // Reduced-motion gate: don't even attempt autoplay if the user prefers
  // less motion. The poster (first frame) shows instead.
  const reducedMotion = useReducedMotion();

  // IntersectionObserver: play the video while ≥ 60% visible in the
  // viewport, pause it otherwise. One observer wired up to all three
  // refs — single listener, minimal overhead.
  useEffect(() => {
    if (typeof window === "undefined" || reducedMotion) return;
    const els = videoRefs.current.filter((el): el is HTMLVideoElement =>
      Boolean(el),
    );
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            v.play().catch(() => undefined);
          } else {
            v.pause();
          }
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reducedMotion]);

  // Mute state is shared across all three cards — clicking any card toggles
  // the strip's sound. Apply it imperatively to keep the videos
  // uncontrolled.
  useEffect(() => {
    for (const v of videoRefs.current) {
      if (v) v.muted = muted;
    }
  }, [muted]);

  const toggleMute = () => setMuted((m) => !m);

  const eyebrow = isRTL ? "من رحلاتنا" : "From our travels";
  const heading = isRTL ? "لحظات تستحق" : "Moments worth carrying";
  const muteLabel = muted
    ? isRTL
      ? "تشغيل الصوت"
      : "Unmute"
    : isRTL
      ? "كتم الصوت"
      : "Mute";

  return (
    <section
      className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-24"
      aria-labelledby="videos-strip-heading"
    >
      <header className="mb-10 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
            {eyebrow}
          </p>
          <h2
            id="videos-strip-heading"
            className="font-display mt-2 text-3xl text-[var(--color-text)] md:text-4xl"
          >
            {heading}
          </h2>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          {isRTL ? "اضغط على أي فيديو للصوت" : "Tap any card for sound"}
        </p>
      </header>

      {/* Horizontal scroller — snap-x on the container, snap-center on each
          card. Negative side padding via px-6 keeps the cards flush with the
          page padding while leaving room for the snap-edge. */}
      <div
        className={cn(
          "-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-6 px-6 pb-2 md:-mx-12 md:scroll-px-12 md:gap-6 md:px-12",
          // hide scrollbar but keep scroll
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        )}
        role="list"
      >
        {CARDS.map((card, i) => (
          <button
            key={card.src}
            type="button"
            role="listitem"
            onClick={toggleMute}
            aria-label={`${isRTL ? card.ar : card.en} — ${muteLabel}`}
            className="group relative aspect-[9/16] w-[78vw] max-w-[300px] shrink-0 snap-center overflow-hidden rounded-2xl bg-navy-900 text-start outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] md:w-[320px] md:max-w-none"
          >
            <video
              ref={(el) => {
                videoRefs.current[i] = el;
              }}
              src={card.src}
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />

            {/* Bottom gradient for label legibility */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
            />

            {/* Mute indicator — top corner, mirrors current state */}
            <span
              aria-hidden
              className={cn(
                "absolute top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition group-hover:bg-black/65",
                isRTL ? "left-3" : "right-3",
              )}
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </span>

            {/* Caption */}
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="font-display text-xl leading-snug md:text-2xl">
                {isRTL ? card.ar : card.en}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

// Sync-safe reduced-motion hook. SSR-side returns false (assume motion OK)
// so the initial HTML can still render the videos — then the post-mount
// state correction kicks in on the first client paint.
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  // useMemo for the matchMedia so React doesn't re-create the listener.
  const mql = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.matchMedia("(prefers-reduced-motion: reduce)");
  }, []);
  useEffect(() => {
    if (!mql) return;
    setReduced(mql.matches);
    const cb = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  }, [mql]);
  return reduced;
}
