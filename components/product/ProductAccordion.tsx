import Link from "next/link";
import {
  ChevronDown,
  RefreshCcw,
  ShieldCheck,
  Truck,
  Wallet,
} from "lucide-react";
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
  const isAr = locale === "ar";

  // Shipping & returns is a list of trust cues; giving each row a
  // themed brass icon reads as a policy summary rather than a plain
  // bulleted list. Also lets the row wrap gracefully on mobile
  // without losing the "which cue is this" affordance.
  const shippingCues: {
    icon: typeof Truck;
    text: string;
  }[] = [
    {
      icon: Truck,
      text: isAr
        ? "شحن لكل الـ 27 محافظة خلال 2–5 أيام عمل."
        : "Ships to all 27 governorates within 2–5 business days.",
    },
    {
      icon: Wallet,
      text: isAr
        ? "الشحن مجاني للطلبات فوق 1,500 جنيه."
        : "Free shipping on orders over EGP 1,500.",
    },
    {
      icon: RefreshCcw,
      text: isAr
        ? "إرجاع مجاني خلال 14 يوم من الاستلام."
        : "Free returns within 14 days of delivery.",
    },
    {
      icon: ShieldCheck,
      text: isAr
        ? "الدفع عند الاستلام متاح (+25 جنيه رسوم)."
        : "Cash on delivery available (+EGP 25 fee).",
    },
  ];
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
        <div className="flex flex-col gap-4">
          <ul className="space-y-3 text-sm text-[var(--color-text)]">
            {shippingCues.map((cue, idx) => {
              const Icon = cue.icon;
              return (
                <li key={idx} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent-dark)]"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="leading-relaxed">{cue.text}</span>
                </li>
              );
            })}
          </ul>
          {/* Deep-link to the two policies so a shopper who needs the
              full terms doesn't have to hunt the footer. */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-secondary)]">
            <Link
              href={`/${locale}/shipping-policy`}
              className="underline-offset-4 hover:text-[var(--color-text)] hover:underline"
            >
              {isAr ? "سياسة الشحن الكاملة" : "Full shipping policy"}
            </Link>
            <Link
              href={`/${locale}/refund-policy`}
              className="underline-offset-4 hover:text-[var(--color-text)] hover:underline"
            >
              {isAr ? "سياسة الإرجاع الكاملة" : "Full refund policy"}
            </Link>
          </div>
        </div>
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
