// Pure quantity rules for cart lines (M6 — qty must not exceed stock).
// No React / Zustand / "server-only" imports so Vitest can exercise them
// directly; store/cart.ts is the only runtime caller.

/** Absolute per-line cap. Matches MAX_LINE_QTY enforced at checkout. */
export const MAX_QTY = 99;

/** Max lines the stock-refresh action accepts in one call. */
export const MAX_STOCK_LOOKUP = 50;

/** One row of the stock-refresh action's result (lib/cart/stock-actions.ts). */
export type VariantStock = { variantId: string; stock: number };

function toInt(n: number | undefined, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : fallback;
}

/**
 * Highest qty a line may reach given its known stock. Unknown stock (lines
 * persisted before M6, or a caller that doesn't know it) falls back to
 * MAX_QTY — checkout re-validates server-side regardless.
 */
export function qtyCap(stock: number | undefined): number {
  if (typeof stock !== "number" || !Number.isFinite(stock)) return MAX_QTY;
  return Math.max(0, Math.min(MAX_QTY, Math.floor(stock)));
}

/**
 * Resolve a requested qty (>= 1) for a line already in the cart. Never
 * raises a line above its cap, but always lets it move DOWN — even a line
 * already over the cap because stock dropped after it was added — so the
 * "−" button keeps working on an out-of-stock line.
 */
export function clampLineQty(
  current: number,
  requested: number,
  stock: number | undefined,
): number {
  const req = Math.max(1, toInt(requested, 1));
  const cap = qtyCap(stock);
  if (req <= cap) return req;
  return Math.max(1, Math.min(req, Math.max(cap, toInt(current, 1))));
}

/**
 * Line qty after adding `incoming` units (default 1). `existing` is the
 * current qty when the variant is already in the cart. Returns 0 when a
 * NEW line can't be added at all (stock 0) — the caller skips it.
 */
export function qtyAfterAdd(
  existing: number | undefined,
  incoming: number | undefined,
  stock: number | undefined,
): number {
  const add = Math.max(1, Math.min(MAX_QTY, toInt(incoming, 1)));
  if (existing == null) return Math.min(add, qtyCap(stock));
  return clampLineQty(existing, existing + add, stock);
}

/**
 * Line qty after a server stock refresh: clamp down to the cap. Stock 0
 * keeps the qty untouched so the line stays visible (flagged out of stock)
 * instead of silently vanishing from the cart.
 */
export function qtyAfterStockSync(qty: number, stock: number): number {
  const cap = qtyCap(stock);
  if (cap === 0) return qty;
  return Math.max(1, Math.min(toInt(qty, 1), cap));
}
