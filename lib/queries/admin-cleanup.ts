import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  PRODUCTS_BUCKET,
  type OrphanFile,
  type OrphanScanResult,
} from "@/lib/queries/admin-cleanup-shared";

/**
 * Storage cleanup queries.
 *
 * Finds files in the `products` bucket that no product row references
 * any more — Calvin Klein / Bagzawy imports that left originals
 * behind, deletes that didn't cascade to storage, pre-WebP versions
 * that survived the re-encode pass, etc. Reclaims storage cap without
 * touching anything still in use.
 *
 * Two safety filters baked in here, before the UI ever sees a row:
 *   1. The diff key is the storage path (e.g. "2026-06-17/abc.webp"),
 *      extracted from the full public URL stored in products.images.
 *      Off-bucket URLs (cdn.shopify.com, jumia, unsplash) are ignored
 *      entirely — they're not in our bucket so they can't be orphans.
 *   2. A `recentCutoffMs` window (default 1 hour) excludes very fresh
 *      uploads so a mid-edit image that hasn't been persisted to the
 *      row yet can't be auto-classified as orphan.
 *
 * Types + the byte-formatter live in `admin-cleanup-shared.ts` so the
 * client table can import them without dragging this server-only
 * module into the browser bundle.
 */

const PRODUCTS_PATH_PREFIX = `/storage/v1/object/public/${PRODUCTS_BUCKET}/`;
const DEFAULT_RECENT_CUTOFF_MS = 60 * 60 * 1000; // 1 hour

type StoragePathRow = {
  path: string;
  bytes: number | string | null;
  created_at: string;
};

/**
 * Scans the products bucket for orphan files. Safe to call on every
 * page load — the RPC is one round-trip and the products.images query
 * pulls a single text[] column.
 */
export async function findOrphanProductFiles(
  recentCutoffMs: number = DEFAULT_RECENT_CUTOFF_MS,
): Promise<OrphanScanResult> {
  const admin = getSupabaseAdminClient();

  // 1) Every path currently in the bucket.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types
  const { data: rawPaths, error: pathsErr } = await (admin as any).rpc(
    "admin_storage_paths",
    { p_bucket: PRODUCTS_BUCKET },
  );
  if (pathsErr || !Array.isArray(rawPaths)) {
    return {
      orphans: [],
      totals: {
        storageObjectCount: 0,
        storageBytes: 0,
        referencedCount: 0,
        orphanCount: 0,
        orphanBytes: 0,
        recentSkippedCount: 0,
      },
    };
  }
  const allPaths = rawPaths as StoragePathRow[];

  // 2) Every URL referenced by any product, distilled to the bucket
  // path. Off-bucket URLs are dropped here — they can never be
  // orphans because we don't manage them.
  const { data: productRows } = await admin
    .from("products")
    .select("images");

  const referenced = new Set<string>();
  for (const row of (productRows ?? []) as Array<{ images: string[] | null }>) {
    for (const url of row.images ?? []) {
      const path = extractBucketPath(url);
      if (path) referenced.add(path);
    }
  }

  // 3) Diff. Filter out very recent uploads so a mid-edit file can't
  // be mistaken for an orphan.
  const now = Date.now();
  const orphans: OrphanFile[] = [];
  let storageBytes = 0;
  let orphanBytes = 0;
  let recentSkippedCount = 0;

  for (const row of allPaths) {
    const bytes = Number(row.bytes ?? 0);
    storageBytes += bytes;
    if (referenced.has(row.path)) continue;
    const ageMs = now - new Date(row.created_at).getTime();
    if (ageMs < recentCutoffMs) {
      recentSkippedCount += 1;
      continue;
    }
    orphans.push({
      path: row.path,
      bytes,
      createdAt: row.created_at,
      ageDays: Math.floor(ageMs / (24 * 60 * 60 * 1000)),
    });
    orphanBytes += bytes;
  }

  // Sort oldest-first so the default "select top 20" hits the most
  // stale files.
  orphans.sort((a, b) => b.ageDays - a.ageDays);

  return {
    orphans,
    totals: {
      storageObjectCount: allPaths.length,
      storageBytes,
      referencedCount: referenced.size,
      orphanCount: orphans.length,
      orphanBytes,
      recentSkippedCount,
    },
  };
}

/**
 * Pulls the in-bucket path out of a stored image URL. Returns null
 * for off-bucket URLs (cdn.shopify.com etc.) and any URL we can't
 * confidently parse — null callers should treat as "not ours, leave
 * alone".
 */
function extractBucketPath(url: string): string | null {
  if (typeof url !== "string" || url.length === 0) return null;
  // The Supabase public URL shape is:
  //   https://<ref>.supabase.co/storage/v1/object/public/products/<path>
  // The render-image transform shape is:
  //   https://<ref>.supabase.co/storage/v1/render/image/public/products/<path>?…
  // Both contain `/storage/v1/.../public/products/` as the marker.
  const idx = url.indexOf(PRODUCTS_PATH_PREFIX);
  if (idx === -1) {
    // Maybe the render-image variant — search by bucket name segment.
    const renderMarker = `/render/image/public/${PRODUCTS_BUCKET}/`;
    const rIdx = url.indexOf(renderMarker);
    if (rIdx === -1) return null;
    const pathAndQuery = url.slice(rIdx + renderMarker.length);
    return pathAndQuery.split("?")[0] || null;
  }
  const pathAndQuery = url.slice(idx + PRODUCTS_PATH_PREFIX.length);
  return pathAndQuery.split("?")[0] || null;
}
