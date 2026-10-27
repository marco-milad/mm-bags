import { describe, expect, it } from "vitest";
import { buildCsp } from "@/lib/security/csp";

const SUPA = "https://abc.supabase.co";
const parse = (csp: string) =>
  Object.fromEntries(
    csp.split(";").map((d) => {
      const [k, ...v] = d.trim().split(/\s+/);
      return [k, v];
    }),
  );

describe("buildCsp", () => {
  const prod = parse(buildCsp({ supabaseOrigin: SUPA }));

  it("never allows everything", () => {
    for (const [k, v] of Object.entries(prod)) {
      expect(v, k).not.toContain("*");
      expect(v, k).not.toContain("https:");
      expect(v, k).not.toContain("http:");
    }
  });

  it("locks down the dangerous directives", () => {
    expect(prod["object-src"]).toEqual(["'none'"]);
    expect(prod["frame-ancestors"]).toEqual(["'none'"]);
    expect(prod["base-uri"]).toEqual(["'self'"]);
    expect(prod["form-action"]).toEqual(["'self'"]);
    expect(prod["default-src"]).toEqual(["'self'"]);
  });

  it("only lets the page send data to us, Supabase and Turnstile", () => {
    expect(prod["connect-src"].sort()).toEqual(
      ["'self'", SUPA, "wss://abc.supabase.co", "https://challenges.cloudflare.com"].sort(),
    );
  });

  it("allows scripts only from us and Turnstile, without eval in production", () => {
    expect(prod["script-src"]).toContain("https://challenges.cloudflare.com");
    expect(prod["script-src"]).not.toContain("'unsafe-eval'");
    expect(prod["frame-src"]).toEqual(["https://challenges.cloudflare.com"]);
  });

  it("serves product images and videos from Supabase", () => {
    expect(prod["img-src"]).toContain(SUPA);
    expect(prod["media-src"]).toContain(SUPA);
  });

  it("reports violations and upgrades http in production", () => {
    expect(prod["report-uri"]).toEqual(["/api/csp-report"]);
    expect(prod).toHaveProperty("upgrade-insecure-requests");
  });

  it("dev adds eval + websocket for fast refresh; preview adds the Vercel toolbar", () => {
    const dev = parse(buildCsp({ supabaseOrigin: SUPA, isDev: true }));
    expect(dev["script-src"]).toContain("'unsafe-eval'");
    expect(dev["connect-src"]).toContain("ws:");
    expect(dev).not.toHaveProperty("upgrade-insecure-requests");
    const preview = parse(buildCsp({ supabaseOrigin: SUPA, isPreview: true }));
    expect(preview["script-src"]).toContain("https://vercel.live");
    expect(prod["script-src"]).not.toContain("https://vercel.live");
  });
});
