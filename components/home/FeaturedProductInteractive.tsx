"use client";

import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n-config";
import type { ProductWithVariants } from "@/lib/catalog-shared";
import { effectivePrice, totalStock } from "@/lib/catalog-shared";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/utils";

/**
 * Client subtree of FeaturedProduct: image gallery (main + thumb swap),
 * color-variant swatches, and the Add-to-Cart button that pushes the
 * selected variant onto the Zustand cart store and opens the drawer.
 *
 * The static "above the swatches" header is rendered server-side and
 * passed in as `header`; same with `footer` for the "View full product"
 * link below the CTA. Keeps the client bundle lean.
 */
export function FeaturedProductInteractive({
  locale,
  product,
  header,
  footer,
}: {
  locale: Locale;
  product: ProductWithVariants;
  header: ReactNode;
  footer: ReactNode;
}) {
  const isRTL = locale === "ar";
  const images = product.images ?? [];
  const variants = product.product_variants ?? [];

  // Distinct colors across all variants — for the swatch grid. Map each color
  // to a representative variant (first one we see for that color) so the user
  // selecting a swatch always lands on a real, addable variant.
  const colorOptions = useMemo(() => {
    const map = new Map<
      string,
      { variantId: string; hex: string; ar: string | null; en: string | null }
    >();
    for (const v of variants) {
      if (!v.color_hex) continue;
      if (!map.has(v.color_hex)) {
        map.set(v.color_hex, {
          variantId: v.id,
          hex: v.color_hex,
          ar: v.color_ar,
          en: v.color_en,
        });
      }
    }
    return Array.from(map.values());
  }, [variants]);

  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    colorOptions[0]?.variantId ?? variants[0]?.id ?? null,
  );

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;
  const stock = totalStock(product);
  const isOOS = stock === 0;

  const openDrawer = useCartStore((s) => s.openDrawer);
  const addItem = useCartStore((s) => s.addItem);

  const addToCart = () => {
    if (!selectedVariant || isOOS) return;
    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      productSlug: product.slug,
      name_ar: product.name_ar,
      name_en: product.name_en,
      image: images[0] ?? null,
      color_hex: selectedVariant.color_hex,
      color_ar: selectedVariant.color_ar,
      color_en: selectedVariant.color_en,
      size_inches: selectedVariant.size_inches,
      unitPrice: effectivePrice(product),
    });
    openDrawer();
  };

  const ctaLabel = isOOS
    ? isRTL
      ? "غير متوفر"
      : "Out of stock"
    : isRTL
      ? "أضف للكارت"
      : "Add to cart";

  return (
    <>
      {/* ============ LEFT — gallery ============ */}
      <div className="flex flex-col gap-3">
        {images[activeImage] && (
          // NATURAL-FLOW IMAGE — same pattern as the PDP gallery. width:100%
          // + height:auto + maxHeight:70vh means the source's intrinsic
          // aspect drives the box; the viewport cap only kicks in for tall
          // portrait sources that would otherwise scroll past the fold.
          <div
            key={images[activeImage]}
            className={cn(
              "relative w-full overflow-hidden rounded-2xl ring-1 ring-[var(--color-border)]",
              product.image_fit === "contain" && "bg-white",
            )}
          >
            <Image
              src={images[activeImage]}
              alt={isRTL ? product.name_ar : product.name_en}
              width={0}
              height={0}
              sizes="(min-width: 1024px) 560px, 100vw"
              priority
              className={cn(
                "block h-auto w-full",
                product.image_fit === "contain"
                  ? "object-contain p-4"
                  : "object-cover",
              )}
              style={{ maxHeight: "70vh" }}
            />
          </div>
        )}

        {images.length > 1 && (
          <div
            className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            aria-label={isRTL ? "صور المنتج" : "Product images"}
          >
            {images.map((src, idx) => (
              <button
                key={src}
                type="button"
                // eslint-disable-next-line jsx-a11y/aria-proptypes -- stringified
                // ternary produces only valid "true"|"false" literals at runtime;
                // the static analyzer can't narrow the conditional expression.
                aria-pressed={idx === activeImage ? "true" : "false"}
                aria-label={
                  isRTL ? `الصورة رقم ${idx + 1}` : `Image ${idx + 1}`
                }
                onClick={() => setActiveImage(idx)}
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg transition",
                  // Thumbnail bg matches the contain mode so product-on-white
                  // shots blend in nicely; cover mode uses the neutral surface.
                  product.image_fit === "contain"
                    ? "bg-white"
                    : "bg-[var(--color-surface-2)]",
                  idx === activeImage
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
                    product.image_fit === "contain"
                      ? "object-contain p-1"
                      : "object-cover",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ============ RIGHT — header + swatches + CTAs ============ */}
      <div className="flex flex-col gap-6">
        {header}

        {colorOptions.length > 0 && (
          <fieldset>
            <legend className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
              {isRTL ? "الألوان" : "Colors"}
            </legend>
            <div className="flex flex-wrap gap-2.5">
              {colorOptions.map((opt) => {
                const isActive = opt.variantId === selectedVariantId;
                const label = isRTL ? opt.ar : opt.en;
                return (
                  <button
                    key={opt.variantId}
                    type="button"
                    onClick={() => setSelectedVariantId(opt.variantId)}
                    aria-pressed={isActive}
                    title={label ?? ""}
                    className={cn(
                      "relative h-9 w-9 rounded-full ring-offset-2 ring-offset-[var(--color-surface)] transition",
                      isActive
                        ? "ring-2 ring-[var(--color-text)]"
                        : "ring-1 ring-[var(--color-border)] hover:ring-[var(--color-text-secondary)]",
                    )}
                    style={{ background: opt.hex }}
                  >
                    <span className="sr-only">{label ?? opt.hex}</span>
                  </button>
                );
              })}
            </div>
            {selectedVariant && (
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                {isRTL ? selectedVariant.color_ar : selectedVariant.color_en}
              </p>
            )}
          </fieldset>
        )}

        <button
          type="button"
          onClick={addToCart}
          disabled={isOOS || !selectedVariant}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-md px-7 py-3.5 text-sm font-semibold transition",
            isOOS
              ? "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
              : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)]",
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          {ctaLabel}
        </button>

        {footer}
      </div>
    </>
  );
}
