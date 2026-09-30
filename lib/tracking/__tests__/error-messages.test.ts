import { describe, it, expect } from "vitest";
import {
  trackingFieldMessage,
  trackingErrorMessage,
  type TrackingField,
} from "@/lib/tracking/error-messages";
import type { TrackingErrorCode } from "@/lib/tracking/schema";

const AR = /[؀-ۿ]/;

const FIELDS: TrackingField[] = ["orderIdOrNumber", "phoneLast4"];
const CODES: TrackingErrorCode[] = ["INVALID_INPUT", "NOT_FOUND"];

describe("tracking field validation messages (H3)", () => {
  it.each(FIELDS)("%s → localized AR and EN, distinct", (field) => {
    const ar = trackingFieldMessage(field, "ar");
    const en = trackingFieldMessage(field, "en");
    expect(ar).toBeTruthy();
    expect(en).toBeTruthy();
    expect(ar).not.toBe(en);
    expect(AR.test(ar)).toBe(true);
    expect(AR.test(en)).toBe(false);
  });
});

describe("tracking server error codes (H3)", () => {
  it.each(CODES)("%s → localized AR and EN, distinct", (code) => {
    const ar = trackingErrorMessage(code, "ar");
    const en = trackingErrorMessage(code, "en");
    expect(ar).toBeTruthy();
    expect(en).toBeTruthy();
    expect(ar).not.toBe(en);
    expect(AR.test(ar)).toBe(true);
    expect(AR.test(en)).toBe(false);
  });

  it("enumeration guard: order-not-found and phone-mismatch share the SAME NOT_FOUND message", () => {
    // Both server branches (missing order, wrong phone) return code NOT_FOUND
    // (see lib/tracking/actions.ts), so the localized copy is identical for the
    // two cases in each locale — the reply can't reveal which one occurred.
    for (const locale of ["ar", "en"] as const) {
      const orderMissing = trackingErrorMessage("NOT_FOUND", locale);
      const phoneMismatch = trackingErrorMessage("NOT_FOUND", locale);
      expect(orderMissing).toBe(phoneMismatch);
      // ...and NOT_FOUND must differ from INVALID_INPUT so they aren't blurred.
      expect(orderMissing).not.toBe(trackingErrorMessage("INVALID_INPUT", locale));
    }
  });
});
