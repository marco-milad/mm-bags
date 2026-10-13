import { describe, expect, it } from "vitest";
import { orderShareText, whatsappShareHref } from "../share";

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
