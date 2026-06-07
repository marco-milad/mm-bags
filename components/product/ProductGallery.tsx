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
  imageAspect: _imageAspect = "square",
}: {
  images: string[];
  name: string;
  locale: "ar" | "en";
  /** Determines whether the main image and thumbnails crop (`cover`) or
      letterbox with padding (`contain`). */
  imageFit?: ImageFit;
  /** Reserved for ImageContainer-based hosts; main-image gallery uses a
      hard `min(320px, 45vw)` height clamp regardless of orientation. */
  imageAspect?: ImageAspect;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeImages = images.length > 0 ? images : [];
  const active = safeImages[activeIndex];

  if (safeImages.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-sm text-[var(--color-text-secondary)]">
        {locale === "ar" ? "بدون صورة" : "No image"}
      </div>
    );
  }

  const isContain = imageFit === "contain";

  return (
    <div className="flex flex-col gap-3">
      {/* NATURAL-FLOW IMAGE — no fixed height, no aspect-ratio forcing.
          The image renders at its own intrinsic proportions (width 100%
          of container, height computed by the browser from the natural
          aspect), capped at maxHeight: 70vh so a tall portrait can't
          ever exceed the viewport. This is the pattern Shopify themes
          and Bagzawy/Noon/Amazon use for product galleries — the source
          image decides the box, not the box deciding the source. */}
      <div
        key={active}
        className={cn(
          "relative w-full overflow-hidden rounded-2xl",
          isContain && "bg-white",
        )}
      >
        <Image
          src={active}
          alt={name}
          /* width/height=0 + sizes + style:height:auto is the Next.js
             documented pattern for letting next/image render at natural
             intrinsic aspect while still going through the optimizer. */
          width={0}
          height={0}
          sizes="(min-width: 1024px) 600px, 100vw"
          priority
          className={cn(
            "block h-auto w-full",
            isContain ? "object-contain p-4" : "object-cover",
          )}
          style={{ maxHeight: "70vh" }}
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
    </div>
  );
}
