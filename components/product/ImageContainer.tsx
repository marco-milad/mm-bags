import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ImageFit = "cover" | "contain";
export type ImageAspect = "square" | "landscape" | "portrait";

/**
 * Universal product-image primitive. Two orthogonal knobs:
 *
 * - `fit`:    how the image meets its container.
 *               cover   → crops to fill (square sources, lifestyle shots)
 *               contain → letterboxes with matching white bg + padding so the
 *                         entire bag is visible (product-on-white photography)
 *
 * - `aspect`: the container's aspect ratio. Matches the SOURCE's native
 *             orientation so contain-mode bags fill the visible frame
 *             without 30% whitespace stripes.
 *               square    → aspect-square        (most products)
 *               landscape → aspect-[7/5]   ≈ 1.4 (Milano series)
 *               portrait  → aspect-[3/4]   ≈ 0.75 (Calvin Klein)
 *
 * Two `next/image` slots are supported via `secondarySrc` so consumers
 * (ProductCard hover-swap) can crossfade without re-implementing the
 * styling logic.
 */
export function ImageContainer({
  src,
  secondarySrc,
  alt,
  fit,
  aspect = "square",
  sizes,
  priority = false,
  containerClassName,
  rounded = "none",
  children,
}: {
  src: string;
  secondarySrc?: string | null;
  alt: string;
  fit: ImageFit;
  /** Source orientation — drives the container's aspect-ratio. */
  aspect?: ImageAspect;
  sizes: string;
  priority?: boolean;
  /** Extra classes for the outer wrapper. Useful for ring/border, mobile
      max-h caps, w-full, etc. NB: any `aspect-*` class here will be
      overridden by the resolved aspect from `aspect` via twMerge. */
  containerClassName?: string;
  /** Border-radius preset — matches the look at the call site. */
  rounded?: "none" | "lg" | "xl" | "2xl";
  /** Overlays such as Wishlist button, sale badge, OOS strip. Rendered as
      siblings of the image inside the same relative+aspect wrapper, so
      they can use absolute positioning against the container. */
  children?: ReactNode;
}) {
  const isContain = fit === "contain";

  // Aspect ratio class for the wrapper. Two arbitrary ratios chosen to
  // closely match the measured native dimensions of our sources without
  // introducing per-product mathematical ratios.
  const aspectClass =
    aspect === "landscape"
      ? "aspect-[7/5]"
      : aspect === "portrait"
        ? "aspect-[3/4]"
        : "aspect-square";

  const radiusClass =
    rounded === "2xl"
      ? "rounded-2xl"
      : rounded === "xl"
        ? "rounded-xl"
        : rounded === "lg"
          ? "rounded-lg"
          : "";

  // `bg-white` for contain so product-on-white shots blend seamlessly into
  // the container; `bg-[var(--color-surface-2)]` for cover so missing
  // images / loading states match the surrounding cream palette.
  const bgClass = isContain ? "bg-white" : "bg-[var(--color-surface-2)]";

  // Padding only inside contain — pulls the image away from the rounded
  // corners so the silhouette breathes. Calibrated to ~4% of card width via
  // `p-3`-equivalent at typical card sizes; tighter on the card host via
  // wrapper override if needed.
  const padClass = isContain ? "p-3" : "";

  return (
    <div
      className={cn(
        "relative overflow-hidden w-full",
        // Per-product aspect ratio — drives the container's height as
        // width × ratio. Placed before containerClassName so a caller can
        // still pass a different aspect/max-h override if needed.
        aspectClass,
        radiusClass,
        bgClass,
        containerClassName,
      )}
    >
      <div className={cn("absolute inset-0", padClass)}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "transition duration-300",
            isContain ? "object-contain" : "object-cover",
            // Cover-mode cards already do their own group-hover scale at the
            // consumer; we don't apply scaling here so we don't double-up.
          )}
        />
        {secondarySrc && (
          <Image
            src={secondarySrc}
            alt=""
            aria-hidden
            fill
            sizes={sizes}
            className={cn(
              "opacity-0 transition duration-300 group-hover:opacity-100",
              isContain ? "object-contain" : "object-cover",
            )}
          />
        )}
      </div>
      {children}
    </div>
  );
}
