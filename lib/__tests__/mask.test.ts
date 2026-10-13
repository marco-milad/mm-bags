import { describe, it, expect } from "vitest";
import { firstName, maskPhone } from "@/lib/mask";

describe("maskPhone", () => {
  it("keeps only the last 4 digits of an Egyptian mobile", () => {
    expect(maskPhone("01012345678")).toBe("•••••••5678");
  });

  it("strips non-digits before masking", () => {
    expect(maskPhone("+20 101 234 5678")).toBe("••••••••5678");
  });

  it("never reveals more than 4 digits", () => {
    const masked = maskPhone("01198765432");
    expect(masked.replace(/\D/g, "")).toBe("5432");
  });

  it("returns very short input unchanged", () => {
    expect(maskPhone("123")).toBe("123");
    expect(maskPhone("")).toBe("");
  });

  it("exactly 4 digits → no bullets", () => {
    expect(maskPhone("1234")).toBe("1234");
  });
});

describe("firstName", () => {
  it("returns the first word", () => {
    expect(firstName("Marco Milad Mankarious")).toBe("Marco");
    expect(firstName("  مينا   مكرم ")).toBe("مينا");
  });

  it("handles missing names", () => {
    expect(firstName(undefined)).toBe("");
    expect(firstName(null)).toBe("");
    expect(firstName("   ")).toBe("");
  });
});
