import { describe, expect, it } from "vitest";
import {
  cairoDateISO,
  codFeeFor,
  collectionFeeFor,
  deliveryDeadline,
  feeRange,
  zonesFor,
} from "../shared";

describe("collectionFeeFor (courier rule)", () => {
  it("is 30 up to 1,000", () => {
    expect(collectionFeeFor(200)).toBe(30);
    expect(collectionFeeFor(1000)).toBe(30);
  });

  it("adds 5 for every started 1,000 above that (owner: 1,500 → 35)", () => {
    expect(collectionFeeFor(1001)).toBe(35);
    expect(collectionFeeFor(1500)).toBe(35);
    expect(collectionFeeFor(2000)).toBe(35);
    expect(collectionFeeFor(2001)).toBe(40);
    expect(collectionFeeFor(4100)).toBe(50);
  });

  it("is 0 when there's nothing to collect", () => {
    expect(collectionFeeFor(0)).toBe(0);
  });
});

describe("codFeeFor", () => {
  it("counts the fee itself in the collected amount", () => {
    // 990 + 30 = 1,020 is over 1,000 → the courier takes 35.
    expect(codFeeFor(990)).toBe(35);
    expect(codFeeFor(960)).toBe(30);
    expect(codFeeFor(1305)).toBe(35);
  });
});

describe("zones", () => {
  const zones = [
    { id: "b", code: "cairo-east", governorate_code: "cairo", name_ar: "الشروق", name_en: "Shorouk", fee: 165, sort_order: 1 },
    { id: "a", code: "cairo", governorate_code: "cairo", name_ar: "القاهرة", name_en: "Cairo", fee: 155, sort_order: 0 },
    { id: "c", code: "sohag", governorate_code: "sohag", name_ar: "سوهاج", name_en: "Sohag", fee: 135, sort_order: 0 },
  ];

  it("lists a governorate's areas in display order", () => {
    expect(zonesFor(zones, "cairo").map((z) => z.id)).toEqual(["a", "b"]);
    expect(zonesFor(zones, undefined)).toEqual([]);
  });

  it("knows the cheapest and dearest price", () => {
    expect(feeRange(zones)).toEqual({ min: 135, max: 165 });
    expect(feeRange([])).toBeNull();
  });
});

describe("delivery date", () => {
  it("is 36 hours after the courier pickup, as a Cairo date", () => {
    // Wed 11 Nov 2026 20:00 Cairo (18:00Z) + 36 h = Fri 13 Nov 08:00 Cairo.
    const by = deliveryDeadline("2026-11-11T18:00:00Z");
    expect(by.toISOString()).toBe("2026-11-13T06:00:00.000Z");
    expect(cairoDateISO(by)).toBe("2026-11-13");
  });
});
