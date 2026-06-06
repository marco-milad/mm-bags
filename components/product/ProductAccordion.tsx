import { ChevronDown } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { Product } from "@/lib/supabase/types";
import { ProductSpecs } from "@/components/product/ProductSpecs";

export function ProductAccordion({
  product,
  locale,
}: {
  product: Pick<
    Product,
    | "description_ar"
    | "description_en"
    | "material_ar"
    | "material_en"
    | "weight_kg"
    | "dimensions"
    | "laptop_inches"
    | "material_type"
    | "wheel_type"
    | "lock_type"
    | "capacity_liters"
    | "is_water_resistant"
    | "is_expandable"
  >;
  locale: Locale;
}) {
  const description =
    (locale === "ar" ? product.description_ar : product.description_en) ?? "";
  // Fallback prose-material line (material_ar/material_en) — surfaces above
  // the icon grid since it's free-form and complements the structured
  // material_type chip. Keeps backwards compat for products imported before
  // the specs migration.
  const proseMaterial = locale === "ar" ? product.material_ar : product.material_en;

  const sections: { title: string; content: React.ReactNode }[] = [
    {
      title: locale === "ar" ? "وصف المنتج" : "Description",
      content: description ? (
        <p className="leading-relaxed text-[var(--color-text)]">{description}</p>
      ) : (
        <p className="text-[var(--color-text-secondary)]">
          {locale === "ar" ? "لا يوجد وصف بعد." : "No description yet."}
        </p>
      ),
    },
    {
      title: locale === "ar" ? "المواصفات" : "Specifications",
      content: (
        <div className="flex flex-col gap-5">
          {proseMaterial && (
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {proseMaterial}
            </p>
          )}
          <ProductSpecs product={product} locale={locale} />
        </div>
      ),
    },
    {
      title: locale === "ar" ? "الشحن والإرجاع" : "Shipping & returns",
      content: (
        <ul className="space-y-2 text-sm text-[var(--color-text)]">
          <li>
            {locale === "ar"
              ? "شحن لكل المحافظات خلال 2–5 أيام عمل."
              : "Shipping to all governorates within 2–5 business days."}
          </li>
          <li>
            {locale === "ar"
              ? "الشحن مجاني للطلبات فوق 1,500 جنيه."
              : "Free shipping on orders over EGP 1,500."}
          </li>
          <li>
            {locale === "ar"
              ? "إرجاع مجاني خلال 14 يوم من الاستلام."
              : "Free returns within 14 days of delivery."}
          </li>
          <li>
            {locale === "ar"
              ? "متاح الدفع عند الاستلام (+25 جنيه)."
              : "Cash on delivery available (+EGP 25)."}
          </li>
        </ul>
      ),
    },
  ];

  return (
    <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
      {sections.map((section, i) => (
        <details key={section.title} className="group" open={i === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]">
            {section.title}
            <ChevronDown className="h-4 w-4 text-[var(--color-text-secondary)] transition group-open:rotate-180" />
          </summary>
          <div className="pb-5 text-sm">{section.content}</div>
        </details>
      ))}
    </div>
  );
}
