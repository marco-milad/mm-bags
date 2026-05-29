"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";

export type WishlistItem = {
  productId: string;
  productSlug: string;
  name_ar: string;
  name_en: string;
  image: string | null;
  addedAt: number;
};

type WishlistState = {
  items: WishlistItem[];
  toggle: (item: Omit<WishlistItem, "addedAt">) => boolean; // returns true if added
  add: (item: Omit<WishlistItem, "addedAt">) => void;
  remove: (productId: string) => void;
  clear: () => void;
  isWishlisted: (productId: string) => boolean;
  replaceAll: (items: WishlistItem[]) => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

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

      remove: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),

      clear: () => set({ items: [] }),

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

export function useWishlistHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useWishlistStore.persist.onFinishHydration(() => setHydrated(true));
    if (useWishlistStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}
