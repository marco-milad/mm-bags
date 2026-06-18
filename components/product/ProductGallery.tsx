"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ImageAspect, ImageFit } from "@/components/product/ImageContainer";

export function ProductGallery({
  images,
  name,
  locale,
  imageFit = "cover",
  imageAspect = "square",
  previewImageIndex = null,
}: {
  images: string[];
  name: string;
  locale: "ar" | "en";
  /** Determines whether the main image and thumbnails crop (`cover`) or
      letterbox with padding (`contain`). */
  imageFit?: ImageFit;
  /** Source orientation — drives the gallery's aspect-ratio container.
      Matching the source's native orientation keeps contain-mode bags
      from getting big whitespace stripes top/bottom. */
  imageAspect?: ImageAspect;
  /** External override (e.g. ProductActions color-swatch hover) that
      replaces the internally-tracked thumbnail selection without
      mutating it. `null` = no preview, fall back to the selected image.
      Used by ProductDetailLayout to let a color hover swap the main
      image while leaving the user's clicked thumbnail intact. */
  previewImageIndex?: number | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeImages = images.length > 0 ? images : [];
  // Preview wins when set + in range. We intentionally don't touch
  // setActiveIndex on hover so the original click-selected thumb stays
  // visually marked + restored on mouse-out.
  const effectiveIndex =
    previewImageIndex !== null &&
    previewImageIndex >= 0 &&
    previewImageIndex < safeImages.length
      ? previewImageIndex
      : activeIndex;
  const active = safeImages[effectiveIndex];

  if (safeImages.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-sm text-[var(--color-text-secondary)]">
        {locale === "ar" ? "بدون صورة" : "No image"}
      </div>
    );
  }

  const isContain = imageFit === "contain";
  // Aspect-ratio container — `fill` inside an explicit aspect-* wrapper
  // is the only reliable cross-browser pattern. The previous
  // `width={0} height={0} + style.height:auto` trick relied on the
  // browser computing intrinsic dimensions; on Samsung Internet +
  // some Android WebViews the IMG renders at native pixel width and
  // gets left-aligned inside a w-full parent, leaving white space on
  // the trailing side of the gallery (reported on mobile Milano PDP).
  const aspectClass =
    imageAspect === "landscape"
      ? "aspect-[7/5]"
      : imageAspect === "portrait"
        ? "aspect-[3/4]"
        : "aspect-square";

  return (
    <div className="flex flex-col gap-3">
      <div
        key={active}
        className={cn(
          "relative w-full overflow-hidden rounded-2xl",
          aspectClass,
          isContain && "bg-white",
        )}
        // 300ms crossfade fires whenever `active` changes — color-swatch
        // hover swaps the src, the key remounts the div, and the inline
        // animation runs on the fresh node. Cheap and avoids the
        // double-buffer two-image dance.
        style={{ animation: "mm-gallery-fade 0.3s ease-out" }}
      >
        <Image
          src={active}
          alt={name}
          fill
          sizes="(min-width: 1024px) 600px, 100vw"
          priority
          className={cn(isContain ? "object-contain p-4" : "object-cover")}
        />
      </div>

      {safeImages.length > 1 && (
        <div
          className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          aria-label={locale === "ar" ? "صور المنتج" : "Product images"}
        >
          {safeImages.map((src, idx) => (
            <div key={src} className="shrink-0">
              <button
                type="button"
                // eslint-disable-next-line jsx-a11y/aria-proptypes -- stringified
                // ternary produces only valid "true"|"false" literals at runtime;
                // the static analyzer can't narrow the conditional expression.
                // Stays bound to `activeIndex` (not effectiveIndex) so a
                // color-hover preview doesn't visually re-select the thumb.
                aria-pressed={idx === activeIndex ? "true" : "false"}
                aria-label={
                  locale === "ar" ? `الصورة رقم ${idx + 1}` : `Image ${idx + 1}`
                }
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  "relative h-16 w-16 overflow-hidden rounded-lg transition",
                  // Thumbnail bg matches the contain mode so product-on-white
                  // shots blend in nicely; cover mode uses the neutral surface.
                  isContain ? "bg-white" : "bg-[var(--color-surface-2)]",
                  idx === activeIndex
                    ? "ring-2 ring-[var(--color-accent)]"
                    : "opacity-70 ring-1 ring-[var(--color-border)] hover:opacity-100",
                )}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="64px"
                  className={cn(
                    isContain ? "object-contain p-1" : "object-cover",
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Scoped keyframe for the crossfade above — kept inline to avoid
          polluting globals.css for a one-element animation. */}
      <style>{`
        @keyframes mm-gallery-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
