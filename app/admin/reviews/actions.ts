"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";

export type ApproveResult = { ok: true } | { ok: false; error: string };

/**
 * Server action used by the admin Reviews queue's Approve button.
 *
 * Flips `is_approved` to true via the service-role client (the public
 * RLS would reject this from any other role). Revalidates the
 * admin/reviews list AND the public product page so the new review
 * appears on both within the same request cycle.
 */
export async function approveReview(
  reviewId: string,
  productSlug: string | null,
): Promise<ApproveResult> {
  await requireAdmin(["admin", "manager"]);
  if (!reviewId || typeof reviewId !== "string") {
    return { ok: false, error: "Missing review id" };
  }
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("reviews")
    .update({ is_approved: true })
    .eq("id", reviewId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  if (productSlug) {
    revalidatePath(`/ar/products/${productSlug}`);
    revalidatePath(`/en/products/${productSlug}`);
  }
  return { ok: true };
}

/**
 * Reject + delete a pending review. We hard-delete rather than soft-flag
 * — pending reviews aren't load-bearing data and a rejected one is
 * either spam or in error, so keeping it around costs more than it's
 * worth. Approved reviews never reach this code path.
 */
export async function rejectReview(reviewId: string): Promise<ApproveResult> {
  await requireAdmin(["admin", "manager"]);
  if (!reviewId || typeof reviewId !== "string") {
    return { ok: false, error: "Missing review id" };
  }
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("is_approved", false); // safety: never delete an approved row
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  return { ok: true };
}
