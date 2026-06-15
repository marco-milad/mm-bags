"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reviewSchema, type ReviewInput } from "./schema";

export type SubmitReviewResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitReview(
  raw: ReviewInput,
  productSlug: string,
): Promise<SubmitReviewResult> {
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { productId, name, rating, title, body, images } = parsed.data;

  // Capture user if logged in (today: nobody). The RLS INSERT policy needs
  // auth.uid() = user_id, so guests must go through the admin client.
  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("reviews").insert({
    product_id: productId,
    user_id: user?.id ?? null,
    guest_name: user ? null : name,
    rating,
    title: title || null,
    body,
    // Falls back to [] when client omits the field; cap is enforced by
    // the schema before we get here.
    images: images && images.length > 0 ? images : [],
    is_approved: false,
    verified_purchase: false,
  });

  if (error) {
    return { ok: false, error: `حصلت مشكلة في إرسال التقييم: ${error.message}` };
  }

  // Revalidate both locale variants of the product page so the moment the
  // admin approves the review, the next visit shows it.
  revalidatePath(`/ar/products/${productSlug}`);
  revalidatePath(`/en/products/${productSlug}`);

  return { ok: true };
}
