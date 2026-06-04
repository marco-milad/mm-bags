import type { Locale } from "@/lib/i18n-config";

const PHRASES_AR = [
  "سافر بذكاء",
  "اخترناها بإيدنا",
  "جودة حقيقية",
  "سعر عادل",
  "ضمان ١٤ يوم",
  "بنشحن لكل ٢٧ محافظة",
] as const;

const PHRASES_EN = [
  "Travel Smart",
  "Hand-picked quality",
  "Fair pricing",
  "Free shipping over LE 1,500",
  "14-day guarantee",
  "Ships to 27 governorates",
] as const;

/**
 * Cormorant italic phrases scrolling horizontally. Pure CSS animation
 * (mm-marquee, 26s linear infinite). Pauses on hover via group-hover.
 * Duplicated track for seamless loop. Reduced-motion users get a static row.
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
        className="flex whitespace-nowrap will-change-transform motion-reduce:animate-none group-hover:[animation-play-state:paused]"
        style={{
          animation: "mm-marquee 26s linear infinite",
          // RTL flips the scroll direction naturally via dir; we keep the same
          // keyframes, but the layout direction comes from the locale html dir.
        }}
      >
        {track.map((phrase, i) => (
          <span
            key={i}
            aria-hidden={i >= phrases.length}
            className="font-display mx-8 inline-flex items-center gap-8 text-2xl italic text-ink-700 md:text-3xl"
          >
            {phrase}
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brass-500" />
          </span>
        ))}
      </div>
    </section>
  );
}
