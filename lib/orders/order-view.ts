import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  TRACKING_ORDER_COLUMNS,
  buildTrackingResult,
  type TrackingOrderRow,
} from "@/lib/tracking/result";
import type { TrackingResult } from "@/lib/tracking/schema";
import { isViewToken } from "./share";

/**
 * The order behind a private order link (0031), with full details. The
 * token is the credential: unknown, malformed and failed lookups all return
 * null so the page 404s the same way for each.
 */
export async function getOrderByViewToken(
  token: string,
  locale: string,
): Promise<TrackingResult | null> {
  if (!isViewToken(token)) return null;
  const { data, error } = await getSupabaseAdminClient()
    .from("orders")
    .select(TRACKING_ORDER_COLUMNS)
    .eq("view_token", token)
    .maybeSingle();
  if (error) console.warn("[order-link] lookup failed:", error.message);
  if (!data) return null;
  return buildTrackingResult(data as unknown as TrackingOrderRow, {
    full: true,
    locale,
    now: Date.now(),
  });
}

/** The token for an order, for building its link (null before 0031 runs). */
export async function getViewToken(orderId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("orders")
    .select("view_token")
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    console.warn("[order-link] token lookup failed:", error.message);
    return null;
  }
  return data?.view_token ?? null;
}
