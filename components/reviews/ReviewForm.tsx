"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Star } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { reviewSchema, type ReviewInput } from "@/lib/reviews/schema";
import { submitReview } from "@/lib/reviews/actions";
import { cn } from "@/lib/utils";

export function ReviewForm({
  productId,
  productSlug,
  locale,
}: {
  productId: string;
  productSlug: string;
  locale: Locale;
}) {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    mode: "onBlur",
    defaultValues: {
      productId,
      name: "",
      rating: 0 as never,
      title: "",
      body: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await submitReview(values, productSlug);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      setDone(true);
      reset({
        productId,
        name: "",
        rating: 0 as never,
        title: "",
        body: "",
      });
    });
  });

  if (done) {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 p-5 text-sm"
      >
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-success)]" />
        <div>
          <p className="font-medium text-[var(--color-text)]">
            {locale === "ar" ? "تم استلام تقييمك" : "Thanks for your review"}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {locale === "ar"
              ? "هيظهر للجميع بعد المراجعة من فريقنا."
              : "It'll appear publicly once our team has reviewed it."}
          </p>
          <button
            type="button"
            onClick={() => setDone(false)}
            className="mt-3 text-xs font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
          >
            {locale === "ar" ? "ضيف تقييم تاني" : "Add another review"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5"
    >
      <h3 className="font-display text-lg text-[var(--color-text)]">
        {locale === "ar" ? "شاركنا رأيك" : "Share your review"}
      </h3>

      <Field
        label={locale === "ar" ? "تقييمك" : "Your rating"}
        error={errors.rating?.message}
      >
        <Controller
          control={control}
          name="rating"
          render={({ field }) => (
            <RatingInput
              value={field.value}
              onChange={field.onChange}
              locale={locale}
            />
          )}
        />
      </Field>

      <Field
        label={locale === "ar" ? "الاسم" : "Name"}
        error={errors.name?.message}
      >
        <input
          type="text"
          autoComplete="name"
          {...register("name")}
          className={inputClass(!!errors.name)}
        />
      </Field>

      <Field
        label={locale === "ar" ? "عنوان (اختياري)" : "Title (optional)"}
        error={errors.title?.message}
      >
        <input
          type="text"
          {...register("title")}
          className={inputClass(!!errors.title)}
        />
      </Field>

      <Field
        label={locale === "ar" ? "رأيك" : "Your review"}
        error={errors.body?.message}
      >
        <textarea
          rows={4}
          {...register("body")}
          className={cn(inputClass(!!errors.body), "resize-none")}
        />
      </Field>

      {serverError && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)] disabled:opacity-70"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {locale === "ar" ? "إرسال التقييم" : "Submit review"}
      </button>
    </form>
  );
}

function RatingInput({
  value,
  onChange,
  locale,
}: {
  value: number;
  onChange: (v: number) => void;
  locale: Locale;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div
      className="inline-flex items-center gap-1"
      role="radiogroup"
      aria-label={locale === "ar" ? "تقييم بالنجوم" : "Star rating"}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${locale === "ar" ? "نجوم" : "stars"}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className="rounded p-0.5 transition hover:scale-110 focus-visible:outline-none"
        >
          <Star
            className={cn(
              "h-7 w-7 transition",
              n <= active
                ? "fill-[var(--color-accent)] stroke-[var(--color-accent)]"
                : "stroke-[var(--color-border-dark)]",
            )}
          />
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--color-text)]">{label}</span>
      {children}
      {error && <span className="text-xs text-[var(--color-error)]">{error}</span>}
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
