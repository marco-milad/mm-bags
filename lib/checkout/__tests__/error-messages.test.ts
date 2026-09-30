import { describe, it, expect } from "vitest";
import {
  checkoutFieldMessage,
  checkoutErrorMessage,
  type CheckoutField,
} from "@/lib/checkout/error-messages";
import type { PlaceOrderErrorCode } from "@/lib/checkout/schema";

// Arabic script range — used to assert AR vs EN copy without pinning exact text.
const AR = /[؀-ۿ]/;

const FIELDS: CheckoutField[] = [
  "name",
  "phone",
  "email",
  "governorate",
  "city",
  "street",
  "building",
  "notes",
  "paymentMethod",
];

const CODES: PlaceOrderErrorCode[] = [
  "INVALID_CART",
  "PRODUCT_UNAVAILABLE",
  "VARIANT_NOT_FOUND",
  "INVALID_QUANTITY",
  "INSUFFICIENT_STOCK",
  "PRICE_CHANGED",
  "CHECKOUT_FAILED",
];

describe("checkout field validation messages (H3)", () => {
  it.each(FIELDS)("%s → localized AR and EN, distinct", (field) => {
    const ar = checkoutFieldMessage(field, "ar");
    const en = checkoutFieldMessage(field, "en");
    expect(ar).toBeTruthy();
    expect(en).toBeTruthy();
    expect(ar).not.toBe(en);
    expect(AR.test(ar)).toBe(true); // Arabic copy uses Arabic script
    expect(AR.test(en)).toBe(false); // English copy has no Arabic script
  });
});

describe("checkout server error codes (H3)", () => {
  it.each(CODES)("%s → localized AR and EN, distinct", (code) => {
    const ar = checkoutErrorMessage(code, "ar");
    const en = checkoutErrorMessage(code, "en");
    expect(ar).toBeTruthy();
    expect(en).toBeTruthy();
    expect(ar).not.toBe(en);
    expect(AR.test(ar)).toBe(true);
    expect(AR.test(en)).toBe(false);
  });

  it("INSUFFICIENT_STOCK / PRODUCT_UNAVAILABLE stay generic (no name or count leaked)", () => {
    for (const code of ["INSUFFICIENT_STOCK", "PRODUCT_UNAVAILABLE"] as const) {
      for (const locale of ["ar", "en"] as const) {
        const msg = checkoutErrorMessage(code, locale);
        expect(msg).not.toMatch(/\d/); // no available count
        expect(msg).not.toContain('"'); // no quoted product name
      }
    }
  });
});
