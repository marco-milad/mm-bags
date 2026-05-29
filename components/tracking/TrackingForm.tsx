"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import {
  verifyTrackingSchema,
  type VerifyTrackingInput,
} from "@/lib/tracking/schema";
import { cn } from "@/lib/utils";

export function TrackingForm({
  locale,
  initialOrderIdOrNumber,
  pending,
  serverError,
  onSubmit,
}: {
  locale: Locale;
  initialOrderIdOrNumber: string;
  pending: boolean;
  serverError: string | null;
  onSubmit: (values: VerifyTrackingInput) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyTrackingInput>({
    resolver: zodResolver(verifyTrackingSchema),
    mode: "onBlur",
    defaultValues: {
      orderIdOrNumber: initialOrderIdOrNumber,
      phoneLast4: "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6"
    >
      <div className="flex items-start gap-3">
        <Lock className="mt-1 h-5 w-5 text-[var(--color-primary)]" />
        <div>
          <h2 className="font-display text-xl text-[var(--color-text)]">
            {locale === "ar" ? "تتبع طلبك" : "Track your order"}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {locale === "ar"
              ? "ادخل بياناتك للتحقق من ملكية الطلب."
              : "Enter your details to verify ownership of the order."}
          </p>
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--color-text)]">
          {locale === "ar" ? "رقم الطلب" : "Order number"}
        </span>
        <input
          type="text"
          dir="ltr"
          autoComplete="off"
          placeholder="MM-2026-ABC123"
          {...register("orderIdOrNumber")}
          className={inputClass(!!errors.orderIdOrNumber)}
        />
        {errors.orderIdOrNumber && (
          <span className="text-xs text-[var(--color-error)]">
            {errors.orderIdOrNumber.message}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--color-text)]">
          {locale === "ar"
            ? "آخر 4 أرقام من رقم الموبايل"
            : "Last 4 digits of phone"}
        </span>
        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          maxLength={4}
          autoComplete="off"
          placeholder="1234"
          {...register("phoneLast4")}
          className={inputClass(!!errors.phoneLast4)}
        />
        {errors.phoneLast4 && (
          <span className="text-xs text-[var(--color-error)]">
            {errors.phoneLast4.message}
          </span>
        )}
      </label>

      {serverError && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)] disabled:opacity-70"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {locale === "ar" ? "تتبع الطلب" : "Track order"}
      </button>
    </form>
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
