"use client";

import type { Locale } from "@/lib/i18n-config";
import { EG_GOVERNORATES } from "@/lib/checkout/governorates";
import type { CheckoutValues } from "@/lib/checkout/schema";
import { calcTotals } from "@/lib/checkout/schema";
import { formatPriceEGP } from "@/lib/utils";
import type { CartItem } from "@/store/cart";

export function OrderReview({
  values,
  items,
  locale,
}: {
  values: CheckoutValues;
  items: CartItem[];
  locale: Locale;
}) {
  const totals = calcTotals(items, values.paymentMethod);
  const governorate = EG_GOVERNORATES.find((g) => g.code === values.governorate);
  const governorateName = governorate
    ? locale === "ar"
      ? governorate.name_ar
      : governorate.name_en
    : values.governorate;

  return (
    <div className="flex flex-col gap-6">
      <Section title={locale === "ar" ? "ملخص الطلب" : "Order summary"}>
        <ul className="divide-y divide-[var(--color-border)]">
          {items.map((item) => {
            const name = locale === "ar" ? item.name_ar : item.name_en;
            const colorLabel =
              (locale === "ar" ? item.color_ar : item.color_en) ?? null;
            return (
              <li key={item.variantId} className="flex justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="line-clamp-1 font-medium text-[var(--color-text)]">
                    {name}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {[
                      colorLabel,
                      item.size_inches ? `${item.size_inches}"` : null,
                      `× ${item.qty}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <p className="font-mono text-sm font-semibold text-[var(--color-text)]">
                  {formatPriceEGP(item.unitPrice * item.qty, locale)}
                </p>
              </li>
            );
          })}
        </ul>

        <dl className="mt-4 space-y-1.5 border-t border-[var(--color-border)] pt-4 text-sm">
          <SummaryRow
            label={locale === "ar" ? "الإجمالي الفرعي" : "Subtotal"}
            value={formatPriceEGP(totals.subtotal, locale)}
          />
          <SummaryRow
            label={locale === "ar" ? "الشحن" : "Shipping"}
            value={
              totals.shippingFee === 0
                ? locale === "ar"
                  ? "مجاناً"
                  : "Free"
                : formatPriceEGP(totals.shippingFee, locale)
            }
          />
          {totals.codFee > 0 && (
            <SummaryRow
              label={locale === "ar" ? "رسوم الدفع عند الاستلام" : "Cash-on-delivery fee"}
              value={formatPriceEGP(totals.codFee, locale)}
            />
          )}
          <div className="flex justify-between border-t border-[var(--color-border)] pt-2 text-base">
            <dt className="font-semibold text-[var(--color-text)]">
              {locale === "ar" ? "الإجمالي" : "Total"}
            </dt>
            <dd className="font-mono font-semibold text-[var(--color-primary)]">
              {formatPriceEGP(totals.total, locale)}
            </dd>
          </div>
        </dl>
      </Section>

      <Section title={locale === "ar" ? "عنوان الشحن" : "Shipping address"}>
        <p className="text-sm font-medium text-[var(--color-text)]">{values.name}</p>
        <p className="text-sm text-[var(--color-text-secondary)]" dir="ltr">
          {values.phone}
        </p>
        {values.email && (
          <p className="text-sm text-[var(--color-text-secondary)]" dir="ltr">
            {values.email}
          </p>
        )}
        <p className="mt-1 text-sm text-[var(--color-text)]">
          {[values.street, values.building].filter(Boolean).join(" · ")}
        </p>
        <p className="text-sm text-[var(--color-text)]">
          {[values.city, governorateName].filter(Boolean).join(" — ")}
        </p>
        {values.notes && (
          <p className="mt-2 rounded-md bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
            {values.notes}
          </p>
        )}
      </Section>

      <Section title={locale === "ar" ? "طريقة الدفع" : "Payment method"}>
        <p className="text-sm text-[var(--color-text)]">
          {values.paymentMethod === "card"
            ? locale === "ar"
              ? "بطاقة ائتمان عبر Paymob"
              : "Card via Paymob"
            : locale === "ar"
              ? `الدفع عند الاستلام (+${formatPriceEGP(totals.codFee, locale)})`
              : `Cash on delivery (+${formatPriceEGP(totals.codFee, locale)})`}
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-[var(--color-text-secondary)]">{label}</dt>
      <dd className="font-mono text-[var(--color-text)]">{value}</dd>
    </div>
  );
}
