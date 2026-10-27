import { describe, expect, it } from "vitest";
import { consentRate, pageLabel, pct } from "@/lib/analytics/paths";

describe("pageLabel", () => {
  it("names the common pages in both languages", () => {
    expect(pageLabel("/", true)).toBe("الرئيسية");
    expect(pageLabel("/", false)).toBe("Home");
    expect(pageLabel("/checkout", true)).toBe("الدفع");
    expect(pageLabel("/catalog", false)).toBe("Catalog");
    expect(pageLabel("/account/wishlist", true)).toBe("المفضلة");
    expect(pageLabel("/order-confirmation/123", false)).toBe("Order confirmed");
  });

  it("keeps the slug for products, collections and guides", () => {
    expect(pageLabel("/products/ck-luggage", true)).toBe("منتج: ck-luggage");
    expect(pageLabel("/catalog/travel-bags", false)).toBe("Collection: travel-bags");
    expect(pageLabel("/guides/luggage-size-guide", false)).toBe("Guide: luggage-size-guide");
    expect(pageLabel("/products/%D8%B4%D9%86%D8%B7%D8%A9", true)).toBe("منتج: شنطة");
  });

  it("falls back to the raw path and survives bad encoding", () => {
    expect(pageLabel("/something-new", true)).toBe("/something-new");
    expect(pageLabel("/products/%E0%A4%A", false)).toBe("Product: %E0%A4%A");
    expect(pageLabel("/faq/", false)).toBe("FAQ");
  });
});

describe("pct / consentRate", () => {
  it("is null with nothing to divide by", () => {
    expect(pct(3, 0)).toBeNull();
    expect(consentRate(0, 0)).toBeNull();
  });
  it("rounds to one decimal", () => {
    expect(pct(1, 3)).toBe(33.3);
    expect(consentRate(30, 70)).toBe(30);
  });
});
