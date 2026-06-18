/* eslint-disable no-console */
/**
 * Phase 6 of the image-optimisation rollout (visual parity, not byte
 * size): widen the canvas of a product's source images so the bag sits
 * with more whitespace inside the PDP gallery's landscape wrapper.
 *
 * Why this exists: the PDP gallery is `aspect-[7/5]` everywhere, but
 * the Milano source photos are cropped tight against the bag (~1.3
 * aspect), so `object-contain` fills 90 %+ of the frame and the bag
 * "feels zoomed in". The bagzawy-imported collections (travel-sets,
 * lv-collection, etc.) ship source photos at ~0.75 aspect, which
 * letterbox in the landscape wrapper and fill ~52 % of the frame —
 * the look Marco prefers. This script adds vertical white padding to
 * the source to bring it down to ~0.75 aspect, so the gallery render
 * matches without changing the gallery code.
 *
 * Run (canary):
 *   `npx tsx scripts/pad-product-images.ts --slug=bs-milano-classic`
 * Run (multiple):
 *   `npx tsx scripts/pad-product-images.ts --slug=bs-milano-189,bs-milano-302,...`
 * Run (dry):
 *   add `--dry-run`
 *
 * For each image:
 *   - download bytes from the public URL
 *   - measure with sharp
 *   - if source aspect <= TARGET_ASPECT + SKIP_TOLERANCE, leave it
 *     (already portrait-enough; padding would only add unnecessary
 *     white space)
 *   - otherwise compute the vertical padding needed to reach
 *     TARGET_ASPECT, split top/bottom, sharp.extend with white,
 *     re-encode WebP @ q=82
 *   - upload to a SIBLING path under `<slug>/padded/<filename>`
 *     (originals at `<slug>/optimized/<filename>` are kept — rollback
 *     is a single UPDATE to revert products.images[] to the old URLs)
 *   - rewrite the corresponding products.images[] index
 *
 * Idempotent: if a URL already points at `/padded/` it's left alone.
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
const PADDED_SEGMENT = "/padded/";
// 0.75 matches the bagzawy travel-sets / lv-collection / two-piece
// source crops Marco likes. Pure 4:3 portrait. Going lower (more
// portrait) would shrink the bag further; going higher would leave
// less whitespace.
const TARGET_ASPECT = 0.75;
// Don't pad sources that are already within this much of the target
// (saves a re-encode round-trip + avoids over-tall images).
const SKIP_TOLERANCE = 0.05;
const WEBP_QUALITY = 82;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

type Args = { slugs: string[]; dryRun: boolean; rollback: boolean };
function parseArgs(): Args {
  const out: Args = { slugs: [], dryRun: false, rollback: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--rollback") out.rollback = true;
    else if (arg.startsWith("--slug=")) {
      out.slugs = arg.slice(7).split(",").filter(Boolean);
    } else if (arg.startsWith("--slugs=")) {
      out.slugs = arg.slice(8).split(",").filter(Boolean);
    }
  }
  if (out.slugs.length === 0) {
    throw new Error(
      "Pass at least one slug via --slug=<a> or --slugs=<a,b,c>",
    );
  }
  return out;
}

/**
 * Rollback mode: for the given slugs, rewrite products.images[] by
 * stripping the `/padded/` segment so URLs point at the original
 * `/optimized/` paths again. The `/padded/` files in Storage are left
 * in place (cheap; lets us re-roll forward without re-encoding).
 */
async function rollbackOne(slug: string): Promise<void> {
  const { data: rows, error } = await supabase
    .from("products")
    .select("id, images")
    .eq("slug", slug);
  if (error || !rows || rows.length === 0) {
    console.log(`! ${slug}: not found`);
    return;
  }
  const row = rows[0];
  const existing: string[] = (row.images as string[] | null) ?? [];
  const restored = existing.map((u) => {
    if (!u.includes(PADDED_SEGMENT)) return u;
    // <slug>/padded/foo.webp -> <slug>/optimized/foo.webp.
    // The pad pipeline always writes WebP so the destination here is
    // also `.webp`, matching what Phase 5 produced.
    return u.replace(PADDED_SEGMENT, "/optimized/");
  });
  const changed = restored.some((u, i) => u !== existing[i]);
  if (!changed) {
    console.log(`→ ${slug}: nothing to roll back`);
    return;
  }
  const { error: updErr } = await supabase
    .from("products")
    .update({ images: restored })
    .eq("id", row.id);
  if (updErr) {
    console.log(`  ! UPDATE failed: ${updErr.message}`);
  } else {
    const swapped = restored.filter((u, i) => u !== existing[i]).length;
    console.log(`✓ ${slug}: rolled back ${swapped} URL(s)`);
  }
}

function isOurStorageUrl(u: string): boolean {
  return u.startsWith(SUPABASE_PUBLIC_PREFIX);
}
function isAlreadyPadded(u: string): boolean {
  return u.includes(PADDED_SEGMENT);
}
function objectKeyFor(u: string): string {
  return u.slice(SUPABASE_PUBLIC_PREFIX.length);
}
function publicUrlFor(key: string): string {
  return `${SUPABASE_PUBLIC_PREFIX}${key}`;
}
function paddedKeyFor(originalKey: string): string {
  // `<slug>/optimized/00-foo.webp` -> `<slug>/padded/00-foo.webp`
  // `<slug>/00-foo.jpg`             -> `<slug>/padded/00-foo.webp`
  const lastSlash = originalKey.lastIndexOf("/");
  const dir = originalKey.slice(0, lastSlash);
  const filename = originalKey.slice(lastSlash + 1);
  const dot = filename.lastIndexOf(".");
  const stem = dot === -1 ? filename : filename.slice(0, dot);
  // Drop the `/optimized/` segment if present so we don't end up at
  // `<slug>/optimized/padded/foo.webp` which is awkward.
  const dirClean = dir.replace(/\/optimized$/, "");
  return `${dirClean}/padded/${stem}.webp`;
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
  | {
      status: "padded";
      newUrl: string;
      originalAspect: number;
      newAspect: number;
      originalDims: string;
      newDims: string;
    }
  | { status: "failed"; error: string };

async function processImage(
  url: string,
  dryRun: boolean,
): Promise<ImageResult> {
  if (!isOurStorageUrl(url)) {
    return { status: "skipped", reason: "external" };
  }
  if (isAlreadyPadded(url)) {
    return { status: "skipped", reason: "already-padded" };
  }

  const originalKey = objectKeyFor(url);
  const destKey = paddedKeyFor(originalKey);

  let bytes: Buffer;
  try {
    const res = await fetchWithRetry(url);
    const ab = await res.arrayBuffer();
    bytes = Buffer.from(ab);
  } catch (err) {
    return { status: "failed", error: `fetch: ${(err as Error).message}` };
  }

  let meta: sharp.Metadata;
  try {
    meta = await sharp(bytes).metadata();
  } catch (err) {
    return { status: "failed", error: `meta: ${(err as Error).message}` };
  }
  if (!meta.width || !meta.height) {
    return { status: "failed", error: "no-dimensions" };
  }
  const originalAspect = meta.width / meta.height;

  if (originalAspect <= TARGET_ASPECT + SKIP_TOLERANCE) {
    return {
      status: "skipped",
      reason: `already-tall-enough (aspect=${originalAspect.toFixed(2)} <= target+${SKIP_TOLERANCE})`,
    };
  }

  // Compute padding to widen the canvas vertically (= add white on top
  // and bottom) so the new aspect lands on TARGET_ASPECT.
  // new_h = w / TARGET_ASPECT  ;  padding_total = new_h - h
  const newHeight = Math.round(meta.width / TARGET_ASPECT);
  const paddingTotal = newHeight - meta.height;
  const padTop = Math.floor(paddingTotal / 2);
  const padBottom = paddingTotal - padTop;

  let padded: Buffer;
  try {
    padded = await sharp(bytes)
      .rotate()
      .extend({
        top: padTop,
        bottom: padBottom,
        left: 0,
        right: 0,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch (err) {
    return { status: "failed", error: `sharp: ${(err as Error).message}` };
  }

  if (dryRun) {
    return {
      status: "padded",
      newUrl: publicUrlFor(destKey),
      originalAspect,
      newAspect: meta.width / newHeight,
      originalDims: `${meta.width}x${meta.height}`,
      newDims: `${meta.width}x${newHeight}`,
    };
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(destKey, padded, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "31536000",
    });
  if (uploadError) {
    return { status: "failed", error: `upload: ${uploadError.message}` };
  }

  return {
    status: "padded",
    newUrl: publicUrlFor(destKey),
    originalAspect,
    newAspect: meta.width / newHeight,
    originalDims: `${meta.width}x${meta.height}`,
    newDims: `${meta.width}x${newHeight}`,
  };
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.rollback) {
    console.log(`Rolling back padded images for: ${args.slugs.join(", ")}\n`);
    for (const slug of args.slugs) await rollbackOne(slug);
    return;
  }

  console.log(
    `Padding to TARGET_ASPECT=${TARGET_ASPECT} for slugs: ${args.slugs.join(", ")}${args.dryRun ? "  (DRY RUN)" : ""}\n`,
  );

  for (const slug of args.slugs) {
    const { data: rows, error } = await supabase
      .from("products")
      .select("id, slug, images")
      .eq("slug", slug);
    if (error || !rows || rows.length === 0) {
      console.log(`! ${slug}: not found (${error?.message ?? "missing"})`);
      continue;
    }
    const row = rows[0];
    const existing: string[] = (row.images as string[] | null) ?? [];
    if (existing.length === 0) {
      console.log(`→ ${slug}: no images, skipping`);
      continue;
    }

    console.log(`→ ${slug}  (${existing.length} images)`);
    const newImages = [...existing];
    let changed = false;
    let padded = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < existing.length; i++) {
      const r = await processImage(existing[i], args.dryRun);
      if (r.status === "padded") {
        newImages[i] = r.newUrl;
        changed = true;
        padded++;
        console.log(
          `    ✓ [${i}] ${r.originalDims} (${r.originalAspect.toFixed(2)}) → ${r.newDims} (${r.newAspect.toFixed(2)})`,
        );
      } else if (r.status === "skipped") {
        skipped++;
        console.log(`    — [${i}] skipped: ${r.reason}`);
      } else {
        failed++;
        console.log(`    ✗ [${i}] ${r.error}`);
      }
      await sleep(120);
    }

    if (changed && !args.dryRun) {
      const { error: updErr } = await supabase
        .from("products")
        .update({ images: newImages })
        .eq("id", row.id);
      if (updErr) {
        console.log(`  ! UPDATE failed: ${updErr.message}`);
      } else {
        console.log(
          `  ✓ ${slug}: padded=${padded} skipped=${skipped} failed=${failed} (DB updated)`,
        );
      }
    } else if (changed && args.dryRun) {
      console.log(
        `  DRY: would have padded=${padded} skipped=${skipped} failed=${failed}`,
      );
    } else {
      console.log(`  — ${slug}: nothing changed`);
    }
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
