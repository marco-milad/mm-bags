// Pure wishlist helpers shared by the client store, the WishlistSync
// component and the server actions. No "use client"/"server-only" here so
// Vitest can import it directly.

export type WishlistItem = {
  productId: string;
  productSlug: string;
  name_ar: string;
  name_en: string;
  image: string | null;
  addedAt: number;
};

/** Upper bound on ids accepted by one bulk call (mirrors getWishlistedProducts). */
export const MAX_WISHLIST_IDS = 100;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates untrusted input from a server-action call: keeps only UUID
 * strings, lower-cases and dedupes them, and caps the list. Anything that
 * is not an array yields [].
 */
export function sanitizeProductIds(
  input: unknown,
  max: number = MAX_WISHLIST_IDS,
): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (seen.size >= max) break;
    if (typeof raw !== "string") continue;
    const id = raw.trim().toLowerCase();
    if (UUID_RE.test(id)) seen.add(id);
  }
  return [...seen];
}

/**
 * Union of the device's wishlist and the account's wishlist, keyed by
 * productId. When both sides have a product, the remote row wins for
 * display fields (slug/names/image are fresh from the catalog) but the
 * earliest addedAt is kept, so an item saved as a guest last week does not
 * jump to the top just because it was uploaded today. Result is sorted
 * most-recent first, matching the store's prepend order.
 */
export function mergeWishlists(
  local: readonly WishlistItem[],
  remote: readonly WishlistItem[],
): WishlistItem[] {
  const byId = new Map<string, WishlistItem>();
  const put = (item: WishlistItem, preferFields: boolean) => {
    const prev = byId.get(item.productId);
    if (!prev) {
      byId.set(item.productId, { ...item });
      return;
    }
    const base = preferFields ? item : prev;
    byId.set(item.productId, {
      ...base,
      addedAt: Math.min(prev.addedAt, item.addedAt),
    });
  };
  for (const item of local) put(item, false);
  for (const item of remote) put(item, true);
  return [...byId.values()].sort((a, b) => b.addedAt - a.addedAt);
}

/** Inserts `item` at its addedAt position (most-recent first) if absent. */
export function insertByAddedAt(
  items: readonly WishlistItem[],
  item: WishlistItem,
): WishlistItem[] {
  if (items.some((i) => i.productId === item.productId)) return [...items];
  const idx = items.findIndex((i) => i.addedAt < item.addedAt);
  if (idx === -1) return [...items, item];
  return [...items.slice(0, idx), item, ...items.slice(idx)];
}
