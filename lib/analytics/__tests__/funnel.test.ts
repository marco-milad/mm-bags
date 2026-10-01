import { describe, it, expect } from "vitest";
import { computeFunnel, EMPTY_FUNNEL_RAW, pct } from "@/lib/analytics/funnel";

describe("pct", () => {
  it("returns null — not 0 — when there is no denominator", () => {
    expect(pct(0, 0)).toBeNull();
    expect(pct(5, 0)).toBeNull();
  });
  it("returns a measured zero as 0", () => {
    expect(pct(0, 10)).toBe(0);
  });
  it("rounds to one decimal", () => {
    expect(pct(1, 3)).toBe(33.3);
    expect(pct(2, 3)).toBe(66.7);
  });
});

describe("computeFunnel", () => {
  it("derives every stage rate from the raw counts", () => {
    const f = computeFunnel({
      sessions: 200,
      viewed: 100,
      carted: 20,
      purchased: 5,
      cartedVisitors: 16,
      abandonedVisitors: 12,
      revenue: "12500.50",
      byChannel: [
        { channel: "organic_search", sessions: 100, purchased: 4, revenue: "10000" },
        { channel: "direct", sessions: 100, purchased: 1, revenue: 2500.5 },
      ],
    });
    expect(f.viewRate).toBe(50);
    expect(f.cartRate).toBe(20);
    expect(f.conversionRate).toBe(2.5);
    expect(f.abandonmentRate).toBe(75);
    expect(f.revenue).toBe(12500.5); // numeric string normalized
    expect(f.byChannel[0]).toMatchObject({ channel: "organic_search", conversionRate: 4, revenue: 10000 });
    expect(f.byChannel[1].conversionRate).toBe(1);
  });

  it("an empty period yields nulls, not fake zero percentages", () => {
    const f = computeFunnel(EMPTY_FUNNEL_RAW);
    expect(f.viewRate).toBeNull();
    expect(f.cartRate).toBeNull();
    expect(f.conversionRate).toBeNull();
    expect(f.abandonmentRate).toBeNull();
    expect(f.revenue).toBe(0);
    expect(f.byChannel).toEqual([]);
  });

  it("carts with no purchase is 100% abandonment, not null", () => {
    const f = computeFunnel({ ...EMPTY_FUNNEL_RAW, cartedVisitors: 3, abandonedVisitors: 3 });
    expect(f.abandonmentRate).toBe(100);
  });
});
