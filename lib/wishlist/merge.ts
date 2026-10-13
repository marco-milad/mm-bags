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

/**
 * How a device's persisted wishlist relates to the account being synced,
 * based on which account (if any) last synced it:
 * - "merge-guest": no owner, so these are guest saves. Upload them, then
 *   union with the account.
 * - "refresh-cache": this account already owns the list. Every signed-in
 *   toggle writes through to the DB, so the list is only a cache: replace it
 *   with the account's rows and upload nothing (otherwise an item removed on
 *   another device would be re-inserted from this one).
 * - "discard-foreign": a different account left it behind. Drop it.
 */
export type WishlistSyncMode = "merge-guest" | "refresh-cache" | "discard-foreign";

export function wishlistSyncMode(
  ownerId: string | null | undefined,
  userId: string,
): WishlistSyncMode {
  if (!ownerId) return "merge-guest";
  return ownerId === userId ? "refresh-cache" : "discard-foreign";
}

/**
 * The list to store once the account's rows (`remote`) arrive. `snapshot`
 * is the store when the sync started and `current` is the store now, so
 * hearts toggled while the requests were in flight are respected: removed
 * ones stay removed, added ones are kept (both already went to the DB).
 */
export function reconcileWishlist(
  mode: WishlistSyncMode,
  snapshot: readonly WishlistItem[],
  current: readonly WishlistItem[],
  remote: readonly WishlistItem[],
): WishlistItem[] {
  const snapIds = new Set(snapshot.map((i) => i.productId));
  const currentIds = new Set(current.map((i) => i.productId));
  const removedMeanwhile = new Set(
    [...snapIds].filter((id) => !currentIds.has(id)),
  );
  const remoteKept = remote.filter((r) => !removedMeanwhile.has(r.productId));
  if (mode === "merge-guest") return mergeWishlists(current, remoteKept);
  const addedMeanwhile = current.filter((i) => !snapIds.has(i.productId));
  return mergeWishlists(addedMeanwhile, remoteKept);
}

/** How long a sync stays fresh before a reload / tab focus fetches again. */
export const WISHLIST_REFRESH_MS = 5 * 60 * 1000;

export type WishlistSyncStamp = { userId: string; at: number };

/** True when `stamp` is a sync for `userId` newer than `maxAge`. */
export function isSyncFresh(
  stamp: WishlistSyncStamp | null,
  userId: string,
  now: number,
  maxAge: number = WISHLIST_REFRESH_MS,
): boolean {
  return !!stamp && stamp.userId === userId && now - stamp.at >= 0 && now - stamp.at < maxAge;
}

/** Shown when a wishlist write could not be saved to the account. */
export function wishlistSaveErrorText(isAr: boolean): string {
  return isAr
    ? "حصلت مشكلة ومقدرناش نحفظ التغيير، جرّب تاني"
    : "Couldn't save that change. Please try again.";
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
