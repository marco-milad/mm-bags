"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";
import { insertByAddedAt, type WishlistItem } from "@/lib/wishlist/merge";

// The type lives in the pure merge module so server actions and tests can
// share it; re-exported here so existing imports keep working.
export type { WishlistItem };

type WishlistState = {
  items: WishlistItem[];
  /**
   * Account that last synced `items` on this device, or null for a guest
   * list. Persisted with the items so WishlistSync can tell a guest list
   * (upload it) from this account's cache (just refresh it).
   */
  ownerId: string | null;
  setOwner: (ownerId: string | null) => void;
  toggle: (item: Omit<WishlistItem, "addedAt">) => boolean; // returns true if added
  add: (item: Omit<WishlistItem, "addedAt">) => void;
  /** Puts a removed item back at its original position (undo / failed DB call). */
  restore: (item: WishlistItem) => void;
  remove: (productId: string) => void;
  clear: () => void;
  isWishlisted: (productId: string) => boolean;
  replaceAll: (items: WishlistItem[]) => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      ownerId: null,

      setOwner: (ownerId) => set({ ownerId }),

      toggle: (item) => {
        const exists = get().items.some((i) => i.productId === item.productId);
        if (exists) {
          set((s) => ({ items: s.items.filter((i) => i.productId !== item.productId) }));
          return false;
        }
        set((s) => ({ items: [{ ...item, addedAt: Date.now() }, ...s.items] }));
        return true;
      },

      add: (item) =>
        set((s) =>
          s.items.some((i) => i.productId === item.productId)
            ? s
            : { items: [{ ...item, addedAt: Date.now() }, ...s.items] },
        ),

      restore: (item) => set((s) => ({ items: insertByAddedAt(s.items, item) })),

      remove: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),

      clear: () => set({ items: [], ownerId: null }),

      isWishlisted: (productId) =>
        get().items.some((i) => i.productId === productId),

      replaceAll: (items) => set({ items }),
    }),
    {
      name: "mm-wishlist",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const useWishlistItems = () => useWishlistStore((s) => s.items);
export const useWishlistCount = () => useWishlistStore((s) => s.items.length);

/** Resolves once the persisted (localStorage) wishlist has been loaded. */
export function whenWishlistHydrated(): Promise<void> {
  if (useWishlistStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useWishlistStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

export function useWishlistHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useWishlistStore.persist.onFinishHydration(() => setHydrated(true));
    if (useWishlistStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}
