/* eslint-disable no-console */
/**
 * Pull every off-bucket product image (cdn.shopify.com, eg.jumia.is,
 * images.unsplash.com, …anything not on our own Storage) into the
 * `products` Supabase Storage bucket under `<product-slug>/<filename>`
 * and rewrite each row's `images[]` to the new public URLs.
 *
 * Run with: `npx tsx scripts/migrate-shopify-images.ts`
 *
 * Originally Shopify-only (Milano + Calvin Klein imports) — kept the
 * filename for git history but the body is now generalised: every
 * product across every collection is processed, every URL that isn't
 * a Supabase Storage URL is re-hosted.
 *
 * Idempotent: re-uploads use `upsert: true`, so re-running overwrites
 * the same destination paths and rewrites `images[]` with the same
 * URLs. Products whose images are ALREADY on Supabase Storage are
 * left untouched.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(): { url: string; serviceKey: string } {
  // Minimal .env.local parser — keeps the script free of dotenv as a
  // dependency. Reads only the two keys we need.
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
const SUPABASE_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

type ProductRow = {
  id: string;
  slug: string;
  name_en: string;
  images: string[] | null;
};

/** True for any URL that we don't already host on our own Storage. */
function isExternalUrl(u: string): boolean {
  return !u.startsWith(SUPABASE_PREFIX);
}

/** Derive a clean, deterministic filename for the destination path. */
function filenameFor(originalUrl: string, index: number): string {
  const path = new URL(originalUrl).pathname;
  const last = path.substring(path.lastIndexOf("/") + 1);
  // Strip any whitespace, then keep only safe path characters.
  const safe = last.replace(/[^a-zA-Z0-9._-]/g, "_") || "image.jpg";
  // Zero-pad the index so the bucket listing sorts in display order.
  return `${String(index).padStart(2, "0")}-${safe}`;
}

function contentTypeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

/** Some CDNs (Unsplash) serve images at extension-less URLs. Use the
 *  response Content-Type to pick a usable extension instead. */
function extensionFor(contentType: string): string {
  const ct = contentType.split(";")[0].trim().toLowerCase();
  switch (ct) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/avif":
      return ".avif";
    default:
      return "";
  }
}

function publicUrlFor(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fetch a URL with a per-attempt timeout + exponential backoff. The
 *  Shopify CDN occasionally drops connections under sustained load
 *  from a single client, so a small retry loop keeps the migration
 *  moving instead of failing on the first dropped socket. */
async function fetchWithRetry(
  src: string,
  attempts = 4,
  timeoutMs = 30_000,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(src, {
        signal: ctrl.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        },
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < attempts - 1) {
        const backoff = 500 * 2 ** attempt;
        await sleep(backoff);
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function migrateOne(product: ProductRow): Promise<{
  slug: string;
  uploaded: number;
  skipped: number;
  failed: number;
}> {
  const stats = { slug: product.slug, uploaded: 0, skipped: 0, failed: 0 };
  const existing = product.images ?? [];
  if (existing.length === 0) {
    console.log(`  ${product.slug}: no images — skipping product entirely`);
    return stats;
  }
  // If every image is already on Supabase Storage we leave the row alone.
  const allOnSupabase = existing.every((u) => !isExternalUrl(u));
  if (allOnSupabase) {
    console.log(
      `  ${product.slug}: ${existing.length} images already on Supabase — skipping`,
    );
    stats.skipped = existing.length;
    return stats;
  }

  const newImageUrls: string[] = [];

  for (let i = 0; i < existing.length; i++) {
    const src = existing[i];
    // Pass-through anything we already host.
    if (!isExternalUrl(src)) {
      newImageUrls.push(src);
      stats.skipped++;
      continue;
    }

    let filename = filenameFor(src, i);

    try {
      const res = await fetchWithRetry(src);
      const bytes = new Uint8Array(await res.arrayBuffer());

      // Prefer the CDN's Content-Type when the URL lacks an extension
      // (Unsplash serves /photo-<id> with no suffix, which our default
      // extension-based MIME guess can't classify).
      const ctHeader = res.headers.get("content-type") ?? "";
      let contentType = contentTypeFor(filename);
      if (contentType === "application/octet-stream" && ctHeader) {
        contentType = ctHeader.split(";")[0].trim();
        const ext = extensionFor(ctHeader);
        if (ext && !/\.[a-z0-9]+$/i.test(filename)) {
          filename = `${filename}${ext}`;
        }
      }
      const destPath = `${product.slug}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(destPath, bytes, {
          contentType,
          upsert: true,
          cacheControl: "31536000", // 1 year — images are immutable per path
        });
      if (uploadError) throw uploadError;

      const newUrl = publicUrlFor(destPath);
      newImageUrls.push(newUrl);
      stats.uploaded++;
      console.log(
        `    ✓ ${product.slug}/${filename}  (${(bytes.byteLength / 1024).toFixed(0)} KB)`,
      );
      // Polite pause between successive CDN fetches.
      await sleep(150);
    } catch (err) {
      stats.failed++;
      console.error(`    ✗ ${product.slug}/${filename}  ${(err as Error).message}`);
      // Keep the original URL in place so the catalog doesn't lose the
      // image on a partial failure. Re-running the script will retry.
      newImageUrls.push(src);
    }
  }

  // Only update the row if the array actually changed.
  const changed = newImageUrls.some((u, i) => u !== existing[i]);
  if (changed) {
    const { error: updateError } = await supabase
      .from("products")
      .update({ images: newImageUrls })
      .eq("id", product.id);
    if (updateError) {
      console.error(
        `  ! ${product.slug}: row update FAILED — ${updateError.message}`,
      );
      stats.failed = existing.length;
      stats.uploaded = 0;
    }
  }
  return stats;
}

async function main(): Promise<void> {
  // Process every product — the helper short-circuits the ones whose
  // images are already on Supabase Storage so this is cheap to rerun.
  const { data: products, error } = await supabase
    .from("products")
    .select("id, slug, name_en, images")
    .order("slug");
  if (error) {
    throw new Error(`Failed to list products: ${error.message}`);
  }
  if (!products || products.length === 0) {
    console.log("No products found.");
    return;
  }

  const needsWork = (products as ProductRow[]).filter((p) =>
    (p.images ?? []).some(isExternalUrl),
  );
  console.log(
    `Scanned ${products.length} products. ${needsWork.length} have external images.\n`,
  );

  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  const migratedSlugs: string[] = [];

  for (const p of needsWork) {
    console.log(`→ ${p.slug}  (${p.name_en})`);
    const stats = await migrateOne(p);
    totalUploaded += stats.uploaded;
    totalSkipped += stats.skipped;
    totalFailed += stats.failed;
    if (stats.uploaded > 0) migratedSlugs.push(p.slug);
  }

  console.log(
    `\nDone. uploaded=${totalUploaded}  skipped=${totalSkipped}  failed=${totalFailed}`,
  );

  // Spot-check: HEAD the first image of each migrated product so we
  // know the new public URLs actually serve bytes.
  if (migratedSlugs.length > 0) {
    console.log(`\nSpot-checking new URLs are reachable:`);
    const { data: verifyRows } = await supabase
      .from("products")
      .select("slug, images")
      .in("slug", migratedSlugs);
    for (const r of (verifyRows ?? []) as Array<{
      slug: string;
      images: string[] | null;
    }>) {
      const first = r.images?.[0];
      if (!first) {
        console.log(`  ${r.slug}: no images`);
        continue;
      }
      if (isExternalUrl(first)) {
        console.log(`  ${r.slug}: first image still external — ${first}`);
        continue;
      }
      try {
        const head = await fetch(first, { method: "HEAD" });
        console.log(
          `  ${r.slug}: ${head.status} ${head.headers.get("content-type") ?? ""} ${head.headers.get("content-length") ?? ""}B`,
        );
      } catch (err) {
        console.log(`  ${r.slug}: HEAD failed — ${(err as Error).message}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
