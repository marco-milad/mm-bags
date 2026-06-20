"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n-config";
import type { ProductWithVariants } from "@/lib/catalog-shared";
import { ProductGallery } from "./ProductGallery";
import { ProductActions } from "./ProductActions";
import { ProductAccordion } from "./ProductAccordion";

/**
 * Client wrapper for the PDP's two-column hero (gallery + buy-box).
 * Owns the cross-component hovered-color state so a color swatch in
 * ProductActions can preview the matching product image in ProductGallery
 * without either component knowing about the other.
 *
 * Mapping color → image: we walk product_variants in insertion order,
 * collect distinct color_hex values, and use that index into
 * product.images. So images[0] belongs to the first-seen color,
 * images[1] to the second, and so on — admins line the image array up
 * with the color order. If a color has no matching image (color index ≥
 * images.length) we leave the gallery on the selected image rather than
 * flashing to a wrong one.
 *
 * The header block (collection chip / name / star summary) lives in the
 * right column above ProductActions and is passed in as `header` so the
 * page server-renders it and ships the rendered tree down — no need to
 * port its data fetches into the client.
 */
// Collections that opt into the compact PDP layout: slim h-12 thumb
// strip, progressive-disclosure thumb (+N) tile when images > 6, and
// progressive-disclosure colour (+N more) pill when colours > 6.
// Products outside these collections render byte-identically to the
// default ProductGallery / ProductActions paths.
//
// Why a set: started as a slug-scoped canary on bs-milano-classic,
// then promoted to the milano-series collection after on-phone QA.
// Add other crowded collections here when they need the same treatment.
const COMPACT_COLLECTION_SLUGS: ReadonlySet<string> = new Set([
  "milano-series",
  // Calvin Klein luggage ships 14 images — without the compact strip
  // the thumbnail rail's min-content reaches ~1024 px on mobile and
  // drags the whole grid column past the viewport.
  "calvin-klein",
]);

export function ProductDetailLayout({
  product,
  collectionSlug,
  locale,
  name,
  whatsappNumber,
  header,
}: {
  product: ProductWithVariants;
  /** Slug of the product's parent collection (joined from the
      collections table by the PDP server page). Drives the
      compact-layout policy below. Pass `null` when the product has
      no collection. */
  collectionSlug: string | null;
  locale: Locale;
  name: string;
  whatsappNumber: string;
  /** Server-rendered breadcrumb-like header block placed above the
      ProductActions buy-box (h1, collection chip, review stars). */
  header: React.ReactNode;
}) {
  const useCompactLayout =
    collectionSlug !== null && COMPACT_COLLECTION_SLUGS.has(collectionSlug);

  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  // Distinct color hexes in the order they first appear on the variant
  // list. Memoised because variants don't change for the lifetime of
  // this PDP render.
  const colorOrder = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const v of product.product_variants) {
      if (v.color_hex && !seen.has(v.color_hex)) {
        seen.add(v.color_hex);
        list.push(v.color_hex);
      }
    }
    return list;
  }, [product.product_variants]);

  const previewImageIndex = useMemo(() => {
    if (!hoveredColor) return null;
    const idx = colorOrder.indexOf(hoveredColor);
    if (idx < 0) return null;
    // Guard against admins with fewer images than colors — pinning to
    // the current selection beats jumping to a wrong-color image.
    if (idx >= product.images.length) return null;
    return idx;
  }, [hoveredColor, colorOrder, product.images.length]);

  return (
    // `[&>*]:min-w-0` overrides the CSS Grid default of `min-width:
    // auto` (= min-content) on both columns. Without it, any wide
    // descendant — a 14-thumb gallery rail, a long unbreakable word in
    // the description — drags the single-column mobile track past the
    // viewport, and `overflow-x-clip` on <main> hides the bleed
    // instead of preventing it. Tailwind's `md:grid-cols-2` already
    // resolves to `minmax(0, 1fr)` on desktop, so this only changes
    // mobile / sub-md behavior.
    <div className="grid gap-8 md:grid-cols-2 md:gap-12 [&>*]:min-w-0">
      <ProductGallery
        images={product.images}
        name={name}
        locale={locale}
        imageFit={product.image_fit}
        imageAspect={product.image_aspect}
        previewImageIndex={previewImageIndex}
        compact={useCompactLayout}
      />

      <div className="flex flex-col gap-6">
        {header}

        <ProductActions
          product={product}
          locale={locale}
          whatsappNumber={whatsappNumber}
          onColorHover={setHoveredColor}
          compact={useCompactLayout}
        />

        <ProductAccordion product={product} locale={locale} />
      </div>
    </div>
  );
}
