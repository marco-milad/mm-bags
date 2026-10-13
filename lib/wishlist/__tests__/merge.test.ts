import { describe, it, expect } from "vitest";
import {
  insertByAddedAt,
  isSyncFresh,
  mergeWishlists,
  reconcileWishlist,
  sanitizeProductIds,
  wishlistSyncMode,
  type WishlistItem,
} from "@/lib/wishlist/merge";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

function item(productId: string, addedAt: number, name = "x"): WishlistItem {
  return {
    productId,
    productSlug: `slug-${name}`,
    name_ar: `ar-${name}`,
    name_en: `en-${name}`,
    image: null,
    addedAt,
  };
}

describe("mergeWishlists (M1)", () => {
  it("unions local and remote by productId", () => {
    const merged = mergeWishlists([item(A, 10)], [item(B, 20)]);
    expect(merged.map((i) => i.productId)).toEqual([B, A]);
  });

  it("dedupes a product present on both sides, keeping the earliest addedAt", () => {
    const merged = mergeWishlists([item(A, 5, "local")], [item(A, 50, "remote")]);
    expect(merged).toHaveLength(1);
    expect(merged[0].addedAt).toBe(5);
  });

  it("keeps the earliest addedAt when remote is older too", () => {
    const merged = mergeWishlists([item(A, 50)], [item(A, 5)]);
    expect(merged[0].addedAt).toBe(5);
  });

  it("prefers remote display fields (fresh from the catalog)", () => {
    const merged = mergeWishlists([item(A, 5, "stale")], [item(A, 50, "fresh")]);
    expect(merged[0].productSlug).toBe("slug-fresh");
    expect(merged[0].name_en).toBe("en-fresh");
  });

  it("dedupes duplicates within one side", () => {
    const merged = mergeWishlists([], [item(A, 30), item(A, 10), item(B, 20)]);
    expect(merged.map((i) => [i.productId, i.addedAt])).toEqual([
      [B, 20],
      [A, 10],
    ]);
  });

  it("sorts most-recent first", () => {
    const merged = mergeWishlists([item(A, 1), item(C, 3)], [item(B, 2)]);
    expect(merged.map((i) => i.productId)).toEqual([C, B, A]);
  });

  it("handles empty inputs and does not mutate them", () => {
    const local = [item(A, 1)];
    expect(mergeWishlists([], [])).toEqual([]);
    const merged = mergeWishlists(local, []);
    expect(merged).toEqual(local);
    expect(merged[0]).not.toBe(local[0]);
  });
});

describe("sanitizeProductIds (M1)", () => {
  it("rejects non-arrays", () => {
    expect(sanitizeProductIds(undefined)).toEqual([]);
    expect(sanitizeProductIds("abc")).toEqual([]);
    expect(sanitizeProductIds({ 0: A })).toEqual([]);
  });

  it("keeps only UUID strings, normalized and deduped", () => {
    expect(
      sanitizeProductIds([A, A.toUpperCase(), ` ${B} `, 42, null, "not-a-uuid", "1; drop"]),
    ).toEqual([A, B]);
  });

  it("caps the list length", () => {
    expect(sanitizeProductIds([A, B, C], 2)).toEqual([A, B]);
  });
});

describe("wishlistSyncMode (M1)", () => {
  it("treats an unowned list as guest saves to upload", () => {
    expect(wishlistSyncMode(null, "u1")).toBe("merge-guest");
    expect(wishlistSyncMode(undefined, "u1")).toBe("merge-guest");
    expect(wishlistSyncMode("", "u1")).toBe("merge-guest");
  });

  it("treats this account's list as a cache", () => {
    expect(wishlistSyncMode("u1", "u1")).toBe("refresh-cache");
  });

  it("treats another account's list as foreign", () => {
    expect(wishlistSyncMode("u2", "u1")).toBe("discard-foreign");
  });
});

describe("reconcileWishlist (M1)", () => {
  it("merge-guest: unions the guest list with the account", () => {
    const local = [item(A, 10)];
    const out = reconcileWishlist("merge-guest", local, local, [item(B, 20)]);
    expect(out.map((i) => i.productId)).toEqual([B, A]);
  });

  it("refresh-cache: a removal on another device sticks (no resurrection)", () => {
    // Laptop still caches A and B; the phone removed A, so the DB has only B.
    const cache = [item(A, 10), item(B, 20)];
    const out = reconcileWishlist("refresh-cache", cache, cache, [item(B, 20)]);
    expect(out.map((i) => i.productId)).toEqual([B]);
  });

  it("refresh-cache: picks up items saved on another device", () => {
    const cache = [item(A, 10)];
    const out = reconcileWishlist("refresh-cache", cache, cache, [item(A, 10), item(C, 30)]);
    expect(out.map((i) => i.productId)).toEqual([C, A]);
  });

  it("discard-foreign: drops the previous account's list", () => {
    const foreign = [item(A, 10), item(B, 20)];
    const out = reconcileWishlist("discard-foreign", foreign, foreign, [item(C, 30)]);
    expect(out.map((i) => i.productId)).toEqual([C]);
  });

  it("discard-foreign: an empty account yields an empty list", () => {
    const foreign = [item(A, 10)];
    expect(reconcileWishlist("discard-foreign", foreign, foreign, [])).toEqual([]);
  });

  it.each(["merge-guest", "refresh-cache", "discard-foreign"] as const)(
    "%s: keeps hearts toggled while the sync was in flight",
    (mode) => {
      const snapshot = [item(A, 10), item(B, 20)];
      // During the sync: B removed, C added (both already sent to the DB).
      const current = [item(C, 30), item(A, 10)];
      // The fetch raced the remove, so B is still in the account's rows.
      const remote = [item(A, 10), item(B, 20)];
      const ids = reconcileWishlist(mode, snapshot, current, remote).map((i) => i.productId);
      expect(ids).toContain(C);
      expect(ids).toContain(A);
      expect(ids).not.toContain(B);
    },
  );
});

describe("isSyncFresh (M1)", () => {
  const now = 1_000_000;

  it("is stale with no stamp or another user's stamp", () => {
    expect(isSyncFresh(null, "u1", now)).toBe(false);
    expect(isSyncFresh({ userId: "u2", at: now }, "u1", now)).toBe(false);
  });

  it("is fresh within the window and stale after it", () => {
    expect(isSyncFresh({ userId: "u1", at: now - 1000 }, "u1", now, 5000)).toBe(true);
    expect(isSyncFresh({ userId: "u1", at: now - 5000 }, "u1", now, 5000)).toBe(false);
  });

  it("treats a stamp from the future (clock change) as stale", () => {
    expect(isSyncFresh({ userId: "u1", at: now + 1000 }, "u1", now, 5000)).toBe(false);
  });
});

describe("insertByAddedAt (M10 undo)", () => {
  it("re-inserts at its original position", () => {
    const list = [item(C, 30), item(A, 10)];
    expect(insertByAddedAt(list, item(B, 20)).map((i) => i.productId)).toEqual([C, B, A]);
  });

  it("appends the oldest item and ignores duplicates", () => {
    const list = [item(C, 30)];
    expect(insertByAddedAt(list, item(A, 1)).map((i) => i.productId)).toEqual([C, A]);
    expect(insertByAddedAt(list, item(C, 99))).toHaveLength(1);
  });
});
