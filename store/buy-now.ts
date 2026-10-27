"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import { track } from "@/lib/analytics/track";
import { hasSoldOutLine, qtyAfterStockSync } from "@/lib/cart/qty";
import { getCartStock } from "@/lib/cart/stock-actions";
import type { AddItemInput, CartItem } from "./cart";

/**
 * "Order now" (اطلب دلوقتي): checkout for ONE product, straight from the
 * product page or quick view, without touching the cart. Whatever the
 * shopper already has in the cart stays there and is not ordered with it.
 *
 * Kept in sessionStorage: it belongs to this tab's checkout only, survives a
 * refresh on /checkout, and doesn't follow the shopper into a later visit.
 */
type BuyNowState = {
  item: CartItem | null;
  /** False for a variant known to be sold out. */
  start: (input: AddItemInput) => boolean;
  reprice: (unitPrice: number) => void;
  syncStock: (stock: number) => void;
  clear: () => void;
};

export const useBuyNowStore = create<BuyNowState>()(
  persist(
    (set) => ({
      item: null,

      start: (input) => {
        if (input.stock !== undefined && input.stock <= 0) return false;
        set({ item: { ...input, qty: 1 } });
        // Same funnel step as add-to-cart, from a different button.
        track({ name: "add_to_cart", productId: input.productId });
        return true;
      },

      reprice: (unitPrice) =>
        set((s) => (s.item ? { item: { ...s.item, unitPrice } } : s)),

      syncStock: (stock) =>
        set((s) =>
          s.item
            ? { item: { ...s.item, stock, qty: qtyAfterStockSync(s.item.qty, stock) } }
            : s,
        ),

      clear: () => set({ item: null }),
    }),
    {
      name: "mm-buy-now",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ item: s.item }),
    },
  ),
);

export const useBuyNowItem = () => useBuyNowStore((s) => s.item);
export const useBuyNowHasSoldOut = () =>
  useBuyNowStore((s) => (s.item ? hasSoldOutLine([s.item]) : false));

/** Re-read the buy-now line's stock from the server (clamps / flags it). */
export async function refreshBuyNowStock(): Promise<void> {
  const item = useBuyNowStore.getState().item;
  if (!item) return;
  try {
    const rows = await getCartStock([item.variantId]);
    const row = rows?.find((r) => r.variantId === item.variantId);
    if (row) useBuyNowStore.getState().syncStock(row.stock);
  } catch {
    // Network / action failure: checkout re-validates server-side anyway.
  }
}

/** True once sessionStorage has been read (false during SSR). */
export function useBuyNowHydrated() {
  return useSyncExternalStore(
    (onChange) => useBuyNowStore.persist.onFinishHydration(onChange),
    () => useBuyNowStore.persist.hasHydrated(),
    () => false,
  );
}