import { describe, expect, it, vi } from "vitest";
import { SITEVERIFY_URL, checkTurnstile } from "@/lib/security/turnstile-core";

const reply = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("checkTurnstile", () => {
  it("passes everything while no secret is configured", async () => {
    const f = reply(200, { success: false });
    expect(await checkTurnstile({ token: undefined, secret: undefined, fetchImpl: f })).toEqual({ ok: true, reason: "disabled" });
    expect(await checkTurnstile({ token: "x", secret: "  ", fetchImpl: f })).toMatchObject({ ok: true, reason: "disabled" });
    expect(f).not.toHaveBeenCalled();
  });

  it("blocks a missing, non-string or oversized token without calling Cloudflare", async () => {
    const f = reply(200, { success: true });
    for (const token of [undefined, "", "   ", 42, "x".repeat(2049)]) {
      expect(await checkTurnstile({ token, secret: "s", fetchImpl: f })).toMatchObject({ ok: false, reason: "missing" });
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("passes a token Cloudflare accepts, sending secret, token and ip", async () => {
    const f = reply(200, { success: true });
    expect(await checkTurnstile({ token: "tok", secret: "sec", ip: "1.2.3.4", fetchImpl: f })).toEqual({ ok: true, reason: "verified" });
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(SITEVERIFY_URL);
    const body = init.body as URLSearchParams;
    expect(body.get("secret")).toBe("sec");
    expect(body.get("response")).toBe("tok");
    expect(body.get("remoteip")).toBe("1.2.3.4");
  });

  it("does not send an unknown ip", async () => {
    const f = reply(200, { success: true });
    await checkTurnstile({ token: "tok", secret: "sec", ip: "unknown", fetchImpl: f });
    const [, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init.body as URLSearchParams).has("remoteip")).toBe(false);
  });

  it("blocks a token Cloudflare rejects", async () => {
    const d = await checkTurnstile({ token: "bad", secret: "s", fetchImpl: reply(200, { success: false, "error-codes": ["invalid-input-response"] }) });
    expect(d).toEqual({ ok: false, reason: "rejected", codes: ["invalid-input-response"] });
    expect(await checkTurnstile({ token: "reused", secret: "s", fetchImpl: reply(200, { success: false, "error-codes": ["timeout-or-duplicate"] }) })).toMatchObject({ ok: false });
  });

  it("fails open when Cloudflare is down or our secret is wrong", async () => {
    const down = vi.fn(async () => { throw new Error("ECONNRESET"); }) as unknown as typeof fetch;
    expect(await checkTurnstile({ token: "t", secret: "s", fetchImpl: down })).toEqual({ ok: true, reason: "unreachable" });
    expect(await checkTurnstile({ token: "t", secret: "s", fetchImpl: reply(503, {}) })).toEqual({ ok: true, reason: "unreachable" });
    expect(await checkTurnstile({ token: "t", secret: "s", fetchImpl: reply(200, { success: false, "error-codes": ["invalid-input-secret"] }) })).toEqual({ ok: true, reason: "unreachable" });
  });
});
