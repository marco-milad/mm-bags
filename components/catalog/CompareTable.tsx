import Image from "next/image";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import {
  effectivePrice,
  type ProductWithVariants,
} from "@/lib/catalog-shared";
import { cn, formatPriceEGP } from "@/lib/utils";

/**
 * Side-by-side product comparison.
 *
 * Layout: each product is a column, each spec a row. On mobile the table
 * scrolls horizontally and the spec-name column sticks to the inline-start
 * edge so users never lose the row label.
 *
 * Highlighting: the lowest-price cell and the most-colors cell get a brass
 * tint so customers can scan for "best of" at a glance. Other rows could
 * follow (lightest, biggest capacity, etc.) but per the brief we hold to
 * those two.
 */
export function CompareTable({
  locale,
  products,
}: {
  locale: Locale;
  products: ProductWithVariants[];
}) {
  const isRTL = locale === "ar";

  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-secondary)]">
        {isRTL
          ? "مفيش منتجات للمقارنة في التشكيلة دي."
          : "No products to compare in this collection."}
      </p>
    );
  }

  // ─── Derived values per product ──────────────────────────────────
  const derived = products.map((p) => {
    const sizes = Array.from(
      new Set(
        p.product_variants
          .map((v) => v.size_inches)
          .filter((s): s is number => typeof s === "number"),
      ),
    ).sort((a, b) => a - b);

    const colors = new Set(
      p.product_variants
        .map((v) => v.color_hex)
        .filter((c): c is string => Boolean(c)),
    );

    return {
      product: p,
      price: effectivePrice(p),
      hasSale: p.sale_price !== null && p.sale_price < p.base_price,
      sizes,
      colorCount: colors.size,
    };
  });

  // Best-of indices — cells matching these get the brass-tint class. We
  // mark ALL ties (Math.min/max) so a 3-way price tie all highlight.
  const minPrice = Math.min(...derived.map((d) => d.price));
  const maxColors = Math.max(...derived.map((d) => d.colorCount));

  // Spec rows. `value(d)` is called per product; `bestIdx` is a predicate
  // that returns true for highlighted cells. Pulling rows out as data
  // (rather than hand-writing each <tr>) keeps the JSX flat.
  type Row = {
    key: string;
    label: string;
    render: (d: (typeof derived)[number]) => React.ReactNode;
    bestIdx?: (d: (typeof derived)[number]) => boolean;
  };

  const rows: Row[] = [
    {
      key: "price",
      label: isRTL ? "السعر" : "Price",
      render: (d) => (
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-mono text-sm font-semibold text-[var(--color-primary)]">
            {formatPriceEGP(d.price, locale)}
          </span>
          {d.hasSale && (
            <span className="font-mono text-[10px] text-[var(--color-text-secondary)] line-through">
              {formatPriceEGP(d.product.base_price, locale)}
            </span>
          )}
        </div>
      ),
      bestIdx: (d) => d.price === minPrice,
    },
    {
      key: "sizes",
      label: isRTL ? "المقاسات المتاحة" : "Available sizes",
      render: (d) =>
        d.sizes.length > 0
          ? d.sizes.map((s) => `${s}"`).join(" · ")
          : <Dash />,
    },
    {
      key: "dimensions",
      label: isRTL ? "الأبعاد" : "Dimensions",
      render: (d) => d.product.dimensions || <Dash />,
    },
    {
      key: "weight",
      label: isRTL ? "الوزن" : "Weight",
      render: (d) =>
        d.product.weight_kg !== null && d.product.weight_kg !== undefined
          ? isRTL
            ? `${d.product.weight_kg} كجم`
            : `${d.product.weight_kg} kg`
          : <Dash />,
    },
    {
      key: "material",
      label: isRTL ? "المادة" : "Material",
      render: (d) => d.product.material_type || <Dash />,
    },
    {
      key: "wheels",
      label: isRTL ? "نوع العجل" : "Wheels",
      render: (d) => d.product.wheel_type || <Dash />,
    },
    {
      key: "lock",
      label: isRTL ? "نوع القفل" : "Lock",
      render: (d) => d.product.lock_type || <Dash />,
    },
    {
      key: "expandable",
      label: isRTL ? "قابل للتمديد" : "Expandable",
      render: (d) =>
        d.product.is_expandable ? (
          <Check className="mx-auto h-4 w-4 text-[var(--color-success)]" />
        ) : (
          <Dash />
        ),
    },
    {
      key: "colors",
      label: isRTL ? "عدد الألوان" : "Colors",
      render: (d) => (
        <span className="font-mono text-sm tabular-nums">
          {d.colorCount}
        </span>
      ),
      bestIdx: (d) => d.colorCount === maxColors && d.colorCount > 0,
    },
  ];

  // Sticky-column styles. Tailwind's `start-0` maps to `inset-inline-start`
  // so the spec-name column pins to the right edge in RTL and left in LTR.
  const stickyHead = cn(
    "sticky start-0 z-10 bg-[var(--color-bg)]",
    "border-e border-[var(--color-border)]",
  );

  return (
    <div className="-mx-4 overflow-x-auto md:mx-0">
      <table className="w-full min-w-[640px] border-separate border-spacing-0">
        {/* ─── Header row: image + name per product ────────────── */}
        <thead>
          <tr>
            <th
              scope="col"
              className={cn(
                stickyHead,
                "w-40 bg-navy-900 px-4 py-4 text-start text-xs font-semibold uppercase tracking-wider text-paper md:w-48",
              )}
            >
              {isRTL ? "الموديل" : "Model"}
            </th>
            {derived.map(({ product }) => {
              const name = isRTL ? product.name_ar : product.name_en;
              const img = product.images?.[0];
              return (
                <th
                  key={product.id}
                  scope="col"
                  className="min-w-[180px] bg-navy-900 px-3 py-4 text-center align-bottom text-paper"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Link
                      href={`/${locale}/products/${product.slug}`}
                      className="block"
                      aria-label={name}
                    >
                      <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-white/10">
                        {img && (
                          <Image
                            src={img}
                            alt={name}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        )}
                      </div>
                    </Link>
                    <Link
                      href={`/${locale}/products/${product.slug}`}
                      className="line-clamp-2 text-xs font-medium text-paper hover:text-brass-300 md:text-sm"
                    >
                      {name}
                    </Link>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* ─── Spec rows ──────────────────────────────────────── */}
        <tbody>
          {rows.map((row, rowIdx) => {
            // Alternating row backgrounds for readability. We do this on
            // the row itself rather than zebra-striping cells so the
            // sticky column tracks the row tint without a hard seam.
            const zebra =
              rowIdx % 2 === 0
                ? "bg-[var(--color-bg)]"
                : "bg-[var(--color-surface)]";

            return (
              <tr key={row.key}>
                <th
                  scope="row"
                  className={cn(
                    stickyHead,
                    zebra,
                    "px-4 py-4 text-start text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] md:text-sm",
                  )}
                >
                  {row.label}
                </th>
                {derived.map((d) => {
                  const isBest = row.bestIdx?.(d) ?? false;
                  return (
                    <td
                      key={d.product.id}
                      className={cn(
                        zebra,
                        "border-t border-[var(--color-border)] px-3 py-4 text-center text-sm text-[var(--color-text)]",
                        // Brass tint for the "best" cell. Slightly stronger
                        // than the row background so it pops against zebra.
                        isBest &&
                          "bg-brass-500/15 font-semibold text-[var(--color-primary)] ring-1 ring-inset ring-brass-500/40",
                      )}
                    >
                      {row.render(d)}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* ─── Buy CTA row ────────────────────────────────────── */}
          <tr>
            <th
              scope="row"
              className={cn(
                stickyHead,
                "bg-[var(--color-bg)] px-4 py-5 text-start",
              )}
            >
              <span className="sr-only">
                {isRTL ? "اشتري" : "Buy"}
              </span>
            </th>
            {derived.map((d) => (
              <td
                key={d.product.id}
                className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-5 text-center"
              >
                <Link
                  href={`/${locale}/products/${d.product.slug}`}
                  className="inline-flex w-full max-w-[140px] items-center justify-center rounded-full bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
                >
                  {isRTL ? "اشتري دلوقتي" : "Buy now"}
                </Link>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Subtle placeholder when a spec value isn't set on the product. */
function Dash() {
  return <Minus className="mx-auto h-4 w-4 text-[var(--color-text-secondary)]" aria-hidden />;
}
