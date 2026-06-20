"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { PRODUCTS_BUCKET } from "@/lib/queries/admin-cleanup-shared";

/**
 * Bulk-delete orphan files from the products bucket.
 *
 * Safety net belt-and-suspenders:
 *   - requireAdmin() at the top (this is destructive).
 *   - Hard cap of 200 paths per call so a misclick on "Select All"
 *     in a 5000-file catalog can't blow up the bucket in one POST.
 *   - Path-shape validation rejects anything outside the products
 *     bucket prefix conventions (no leading "/", no "..", no other
 *     bucket names).
 *   - The Supabase storage SDK's remove() ignores files that don't
 *     exist, so re-running the action is idempotent.
 *
 * Returns a typed result so the cleanup page can show "deleted X,
 * skipped Y" instead of a silent revalidate.
 */
export type CleanupResult =
  | {
      ok: true;
      deletedCount: number;
      deletedBytes?: number;
      attempted: number;
    }
  | { ok: false; error: string };

const MAX_PATHS_PER_CALL = 200;
const PATH_PATTERN = /^[A-Za-z0-9_\-/.]{1,200}$/;

export async function deleteOrphanProductFiles(
  formData: FormData,
): Promise<CleanupResult> {
  try {
    await requireAdmin(["admin"]);
  } catch {
    return { ok: false, error: "Not authorised" };
  }

  const rawPaths = formData.getAll("paths");
  if (rawPaths.length === 0) {
    return { ok: false, error: "Select at least one file" };
  }
  if (rawPaths.length > MAX_PATHS_PER_CALL) {
    return {
      ok: false,
      error: `Too many files at once (max ${MAX_PATHS_PER_CALL}). Run the cleanup in smaller batches.`,
    };
  }

  const paths: string[] = [];
  for (const raw of rawPaths) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("/") || trimmed.includes("..")) continue;
    if (!PATH_PATTERN.test(trimmed)) continue;
    paths.push(trimmed);
  }
  if (paths.length === 0) {
    return { ok: false, error: "No valid paths in selection" };
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(PRODUCTS_BUCKET)
    .remove(paths);

  if (error) {
    console.error("[deleteOrphanProductFiles] storage remove failed", error);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/cleanup");
  revalidatePath("/admin");
  return {
    ok: true,
    deletedCount: data?.length ?? 0,
    attempted: paths.length,
  };
}
