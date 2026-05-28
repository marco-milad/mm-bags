"use client";

import { ShoppingBag } from "lucide-react";
import { useCartHydrated, useCartItemCount, useCartStore } from "@/store/cart";

export function CartIconButton({ label }: { label: string }) {
  const openDrawer = useCartStore((s) => s.openDrawer);
  const count = useCartItemCount();
  const hydrated = useCartHydrated();

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={count > 0 ? `${label} (${count})` : label}
      className="relative rounded-full p-2 text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
    >
      <ShoppingBag className="h-5 w-5" />
      {hydrated && count > 0 && (
        <span className="absolute top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 font-mono text-[10px] font-semibold text-[var(--color-primary)] ltr:right-0 rtl:left-0">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
