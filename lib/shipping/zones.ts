import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ShippingZone } from "./shared";

const ZONE_COLUMNS = "id, code, governorate_code, name_ar, name_en, fee, sort_order";

/** Active zones, ordered for display. Service role: zones have no RLS read
 *  policy (0032), the server hands them to the page. */
export async function getActiveShippingZones(): Promise<ShippingZone[]> {
  // Never throws: the policy page and llms.txt prerender at build time, and a
  // missing table or env var must degrade to "no price table", not a failed
  // build. Checkout handles an empty list (it tells the shopper to WhatsApp).
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from("shipping_zones")
      .select(ZONE_COLUMNS)
      .eq("is_active", true)
      .order("governorate_code")
      .order("sort_order");
    if (error) {
      console.error("[shipping] zones read failed:", error.message);
      return [];
    }
    return (data ?? []).map((z) => ({ ...z, fee: Number(z.fee) }));
  } catch (err) {
    console.error("[shipping] zones read failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

/** One active zone by id — placeOrder's authoritative fee lookup. */
export async function getActiveShippingZone(id: string): Promise<ShippingZone | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("shipping_zones")
    .select(ZONE_COLUMNS)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    console.error("[shipping] zone read failed:", error.message);
    return null;
  }
  return data ? { ...data, fee: Number(data.fee) } : null;
}
