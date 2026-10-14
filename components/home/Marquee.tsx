import type { Locale } from "@/lib/i18n-config";

/**
 * Trust-signal ticker items. Each item pairs an objection the local
 * Egyptian shopper actually has ("can I pay cash?", "how fast do you
 * ship?") with a concrete answer + a check glyph. The previous strip
 * of brand poetry ("Travel Smart", "Fair pricing") reads well but
 * doesn't move a purchase decision — trust cues do.
 */
const PHRASES_AR = [
  "الدفع عند الاستلام أو InstaPay ✓",
  "توصيل خلال ٢–٥ أيام ✓",
  "إرجاع ١٤ يوم + ضمان سنة ✓",
  "٢٧ محافظة ✓",
  "رد على واتساب خلال ٢٤ ساعة ✓",
] as const;

// Every phrase must match checkout and the policies — answer engines quote
// these strips as facts about the store.
const PHRASES_EN = [
  "Cash on delivery or InstaPay ✓",
  "Delivered in 2–5 days ✓",
  "14-day returns · 1-year warranty ✓",
  "27 governorates ✓",
  "WhatsApp replies within 24 hours ✓",
] as const;

/**
 * Trust-signal phrases scrolling horizontally. Pure CSS animation
 * (mm-marquee, linear infinite). Duration is responsive: 40s on
 * mobile (small viewport → each item takes more of the visible strip
 * → same 26s felt too fast) and 30s on md+. Pauses on hover.
 * Duplicated track for seamless loop; reduced-motion users get a
 * static row.
 */
export function Marquee({ locale }: { locale: Locale }) {
  const phrases = locale === "ar" ? PHRASES_AR : PHRASES_EN;
  // Two copies so the -50% translate produces a seamless loop
  const track = [...phrases, ...phrases];

  return (
    <section
      aria-label={locale === "ar" ? "شريط متحرك" : "Brand marquee"}
      className="group overflow-hidden border-y border-line bg-paper py-6"
    >
      <div
        // `[--marquee-dur:*]` sets a CSS custom property that the inline
        // animation reads. Slower on small screens, faster on md+.
        className="flex whitespace-nowrap will-change-transform [--marquee-dur:40s] motion-reduce:animate-none group-hover:[animation-play-state:paused] md:[--marquee-dur:30s]"
        style={{
          animation: "mm-marquee var(--marquee-dur, 30s) linear infinite",
          // RTL flips the scroll direction naturally via dir; we keep the same
          // keyframes, but the layout direction comes from the locale html dir.
        }}
      >
        {track.map((phrase, i) => (
          <span
            key={i}
            aria-hidden={i >= phrases.length}
            className="font-display mx-8 inline-flex items-center gap-8 text-xl italic text-ink-700 md:text-3xl"
          >
            {phrase}
            {/* Slightly larger brass dot separator — the previous 6px
                dot got lost between phrases on mobile. 8px reads as a
                deliberate delimiter, and the ring gives it presence
                against the cream background. */}
            <span
              aria-hidden
              className="h-2 w-2 rounded-full bg-brass-500 ring-1 ring-brass-500/30 ring-offset-2 ring-offset-paper"
            />
          </span>
        ))}
      </div>
    </section>
  );
}
