import { describe, it, expect } from "vitest";
import { buildInsights, deltaPct, deltaPoints, type InsightInput } from "@/lib/analytics/insights";

const base: InsightInput = {
  visitors: 0,
  prevVisitors: null,
  purchased: 0,
  conversionRate: null,
  cartedVisitors: 0,
  abandonmentRate: null,
  zeroTerms: [],
  products: [],
};

describe("deltaPct / deltaPoints", () => {
  it("returns null without a usable baseline", () => {
    expect(deltaPct(10, null)).toBeNull();
    expect(deltaPct(10, 0)).toBeNull();
    expect(deltaPoints(null, 5)).toBeNull();
  });
  it("computes changes", () => {
    expect(deltaPct(12, 10)).toBe(20);
    expect(deltaPct(5, 10)).toBe(-50);
    expect(deltaPoints(3.5, 2)).toBe(1.5);
  });
});

describe("buildInsights", () => {
  it("says so plainly when there is nothing to act on", () => {
    const out = buildInsights(base);
    expect(out).toHaveLength(1);
    expect(out[0].tone).toBe("info");
  });

  it("flags the most-searched term that found nothing", () => {
    const out = buildInsights({
      ...base,
      zeroTerms: [
        { query_norm: "شنطه جلد", searches: 2 },
        { query_norm: "كاب", searches: 7 },
      ],
    });
    expect(out[0].tone).toBe("warn");
    expect(out[0].en).toContain('"كاب"');
    expect(out[0].en).toContain("7");
  });

  it("stays quiet below the volume thresholds (no crying wolf)", () => {
    const out = buildInsights({
      ...base,
      zeroTerms: [{ query_norm: "x", searches: 1 }],
      products: [{ name_ar: "أ", name_en: "A", opens: 4, carts: 0, orders: 0 }],
      cartedVisitors: 2,
      abandonmentRate: 100,
      visitors: 5,
      prevVisitors: 4,
    });
    expect(out).toHaveLength(1);
    expect(out[0].tone).toBe("info");
  });

  it("flags a product that is viewed but never carted", () => {
    const out = buildInsights({
      ...base,
      products: [
        { name_ar: "مشهور", name_en: "Popular", opens: 9, carts: 0, orders: 0 },
        { name_ar: "بيتباع", name_en: "Seller", opens: 20, carts: 3, orders: 2 },
      ],
    });
    expect(out[0].en).toContain('"Popular"');
  });

  it("flags high cart abandonment and traffic drops", () => {
    const out = buildInsights({
      ...base,
      cartedVisitors: 10,
      abandonmentRate: 80,
      visitors: 50,
      prevVisitors: 100,
    });
    expect(out.map((i) => i.en).join(" ")).toMatch(/80%.*didn't complete/);
    expect(out.some((i) => /down 50%/.test(i.en))).toBe(true);
  });

  it("reports purchases as good news and caps the list", () => {
    const out = buildInsights(
      {
        ...base,
        zeroTerms: [{ query_norm: "a", searches: 5 }],
        products: [{ name_ar: "ب", name_en: "B", opens: 9, carts: 0, orders: 0 }],
        cartedVisitors: 10,
        abandonmentRate: 90,
        visitors: 200,
        prevVisitors: 100,
        purchased: 4,
        conversionRate: 2,
      },
      3,
    );
    expect(out).toHaveLength(3);
    expect(out.every((i) => i.tone === "warn")).toBe(true); // highest-priority first
  });
});
