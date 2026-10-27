import { describe, expect, it } from "vitest";
import {
  COUPON_VALID_DAYS,
  couponDiscount,
  couponExpiry,
  generateCouponCode,
  normalizeCouponCode,
} from "@/lib/coupons/code";
import { calcTotals } from "@/lib/checkout/schema";

describe("generateCouponCode", () => {
  it("makes MM- + 6 unambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      const c = generateCouponCode();
      expect(c).toMatch(/^MM-[A-HJ-NP-Z2-9]{6}$/);
      expect(normalizeCouponCode(c)).toBe(c);
    }
  });

  it("maps bytes onto the alphabet without bias (every byte value is usable)", () => {
    expect(generateCouponCode(() => new Uint8Array([0, 31, 32, 63, 255, 128]))).toBe("MM-A9A99A");
  });
});

describe("normalizeCouponCode", () => {
  it("forgives case, spaces and dashes", () => {
    for (const raw of ["mm-abc234", "MMABC234", " mm abc 234 ", "mm–abc234", "MM_ABC234"]) {
      expect(normalizeCouponCode(raw)).toBe("MM-ABC234");
    }
  });

  it("rejects what can't be a code", () => {
    for (const raw of ["", "WELCOME10", "MM-ABC23", "MM-ABC2345", "MM-ABC0O1", "XX-ABC234", "x".repeat(21), null, 42, undefined]) {
      expect(normalizeCouponCode(raw)).toBeNull();
    }
  });
});

describe("couponDiscount", () => {
  it("is 10% rounded to the pound", () => {
    expect(couponDiscount(899, 10)).toBe(90);
    expect(couponDiscount(1650, 10)).toBe(165);
    expect(couponDiscount(1234, 10)).toBe(123);
  });
  it("is never negative or more than the subtotal", () => {
    expect(couponDiscount(0, 10)).toBe(0);
    expect(couponDiscount(-5, 10)).toBe(0);
    expect(couponDiscount(500, 0)).toBe(0);
    expect(couponDiscount(500, 250)).toBe(500);
  });
});

describe("couponExpiry", () => {
  it("is COUPON_VALID_DAYS later", () => {
    const from = new Date("2026-10-27T10:00:00Z");
    expect(couponExpiry(from).getTime() - from.getTime()).toBe(COUPON_VALID_DAYS * 86_400_000);
  });
});

describe("calcTotals with a coupon", () => {
  const items = [{ qty: 1, unitPrice: 1400 }, { qty: 2, unitPrice: 50 }]; // 1500

  it("takes 10% off the products only, keeps shipping/COD fees", () => {
    const t = calcTotals([{ qty: 1, unitPrice: 899 }], "cod", 10);
    expect(t).toEqual({ subtotal: 899, discount: 90, shippingFee: 50, codFee: 25, total: 899 - 90 + 50 + 25 });
  });

  it("keeps free shipping when the coupon takes the total under the threshold", () => {
    const t = calcTotals(items, "instapay", 10);
    expect(t.subtotal).toBe(1500);
    expect(t.discount).toBe(150);
    expect(t.shippingFee).toBe(0);
    expect(t.total).toBe(1350);
  });

  it("is unchanged without a coupon", () => {
    expect(calcTotals(items, "cod")).toEqual({ subtotal: 1500, discount: 0, shippingFee: 0, codFee: 25, total: 1525 });
  });
});
