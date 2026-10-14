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

/**
 * Path → canonical + hreflang alternates for Next.js metadata.alternates.
 *
 * Each locale is canonical to ITSELF. The EN pages are real translations,
 * not duplicates: pointing their canonical at /ar told Google and Bing to
 * drop every English page and ignore hreflang (audit T1). x-default stays
 * on Arabic, the storefront default.
 */
export function localeAlternates(
  pathWithinLocale: string,
  locale: "ar" | "en",
): {
  canonical: string;
  languages: Record<string, string>;
} {
  const clean = pathWithinLocale.startsWith("/")
    ? pathWithinLocale
    : `/${pathWithinLocale}`;
  const at = (l: "ar" | "en") => absoluteUrl(`/${l}${clean === "/" ? "" : clean}`);
  return {
    canonical: at(locale),
    languages: { ar: at("ar"), en: at("en"), "x-default": at("ar") },
  };
}

/** Brand description (used by Organization JSON-LD + OG fallbacks). */
// Written as quotable facts (who, where, since when, how to pay, delivery,
// returns): answer engines lift these sentences verbatim, so every claim
// here must match checkout and the policy pages.
export const SITE_DESCRIPTION_AR =
  "M.M Bags متجر مصري لشنط السفر والضهر واللاب توب من سوهاج من 1998. شحن لكل 27 محافظة خلال 2–5 أيام، الدفع عند الاستلام أو InstaPay، إرجاع خلال 14 يوم وضمان سنة.";
export const SITE_DESCRIPTION_EN =
  "M.M Bags is an Egyptian travel-bag and backpack store from Sohag, founded in 1998. Delivery to all 27 governorates in 2–5 days, cash on delivery or InstaPay, 14-day returns and a one-year warranty.";

/** Brand social profiles (used by Organization sameAs). */
export const SOCIAL_LINKS = [
  "https://facebook.com/mmbags.eg",
  "https://instagram.com/mmbags.eg",
  "https://tiktok.com/@mmbags.eg",
] as const;
