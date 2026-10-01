/**
 * "What to do today" — turns the dashboard numbers into a short, prioritized
 * list of plain-language actions for the store owner.
 *
 * Pure and dependency-free so it is unit-tested. Every rule has a minimum
 * volume threshold: an insight drawn from 2 visits is noise, and a dashboard
 * that cries wolf stops being read.
 */

export type InsightTone = "good" | "warn" | "info";
export type Insight = { tone: InsightTone; ar: string; en: string };

/** % change, or null when there is no meaningful baseline. */
export function deltaPct(cur: number, prev: number | null | undefined): number | null {
  if (prev == null || prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

/** Difference between two percentages, in percentage points. */
export function deltaPoints(
  cur: number | null | undefined,
  prev: number | null | undefined,
): number | null {
  if (cur == null || prev == null) return null;
  return Math.round((cur - prev) * 10) / 10;
}

export type InsightInput = {
  visitors: number;
  prevVisitors: number | null;
  purchased: number;
  conversionRate: number | null;
  cartedVisitors: number;
  abandonmentRate: number | null;
  zeroTerms: { query_norm: string; searches: number }[];
  products: { name_ar: string; name_en: string; opens: number; carts: number; orders: number }[];
};

/** Minimum volumes before a rule is allowed to speak. */
export const THRESHOLDS = {
  zeroTermSearches: 2,
  stuckProductOpens: 5,
  abandonmentVisitors: 3,
  abandonmentRate: 50,
  trafficBaseline: 10,
  trafficSwing: 20,
} as const;

export function buildInsights(input: InsightInput, max = 3): Insight[] {
  const ar = (v: number) => v.toLocaleString("ar-EG");
  const en = (v: number) => v.toLocaleString("en-US");
  const out: Insight[] = [];

  // 1. Demand we are failing to meet — the most directly fixable thing.
  const term = [...input.zeroTerms].sort((a, b) => b.searches - a.searches)[0];
  if (term && term.searches >= THRESHOLDS.zeroTermSearches) {
    out.push({
      tone: "warn",
      ar: `«${term.query_norm}» اتبحث عنها ${ar(term.searches)} مرة ومالقتش أي نتيجة — ضيف المنتج، أو ضيف مرادف من قسم «بحثوا ومالقوش».`,
      en: `"${term.query_norm}" was searched ${en(term.searches)} times with no results — stock it, or add a synonym under "Searched, found nothing".`,
    });
  }

  // 2. A product people look at but never add to cart — a merchandising issue.
  const stuck = input.products
    .filter((p) => p.opens >= THRESHOLDS.stuckProductOpens && p.carts === 0 && p.orders === 0)
    .sort((a, b) => b.opens - a.opens)[0];
  if (stuck) {
    out.push({
      tone: "warn",
      ar: `«${stuck.name_ar}» اتفتح ${ar(stuck.opens)} مرة ومحدش ضافه للسلة — راجع السعر والصور والوصف.`,
      en: `"${stuck.name_en}" was opened ${en(stuck.opens)} times but never added to cart — review its price, photos and description.`,
    });
  }

  // 3. Carts that don't become orders.
  if (
    input.cartedVisitors >= THRESHOLDS.abandonmentVisitors &&
    input.abandonmentRate != null &&
    input.abandonmentRate >= THRESHOLDS.abandonmentRate
  ) {
    out.push({
      tone: "warn",
      ar: `${ar(input.abandonmentRate)}% من اللي ضافوا للسلة مكمّلوش الشراء — جرّب تسهّل الدفع أو تواصل معاهم على واتساب.`,
      en: `${en(input.abandonmentRate)}% of shoppers who added to cart didn't complete the purchase — simplify checkout or follow up on WhatsApp.`,
    });
  }

  // 4. Traffic swing vs the previous period.
  const change = deltaPct(input.visitors, input.prevVisitors);
  if (
    change != null &&
    (input.prevVisitors ?? 0) >= THRESHOLDS.trafficBaseline &&
    Math.abs(change) >= THRESHOLDS.trafficSwing
  ) {
    out.push(
      change < 0
        ? {
            tone: "warn",
            ar: `الزوّار قلّوا ${ar(Math.abs(change))}% عن الفترة اللي فاتت.`,
            en: `Visitors are down ${en(Math.abs(change))}% vs the previous period.`,
          }
        : {
            tone: "good",
            ar: `الزوّار زادوا ${ar(change)}% عن الفترة اللي فاتت.`,
            en: `Visitors are up ${en(change)}% vs the previous period.`,
          },
    );
  }

  // 5. Good news, so the panel is never all alarms.
  if (input.purchased > 0 && input.conversionRate != null) {
    out.push({
      tone: "good",
      ar: `${ar(input.purchased)} عملية شراء في الفترة دي — معدل الشراء ${ar(input.conversionRate)}% من الزيارات.`,
      en: `${en(input.purchased)} purchases this period — a ${en(input.conversionRate)}% conversion rate.`,
    });
  }

  if (out.length === 0) {
    out.push({
      tone: "info",
      ar: "مفيش حاجة محتاجة تدخّل دلوقتي. الملاحظات هنا بتظهر لما يبقى فيه بيانات كفاية تستاهل.",
      en: "Nothing needs your attention right now. Suggestions appear here once there's enough data to act on.",
    });
  }
  return out.slice(0, max);
}
