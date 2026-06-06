import {
  Droplets,
  Key,
  Layers,
  Laptop,
  Lock,
  Maximize2,
  PackageOpen,
  Ruler,
  RotateCw,
  Weight,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { Product } from "@/lib/supabase/types";

type SpecsSubset = Pick<
  Product,
  | "dimensions"
  | "weight_kg"
  | "laptop_inches"
  | "material_type"
  | "wheel_type"
  | "lock_type"
  | "capacity_liters"
  | "is_water_resistant"
  | "is_expandable"
>;

export type SpecRow = {
  key: string;
  Icon: LucideIcon;
  label: string;
  value: string;
};

/**
 * Returns the populated spec rows for a product, in the order the design
 * system wants them displayed. Use `slice(0, N)` on the card to cap.
 * Skips falsy values so e.g. a soft bag with no wheel never gets a "—".
 */
export function buildSpecRows(
  product: SpecsSubset,
  locale: Locale,
): SpecRow[] {
  const isRTL = locale === "ar";
  const rows: SpecRow[] = [];

  if (product.dimensions) {
    rows.push({
      key: "dimensions",
      Icon: Ruler,
      label: isRTL ? "الأبعاد" : "Dimensions",
      value: product.dimensions,
    });
  }
  if (product.weight_kg !== null && product.weight_kg !== undefined) {
    rows.push({
      key: "weight",
      Icon: Weight,
      label: isRTL ? "الوزن" : "Weight",
      value: isRTL ? `${product.weight_kg} كجم` : `${product.weight_kg} kg`,
    });
  }
  if (product.laptop_inches !== null && product.laptop_inches !== undefined) {
    rows.push({
      key: "laptop",
      Icon: Laptop,
      label: isRTL ? "سعة اللاب توب" : "Laptop fit",
      value: isRTL
        ? `حتى ${product.laptop_inches} بوصة`
        : `Up to ${product.laptop_inches}″`,
    });
  }
  if (product.material_type) {
    rows.push({
      key: "material",
      Icon: Layers,
      label: isRTL ? "المادة" : "Material",
      value: product.material_type,
    });
  }
  if (product.capacity_liters !== null && product.capacity_liters !== undefined) {
    rows.push({
      key: "capacity",
      Icon: PackageOpen,
      label: isRTL ? "السعة" : "Capacity",
      value: isRTL
        ? `${product.capacity_liters} لتر`
        : `${product.capacity_liters}L`,
    });
  }
  if (product.wheel_type) {
    rows.push({
      key: "wheels",
      Icon: RotateCw,
      label: isRTL ? "نوع العجل" : "Wheels",
      value: product.wheel_type,
    });
  }
  if (product.lock_type) {
    rows.push({
      key: "lock",
      Icon: Lock,
      label: isRTL ? "نوع القفل" : "Lock",
      value: product.lock_type,
    });
  }
  if (product.is_water_resistant) {
    rows.push({
      key: "water",
      Icon: Droplets,
      label: isRTL ? "مقاوم للماء" : "Water-resistant",
      value: isRTL ? "نعم" : "Yes",
    });
  }
  if (product.is_expandable) {
    rows.push({
      key: "expandable",
      Icon: Maximize2,
      label: isRTL ? "قابل للتمديد" : "Expandable",
      value: isRTL ? "نعم" : "Yes",
    });
  }

  return rows;
}

/**
 * Full specs grid for the product detail page accordion. Renders nothing
 * when the product has no specs set (lets the caller suppress the section
 * header in that case via `hasSpecs(product)` if desired).
 */
export function ProductSpecs({
  product,
  locale,
}: {
  product: SpecsSubset;
  locale: Locale;
}) {
  const isRTL = locale === "ar";
  const rows = buildSpecRows(product, locale);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        {isRTL ? "لم تُضف المواصفات بعد." : "Specifications haven't been added yet."}
      </p>
    );
  }

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {rows.map(({ key, Icon, label, value }) => (
        <div key={key} className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-primary)]"
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="flex flex-col">
            <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
              {label}
            </dt>
            <dd className="text-sm text-[var(--color-text)]">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

/**
 * Compact, icon-only chip row for ProductCard. Caps at `max` (default 3).
 * Tooltip via `title` so power users still get the label on hover.
 */
export function ProductSpecsChips({
  product,
  locale,
  max = 3,
}: {
  product: SpecsSubset;
  locale: Locale;
  max?: number;
}) {
  const rows = buildSpecRows(product, locale).slice(0, max);
  if (rows.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {rows.map(({ key, Icon, label, value }) => (
        <li
          key={key}
          title={`${label}: ${value}`}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]"
        >
          <Icon className="h-3 w-3" strokeWidth={1.75} aria-hidden />
          <span className="leading-none">{shortValue(key, value)}</span>
        </li>
      ))}
    </ul>
  );
}

// Card chips have limited room; trim long dimensions or wordy labels into
// something that fits in ~5 chars without losing meaning.
function shortValue(key: string, value: string): string {
  if (key === "dimensions") {
    // "44cm × 29.5cm × 23.5cm" → "44×29×23"
    const m = value.match(/(\d+(?:\.\d+)?)/g);
    if (m && m.length >= 3) {
      return m
        .slice(0, 3)
        .map((n) => Math.round(Number(n)))
        .join("×");
    }
  }
  return value;
}

// Tiny helper a caller can use to decide whether to render the whole specs
// accordion section at all (e.g. to hide the "Specifications" header when
// no specs are populated).
export function hasSpecs(product: SpecsSubset): boolean {
  return buildSpecRows(product, "en").length > 0;
}
