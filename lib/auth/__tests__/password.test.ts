import { describe, expect, it } from "vitest";
import { newPasswordError, passwordUpdateErrorText } from "../password";

describe("newPasswordError", () => {
  it("accepts 8+ matching characters", () => {
    expect(newPasswordError("abcd1234", "abcd1234", true)).toBeNull();
  });

  it("rejects short passwords before checking the match", () => {
    expect(newPasswordError("abc", "abc", true)).toContain("8");
    expect(newPasswordError("abc", "xyz", false)).toContain("8");
  });

  it("rejects mismatched passwords", () => {
    expect(newPasswordError("abcd1234", "abcd12345", false)).toBe("Passwords don't match.");
  });
});

describe("passwordUpdateErrorText", () => {
  it("explains the same-password case", () => {
    expect(passwordUpdateErrorText("same_password", true)).toContain("القديمة");
  });

  it("tells the shopper an expired link needs a new request", () => {
    expect(passwordUpdateErrorText("session_not_found", false)).toMatch(/expired/i);
  });

  it("falls back to a generic message", () => {
    expect(passwordUpdateErrorText(undefined, false)).toMatch(/try again/i);
  });
});
