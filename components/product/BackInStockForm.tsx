"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, Check, Loader2, Mail, MessageCircle } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { backInStockSchema, type BackInStockInput } from "@/lib/notifications/schema";
import { subscribeBackInStock } from "@/lib/notifications/actions";
import { cn } from "@/lib/utils";

export function BackInStockForm({
  productId,
  variantId,
  locale,
}: {
  productId: string;
  variantId: string;
  locale: Locale;
}) {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BackInStockInput>({
    resolver: zodResolver(backInStockSchema),
    mode: "onBlur",
    defaultValues: {
      productId,
      variantId,
      channel: "whatsapp",
      email: "",
      phone: "",
    },
  });

  const channel = watch("channel");

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await subscribeBackInStock({
        productId,
        variantId,
        channel: values.channel,
        email: values.channel === "email" ? values.email : undefined,
        phone: values.channel === "whatsapp" ? values.phone : undefined,
      });
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      setDone(true);
    });
  });

  if (done) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-4 py-3 text-sm font-medium text-[var(--color-success)]"
      >
        <Check className="h-4 w-4" />
        {locale === "ar"
          ? "هنبعتلك إشعار لما يرجع ✅"
          : "We'll notify you when it's back ✅"}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      <div className="flex items-start gap-2">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
        <p className="text-sm font-medium text-[var(--color-text)]">
          {locale === "ar" ? "نبّهني لما يرجع" : "Notify me when it's back"}
        </p>
      </div>

      {/* Channel toggle */}
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">
          {locale === "ar" ? "وسيلة التواصل" : "Notification channel"}
        </legend>
        <ChannelOption
          checked={channel === "whatsapp"}
          icon={<MessageCircle className="h-4 w-4" />}
          label={locale === "ar" ? "واتساب" : "WhatsApp"}
          onClick={() => setValue("channel", "whatsapp", { shouldValidate: false })}
        />
        <ChannelOption
          checked={channel === "email"}
          icon={<Mail className="h-4 w-4" />}
          label={locale === "ar" ? "إيميل" : "Email"}
          onClick={() => setValue("channel", "email", { shouldValidate: false })}
        />
        <input type="hidden" {...register("channel")} />
      </fieldset>

      {channel === "whatsapp" ? (
        <div className="flex flex-col gap-1">
          <input
            type="tel"
            inputMode="numeric"
            dir="ltr"
            autoComplete="tel"
            placeholder="01012345678"
            aria-invalid={!!errors.phone}
            {...register("phone")}
            className={cn(
              "rounded-lg border bg-[var(--color-bg)] px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              errors.phone
                ? "border-[var(--color-error)]"
                : "border-[var(--color-border)]",
            )}
          />
          {errors.phone ? (
            <span className="text-xs text-[var(--color-error)]">
              {locale === "ar"
                ? "رقم موبايل غير صحيح"
                : "Invalid mobile number"}
            </span>
          ) : (
            <span className="text-xs text-[var(--color-text-secondary)]">
              {locale === "ar"
                ? "رقم واتساب يبدأ بـ 010 / 011 / 012 / 015"
                : "WhatsApp number starting with 010 / 011 / 012 / 015"}
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <input
            type="email"
            dir="ltr"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...register("email")}
            className={cn(
              "rounded-lg border bg-[var(--color-bg)] px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              errors.email
                ? "border-[var(--color-error)]"
                : "border-[var(--color-border)]",
            )}
          />
          {errors.email && (
            <span className="text-xs text-[var(--color-error)]">
              {locale === "ar" ? "بريد إلكتروني غير صحيح" : "Invalid email"}
            </span>
          )}
        </div>
      )}

      {serverError && (
        <p role="alert" className="text-xs text-[var(--color-error)]">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)] disabled:opacity-70"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {locale === "ar" ? "اشترك في الإشعار" : "Subscribe"}
      </button>
    </form>
  );
}

function ChannelOption({
  checked,
  icon,
  label,
  onClick,
}: {
  checked: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked ? "true" : "false"}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition",
        checked
          ? "border-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-primary)]"
          : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-dark)]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
