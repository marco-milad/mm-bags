"use client";

import type { UseFormReturn } from "react-hook-form";
import type { Locale } from "@/lib/i18n-config";
import { EG_GOVERNORATES } from "@/lib/checkout/governorates";
import type { CheckoutValues } from "@/lib/checkout/schema";
import { cn } from "@/lib/utils";

export function ShippingForm({
  form,
  locale,
}: {
  form: UseFormReturn<CheckoutValues>;
  locale: Locale;
}) {
  const {
    register,
    formState: { errors },
  } = form;

  const labels =
    locale === "ar"
      ? {
          name: "الاسم بالكامل",
          phone: "رقم الموبايل",
          phoneHint: "11 رقم يبدأ بـ 010 / 011 / 012 / 015",
          email: "البريد الإلكتروني (اختياري)",
          governorate: "المحافظة",
          governoratePlaceholder: "اختار المحافظة",
          city: "المدينة / المنطقة",
          street: "اسم الشارع",
          building: "رقم المبنى / الشقة (اختياري)",
          notes: "ملاحظات للمندوب (اختياري)",
        }
      : {
          name: "Full name",
          phone: "Phone number",
          phoneHint: "11 digits starting with 010 / 011 / 012 / 015",
          email: "Email (optional)",
          governorate: "Governorate",
          governoratePlaceholder: "Select governorate",
          city: "City / Area",
          street: "Street",
          building: "Building / Apt (optional)",
          notes: "Notes for the courier (optional)",
        };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Field
        label={labels.name}
        error={errors.name?.message}
        className="md:col-span-2"
      >
        <input
          type="text"
          autoComplete="name"
          {...register("name")}
          className={inputClass(!!errors.name)}
        />
      </Field>

      <Field
        label={labels.phone}
        hint={labels.phoneHint}
        error={errors.phone?.message}
      >
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          dir="ltr"
          {...register("phone")}
          className={inputClass(!!errors.phone)}
          placeholder="01012345678"
        />
      </Field>

      <Field label={labels.email} error={errors.email?.message}>
        <input
          type="email"
          autoComplete="email"
          dir="ltr"
          {...register("email")}
          className={inputClass(!!errors.email)}
        />
      </Field>

      <Field label={labels.governorate} error={errors.governorate?.message}>
        <select
          {...register("governorate")}
          className={inputClass(!!errors.governorate)}
          defaultValue=""
        >
          <option value="" disabled>
            {labels.governoratePlaceholder}
          </option>
          {EG_GOVERNORATES.map((g) => (
            <option key={g.code} value={g.code}>
              {locale === "ar" ? g.name_ar : g.name_en}
            </option>
          ))}
        </select>
      </Field>

      <Field label={labels.city} error={errors.city?.message}>
        <input
          type="text"
          autoComplete="address-level2"
          {...register("city")}
          className={inputClass(!!errors.city)}
        />
      </Field>

      <Field
        label={labels.street}
        error={errors.street?.message}
        className="md:col-span-2"
      >
        <input
          type="text"
          autoComplete="address-line1"
          {...register("street")}
          className={inputClass(!!errors.street)}
        />
      </Field>

      <Field label={labels.building} error={errors.building?.message}>
        <input
          type="text"
          autoComplete="address-line2"
          {...register("building")}
          className={inputClass(!!errors.building)}
        />
      </Field>

      <Field
        label={labels.notes}
        error={errors.notes?.message}
        className="md:col-span-2"
      >
        <textarea
          rows={3}
          {...register("notes")}
          className={cn(inputClass(!!errors.notes), "resize-none")}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <span className="font-medium text-[var(--color-text)]">{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-[var(--color-error)]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[var(--color-text-secondary)]">{hint}</span>
      ) : null}
    </label>
  );
}

function inputClass(hasError: boolean) {
  return cn(
    "rounded-lg border bg-[var(--color-bg)] px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
    hasError
      ? "border-[var(--color-error)]"
      : "border-[var(--color-border)] hover:border-[var(--color-border-dark)]",
  );
}
