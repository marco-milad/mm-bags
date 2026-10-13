import { describe, expect, it } from "vitest";
import { claimableEmail, escapeIlike } from "../claim-rules";

describe("claimableEmail", () => {
  it("returns the normalized email for a confirmed account", () => {
    expect(
      claimableEmail({ email: "  Marco@Example.COM ", email_confirmed_at: "2026-10-01T00:00:00Z" }),
    ).toBe("marco@example.com");
  });

  it("refuses an unconfirmed email — the address is not proven", () => {
    expect(claimableEmail({ email: "marco@example.com", email_confirmed_at: null })).toBeNull();
    expect(claimableEmail({ email: "marco@example.com" })).toBeNull();
  });

  it("refuses accounts without a usable email", () => {
    expect(claimableEmail({ email: null, email_confirmed_at: "2026-10-01T00:00:00Z" })).toBeNull();
    expect(claimableEmail({ email: "   ", email_confirmed_at: "2026-10-01T00:00:00Z" })).toBeNull();
    expect(claimableEmail({ email: "not-an-email", email_confirmed_at: "2026-10-01T00:00:00Z" })).toBeNull();
  });

  it("refuses addresses containing * (a PostgREST LIKE wildcard)", () => {
    expect(claimableEmail({ email: "a*@x.com", email_confirmed_at: "2026-10-01T00:00:00Z" })).toBeNull();
  });
});

describe("escapeIlike", () => {
  it("escapes LIKE wildcards so the match is exact", () => {
    expect(escapeIlike("a_b@x.com")).toBe("a\\_b@x.com");
    expect(escapeIlike("50%off@x.com")).toBe("50\\%off@x.com");
    expect(escapeIlike("back\\slash@x.com")).toBe("back\\\\slash@x.com");
  });

  it("leaves ordinary addresses untouched", () => {
    expect(escapeIlike("marco.milad+shop@gmail.com")).toBe("marco.milad+shop@gmail.com");
  });
});
