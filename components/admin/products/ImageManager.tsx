"use client";

import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Trash2,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { reorderProductImages } from "@/lib/admin/product-actions";
import type { AdminLocale } from "@/lib/admin/locale";

const MAX_IMAGES = 10;

/** Map server-side error codes to admin-friendly messages. */
const UPLOAD_ERROR_MSG: Record<"ar" | "en", Record<string, string>> = {
  ar: {
    file_too_large: "الملف أكبر من 5 ميجا",
    file_type: "JPG أو PNG أو WebP فقط",
    file_missing: "مفيش ملف اتبعت",
    file_empty: "الملف فاضي",
    forbidden: "مفيش صلاحية للرفع",
    unauthorized: "سجّل دخول قبل الرفع",
    csrf: "حدّث الصفحة وحاول تاني",
    invalid_body: "طلب غير سليم — حدّث الصفحة وحاول",
    upload_failed: "خطأ في التخزين — حاول تاني",
    server_error: "خطأ في السيرفر — حاول تاني",
  },
  en: {
    file_too_large: "File over 5 MB",
    file_type: "Only JPG, PNG, or WebP",
    file_missing: "No file received",
    file_empty: "File was empty",
    forbidden: "You don't have permission to upload",
    unauthorized: "Sign in to upload",
    csrf: "Refresh the page and retry",
    invalid_body: "Bad request — refresh and retry",
    upload_failed: "Storage error — please retry",
    server_error: "Server error — please retry",
  },
};

/**
 * Image manager for the product edit page.
 *
 * Adversarial-review fixes applied:
 *   - Queued persist: reorder/delete clicks land on a single FIFO
 *     promise, so concurrent server actions can never race and
 *     stomp the canonical image array.
 *   - Multi-error aggregation: every failed file is recorded by
 *     name + reason; the UI shows the full list.
 *   - ArrowUp/Down icons + 'Move image up/down' aria-labels: more
 *     honest semantics than ArrowLeft/Right for a wrapping grid.
 *   - x-requested-with custom header: server enforces it to defeat
 *     CSRF from cross-site forms (the upload route rejects without
 *     this header).
 *   - Files past MAX_IMAGES surface a "Skipped N file(s)" warning
 *     rather than silently dropping them.
 */
export function ImageManager({
  productId,
  initial,
  hiddenName = "images_json",
  locale,
}: {
  productId?: string;
  initial: string[];
  hiddenName?: string;
  locale: AdminLocale;
}) {
  const isAr = locale === "ar";
  const errorTable = UPLOAD_ERROR_MSG[isAr ? "ar" : "en"];
  const [images, setImages] = useState<string[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [persistPending, startPersist] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // FIFO promise — each persist awaits its predecessor so the final
  // state of the DB matches the final on-screen state, regardless of
  // click rate.
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  function persist(next: string[]) {
    setImages(next);
    if (!productId) return;
    const formData = new FormData();
    formData.set("id", productId);
    formData.set("images_json", JSON.stringify(next));
    startPersist(() => {
      persistQueueRef.current = persistQueueRef.current.then(() =>
        reorderProductImages(formData),
      );
    });
  }

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const all = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (all.length === 0) return;
    setErrors([]);
    const remaining = MAX_IMAGES - images.length;
    const files = all.slice(0, Math.max(0, remaining));
    const skipped = all.length - files.length;
    const collected: string[] = [];
    const failures: string[] = [];
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        let res: Response;
        try {
          res = await fetch("/api/admin/products/upload", {
            method: "POST",
            headers: { "x-requested-with": "mm-admin" },
            body: fd,
          });
        } catch {
          failures.push(
            `${file.name}: ${isAr ? "خطأ في الشبكة" : "network error"}`,
          );
          continue;
        }
        const json = (await res.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };
        if (!res.ok || !json.url) {
          const code = json.error ?? `${res.status}`;
          failures.push(`${file.name}: ${errorTable[code] ?? code}`);
          continue;
        }
        collected.push(json.url);
      }
      if (collected.length > 0) {
        persist([...images, ...collected]);
      }
      const reports: string[] = [];
      if (failures.length > 0) reports.push(...failures);
      if (skipped > 0) {
        reports.push(
          isAr
            ? `تم تخطي ${skipped} ملف — الحد الأقصى ${MAX_IMAGES} صور`
            : `Skipped ${skipped} file(s) — ${MAX_IMAGES}-image limit`,
        );
      }
      setErrors(reports);
    } finally {
      setUploading(false);
    }
  }

  function move(index: number, delta: number) {
    const next = [...images];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  }
  function remove(index: number) {
    const next = images.filter((_, i) => i !== index);
    persist(next);
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={hiddenName} value={JSON.stringify(images)} />

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
          {isAr ? "الصور" : "Images"} ({images.length}/{MAX_IMAGES})
        </p>
        {persistPending && (
          <span
            role="status"
            aria-live="polite"
            className="text-[11px] text-[var(--color-text-secondary)]"
          >
            {isAr ? "جاري حفظ الترتيب…" : "saving order…"}
          </span>
        )}
      </div>

      {images.length === 0 && !uploading && (
        <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-6 text-center text-xs text-[var(--color-text-secondary)]">
          {isAr
            ? "مفيش صور لسه. ارفع أول صورة — هتبقى هي الأساسية."
            : "No images yet. Upload the first one — it becomes the primary."}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((url, idx) => (
          <li
            key={`${url}-${idx}`}
            className="relative overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            <div className="relative aspect-square w-full">
              <Image
                src={url}
                alt={
                  isAr
                    ? `صورة المنتج ${idx + 1}${idx === 0 ? " (أساسية)" : ""}`
                    : `Product image ${idx + 1}${idx === 0 ? " (primary)" : ""}`
                }
                fill
                sizes="200px"
                className="object-cover"
              />
              {idx === 0 && (
                <span className="absolute start-1 top-1 rounded bg-[var(--color-primary)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white">
                  {isAr ? "أساسية" : "Primary"}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-1 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                aria-label={
                  isAr
                    ? `حرّك الصورة ${idx + 1} لفوق`
                    : `Move image ${idx + 1} up`
                }
                // eslint-disable-next-line jsx-a11y/aria-proptypes -- stringified
                // ternary produces only valid "true"|"false" literals at runtime.
                aria-disabled={idx === 0 ? "true" : "false"}
                disabled={idx === 0}
                className="grid h-6 w-6 place-items-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-40"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(idx, +1)}
                aria-label={
                  isAr
                    ? `حرّك الصورة ${idx + 1} لتحت`
                    : `Move image ${idx + 1} down`
                }
                // eslint-disable-next-line jsx-a11y/aria-proptypes
                aria-disabled={idx === images.length - 1 ? "true" : "false"}
                disabled={idx === images.length - 1}
                className="grid h-6 w-6 place-items-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-40"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label={
                  isAr ? `احذف الصورة ${idx + 1}` : `Delete image ${idx + 1}`
                }
                className="grid h-6 w-6 place-items-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-error)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={uploading || images.length >= MAX_IMAGES}
          onClick={() => fileInputRef.current?.click()}
          aria-label={isAr ? "ارفع صور المنتج" : "Upload product images"}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
          {uploading
            ? isAr
              ? "جاري الرفع..."
              : "Uploading..."
            : isAr
              ? "رفع صور"
              : "Upload images"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          title={isAr ? "ارفع صور المنتج" : "Upload product images"}
          onChange={handlePick}
          className="hidden"
        />
      </div>

      {errors.length > 0 && (
        // role=alert on a wrapping div so the inner <ul>/<li> keep
        // their semantic list context (role="alert" on a <ul> would
        // strip the implicit list role from its children).
        <div
          role="alert"
          className="rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2 text-xs text-[var(--color-error)]"
        >
          <ul className="space-y-1">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
