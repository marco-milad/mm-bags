/**
 * Single source of truth for site-wide SEO constants.
 *
 * SITE_URL is read from NEXT_PUBLIC_APP_URL when present and falls
 * back to the production Vercel alias. We re-export the parsed URL
 * + helper string so callers don't have to keep re-parsing.
 */

export const SITE_NAME = "M.M Bags";
export const SITE_FOUNDER = "Marco Milad";
export const SITE_LOCALE_DEFAULT = "ar" as const;

export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://mm-bags.vercel.app"
).replace(/\/+$/, "");

/** Absolute URL builder. Accepts an optional leading slash. */
export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Path → both-locale alternates map for Next.js metadata.alternates.languages. */
export function localeAlternates(pathWithinLocale: string): {
  canonical: string;
  languages: Record<string, string>;
} {
  const clean = pathWithinLocale.startsWith("/")
    ? pathWithinLocale
    : `/${pathWithinLocale}`;
  // Canonical points at the AR version (storefront default) per the
  // SEO spec. Each locale gets its own hreflang alternate.
  return {
    canonical: absoluteUrl(`/ar${clean === "/" ? "" : clean}`),
    languages: {
      ar: absoluteUrl(`/ar${clean === "/" ? "" : clean}`),
      en: absoluteUrl(`/en${clean === "/" ? "" : clean}`),
      "x-default": absoluteUrl(`/ar${clean === "/" ? "" : clean}`),
    },
  };
}

/** Brand description (used by Organization JSON-LD + OG fallbacks). */
export const SITE_DESCRIPTION_AR =
  "تسوق أفضل شنط السفر والظهر والمدارس في مصر. جودة عالية بسعر معقول. شحن لكل 27 محافظة. الدفع عند الاستلام متاح.";
export const SITE_DESCRIPTION_EN =
  "Premium travel, school, and everyday bags shipped across all 27 Egyptian governorates. Cash on delivery available.";

/** Brand social profiles (used by Organization sameAs). */
export const SOCIAL_LINKS = [
  "https://facebook.com/mmbags.eg",
  "https://instagram.com/mmbags.eg",
  "https://tiktok.com/@mmbags.eg",
] as const;
