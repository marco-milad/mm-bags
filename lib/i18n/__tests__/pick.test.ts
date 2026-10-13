import { describe, it, expect } from "vitest";
import { pickLocalized } from "@/lib/i18n/pick";

describe("pickLocalized (bilingual DB field fallback, L3)", () => {
  it("returns the current language when present", () => {
    expect(pickLocalized("أسود", "Black", true)).toBe("أسود");
    expect(pickLocalized("أسود", "Black", false)).toBe("Black");
  });

  it("falls back to the other language when the current one is missing", () => {
    expect(pickLocalized(null, "Black", true)).toBe("Black");
    expect(pickLocalized(undefined, "Black", true)).toBe("Black");
    expect(pickLocalized("أسود", null, false)).toBe("أسود");
    expect(pickLocalized("أسود", undefined, false)).toBe("أسود");
  });

  it("treats empty and whitespace-only strings as missing", () => {
    expect(pickLocalized("", "Black", true)).toBe("Black");
    expect(pickLocalized("أسود", "   ", false)).toBe("أسود");
  });

  it("returns an empty string only when both languages are missing", () => {
    expect(pickLocalized(null, null, true)).toBe("");
    expect(pickLocalized(undefined, "", false)).toBe("");
    expect(pickLocalized(" ", null, false)).toBe("");
  });
});
