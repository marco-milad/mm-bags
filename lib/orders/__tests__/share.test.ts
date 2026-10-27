import { describe, expect, it } from "vitest";
import { customerWhatsappHref, isViewToken, orderLinkPath, orderShareText, whatsappShareHref } from "../share";

describe("orderShareText", () => {
  it("includes the order number and a locale track link (AR)", () => {
    const t = orderShareText({ orderNumber: "MM-2026-ABC123", siteUrl: "https://mm-bags.vercel.app/", isAr: true });
    expect(t).toContain("MM-2026-ABC123");
    expect(t).toContain("https://mm-bags.vercel.app/ar/track/MM-2026-ABC123");
  });

  it("uses the English copy and /en link", () => {
    const t = orderShareText({ orderNumber: "MM-2026-ABC123", siteUrl: "https://mm-bags.vercel.app", isAr: false });
    expect(t).toMatch(/^My M\.M Bags order MM-2026-ABC123/);
    expect(t).toContain("https://mm-bags.vercel.app/en/track/MM-2026-ABC123");
  });

  it("never leaks the /track phone credential", () => {
    const t = orderShareText({ orderNumber: "MM-1", siteUrl: "https://x.test", isAr: true });
    expect(t).not.toContain("?p=");
  });
});

describe("whatsappShareHref", () => {
  it("opens the share picker (no recipient) with encoded text", () => {
    expect(whatsappShareHref("a b\nc")).toBe("https://wa.me/?text=a%20b%0Ac");
  });
});

describe("orderShareText with a view token", () => {
  const token = "0123456789abcdef0123456789abcdef";

  it("sends the private order link instead of /track", () => {
    const t = orderShareText({ orderNumber: "MM-2026-ABC123", siteUrl: "https://mm-bags.vercel.app/", isAr: true, viewToken: token });
    expect(t).toContain(`https://mm-bags.vercel.app/ar/o/${token}`);
    expect(t).not.toContain("/track/");
  });

  it("uses the /en link in English", () => {
    const t = orderShareText({ orderNumber: "MM-1", siteUrl: "https://x.test", isAr: false, viewToken: token });
    expect(t).toContain(`https://x.test/en/o/${token}`);
  });
});

describe("isViewToken / orderLinkPath", () => {
  it("accepts only 32 lowercase hex chars", () => {
    expect(isViewToken("0123456789abcdef0123456789abcdef")).toBe(true);
    expect(isViewToken("0123456789ABCDEF0123456789abcdef")).toBe(false);
    expect(isViewToken("0123456789abcdef")).toBe(false);
    expect(isViewToken("MM-2026-ABC123")).toBe(false);
    expect(isViewToken("6f1c2d3e-4a5b-4c6d-8e7f-001122334455")).toBe(false);
  });

  it("builds the locale path", () => {
    expect(orderLinkPath("ar", "abc")).toBe("/ar/o/abc");
  });
});

describe("customerWhatsappHref", () => {
  it("turns local and international Egyptian mobiles into wa.me/20…", () => {
    expect(customerWhatsappHref("01012345678", "hi")).toBe("https://wa.me/201012345678?text=hi");
    expect(customerWhatsappHref("+20 101 234 5678", "hi")).toBe("https://wa.me/201012345678?text=hi");
    expect(customerWhatsappHref("00201012345678", "hi")).toBe("https://wa.me/201012345678?text=hi");
  });

  it("returns null for numbers it can't address", () => {
    expect(customerWhatsappHref("0223456789", "hi")).toBeNull();
    expect(customerWhatsappHref("", "hi")).toBeNull();
  });
});