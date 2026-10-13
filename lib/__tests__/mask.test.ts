import { describe, it, expect } from "vitest";
import { firstName, maskPhone, shippingContactForViewer } from "@/lib/mask";

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

  it("visible = 0 hides every digit", () => {
    expect(maskPhone("01012345678", 0)).toBe("•••••••••••");
    expect(maskPhone("123", 0)).toBe("•••");
    expect(maskPhone("", 0)).toBe("");
  });

  it("honours a custom visible count", () => {
    expect(maskPhone("01012345678", 2)).toBe("•••••••••78");
  });
});

describe("shippingContactForViewer", () => {
  const address = { name: "Marco Milad Mankarious", phone: "01012345678" };

  it("owner sees full name and phone", () => {
    expect(shippingContactForViewer(address, true)).toEqual({
      name: "Marco Milad Mankarious",
      phone: "01012345678",
    });
  });

  it("non-owner never sees the /track verification digits", () => {
    const shown = shippingContactForViewer(address, false);
    expect(shown.name).toBe("Marco");
    expect(shown.phone).not.toContain("5678");
    expect(shown.phone.replace(/\D/g, "")).toBe("");
  });

  it("non-owner with a formatted phone still leaks no digits", () => {
    const shown = shippingContactForViewer(
      { name: "مينا", phone: "+20 101 234 5678" },
      false,
    );
    expect(shown.phone).not.toMatch(/\d/);
  });

  it("missing fields render as empty strings", () => {
    expect(shippingContactForViewer({}, false)).toEqual({ name: "", phone: "" });
    expect(shippingContactForViewer({}, true)).toEqual({ name: "", phone: "" });
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
