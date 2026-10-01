import { describe, it, expect } from "vitest";
import { browserFrom, channelFrom, osFrom } from "@/lib/analytics/text";

const UA = {
  chromeWin:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  edgeWin:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Edg/126.0",
  safariIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chromeIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1",
  samsungAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36",
  firefoxMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:127.0) Gecko/20100101 Firefox/127.0",
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
};

describe("browserFrom", () => {
  it("tells Chrome-embedding browsers apart", () => {
    expect(browserFrom(UA.chromeWin)).toBe("Chrome");
    expect(browserFrom(UA.edgeWin)).toBe("Edge");
    expect(browserFrom(UA.samsungAndroid)).toBe("Samsung Internet");
    expect(browserFrom(UA.chromeIphone)).toBe("Chrome");
  });
  it("only calls it Safari when it isn't Chrome", () => {
    expect(browserFrom(UA.safariIphone)).toBe("Safari");
    expect(browserFrom(UA.safariMac)).toBe("Safari");
  });
  it("detects Firefox and falls back to Other", () => {
    expect(browserFrom(UA.firefoxMac)).toBe("Firefox");
    expect(browserFrom("")).toBe("Other");
  });
});

describe("osFrom", () => {
  it("maps the major families", () => {
    expect(osFrom(UA.chromeWin)).toBe("Windows");
    expect(osFrom(UA.safariIphone)).toBe("iOS");
    expect(osFrom(UA.samsungAndroid)).toBe("Android");
    expect(osFrom(UA.firefoxMac)).toBe("macOS");
    expect(osFrom("")).toBe("Other");
  });
});

describe("channelFrom", () => {
  it("no referrer and no UTM = direct", () => {
    expect(channelFrom({})).toBe("direct");
  });
  it("classifies referrers", () => {
    expect(channelFrom({ referrerDomain: "www.google.com" })).toBe("organic_search");
    expect(channelFrom({ referrerDomain: "www.google.com.eg" })).toBe("organic_search");
    expect(channelFrom({ referrerDomain: "l.facebook.com" })).toBe("social");
    expect(channelFrom({ referrerDomain: "www.instagram.com" })).toBe("social");
    expect(channelFrom({ referrerDomain: "t.co" })).toBe("social");
    expect(channelFrom({ referrerDomain: "blog.example.com" })).toBe("referral");
  });
  it("an explicit UTM medium beats the referrer", () => {
    expect(channelFrom({ referrerDomain: "www.facebook.com", utmMedium: "cpc" })).toBe("paid");
    expect(channelFrom({ utmMedium: "email" })).toBe("email");
    expect(channelFrom({ utmMedium: "social" })).toBe("social");
  });
  it("an unclassifiable UTM with no referrer is still not 'direct'", () => {
    expect(channelFrom({ utmSource: "whatsapp", utmMedium: "chat" })).toBe("referral");
  });
});
