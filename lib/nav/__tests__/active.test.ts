import { describe, it, expect } from "vitest";
import { activeBottomNavTab } from "@/lib/nav/active";

describe("activeBottomNavTab (mobile bottom nav, L2)", () => {
  it("home matches only the exact locale root", () => {
    expect(activeBottomNavTab("/ar", "ar")).toBe("home");
    expect(activeBottomNavTab("/en/", "en")).toBe("home");
    expect(activeBottomNavTab("/ar/about", "ar")).toBeNull();
    expect(activeBottomNavTab("/ar/cart", "ar")).toBeNull();
  });

  it("/account does NOT match /account/wishlist", () => {
    expect(activeBottomNavTab("/ar/account", "ar")).toBe("account");
    expect(activeBottomNavTab("/ar/account/wishlist", "ar")).toBe("wishlist");
    expect(activeBottomNavTab("/en/account/wishlist/", "en")).toBe("wishlist");
  });

  it("catalog covers its subpaths, product pages and the category index", () => {
    expect(activeBottomNavTab("/ar/catalog", "ar")).toBe("catalog");
    expect(activeBottomNavTab("/ar/catalog/travel-bags", "ar")).toBe("catalog");
    expect(activeBottomNavTab("/ar/catalog/milano-series/compare", "ar")).toBe("catalog");
    expect(activeBottomNavTab("/en/products/milano", "en")).toBe("catalog");
    expect(activeBottomNavTab("/en/categories", "en")).toBe("catalog");
  });

  it("is segment-aware (no accidental prefix matches)", () => {
    expect(activeBottomNavTab("/ar/catalogue", "ar")).toBeNull();
    expect(activeBottomNavTab("/ar/accounting", "ar")).toBeNull();
    expect(activeBottomNavTab("/ar/account/wishlists", "ar")).toBe("account");
  });

  it("respects the locale and ignores query/hash", () => {
    expect(activeBottomNavTab("/en/catalog", "ar")).toBeNull();
    expect(activeBottomNavTab("/ar/catalog?q=شنطة", "ar")).toBe("catalog");
    expect(activeBottomNavTab("/ar#top", "ar")).toBe("home");
  });

  it("no path → nothing active; unrelated pages → nothing active", () => {
    expect(activeBottomNavTab(null, "ar")).toBeNull();
    expect(activeBottomNavTab("", "ar")).toBeNull();
    expect(activeBottomNavTab("/ar/checkout", "ar")).toBeNull();
    expect(activeBottomNavTab("/ar/auth/login", "ar")).toBeNull();
  });
});
