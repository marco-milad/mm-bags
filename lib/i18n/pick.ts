/**
 * Pick the current-language copy of a bilingual DB field (`*_ar` / `*_en`),
 * falling back to the other language when it's missing, and to "" only when
 * both are. Showing the other language beats rendering a blank label or an
 * empty description. Blank / whitespace-only strings count as missing — an
 * admin form can save "" for a field the owner left empty.
 *
 * Pure (no "server-only"), so client components and tests can import it.
 */
export function pickLocalized(
  ar: string | null | undefined,
  en: string | null | undefined,
  isAr: boolean,
): string {
  const [preferred, other] = isAr ? [ar, en] : [en, ar];
  if (preferred && preferred.trim()) return preferred;
  if (other && other.trim()) return other;
  return "";
}
