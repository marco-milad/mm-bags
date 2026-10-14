/** `2026-10-14` → "14 أكتوبر 2026" / "14 October 2026" (fixed zone: no SSR drift). */
export function formatGuideDate(iso: string, locale: "ar" | "en"): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
