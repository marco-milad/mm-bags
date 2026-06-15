"use client";

import { useRef, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Gift, ImagePlus, Loader2, Star, X } from "lucide-react";
import Image from "next/image";
import type { Locale } from "@/lib/i18n-config";
import { reviewSchema, type ReviewInput } from "@/lib/reviews/schema";
import { submitReview } from "@/lib/reviews/actions";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 3;

export function ReviewForm({
  productId,
  productSlug,
  locale,
}: {
  productId: string;
  productSlug: string;
  locale: Locale;
}) {
  const isRTL = locale === "ar";
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Photo upload state — array of public URLs returned from the upload
  // endpoint. We keep this OUTSIDE react-hook-form because the inputs
  // are uncontrolled file pickers; rhf would over-serialize them.
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so picking the SAME file twice still fires onChange.
    e.target.value = "";
    if (photoUrls.length >= MAX_PHOTOS) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/reviews/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setUploadError(
          isRTL
            ? "تعذّر رفع الصورة. ابعت رأيك من غيرها لو حابب."
            : "Upload failed. You can still submit your review without a photo.",
        );
        return;
      }
      setPhotoUrls((prev) => [...prev, json.url as string]);
    } catch {
      setUploadError(
        isRTL ? "مشكلة في الاتصال." : "Network error.",
      );
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(url: string) {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
  }

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
      // Photos are merged here rather than as a controlled rhf field so
      // the form state stays clean even when a user picks → removes → picks.
      const result = await submitReview(
        { ...values, images: photoUrls },
        productSlug,
      );
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      setDone(true);
      setPhotoUrls([]);
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
            {isRTL
              ? "شكراً! رأيك بيراجعه الفريق وهيظهر قريباً"
              : "Thanks! Your review is with our team and will be live soon."}
          </p>
          <button
            type="button"
            onClick={() => setDone(false)}
            className="mt-3 text-xs font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
          >
            {isRTL ? "ضيف تقييم تاني" : "Add another review"}
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
        {isRTL ? "شاركنا رأيك" : "Share your review"}
      </h3>

      {/* Loyalty incentive — brass-tinted callout above the fields. The
          loyalty programme itself ships later; we tease it here so the
          ask feels like a fair exchange instead of pure effort. */}
      <div className="flex items-start gap-3 rounded-lg border border-brass-500/30 bg-brass-100/60 p-3 text-xs">
        <Gift className="mt-0.5 h-4 w-4 shrink-0 text-brass-700" />
        <p className="text-[var(--color-text)]">
          {isRTL
            ? "شاركنا رأيك واكسب 25 نقطة في برنامج الولاء (قريباً)."
            : "Share your review and earn 25 points in our loyalty programme (coming soon)."}
        </p>
      </div>

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
        label={isRTL ? "رأيك" : "Your review"}
        error={errors.body?.message}
      >
        <textarea
          rows={4}
          {...register("body")}
          className={cn(inputClass(!!errors.body), "resize-none")}
        />
      </Field>

      {/* Optional photo upload — single-pick input we open via the
          ref-controlled "Add photo" button so we can style consistently
          across browsers. Each successful upload becomes a thumbnail
          chip with a remove button; cap at MAX_PHOTOS to match the
          schema. */}
      <Field
        label={
          isRTL
            ? `صور (اختياري — حد أقصى ${MAX_PHOTOS})`
            : `Photos (optional — up to ${MAX_PHOTOS})`
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {photoUrls.map((url) => (
            <div
              key={url}
              className="relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--color-border)]"
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(url)}
                aria-label={isRTL ? "إزالة الصورة" : "Remove photo"}
                className="absolute end-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {photoUrls.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border-dark)] text-[10px] text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)] disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {!uploading &&
                (isRTL ? "ضيف صورة" : "Add photo")}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFilePick}
            // Title gives screen-reader users the same affordance the
            // visible "Add photo" button provides — the input is hidden
            // visually but still tabbable / focusable.
            title={isRTL ? "ضيف صورة للتقييم" : "Add a review photo"}
            className="hidden"
          />
        </div>
        {uploadError && (
          <p className="mt-1.5 text-xs text-[var(--color-error)]">
            {uploadError}
          </p>
        )}
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
