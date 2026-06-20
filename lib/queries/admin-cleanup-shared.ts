/**
 * Client-safe types + constants for the /admin/cleanup screen.
 *
 * Lives in its own file (NOT `"server-only"`) so the client-side
 * OrphanFilesTable can import the row shape and the byte formatter
 * without pulling in lib/supabase/admin and tripping the
 * "Server-only module leaked to client" build error.
 *
 * The server-side scanner + actions live in:
 *   - lib/queries/admin-cleanup.ts   (RPC + diff)
 *   - lib/admin/cleanup-actions.ts   (delete)
 * and both re-export from here.
 */

export const PRODUCTS_BUCKET = "products";

export type OrphanFile = {
  path: string;
  bytes: number;
  createdAt: string; // ISO
  ageDays: number;
};

export type OrphanScanResult = {
  /** All files in the bucket older than the recent-cutoff that no
      product row references. Sorted oldest-first so the UI's default
      selection (top-N) targets the longest-stale rows. */
  orphans: OrphanFile[];
  /** Helpful aggregates so the UI doesn't have to recompute. */
  totals: {
    storageObjectCount: number;
    storageBytes: number;
    referencedCount: number;
    orphanCount: number;
    orphanBytes: number;
    /** Files inside the recent cutoff that were skipped — surfaced
        so the operator knows why a freshly-uploaded file isn't on
        the list yet. */
    recentSkippedCount: number;
  };
};

/** Pretty-print bytes for the cleanup UI. Mirrors the usage widget. */
export function formatCleanupBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
