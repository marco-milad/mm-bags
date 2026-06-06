import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ImageFit = "cover" | "contain";

/**
 * Universal product-image primitive. The container locks the aspect ratio;
 * `fit` controls whether the image fills it (cropping out anything that
 * doesn't fit) or letterboxes inside it (with matching padding + background
 * so the empty space looks intentional).
 *
 * - fit="cover":   for square sources or lifestyle / model shots where
 *                  cropping is fine. Container gets a neutral surface bg.
 * - fit="contain": for product-on-white photography with non-square source
 *                  ratios (Milano + CK luggage, laptop sleeves). Container
 *                  gets a white bg + inset padding so the bag floats inside
 *                  the frame with no awkward letterbox stripe.
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
  sizes,
  priority = false,
  aspectClassName = "aspect-square",
  containerClassName,
  rounded = "none",
  children,
}: {
  src: string;
  secondarySrc?: string | null;
  alt: string;
  fit: ImageFit;
  sizes: string;
  priority?: boolean;
  /** Aspect ratio utility — defaults to `aspect-square`. Pass any Tailwind
      aspect class (e.g. `aspect-[4/5]`) for non-square hosts. */
  aspectClassName?: string;
  /** Extra classes for the outer wrapper. Useful for ring/border treatments. */
  containerClassName?: string;
  /** Border-radius preset — matches the look at the call site. */
  rounded?: "none" | "lg" | "xl" | "2xl";
  /** Overlays such as Wishlist button, sale badge, OOS strip. Rendered as
      siblings of the image inside the same relative+aspect wrapper, so
      they can use absolute positioning against the container. */
  children?: ReactNode;
}) {
  const isContain = fit === "contain";
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
        "relative overflow-hidden",
        aspectClassName,
        // Contain-mode boxes ALWAYS use aspect-square. Landscape/portrait
        // product-on-white sources would otherwise leak their intrinsic
        // aspect through the box when a consumer overrode aspectClassName
        // with something other than square. cn / twMerge keeps the last
        // aspect-* class, so this line wins over anything in
        // aspectClassName above.
        isContain && "aspect-square",
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
