import { describe, expect, it } from "vitest";
import { safeNextPath } from "../safe-next";

describe("safeNextPath", () => {
  it("accepts same-site paths", () => {
    expect(safeNextPath("/ar/account/wishlist")).toBe("/ar/account/wishlist");
    expect(safeNextPath("/en/checkout?step=2")).toBe("/en/checkout?step=2");
  });

  it("rejects protocol-relative and backslash tricks (open redirect)", () => {
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("//evil.com/ar/account")).toBeNull();
    expect(safeNextPath("/\\evil.com")).toBeNull();
  });

  it("rejects absolute URLs and empty input", () => {
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });

  it("rejects control characters browsers may strip", () => {
    expect(safeNextPath("/\t/evil.com")).toBeNull();
    expect(safeNextPath("/ar\n/account")).toBeNull();
  });
});
