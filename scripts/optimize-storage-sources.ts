/* eslint-disable no-console */
/**
 * Phase 5 of the image-optimisation rollout: shrink the SOURCE bytes
 * sitting in Supabase Storage so the transform endpoint (and our edge
 * cache) has a smaller origin to read from on a cold miss. The read-
 * time pipeline (Phases 2-3) and the upload guardrail (Phase 4) cover
 * new + render-time bytes; this script handles the existing inventory.
 *
 * Run:
 *   - canary:    `npx tsx scripts/optimize-storage-sources.ts --limit=5 --slugs=bp-girly-149-urban,bp-girly-130-leather-premium,bp-girly-96-leather-stylish,bp-girly-77-leather-art,bp-girly-141-elegant`
 *   - full:      `npx tsx scripts/optimize-storage-sources.ts`
 *   - dry run:   `npx tsx scripts/optimize-storage-sources.ts --dry-run`
 *
 * For each image of every product:
 *   1. Download the bytes via the public URL.
 *   2. Skip if it's already <= 200 KB AND already a WebP — nothing to
 *      gain; saves a re-encode round-trip.
 *   3. Re-encode with sharp: rotate-by-EXIF, resize long edge to 1600,
 *      strip metadata, write WebP @ q=82.
 *   4. Upload the optimised bytes to a sibling path
 *      `<slug>/optimized/<originalFilename>.webp`.
 *      Originals are LEFT IN PLACE — easy rollback via re-writing
 *      products.images[] to the old paths.
 *   5. Rewrite the product's images[] entry at that index to the new
 *      Storage URL.
 *
 * Idempotent: re-runs detect URLs that already point at `/optimized/`
 * and skip them.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

function loadEnv(): { url: string; serviceKey: string } {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[m[1]] = value;
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }
  return { url, serviceKey };
}

const { url: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_KEY } = loadEnv();
const BUCKET = "products";
const SUPABASE_PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const OPTIMIZED_SEGMENT = "/optimized/";
const MAX_DIMENSION_PX = 1600;
const WEBP_QUALITY = 82;
const SIZE_SKIP_THRESHOLD_BYTES = 200 * 1024; // already-small WebPs

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

type Args = {
  limit?: number;
  slugs?: Set<string>;
  dryRun: boolean;
};
function parseArgs(): Args {
  const out: Args = { dryRun: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg.startsWith("--limit=")) out.limit = parseInt(arg.slice(8), 10);
    else if (arg.startsWith("--slugs=")) {
      out.slugs = new Set(arg.slice(8).split(",").filter(Boolean));
    }
  }
  return out;
}

type ProductRow = {
  id: string;
  slug: string;
  images: string[] | null;
};

function isOurStorageUrl(u: string): boolean {
  return u.startsWith(SUPABASE_PUBLIC_PREFIX);
}
function isAlreadyOptimized(u: string): boolean {
  return u.includes(OPTIMIZED_SEGMENT);
}
function objectKeyFor(u: string): string {
  // strip the public prefix to get the bucket-relative path
  return u.slice(SUPABASE_PUBLIC_PREFIX.length);
}
function publicUrlFor(key: string): string {
  return `${SUPABASE_PUBLIC_PREFIX}${key}`;
}
function destKeyFor(originalKey: string): string {
  // `<slug>/00-foo.jpg` -> `<slug>/optimized/00-foo.webp`
  const lastSlash = originalKey.lastIndexOf("/");
  const dir = originalKey.slice(0, lastSlash);
  const filename = originalKey.slice(lastSlash + 1);
  const dot = filename.lastIndexOf(".");
  const stem = dot === -1 ? filename : filename.slice(0, dot);
  return `${dir}/optimized/${stem}.webp`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(
  src: string,
  attempts = 3,
  timeoutMs = 30_000,
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(src, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (i < attempts - 1) await sleep(500 * 2 ** i);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

type ImageResult =
  | { status: "skipped"; reason: string }
  | { status: "optimized"; newUrl: string; originalBytes: number; optimizedBytes: number }
  | { status: "failed"; error: string };

async function processImage(
  product: ProductRow,
  imageUrl: string,
  dryRun: boolean,
): Promise<ImageResult> {
  if (!isOurStorageUrl(imageUrl)) {
    return { status: "skipped", reason: "external" };
  }
  if (isAlreadyOptimized(imageUrl)) {
    return { status: "skipped", reason: "already-optimized" };
  }

  const originalKey = objectKeyFor(imageUrl);
  const destKey = destKeyFor(originalKey);

  let bytes: Buffer;
  let originalBytes = 0;
  try {
    const res = await fetchWithRetry(imageUrl);
    const ab = await res.arrayBuffer();
    bytes = Buffer.from(ab);
    originalBytes = bytes.byteLength;
  } catch (err) {
    return { status: "failed", error: `fetch: ${(err as Error).message}` };
  }

  // Already small + already webp? Skip — re-encoding offers ~nothing.
  if (
    originalBytes <= SIZE_SKIP_THRESHOLD_BYTES &&
    imageUrl.toLowerCase().endsWith(".webp")
  ) {
    return { status: "skipped", reason: "already-small-webp" };
  }

  let optimized: Buffer;
  try {
    optimized = await sharp(bytes)
      .rotate()
      .resize({
        width: MAX_DIMENSION_PX,
        height: MAX_DIMENSION_PX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch (err) {
    return { status: "failed", error: `sharp: ${(err as Error).message}` };
  }

  // If sharp produced something LARGER than the original (rare —
  // already-tiny PNG icon, etc.), skip the swap.
  if (optimized.byteLength >= originalBytes) {
    return {
      status: "skipped",
      reason: `no-gain (orig=${originalBytes}B opt=${optimized.byteLength}B)`,
    };
  }

  if (dryRun) {
    return {
      status: "optimized",
      newUrl: publicUrlFor(destKey),
      originalBytes,
      optimizedBytes: optimized.byteLength,
    };
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(destKey, optimized, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "31536000",
    });
  if (uploadError) {
    return { status: "failed", error: `upload: ${uploadError.message}` };
  }

  return {
    status: "optimized",
    newUrl: publicUrlFor(destKey),
    originalBytes,
    optimizedBytes: optimized.byteLength,
  };
}

function fmtKB(b: number): string {
  return `${(b / 1024).toFixed(0)}KB`;
}

async function main(): Promise<void> {
  const args = parseArgs();
  console.log(
    `Scope: ${args.slugs ? `slugs=${[...args.slugs].join(",")}` : "all products"}${args.limit ? ` limit=${args.limit}` : ""}${args.dryRun ? " (DRY RUN)" : ""}\n`,
  );

  const { data: products, error } = await supabase
    .from("products")
    .select("id, slug, images")
    .order("slug");
  if (error) throw error;
  if (!products) {
    console.log("No products.");
    return;
  }

  let candidates = (products as ProductRow[]).filter(
    (p) => (p.images?.length ?? 0) > 0,
  );
  if (args.slugs) {
    candidates = candidates.filter((p) => args.slugs!.has(p.slug));
  }
  if (args.limit) candidates = candidates.slice(0, args.limit);

  const summary = {
    productsTouched: 0,
    productsUpdated: 0,
    images: 0,
    optimized: 0,
    skipped: 0,
    failed: 0,
    bytesBefore: 0,
    bytesAfter: 0,
    errors: [] as string[],
  };

  for (const p of candidates) {
    const existing = p.images ?? [];
    summary.productsTouched++;
    summary.images += existing.length;
    process.stdout.write(`→ ${p.slug.padEnd(30)} (${existing.length} imgs)`);
    let productChanged = false;
    const newImages = [...existing];
    let perProductBefore = 0;
    let perProductAfter = 0;

    for (let i = 0; i < existing.length; i++) {
      const r = await processImage(p, existing[i], args.dryRun);
      if (r.status === "optimized") {
        summary.optimized++;
        summary.bytesBefore += r.originalBytes;
        summary.bytesAfter += r.optimizedBytes;
        perProductBefore += r.originalBytes;
        perProductAfter += r.optimizedBytes;
        newImages[i] = r.newUrl;
        productChanged = true;
      } else if (r.status === "skipped") {
        summary.skipped++;
      } else {
        summary.failed++;
        summary.errors.push(`${p.slug}[${i}]: ${r.error}`);
      }
      await sleep(80);
    }

    if (productChanged && !args.dryRun) {
      const { error: updErr } = await supabase
        .from("products")
        .update({ images: newImages })
        .eq("id", p.id);
      if (updErr) {
        console.log(`  ! UPDATE failed: ${updErr.message}`);
        summary.errors.push(`${p.slug}: update ${updErr.message}`);
      } else {
        summary.productsUpdated++;
        console.log(
          `  ✓ ${fmtKB(perProductBefore)} → ${fmtKB(perProductAfter)}  (-${(((perProductBefore - perProductAfter) / Math.max(perProductBefore, 1)) * 100).toFixed(0)}%)`,
        );
      }
    } else if (productChanged && args.dryRun) {
      console.log(
        `  DRY: ${fmtKB(perProductBefore)} → ${fmtKB(perProductAfter)}  (-${(((perProductBefore - perProductAfter) / Math.max(perProductBefore, 1)) * 100).toFixed(0)}%)`,
      );
    } else {
      console.log("  — nothing to do");
    }
  }

  console.log(
    `\nDone. ${summary.optimized} images optimised across ${summary.productsUpdated} products. skipped=${summary.skipped} failed=${summary.failed}`,
  );
  if (summary.bytesBefore > 0) {
    console.log(
      `Bytes: ${fmtKB(summary.bytesBefore)} → ${fmtKB(summary.bytesAfter)}  (-${(((summary.bytesBefore - summary.bytesAfter) / summary.bytesBefore) * 100).toFixed(1)}%)`,
    );
  }
  if (summary.errors.length > 0) {
    console.log(`\nErrors (${summary.errors.length}):`);
    for (const e of summary.errors.slice(0, 50)) console.log(`  ${e}`);
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
