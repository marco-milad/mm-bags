import { ChevronDown } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { Product } from "@/lib/supabase/types";

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
  >;
  locale: Locale;
}) {
  const description =
    (locale === "ar" ? product.description_ar : product.description_en) ?? "";
  const material =
    (locale === "ar" ? product.material_ar : product.material_en) ?? "—";
  const weight =
    product.weight_kg !== null
      ? locale === "ar"
        ? `${product.weight_kg} كجم`
        : `${product.weight_kg} kg`
      : "—";

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
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-[var(--color-text-secondary)]">
            {locale === "ar" ? "المادة" : "Material"}
          </dt>
          <dd className="text-[var(--color-text)]">{material}</dd>
          <dt className="text-[var(--color-text-secondary)]">
            {locale === "ar" ? "الوزن" : "Weight"}
          </dt>
          <dd className="text-[var(--color-text)]">{weight}</dd>
        </dl>
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
