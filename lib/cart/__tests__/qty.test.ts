import { describe, expect, it } from "vitest";
import {
  MAX_QTY,
  clampLineQty,
  qtyAfterAdd,
  qtyAfterStockSync,
  qtyCap,
} from "../qty";

describe("qtyCap", () => {
  it("unknown stock falls back to MAX_QTY", () => {
    expect(qtyCap(undefined)).toBe(MAX_QTY);
    expect(qtyCap(Number.NaN)).toBe(MAX_QTY);
  });

  it("stock 0 (or negative) caps at 0", () => {
    expect(qtyCap(0)).toBe(0);
    expect(qtyCap(-3)).toBe(0);
  });

  it("caps at stock, never above MAX_QTY", () => {
    expect(qtyCap(4)).toBe(4);
    expect(qtyCap(500)).toBe(MAX_QTY);
  });
});

describe("qtyAfterAdd — new line", () => {
  it("undefined stock: 1 by default, requested qty up to MAX_QTY", () => {
    expect(qtyAfterAdd(undefined, undefined, undefined)).toBe(1);
    expect(qtyAfterAdd(undefined, 3, undefined)).toBe(3);
    expect(qtyAfterAdd(undefined, 250, undefined)).toBe(MAX_QTY);
  });

  it("stock 0 → 0 (line must not be added)", () => {
    expect(qtyAfterAdd(undefined, 1, 0)).toBe(0);
  });

  it("stock < requested qty → clamped to stock", () => {
    expect(qtyAfterAdd(undefined, 5, 2)).toBe(2);
  });

  it("garbage qty is treated as 1", () => {
    expect(qtyAfterAdd(undefined, Number.NaN, 10)).toBe(1);
    expect(qtyAfterAdd(undefined, 0, 10)).toBe(1);
  });
});

describe("qtyAfterAdd — merging into an existing line", () => {
  it("adds when there is room", () => {
    expect(qtyAfterAdd(2, 1, 5)).toBe(3);
  });

  it("never exceeds stock when merging", () => {
    expect(qtyAfterAdd(2, 3, 3)).toBe(3);
    expect(qtyAfterAdd(3, 1, 3)).toBe(3);
  });

  it("undefined stock merges up to MAX_QTY", () => {
    expect(qtyAfterAdd(98, 5, undefined)).toBe(MAX_QTY);
  });

  it("existing line over a fresh lower stock is not raised (and not cut here)", () => {
    expect(qtyAfterAdd(4, 1, 2)).toBe(4);
    expect(qtyAfterAdd(3, 1, 0)).toBe(3);
  });
});

describe("clampLineQty (updateQty)", () => {
  it("allows any qty within the cap", () => {
    expect(clampLineQty(1, 2, 5)).toBe(2);
    expect(clampLineQty(3, 1, undefined)).toBe(1);
  });

  it("stops increases at stock", () => {
    expect(clampLineQty(3, 4, 3)).toBe(3);
    expect(clampLineQty(2, 99, 3)).toBe(3);
  });

  it("stops increases at MAX_QTY when stock is unknown", () => {
    expect(clampLineQty(MAX_QTY, MAX_QTY + 1, undefined)).toBe(MAX_QTY);
  });

  it("lets an over-cap / sold-out line move down but not up", () => {
    expect(clampLineQty(3, 2, 0)).toBe(2);
    expect(clampLineQty(3, 4, 0)).toBe(3);
    expect(clampLineQty(5, 4, 2)).toBe(4);
  });

  it("never returns less than 1", () => {
    expect(clampLineQty(1, 0, 5)).toBe(1);
  });
});

describe("qtyAfterStockSync", () => {
  it("clamps qty down to fresh stock", () => {
    expect(qtyAfterStockSync(5, 2)).toBe(2);
  });

  it("leaves qty within stock untouched", () => {
    expect(qtyAfterStockSync(2, 10)).toBe(2);
  });

  it("stock 0 keeps qty so the line stays visible (flagged), not deleted", () => {
    expect(qtyAfterStockSync(3, 0)).toBe(3);
  });

  it("caps at MAX_QTY even with huge stock", () => {
    expect(qtyAfterStockSync(150, 1000)).toBe(MAX_QTY);
  });
});
