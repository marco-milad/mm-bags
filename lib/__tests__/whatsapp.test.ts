import { afterEach, describe, it, expect, vi } from "vitest";
import { waLink, waNumber } from "@/lib/whatsapp";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("whatsapp helpers (M3)", () => {
  it("reduces the configured number to digits", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+20 100 123-4567");
    expect(waNumber()).toBe("201001234567");
  });

  it("falls back to the store number when unset or blank", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "  ");
    expect(waNumber()).toMatch(/^\d{10,15}$/);
  });

  it("builds a wa.me link with an encoded prefilled message", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+201001234567");
    const text = "أهلاً، عايز أتابع تحديثات طلب رقم MM-2026-ABC123 على واتساب";
    const href = waLink(text);
    expect(href.startsWith("https://wa.me/201001234567?text=")).toBe(true);
    expect(new URL(href).searchParams.get("text")).toBe(text);
  });

  it("omits ?text when no message is given", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+201001234567");
    expect(waLink()).toBe("https://wa.me/201001234567");
  });
});
