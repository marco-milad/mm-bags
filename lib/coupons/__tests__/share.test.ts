import { describe, expect, it } from "vitest";
import { couponMessage, gmailComposeUrl } from "@/lib/coupons/share";

describe("couponMessage", () => {
  const base = { code: "MM-ABC234", percentOff: 10, expiresAt: "2026-12-26T10:00:00Z", siteUrl: "https://mm-bags.vercel.app/" };

  it("Arabic message has the code, the expiry and the shop link", () => {
    const m = couponMessage({ ...base, locale: "ar" });
    expect(m.subject).toContain("10");
    expect(m.body).toContain("MM-ABC234");
    expect(m.body).toContain("2026");
    expect(m.body).toContain("https://mm-bags.vercel.app/ar/catalog");
    expect(m.body).toContain("مرة واحدة");
  });

  it("English message works without an expiry", () => {
    const m = couponMessage({ ...base, locale: "en", expiresAt: null });
    expect(m.body).toContain("MM-ABC234");
    expect(m.body).toContain("It works once.");
    expect(m.body).toContain("https://mm-bags.vercel.app/en/catalog");
  });
});

describe("gmailComposeUrl", () => {
  it("encodes recipient, subject and body (incl. Arabic and newlines)", () => {
    const url = new URL(gmailComposeUrl("a+b@example.com", "كود خصم", "سطر 1\nMM-ABC234"));
    expect(url.origin + url.pathname).toBe("https://mail.google.com/mail/");
    expect(url.searchParams.get("view")).toBe("cm");
    expect(url.searchParams.get("to")).toBe("a+b@example.com");
    expect(url.searchParams.get("su")).toBe("كود خصم");
    expect(url.searchParams.get("body")).toBe("سطر 1\nMM-ABC234");
  });
});
