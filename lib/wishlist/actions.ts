"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProductWithVariants } from "@/lib/catalog-shared";

// These actions mirror local wishlist mutations into Supabase for logged-in
// users. Guests have no `auth.uid()`, so each action no-ops cleanly. When the
// auth signup flow ships, no client code needs to change.

export async function dbWishlistAdd(productId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("wishlists")
    .upsert(
      { user_id: user.id, product_id: productId, variant_id: null as never },
      { onConflict: "user_id,product_id,variant_id" },
    );
}

export async function dbWishlistRemove(productId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);
}

export async function getWishlistedProducts(
  ids: string[],
): Promise<ProductWithVariants[]> {
  if (ids.length === 0) return [];
  // Cap at 100 to prevent runaway queries.
  const safeIds = ids.slice(0, 100);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_variants(*)")
    .in("id", safeIds)
    .eq("is_active", true);
  if (error) return [];
  return (data ?? []) as ProductWithVariants[];
}

export async function dbWishlistFetch(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("user_id", user.id);
  if (error) return [];
  return (data ?? []).map((r) => r.product_id).filter((id): id is string => !!id);
}
