/**
 * Search-term normalization and PII scrubbing.
 *
 * Both run on every search before anything is stored. Scrub first, then
 * normalize, so query_norm derives from the already-scrubbed value and a phone
 * number can never reach either column.
 *
 * No Node built-ins here: this is imported from Server Actions, route handlers
 * and (eventually) the search path, and must stay portable.
 */

/** Harakat (U+064B–U+0652), superscript alef (U+0670), tatweel (U+0640). */
const DIACRITICS = /[ً-ْٰـ]/g;

/**
 * Lucene's ArabicNormalizer plus digit folding.
 *
 * Order matters: NFKC first so compatibility forms collapse, diacritics before
 * letter folding, digits before lowercasing.
 *
 * This must be applied to BOTH sides — the query and the product text. Folding
 * only the query means كاب matches nothing at all, because the stored text still
 * carries the forms the fold removes.
 */
export function normalizeSearchTerm(input: string): string {
  return input
    .normalize("NFKC")
    .replace(DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا") // أ إ آ ٱ  → ا
    .replace(/ة/g, "ه") // ة → ه
    .replace(/[يئ]/g, "ي") // ي ئ → ي
    .replace(/ؤ/g, "و") // ؤ → و
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // ٠-٩
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)) // ۰-۹
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Two findings the origin project paid for in a real leak. Both are reproduced
 * here deliberately, and check 9 in the acceptance list is the pair that leaked:
 *
 *  1. Arabic-Indic digits must be matched by the scrubber itself. JS `\d` is
 *     ASCII-only, so ٠١٠١٢٣٤٥٦٧٨ survived the scrub and normalization then
 *     folded it into a plain 01012345678 sitting in query_norm.
 *
 *  2. The phone pattern must be bounded on both sides. A bare {8} fires inside
 *     longer digit runs: SKU010123456789 became SKU[phone]9.
 */
const D = "[0-9\\u0660-\\u0669\\u06F0-\\u06F9]"; // any digit: ASCII, ٠-٩, ۰-۹
const ZERO = "[0\\u0660\\u06F0]";
const ONE = "[1\\u0661\\u06F1]";
const TWO = "[2\\u0662\\u06F2]";
const NETWORK = "[0125\\u0660\\u0661\\u0662\\u0665\\u06F0\\u06F1\\u06F2\\u06F5]"; // 010/011/012/015

const EG_MOBILE = new RegExp(
  `(?<!${D})(?:\\+?${TWO})?${ZERO}?${ONE}${NETWORK}${D}{8}(?!${D})`,
  "g",
);

/** `\w` is ASCII-only, so أحمد@example.com passed straight through. */
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;

export function scrubPII(query: string): string {
  return query
    .replace(EMAIL, "[email]")
    .replace(EG_MOBILE, "[phone]")
    .slice(0, 200);
}

/**
 * The device buckets the dashboard groups by.
 *
 * Tablet is tested before mobile: an iPad's UA contains neither "Mobile" nor
 * "Android" in the desktop-mode case but does contain "iPad", and Android
 * tablets carry "Android" without "Mobile". Checking mobile first misfiles
 * every tablet.
 */
export function deviceTypeFrom(userAgent: string): "mobile" | "tablet" | "desktop" {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(ua)) return "mobile";
  return "desktop";
}

/**
 * The product side of the same fold.
 *
 * Deliberately in this file rather than its own: it must use the normalizer
 * directly above it, and folding only one side matches nothing at all — a
 * shopper typing كاب would be compared against stored text that still carries
 * كآب. Same file, one implementation, no way for the two to drift.
 */
export function buildSearchBlob(product: {
  name_ar?: string | null;
  name_en?: string | null;
  slug?: string | null;
  tags?: string[] | null;
  search_keywords?: string[] | null;
}): string {
  return normalizeSearchTerm(
    [
      product.name_ar,
      product.name_en,
      product.slug,
      ...(product.tags ?? []),
      ...(product.search_keywords ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}
