import { describe, expect, it } from "vitest";
import { LIMITS, isLoopbackIp, limitKey, normalizePhone, pickClientIp, tooManyText } from "../limits";

describe("pickClientIp", () => {
  it("prefers the edge-set x-real-ip over a spoofable x-forwarded-for", () => {
    expect(pickClientIp("41.33.1.2", "127.0.0.1, 41.33.1.2")).toBe("41.33.1.2");
  });

  it("falls back to the first x-forwarded-for hop, then 'unknown'", () => {
    expect(pickClientIp(null, " 41.33.1.2 , 10.0.0.1")).toBe("41.33.1.2");
    expect(pickClientIp(null, null)).toBe("unknown");
  });
});

describe("isLoopbackIp", () => {
  it("recognizes local requests only", () => {
    expect(isLoopbackIp("::1")).toBe(true);
    expect(isLoopbackIp("127.0.0.1")).toBe(true);
    expect(isLoopbackIp("::ffff:127.0.0.1")).toBe(true);
    expect(isLoopbackIp("41.33.1.2")).toBe(false);
    expect(isLoopbackIp("unknown")).toBe(false);
  });
});

describe("normalizePhone", () => {
  it("makes local and international forms of a number match", () => {
    expect(normalizePhone("01012345678")).toBe(normalizePhone("+201012345678"));
    expect(normalizePhone("0101 234 5678")).toBe("1012345678");
  });

  it("handles empty input", () => {
    expect(normalizePhone(null)).toBe("");
    expect(normalizePhone(undefined)).toBe("");
  });
});

describe("limitKey", () => {
  it("prefixes the limit name and normalizes the identity", () => {
    expect(limitKey("trackPerOrder", "  MM-2026-ABC123 ")).toBe("trackPerOrder:mm-2026-abc123");
  });

  it("caps very long identities so keys stay under the DB limit", () => {
    expect(limitKey("contactPerIp", "x".repeat(500)).length).toBeLessThanOrEqual(200);
  });

  it("never produces an empty identity", () => {
    expect(limitKey("orderPerIp", "   ")).toBe("orderPerIp:unknown");
  });
});

describe("LIMITS", () => {
  it("makes brute-forcing the 4-digit track check impractical (> 7 days)", () => {
    const { max, windowSeconds } = LIMITS.trackPerOrder;
    const secondsFor10k = (10_000 / max) * windowSeconds;
    expect(secondsFor10k).toBeGreaterThan(7 * 24 * 60 * 60);
  });

  it("stays within the database function's bounds", () => {
    for (const { max, windowSeconds } of Object.values(LIMITS)) {
      expect(max).toBeGreaterThanOrEqual(1);
      expect(windowSeconds).toBeGreaterThanOrEqual(1);
      expect(windowSeconds).toBeLessThanOrEqual(604800);
    }
  });
});

describe("tooManyText", () => {
  it("is localized", () => {
    expect(tooManyText(true)).toContain("استنى");
    expect(tooManyText(false)).toMatch(/try again/i);
  });
});
