import { describe, expect, it } from "vitest";
import { fitsCabin } from "@/lib/guides/cabin-fit";
import { AIRLINES, OUR_CABIN_BAGS } from "@/lib/guides/cabin-by-airline";

describe("fitsCabin", () => {
  it("compares longest-to-shortest whatever order the airline prints", () => {
    expect(fitsCabin([55, 40, 23], { dims: [23, 40, 55] })).toBe(true);
    expect(fitsCabin([23, 55, 40], { dims: [55, 40, 23] })).toBe(true);
  });

  it("fails when any one side is over", () => {
    expect(fitsCabin([55, 38, 22], { dims: [56, 36, 23] })).toBe(false); // width
    expect(fitsCabin([55, 38, 22], { dims: [50, 37, 25] })).toBe(false); // length
    expect(fitsCabin([55, 38, 22], { dims: [55, 40, 20] })).toBe(false); // depth
  });

  it("applies a total-size cap on top of the sides", () => {
    expect(fitsCabin([55, 40, 23], { dims: [56, 45, 25], maxLinear: 115 })).toBe(false); // 118
    expect(fitsCabin([55, 38, 22], { dims: [56, 45, 25], maxLinear: 115 })).toBe(true); // exactly 115
  });
});

describe("cabin guide data", () => {
  it("every airline has a sane limit and an https source", () => {
    for (const a of AIRLINES) {
      for (const d of a.limit.dims) expect(d).toBeGreaterThan(10);
      expect(a.kg).toBeGreaterThanOrEqual(5);
      expect(a.kg).toBeLessThanOrEqual(12);
      expect(a.url).toMatch(/^https:\/\//);
    }
  });

  it("our Milano 20 result matches a hand check", () => {
    const milano = OUR_CABIN_BAGS[0].dims;
    const fit = (en: string) => {
      const a = AIRLINES.find((x) => x.name.en === en)!;
      return fitsCabin(milano, a.fitLimit ?? a.limit);
    };
    expect(fit("EgyptAir")).toBe(true);
    expect(fit("Qatar Airways")).toBe(false);
    expect(fit("flynas")).toBe(false);
    expect(fit("Emirates")).toBe(false); // judged on the stricter 20 cm depth
  });
});
