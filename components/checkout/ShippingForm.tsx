"use client";

import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Truck } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { EG_GOVERNORATES } from "@/lib/checkout/governorates";
import type { CheckoutValues } from "@/lib/checkout/schema";
import { checkoutFieldMessage } from "@/lib/checkout/error-messages";
import {
  DELIVERY_HOURS_MAX,
  DELIVERY_HOURS_MIN,
  type ShippingZone,
  zoneName,
  zonesFor,
} from "@/lib/shipping/shared";
import { cn, formatPriceEGP } from "@/lib/utils";

export function ShippingForm({
  form,
  locale,
  zones,
  freeShipping,
}: {
  form: UseFormReturn<CheckoutValues>;
  locale: Locale;
  /** Active shipping areas (server-read). */
  zones: ReadonlyArray<ShippingZone>;
  /** The order already qualifies for free shipping. */
  freeShipping: boolean;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const isAr = locale === "ar";
  const governorate = watch("governorate");
  const zoneId = watch("shippingZoneId");
  const govZones = zonesFor(zones, governorate);
  const zone = govZones.find((z) => z.id === zoneId) ?? null;

  // A new governorate invalidates the area. One-area governorates pick it
  // for the shopper; the others wait for an explicit choice (prices differ).
  // Skips the first run so a restored form keeps its area.
  const lastGov = useRef(governorate);
  useEffect(() => {
    if (lastGov.current === governorate) return;
    lastGov.current = governorate;
    const options = zonesFor(zones, governorate);
    setValue("shippingZoneId", options.length === 1 ? options[0].id : "", {
      shouldValidate: false,
      shouldDirty: true,
    });
  }, [governorate, zones, setValue]);

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
        id="shipping-name"
        label={labels.name}
        error={errors.name ? checkoutFieldMessage("name", locale) : undefined}
        className="md:col-span-2"
      >
        <input
          type="text"
          autoComplete="name"
          {...fieldA11y("shipping-name", !!errors.name)}
          {...register("name")}
          className={inputClass(!!errors.name)}
        />
      </Field>

      <Field
        id="shipping-phone"
        label={labels.phone}
        hint={labels.phoneHint}
        error={errors.phone ? checkoutFieldMessage("phone", locale) : undefined}
      >
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          dir="ltr"
          {...fieldA11y("shipping-phone", !!errors.phone, true)}
          {...register("phone")}
          className={inputClass(!!errors.phone)}
          placeholder="01012345678"
        />
      </Field>

      <Field id="shipping-email" label={labels.email} error={errors.email ? checkoutFieldMessage("email", locale) : undefined}>
        <input
          type="email"
          autoComplete="email"
          dir="ltr"
          {...fieldA11y("shipping-email", !!errors.email)}
          {...register("email")}
          className={inputClass(!!errors.email)}
        />
      </Field>

      <Field id="shipping-governorate" label={labels.governorate} error={errors.governorate ? checkoutFieldMessage("governorate", locale) : undefined}>
        <select
          {...fieldA11y("shipping-governorate", !!errors.governorate)}
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

      {governorate && govZones.length > 1 && (
        <Field
          id="shipping-zone"
          label={isAr ? "المنطقة" : "Area"}
          error={errors.shippingZoneId ? checkoutFieldMessage("shippingZoneId", locale) : undefined}
          className="md:col-span-2"
        >
          <select
            {...fieldA11y("shipping-zone", !!errors.shippingZoneId)}
            {...register("shippingZoneId")}
            className={inputClass(!!errors.shippingZoneId)}
          >
            <option value="" disabled>
              {isAr ? "اختار منطقتك" : "Select your area"}
            </option>
            {govZones.map((z) => (
              <option key={z.id} value={z.id}>
                {zoneName(z, locale)}
                {freeShipping ? "" : ` · ${formatPriceEGP(z.fee, locale)}`}
              </option>
            ))}
          </select>
        </Field>
      )}

      {/* One-area governorates: the area is set for the shopper, but it still
          needs a registered input to travel with the form. */}
      {govZones.length <= 1 && <input type="hidden" {...register("shippingZoneId")} />}

      {governorate && govZones.length === 0 && (
        <p role="alert" className="text-sm text-[var(--color-error)] md:col-span-2">
          {isAr
            ? "مش قادرين نحسب الشحن للمحافظة دي دلوقتي. كلّمنا على واتساب ونكمّل معاك الطلب."
            : "We can't price shipping to this governorate right now. Message us on WhatsApp and we'll complete your order."}
        </p>
      )}

      {zone && (
        <p
          aria-live="polite"
          className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] md:col-span-2"
        >
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
          <span>
            <span className="font-semibold">
              {isAr ? "الشحن لـ" : "Shipping to"} {zoneName(zone, locale)}:{" "}
              {freeShipping ? (isAr ? "مجاني" : "free") : formatPriceEGP(zone.fee, locale)}
            </span>
            <span className="block text-xs text-[var(--color-text-secondary)]">
              {isAr
                ? `بيوصلك خلال ${DELIVERY_HOURS_MIN}–${DELIVERY_HOURS_MAX} ساعة من تسليم الطلب لشركة الشحن، بعد ما نأكده معاك.`
                : `Arrives ${DELIVERY_HOURS_MIN}–${DELIVERY_HOURS_MAX} hours after we hand it to the courier, once we've confirmed it with you.`}
            </span>
          </span>
        </p>
      )}

      <Field id="shipping-city" label={labels.city} error={errors.city ? checkoutFieldMessage("city", locale) : undefined}>
        <input
          type="text"
          autoComplete="address-level2"
          {...fieldA11y("shipping-city", !!errors.city)}
          {...register("city")}
          className={inputClass(!!errors.city)}
        />
      </Field>

      <Field
        id="shipping-street"
        label={labels.street}
        error={errors.street ? checkoutFieldMessage("street", locale) : undefined}
        className="md:col-span-2"
      >
        <input
          type="text"
          autoComplete="address-line1"
          {...fieldA11y("shipping-street", !!errors.street)}
          {...register("street")}
          className={inputClass(!!errors.street)}
        />
      </Field>

      <Field id="shipping-building" label={labels.building} error={errors.building ? checkoutFieldMessage("building", locale) : undefined}>
        <input
          type="text"
          autoComplete="address-line2"
          {...fieldA11y("shipping-building", !!errors.building)}
          {...register("building")}
          className={inputClass(!!errors.building)}
        />
      </Field>

      <Field
        id="shipping-notes"
        label={labels.notes}
        error={errors.notes ? checkoutFieldMessage("notes", locale) : undefined}
        className="md:col-span-2"
      >
        <textarea
          rows={3}
          {...fieldA11y("shipping-notes", !!errors.notes)}
          {...register("notes")}
          className={cn(inputClass(!!errors.notes), "resize-none")}
        />
      </Field>
    </div>
  );
}

// M7: the control inside each Field must carry the same `id` (via
// fieldA11y) so its aria-describedby points at this Field's error — or its
// hint when there is no error — and screen readers announce the message.
function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // The <label> wraps only the title so the error/hint text stays out of
    // the control's accessible name (it is announced once, as a description).
    <div className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <label htmlFor={id} className="font-medium text-[var(--color-text)]">
        {label}
      </label>
      {children}
      {error ? (
        <span id={`${id}-error`} role="alert" className="text-xs text-[var(--color-error)]">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="text-xs text-[var(--color-text-secondary)]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function fieldA11y(id: string, hasError: boolean, hasHint = false) {
  return {
    id,
    "aria-invalid": hasError,
    "aria-describedby": hasError
      ? `${id}-error`
      : hasHint
        ? `${id}-hint`
        : undefined,
  };
}

function inputClass(hasError: boolean) {
  return cn(
    "rounded-lg border bg-[var(--color-bg)] px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
    hasError
      ? "border-[var(--color-error)]"
      : "border-[var(--color-border)] hover:border-[var(--color-border-dark)]",
  );
}
