"use client";

import { Heart } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Locale } from "@/lib/i18n-config";
import { dbWishlistAdd, dbWishlistRemove } from "@/lib/wishlist/actions";
import {
  useWishlistHydrated,
  useWishlistStore,
  type WishlistItem,
} from "@/store/wishlist";
import { cn } from "@/lib/utils";

type Variant = "icon" | "button";

export function WishlistButton({
  product,
  locale,
  variant = "icon",
}: {
  product: Omit<WishlistItem, "addedAt">;
  locale: Locale;
  variant?: Variant;
}) {
  const toggle = useWishlistStore((s) => s.toggle);
  const restore = useWishlistStore((s) => s.restore);
  const remove = useWishlistStore((s) => s.remove);
  const isWishlisted = useWishlistStore((s) =>
    s.items.some((i) => i.productId === product.productId),
  );
  const hydrated = useWishlistHydrated();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const isAr = locale === "ar";

  const label = isWishlisted
    ? locale === "ar"
      ? "إزالة من المفضلة"
      : "Remove from wishlist"
    : locale === "ar"
      ? "إضافة للمفضلة"
      : "Add to wishlist";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Keep the exact row (incl. addedAt) so a failed remove can put it back
    // where it was.
    const before = useWishlistStore
      .getState()
      .items.find((i) => i.productId === product.productId);
    const added = toggle(product);
    // One toast id per product: rapid toggles replace instead of stacking.
    const toastId = `wishlist-${product.productId}`;

    if (added) {
      toast.success(isAr ? "اتضافت للمفضّلة" : "Added to wishlist", {
        id: toastId,
        action: {
          label: isAr ? "شوف المفضّلة" : "View",
          onClick: () => router.push(`/${locale}/account/wishlist`),
        },
      });
    } else {
      toast(isAr ? "اتشالت من المفضّلة" : "Removed from wishlist", {
        id: toastId,
      });
    }

    startTransition(async () => {
      let ok = false;
      try {
        ok = added
          ? await dbWishlistAdd(product.productId)
          : await dbWishlistRemove(product.productId);
      } catch {
        ok = false;
      }
      if (ok) return;
      // Roll the heart back so it matches what the account actually has.
      if (added) remove(product.productId);
      else if (before) restore(before);
      toast.error(
        isAr
          ? "حصلت مشكلة ومقدرناش نحفظ التغيير، جرّب تاني"
          : "Couldn't save that change. Please try again.",
        { id: toastId },
      );
    });
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        aria-pressed={hydrated && isWishlisted ? "true" : "false"}
        className={cn(
          "absolute z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-bg)]/90 text-[var(--color-text)] shadow-sm backdrop-blur transition hover:scale-105 hover:bg-[var(--color-bg)] ltr:right-3 rtl:left-3 top-3",
        )}
      >
        <Heart
          className={cn(
            "h-[18px] w-[18px] transition",
            hydrated && isWishlisted
              ? "fill-[var(--color-accent-dark)] stroke-[var(--color-accent-dark)]"
              : "stroke-[var(--color-text-secondary)]",
          )}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      aria-pressed={hydrated && isWishlisted ? "true" : "false"}
      className={cn(
        "flex items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition",
        hydrated && isWishlisted
          ? "border-[var(--color-accent-dark)] bg-[var(--color-accent)]/10 text-[var(--color-accent-dark)]"
          : "border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)]",
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4",
          hydrated && isWishlisted &&
            "fill-[var(--color-accent-dark)] stroke-[var(--color-accent-dark)]",
        )}
      />
      {label}
    </button>
  );
}
