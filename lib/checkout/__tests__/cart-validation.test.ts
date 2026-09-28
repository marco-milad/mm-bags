import { describe, it, expect } from "vitest";
import {
  validateCartLines,
  type AuthoritativeVariant,
  type ClientCartLine,
} from "@/lib/checkout/schema";

// ── Factories ────────────────────────────────────────────────────────────
type ProductRow = NonNullable<AuthoritativeVariant["product"]>;

function product(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: "prod-1",
    is_active: true,
    name_ar: "شنطة سفر",
    name_en: "Travel Bag",
    base_price: 600,
    sale_price: null,
    ...overrides,
  };
}

function variant(
  overrides: Partial<AuthoritativeVariant> & { id: string },
): AuthoritativeVariant {
  return {
    id: overrides.id,
    product_id: overrides.product_id ?? "prod-1",
    stock_qty: overrides.stock_qty ?? 10,
    price_override: overrides.price_override ?? null,
    product: overrides.product === undefined ? product() : overrides.product,
  };
}

function line(
  overrides: Partial<ClientCartLine> & { variantId: string },
): ClientCartLine {
  return {
    variantId: overrides.variantId,
    productId: overrides.productId ?? "prod-1",
    qty: overrides.qty ?? 1,
    unitPrice: overrides.unitPrice ?? 600,
  };
}

// ── Authoritative price resolution ─────────────────────────────────────────
describe("authoritative price resolution", () => {
  it("uses variant.price_override when present (most specific)", () => {
    const res = validateCartLines(
      [line({ variantId: "v1", unitPrice: 400 })],
      [variant({ id: "v1", price_override: 400, product: product({ sale_price: 500 }) })],
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.lines[0].unitPrice).toBe(400);
  });

  it("falls back to product.sale_price when no override", () => {
    const res = validateCartLines(
      [line({ variantId: "v1", unitPrice: 500 })],
      [variant({ id: "v1", product: product({ sale_price: 500 }) })],
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.lines[0].unitPrice).toBe(500);
  });

  it("falls back to product.base_price when no override and no sale", () => {
    const res = validateCartLines(
      [line({ variantId: "v1", unitPrice: 600 })],
      [variant({ id: "v1", product: product({ base_price: 600, sale_price: null }) })],
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.lines[0].unitPrice).toBe(600);
  });
});

// ── Price integrity (scenarios 1–4) ─────────────────────────────────────────
describe("price integrity", () => {
  it("1. correct client price → order uses DB price, succeeds", () => {
    const res = validateCartLines(
      [line({ variantId: "v1", qty: 2, unitPrice: 600 })],
      [variant({ id: "v1", product: product({ base_price: 600 }) })],
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.lines[0].unitPrice).toBe(600);
      expect(res.lines[0].lineTotal).toBe(1200);
      expect(res.subtotal).toBe(1200);
    }
  });

  it("2. manipulated LOWER client price → not accepted; PRICE_CHANGED with DB price", () => {
    const res = validateCartLines(
      [line({ variantId: "v1", unitPrice: 1 })], // attacker sends 1 EGP
      [variant({ id: "v1", product: product({ base_price: 600 }) })],
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("PRICE_CHANGED");
      expect(res.reprice).toEqual([
        { variantId: "v1", oldUnitPrice: 1, newUnitPrice: 600 },
      ]);
    }
  });

  it("3. manipulated HIGHER client price → PRICE_CHANGED with DB price", () => {
    const res = validateCartLines(
      [line({ variantId: "v1", unitPrice: 99999 })],
      [variant({ id: "v1", product: product({ base_price: 600 }) })],
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("PRICE_CHANGED");
      expect(res.reprice?.[0].newUnitPrice).toBe(600);
    }
  });

  it("4. DB price dropped after add (stale higher client price) → PRICE_CHANGED to new DB price", () => {
    const res = validateCartLines(
      [line({ variantId: "v1", unitPrice: 600 })], // saw list price
      [variant({ id: "v1", product: product({ base_price: 600, sale_price: 450 }) })], // now on sale
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("PRICE_CHANGED");
      expect(res.reprice?.[0].newUnitPrice).toBe(450);
    }
  });

  it("tolerates sub-piastre rounding noise (no false PRICE_CHANGED)", () => {
    const res = validateCartLines(
      [line({ variantId: "v1", unitPrice: 600.004 })],
      [variant({ id: "v1", product: product({ base_price: 600 }) })],
    );
    expect(res.ok).toBe(true);
  });
});

// ── Stock & availability (scenarios 5–9) ─────────────────────────────────────
describe("stock and availability", () => {
  it("5. requested qty <= stock → succeeds", () => {
    const res = validateCartLines(
      [line({ variantId: "v1", qty: 3 })],
      [variant({ id: "v1", stock_qty: 3 })],
    );
    expect(res.ok).toBe(true);
  });

  it("6. requested qty > stock → INSUFFICIENT_STOCK with available count", () => {
    const res = validateCartLines(
      [line({ variantId: "v1", qty: 3 })],
      [variant({ id: "v1", stock_qty: 2 })],
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("INSUFFICIENT_STOCK");
      expect(res.available).toBe(2);
      expect(res.variantId).toBe("v1");
      expect(res.productName?.en).toBe("Travel Bag");
    }
  });

  it("7. stock = 0 → INSUFFICIENT_STOCK", () => {
    const res = validateCartLines(
      [line({ variantId: "v1", qty: 1 })],
      [variant({ id: "v1", stock_qty: 0 })],
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("INSUFFICIENT_STOCK");
  });

  it("8. variant not found in DB → VARIANT_NOT_FOUND", () => {
    const res = validateCartLines([line({ variantId: "ghost" })], []);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("VARIANT_NOT_FOUND");
      expect(res.variantId).toBe("ghost");
    }
  });

  it("9a. inactive product → PRODUCT_UNAVAILABLE", () => {
    const res = validateCartLines(
      [line({ variantId: "v1" })],
      [variant({ id: "v1", product: product({ is_active: false }) })],
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("PRODUCT_UNAVAILABLE");
  });

  it("9b. variant with no parent product row → PRODUCT_UNAVAILABLE", () => {
    const res = validateCartLines(
      [line({ variantId: "v1" })],
      [variant({ id: "v1", product: null })],
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("PRODUCT_UNAVAILABLE");
  });
});

// ── Invalid quantity ────────────────────────────────────────────────────────
describe("invalid quantity", () => {
  it("non-integer qty → INVALID_QUANTITY", () => {
    const res = validateCartLines(
      [line({ variantId: "v1", qty: 1.5 })],
      [variant({ id: "v1", stock_qty: 10 })],
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("INVALID_QUANTITY");
  });

  it("zero / negative qty → INVALID_QUANTITY", () => {
    for (const qty of [0, -3]) {
      const res = validateCartLines(
        [line({ variantId: "v1", qty })],
        [variant({ id: "v1", stock_qty: 10 })],
      );
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("INVALID_QUANTITY");
    }
  });

  it("qty above MAX_LINE_QTY (99) → INVALID_QUANTITY", () => {
    const res = validateCartLines(
      [line({ variantId: "v1", qty: 100 })],
      [variant({ id: "v1", stock_qty: 1000 })],
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("INVALID_QUANTITY");
  });
});

// ── Robustness against malformed/missing client price (scenarios 14–15) ──────
describe("robustness against a malformed/stale client payload", () => {
  it("15a. missing (NaN) client price → no crash, priced from DB, succeeds", () => {
    const res = validateCartLines(
      [line({ variantId: "v1", unitPrice: Number.NaN })],
      [variant({ id: "v1", product: product({ base_price: 600 }) })],
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.lines[0].unitPrice).toBe(600);
  });

  it("15b. client price stripped to 0 → PRICE_CHANGED, never charges 0", () => {
    const res = validateCartLines(
      [line({ variantId: "v1", unitPrice: 0 })],
      [variant({ id: "v1", product: product({ base_price: 600 }) })],
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("PRICE_CHANGED");
      expect(res.reprice?.[0].newUnitPrice).toBe(600);
    }
  });

  it("14. duplicate variant lines are each priced from the DB", () => {
    const res = validateCartLines(
      [
        line({ variantId: "v1", qty: 1, unitPrice: 600 }),
        line({ variantId: "v1", qty: 1, unitPrice: 600 }),
      ],
      [variant({ id: "v1", stock_qty: 10, product: product({ base_price: 600 }) })],
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.lines).toHaveLength(2);
      expect(res.lines.every((l) => l.unitPrice === 600)).toBe(true);
    }
  });
});

// ── Multi-item cart & failure precedence ─────────────────────────────────────
describe("multi-item cart validation", () => {
  it("all lines valid → succeeds, subtotal sums authoritative line totals", () => {
    const res = validateCartLines(
      [
        line({ variantId: "v1", qty: 2, unitPrice: 600 }),
        line({ variantId: "v2", qty: 1, unitPrice: 450 }),
      ],
      [
        variant({ id: "v1", product_id: "p1", product: product({ id: "p1", base_price: 600 }) }),
        variant({ id: "v2", product_id: "p2", product: product({ id: "p2", base_price: 450 }) }),
      ],
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.subtotal).toBe(1650);
  });

  it("a hard failure (out of stock) wins over a price change on another line", () => {
    const res = validateCartLines(
      [
        line({ variantId: "v1", qty: 1, unitPrice: 1 }), // would be PRICE_CHANGED
        line({ variantId: "v2", qty: 5, unitPrice: 450 }), // out of stock
      ],
      [
        variant({ id: "v1", product_id: "p1", product: product({ id: "p1", base_price: 600 }) }),
        variant({ id: "v2", product_id: "p2", stock_qty: 2, product: product({ id: "p2", base_price: 450 }) }),
      ],
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("INSUFFICIENT_STOCK");
  });
});
