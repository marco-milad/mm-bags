"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics/track";
import {
  MAX_STOCK_LOOKUP,
  clampLineQty,
  hasSoldOutLine,
  qtyAfterAdd,
  qtyAfterStockSync,
  type VariantStock,
} from "@/lib/cart/qty";
import { getCartStock } from "@/lib/cart/stock-actions";

export type CartItem = {
  variantId: string;
  productId: string;
  productSlug: string;
  name_ar: string;
  name_en: string;
  image: string | null;
  color_hex: string | null;
  color_ar: string | null;
  color_en: string | null;
  size_inches: number | null;
  unitPrice: number;
  qty: number;
  /** Last known stock for this variant. Optional: lines persisted before
   *  M6 have none until syncStock fills it (qty then caps at MAX_QTY). */
  stock?: number;
};

export type AddItemInput = Omit<CartItem, "qty"> & { qty?: number };

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  /** Returns true when the cart actually gained units — false for a sold-out
   *  variant or a line already at its stock/MAX_QTY cap. */
  addItem: (input: AddItemInput) => boolean;
  removeItem: (variantId: string) => void;
  updateQty: (variantId: string, qty: number) => void;
  repriceItems: (updates: { variantId: string; unitPrice: number }[]) => void;
  syncStock: (updates: VariantStock[]) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setOpen: (open: boolean) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (input) => {
        const existing = get().items.find((i) => i.variantId === input.variantId);
        // Fresh stock from the caller wins over the persisted value.
        const stock = input.stock ?? existing?.stock;
        const qty = qtyAfterAdd(existing?.qty, input.qty, stock);
        // A variant known to be sold out can't start a new line, and a line
        // already at its cap can't grow. Callers gate their buttons on stock;
        // this is the backstop, and the false return lets them say so
        // instead of showing a success.
        const grew = qty > (existing?.qty ?? 0);
        if (grew) {
          // Analytics: one add_to_cart per add action that actually added
          // (covers PDP, quick view, home, and wishlist "move to cart" —
          // every caller funnels here). Fired outside set() so the state
          // updater stays pure; track() no-ops without consent and on the
          // server.
          track({ name: "add_to_cart", productId: input.productId });
        }
        if (existing) {
          // Still record fresher stock even when qty couldn't move.
          if (qty === existing.qty && stock === existing.stock) return false;
          set((state) => ({
            items: state.items.map((i) =>
              i.variantId === input.variantId ? { ...i, stock, qty } : i,
            ),
          }));
          return grew;
        }
        if (qty === 0) return false;
        const { qty: _ignored, ...rest } = input;
        set((state) => ({ items: [...state.items, { ...rest, qty }] }));
        return true;
      },

      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),

      updateQty: (variantId, qty) =>
        set((state) => {
          if (qty <= 0) {
            return { items: state.items.filter((i) => i.variantId !== variantId) };
          }
          return {
            items: state.items.map((i) =>
              i.variantId === variantId
                ? { ...i, qty: clampLineQty(i.qty, qty, i.stock) }
                : i,
            ),
          };
        }),

      // Apply server-authoritative prices after checkout reports a stale
      // cart (PRICE_CHANGED). Only touches lines still in the cart; unknown
      // variantIds are ignored.
      repriceItems: (updates) =>
        set((state) => {
          if (updates.length === 0) return state;
          const priceById = new Map(
            updates.map((u) => [u.variantId, u.unitPrice] as const),
          );
          return {
            items: state.items.map((i) => {
              const next = priceById.get(i.variantId);
              return next != null ? { ...i, unitPrice: next } : i;
            }),
          };
        }),

      // Apply fresh stock from the server (getCartStock on cart mount, or
      // after checkout reports INSUFFICIENT_STOCK). Clamps qty down to what's
      // left; a sold-out line keeps its qty and is flagged by CartItem rather
      // than silently removed. Unknown variantIds are ignored.
      syncStock: (updates) =>
        set((state) => {
          if (updates.length === 0) return state;
          const stockById = new Map(
            updates.map((u) => [u.variantId, u.stock] as const),
          );
          let changed = false;
          const items = state.items.map((i) => {
            const stock = stockById.get(i.variantId);
            if (stock == null) return i;
            const qty = qtyAfterStockSync(i.qty, stock);
            if (stock === i.stock && qty === i.qty) return i;
            changed = true;
            return { ...i, stock, qty };
          });
          return changed ? { items } : state;
        }),

      clearCart: () => set({ items: [] }),

      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),
      setOpen: (open) => set({ isOpen: open }),
    }),
    {
      name: "mm-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

// Selectors — colocated so consumers don't have to remember the shape.
export const useCartItems = () => useCartStore((s) => s.items);
export const useCartItemCount = () =>
  useCartStore((s) => s.items.reduce((sum, i) => sum + i.qty, 0));
export const useCartTotal = () =>
  useCartStore((s) => s.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0));
export const useCartIsOpen = () => useCartStore((s) => s.isOpen);
/** Any line known to be sold out — checkout CTAs are blocked until it's removed. */
export const useCartHasSoldOut = () => useCartStore((s) => hasSoldOutLine(s.items));

/**
 * Pull current stock for every cart line from the server and apply it
 * (clamps qty, flags sold-out lines). Failures leave the cart untouched —
 * checkout re-validates server-side anyway.
 */
export async function refreshCartStock(): Promise<void> {
  const ids = useCartStore
    .getState()
    .items.map((i) => i.variantId)
    .slice(0, MAX_STOCK_LOOKUP);
  if (ids.length === 0) return;
  try {
    const rows = await getCartStock(ids);
    if (rows) useCartStore.getState().syncStock(rows);
  } catch {
    // Network / action failure: keep the persisted values.
  }
}

/** Refresh stock once each time `enabled` turns true (cart drawer opened,
 *  cart page hydrated with items). Reads lines from the store at call time
 *  so qty edits while the cart is open don't re-trigger it. */
export function useSyncCartStock(enabled: boolean) {
  useEffect(() => {
    if (enabled) void refreshCartStock();
  }, [enabled]);
}

// Hydration guard so SSR markup never disagrees with persisted client state.
export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() => setHydrated(true));
    if (useCartStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}
