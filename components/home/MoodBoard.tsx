import Image from "next/image";
import type { Locale } from "@/lib/i18n-config";
import { Reveal } from "@/components/shared/Reveal";

type Tile = {
  src: string;
  caption_ar: string;
  caption_en: string;
  /** when true, the tile occupies 2 rows on sm+ for a magazine layout */
  tall: boolean;
};

const TILES: Tile[] = [
  {
    src: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80",
    caption_ar: "مطارات", caption_en: "Departures", tall: false,
  },
  {
    src: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80",
    caption_ar: "أضواء المدينة", caption_en: "City light", tall: true,
  },
  {
    src: "https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?w=800&q=80",
    caption_ar: "خارج المدن", caption_en: "Off-road", tall: false,
  },
  {
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    caption_ar: "صباحات هادية", caption_en: "Slow mornings", tall: true,
  },
];

/**
 * Full-bleed navy mood board with 4 lifestyle cells + captions.
 * Reveals with scale-in stagger; hover scales the image ~6% (per MOTION spec).
 * Picsum placeholders — to be swapped for real photography per PHOTOGRAPHY.md.
 */
export function MoodBoard({ locale }: { locale: Locale }) {
  return (
    <section className="relative isolate overflow-hidden bg-navy-900 py-12 text-paper md:py-28">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 mx-auto h-px max-w-[1200px] bg-brass-500/40"
      />

      <div className="mx-auto max-w-[1200px] px-6 md:px-12">
        <header className="mb-10 flex flex-col gap-2 md:mb-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-brass-300">
            {locale === "ar" ? "حياة على الطريق" : "Life on the road"}
          </p>
          <h2 className="font-display max-w-2xl text-3xl leading-tight text-paper md:text-5xl">
            {locale === "ar"
              ? "صُممت لإيقاع حياتك."
              : "Made for the way you move."}
          </h2>
        </header>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
          {TILES.map((tile, i) => {
            // Stagger by index, reset every 2 (one row on sm+, one column on mobile)
            const stagger = (i % 2) * 100 + Math.floor(i / 2) * 80;
            return (
              <Reveal
                key={tile.src}
                as="li"
                variant="scale"
                delay={stagger}
                className={tile.tall ? "sm:row-span-2" : ""}
              >
                <figure className="group relative block overflow-hidden rounded-[14px] bg-navy-700">
                  <div
                    className={`relative ${tile.tall ? "aspect-[3/4]" : "aspect-[3/2]"} overflow-hidden`}
                  >
                    <Image
                      src={tile.src}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover opacity-95 transition-all duration-[800ms] ease-out group-hover:scale-[1.06] group-hover:opacity-100"
                    />
                    {/* Subtle navy gradient at the bottom for caption legibility */}
                    <div
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-navy-900/80 to-transparent"
                    />
                  </div>
                  <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-5">
                    <span className="font-display text-2xl leading-tight md:text-3xl">
                      {locale === "ar" ? tile.caption_ar : tile.caption_en}
                    </span>
                    <span
                      aria-hidden
                      className="font-mono text-[10px] uppercase tracking-wider text-brass-300"
                    >
                      0{i + 1}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
