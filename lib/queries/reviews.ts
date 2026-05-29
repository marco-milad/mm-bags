import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Review } from "@/lib/supabase/types";

export type FeaturedReview = {
  id: string;
  rating: number;
  body: string | null;
  title: string | null;
  guestName: string | null;
  governorate: string | null;
  productNameAr: string;
  productNameEn: string;
  productSlug: string;
};

export type ReviewSummary = {
  total: number;
  average: number; // 0..5, single decimal
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
};

export const EMPTY_SUMMARY: ReviewSummary = {
  total: 0,
  average: 0,
  counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

export async function getApprovedReviews(
  productId: string,
  limit = 20,
): Promise<Review[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as Review[];
}

export async function getFeaturedReviews(limit = 3): Promise<FeaturedReview[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, rating, body, title, guest_name, governorate, product:products!inner(name_ar, name_en, slug)",
    )
    .eq("is_approved", true)
    .eq("verified_purchase", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((r) => {
    // The PostgREST join can return either an object or an array depending on the FK type.
    const product = Array.isArray(r.product) ? r.product[0] : r.product;
    return {
      id: r.id,
      rating: r.rating,
      body: r.body,
      title: r.title,
      guestName: r.guest_name,
      governorate: r.governorate,
      productNameAr: product?.name_ar ?? "",
      productNameEn: product?.name_en ?? "",
      productSlug: product?.slug ?? "",
    };
  });
}

export function summarize(reviews: Review[]): ReviewSummary {
  if (reviews.length === 0) return EMPTY_SUMMARY;
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  let sum = 0;
  for (const r of reviews) {
    const star = Math.max(1, Math.min(5, r.rating)) as 1 | 2 | 3 | 4 | 5;
    counts[star] += 1;
    sum += star;
  }
  const average = Math.round((sum / reviews.length) * 10) / 10;
  return { total: reviews.length, average, counts };
}
