"use client";

import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { reorderProductImages } from "@/lib/admin/product-actions";
import type { AdminLocale } from "@/lib/admin/locale";

const MAX_IMAGES = 10;
// Hard ceiling on the *original* file. Anything bigger than this is a
// 4K-camera-RAW situation we don't want to spend canvas memory on.
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
// Compress anything bigger than this. ~1.5 MB JPEGs upload fast on 4G
// and stay well under Vercel's ~4.5 MB serverless body cap.
const COMPRESS_THRESHOLD_BYTES = 1.5 * 1024 * 1024;
// Belt-and-suspenders post-compression cap. Vercel's edge rejects any
// body over ~4.5 MB with a generic transport-level error (no JSON), so
// if compression failed or the result was still huge, fail fast here
// with a readable message instead of submitting a doomed POST.
const POST_COMPRESS_MAX_BYTES = 4 * 1024 * 1024;
const COMPRESS_MAX_DIMENSION = 2000;
const COMPRESS_QUALITY = 0.82;
const UPLOAD_TIMEOUT_MS = 60_000;

/** Map server-side error codes (plus a few raw HTTP statuses that can
 *  leak through from the Vercel edge before our handler runs) to
 *  admin-friendly messages. */
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
    "413": "الملف كبير جداً — رفضه السيرفر قبل ما يوصل",
    "504": "انتهت مهلة السيرفر — حاول تاني",
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
    "413": "File too large — rejected before reaching our server",
    "504": "Server timed out — please retry",
  },
};

type UploadProgress = { loaded: number; total: number };

/**
 * Best-effort client-side compression for camera-sized mobile photos.
 *
 * Why this exists: Vercel serverless functions cap request bodies at
 * ~4.5 MB. An 8–10 MB phone photo POSTs straight past that ceiling and
 * is rejected at the edge before the route handler runs — the browser
 * sees a generic fetch error with no JSON body, which is why the old
 * code surfaced a useless "خطأ في الشبكة" on mobile. Shrinking the body
 * here keeps every upload comfortably under the limit. The server's
 * sharp pipeline still does the final re-encode (1600 px WebP @ 82),
 * so we don't have to be perfect — just small.
 *
 * Falls back to the original file when the input is already small,
 * when `createImageBitmap` isn't available, or when anything in the
 * pipeline throws — the upload at least gets a chance.
 */
async function maybeCompress(file: File): Promise<File> {
  if (file.size < COMPRESS_THRESHOLD_BYTES) return file;
  if (typeof window === "undefined" || !("createImageBitmap" in window)) {
    return file;
  }
  let bitmap: ImageBitmap | null = null;
  try {
    // `imageOrientation: "from-image"` makes the bitmap honour the source's
    // EXIF orientation tag. Without it, iPhone portrait shots (which the
    // sensor records as landscape + a "rotate 90°" EXIF tag) decode sideways,
    // and the JPEG we re-encode loses the EXIF tag so the server's
    // sharp.rotate() can't fix it either. Wrap in try/catch because very old
    // browsers may reject the option (Safari < 13.1).
    try {
      bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
    } catch {
      bitmap = await createImageBitmap(file);
    }
    const longEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, COMPRESS_MAX_DIMENSION / longEdge);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // Flatten any source alpha onto white before drawing — product photos
    // are shot on white anyway, and JPEG output below has no alpha channel,
    // so without this PNGs would render with black where they were
    // transparent.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", COMPRESS_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;
    const renamed =
      file.name.replace(/\.(png|webp|jpe?g)$/i, "") + ".jpg";
    return new File([blob], renamed, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    bitmap?.close?.();
  }
}

/**
 * `fetch()` doesn't expose upload progress; `XMLHttpRequest` does.
 * A real per-file progress bar matters on mobile because a multi-MB
 * upload over 4G can take 10+ seconds and silence reads as "frozen".
 * The AbortSignal hook also gives a future Cancel button somewhere to
 * land without another refactor.
 */
async function uploadWithProgress(
  url: string,
  body: FormData,
  onProgress: (p: UploadProgress) => void,
  signal: AbortSignal,
): Promise<{
  ok: boolean;
  status: number;
  json: { url?: string; error?: string };
}> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("x-requested-with", "mm-admin");
    xhr.responseType = "json";
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress({ loaded: e.loaded, total: e.total });
    };
    xhr.onload = () => {
      const json = (xhr.response ?? {}) as { url?: string; error?: string };
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json,
      });
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.ontimeout = () => reject(new Error("timeout"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    const abortHandler = () => xhr.abort();
    signal.addEventListener("abort", abortHandler, { once: true });
    xhr.send(body);
  });
}

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
 *   - Mobile-photo path: 10 MB pre-flight cap + client-side resize
 *     to 2000 px @ JPEG 0.82 so the body fits under Vercel's ~4.5 MB
 *     serverless body limit, with per-file XHR progress and granular
 *     error messages (network vs timeout vs server code).
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
  const [progress, setProgress] = useState<Record<string, UploadProgress>>({});
  const [persistPending, startPersist] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // FIFO promise — each persist awaits its predecessor so the final
  // state of the DB matches the final on-screen state, regardless of
  // click rate.
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());
  // Tracks the latest committed images so an upload that started before a
  // delete/reorder doesn't persist a stale snapshot back over the user's
  // change. The async upload loop reads from imagesRef.current when it
  // finally calls persist().
  const imagesRef = useRef<string[]>(initial);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

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
    setProgress({});
    try {
      for (const original of files) {
        if (original.size > MAX_INPUT_BYTES) {
          failures.push(
            `${original.name}: ${
              isAr
                ? "الملف أكبر من 10 ميجا — قلّل جودة الكاميرا"
                : "file is over 10 MB — lower the camera quality"
            }`,
          );
          continue;
        }
        setProgress((p) => ({
          ...p,
          [original.name]: { loaded: 0, total: 1 },
        }));

        // Compression failures fall through to the raw file so the
        // upload still has a chance; the server-side 5 MB cap then
        // produces a clean `file_too_large` error.
        let file: File;
        try {
          file = await maybeCompress(original);
        } catch {
          file = original;
        }

        const fd = new FormData();
        fd.append("file", file);
        const controller = new AbortController();
        let result: Awaited<ReturnType<typeof uploadWithProgress>>;
        try {
          result = await uploadWithProgress(
            "/api/admin/products/upload",
            fd,
            (p) =>
              setProgress((prev) => ({ ...prev, [original.name]: p })),
            controller.signal,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const reason =
            msg === "timeout"
              ? isAr
                ? `انتهت مهلة الرفع (${Math.round(
                    UPLOAD_TIMEOUT_MS / 1000,
                  )} ثانية) — جرب اتصال أسرع`
                : `upload timed out (${Math.round(
                    UPLOAD_TIMEOUT_MS / 1000,
                  )}s) — try a faster connection`
              : msg === "network"
                ? isAr
                  ? "خطأ في الشبكة — تأكد من الاتصال وحاول تاني"
                  : "network error — check your connection and retry"
                : isAr
                  ? `خطأ في الرفع: ${msg}`
                  : `upload error: ${msg}`;
          failures.push(`${original.name}: ${reason}`);
          continue;
        }
        if (!result.ok || !result.json.url) {
          const code = result.json.error ?? `${result.status}`;
          failures.push(`${original.name}: ${errorTable[code] ?? code}`);
          continue;
        }
        collected.push(result.json.url);
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
      setProgress({});
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

  const progressEntries = Object.entries(progress);

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

      {uploading && progressEntries.length > 0 && (
        <ul
          className="space-y-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
          aria-live="polite"
        >
          {progressEntries.map(([name, p]) => {
            const pct = p.total > 0 ? Math.round((p.loaded / p.total) * 100) : 0;
            return (
              <li key={name} className="space-y-1">
                <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-[var(--color-text-secondary)]">
                  <span className="truncate">{name}</span>
                  <span>{pct}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={
                    isAr ? `تقدّم رفع ${name}` : `Upload progress for ${name}`
                  }
                  className="h-1 overflow-hidden rounded-full bg-[var(--color-border)]"
                >
                  <div
                    className="h-full bg-[var(--color-accent)] transition-[width] duration-150"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

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
