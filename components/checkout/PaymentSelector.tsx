"use client";

import type { UseFormReturn } from "react-hook-form";
import { Banknote, CreditCard, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { COD_FEE, type CheckoutValues } from "@/lib/checkout/schema";
import { cn, formatPriceEGP } from "@/lib/utils";

export function PaymentSelector({
  form,
  locale,
}: {
  form: UseFormReturn<CheckoutValues>;
  locale: Locale;
}) {
  const { register, watch } = form;
  const selected = watch("paymentMethod");

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="space-y-3">
        <legend className="sr-only">
          {locale === "ar" ? "طريقة الدفع" : "Payment method"}
        </legend>

        <PaymentOption
          id="pm-card"
          value="card"
          checked={selected === "card"}
          register={register("paymentMethod")}
          icon={<CreditCard className="h-5 w-5" />}
          title={locale === "ar" ? "بطاقة ائتمان عبر Paymob" : "Card via Paymob"}
          subtitle={
            locale === "ar"
              ? "Visa · Mastercard · Meeza — معاملة آمنة 3-D Secure"
              : "Visa · Mastercard · Meeza — 3-D Secure transaction"
          }
        />

        <PaymentOption
          id="pm-cod"
          value="cod"
          checked={selected === "cod"}
          register={register("paymentMethod")}
          icon={<Banknote className="h-5 w-5" />}
          title={locale === "ar" ? "الدفع عند الاستلام" : "Cash on delivery"}
          subtitle={
            locale === "ar"
              ? `يضاف ${formatPriceEGP(COD_FEE, locale)} رسوم تحصيل`
              : `${formatPriceEGP(COD_FEE, locale)} collection fee added`
          }
        />
      </fieldset>

      {selected === "card" && (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-[var(--color-primary)]" />
          <p className="font-semibold text-[var(--color-text)]">
            {locale === "ar" ? "Paymob iframe (مكان مؤقت)" : "Paymob iframe (placeholder)"}
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            {locale === "ar"
              ? "هيظهر هنا iframe الدفع الحقيقي بعد ما نربط مفاتيح Paymob."
              : "The real Paymob payment iframe will render here once API keys are configured."}
          </p>
        </div>
      )}

      {selected === "cod" && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text)]">
          {locale === "ar" ? (
            <>
              <p className="font-medium">هتدفع للمندوب عند استلام الطلب.</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                تأكد إن المبلغ جاهز عشان نخلص بسرعة.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">You&apos;ll pay the courier on delivery.</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Have the exact amount ready to keep things quick.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentOption({
  id,
  value,
  checked,
  register,
  icon,
  title,
  subtitle,
}: {
  id: string;
  value: "card" | "cod";
  checked: boolean;
  register: ReturnType<UseFormReturn<CheckoutValues>["register"]>;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
        checked
          ? "border-[var(--color-primary)] bg-[var(--color-bg)] ring-2 ring-[var(--color-primary)]/15"
          : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-border-dark)]",
      )}
    >
      <input
        id={id}
        type="radio"
        value={value}
        {...register}
        className="sr-only"
      />
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          checked
            ? "bg-[var(--color-primary)] text-white"
            : "bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
        )}
      >
        {icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-[var(--color-text)]">{title}</span>
        <span className="text-xs text-[var(--color-text-secondary)]">{subtitle}</span>
      </span>
    </label>
  );
}
