import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Review } from "@/lib/supabase/types";

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
