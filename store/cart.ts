"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";

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
};

export type AddItemInput = Omit<CartItem, "qty"> & { qty?: number };

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  addItem: (input: AddItemInput) => void;
  removeItem: (variantId: string) => void;
  updateQty: (variantId: string, qty: number) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setOpen: (open: boolean) => void;
};

const MAX_QTY = 99;

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,

      addItem: (input) =>
        set((state) => {
          const incoming = Math.max(1, Math.min(MAX_QTY, input.qty ?? 1));
          const existing = state.items.find((i) => i.variantId === input.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === input.variantId
                  ? { ...i, qty: Math.min(MAX_QTY, i.qty + incoming) }
                  : i,
              ),
            };
          }
          const { qty: _ignored, ...rest } = input;
          return { items: [...state.items, { ...rest, qty: incoming }] };
        }),

      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),

      updateQty: (variantId, qty) =>
        set((state) => {
          if (qty <= 0) {
            return { items: state.items.filter((i) => i.variantId !== variantId) };
          }
          const clamped = Math.min(MAX_QTY, qty);
          return {
            items: state.items.map((i) =>
              i.variantId === variantId ? { ...i, qty: clamped } : i,
            ),
          };
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
