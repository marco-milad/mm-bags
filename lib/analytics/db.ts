import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Typed access to the analytics tables.
 *
 * lib/supabase/types.ts is generated from the database and predates migrations
 * 0016/0017, so `.from("analytics_events")` currently resolves to `never` and
 * every insert fails to type-check. Regenerating needs a Supabase CLI login we
 * do not have here.
 *
 * Rather than scatter `as any` across call sites, the cast is made once, here,
 * against hand-written row types that mirror the migration. Two consequences
 * worth knowing:
 *
 *   - These types are the contract. If the migration changes, change them too;
 *     nothing else will catch the drift.
 *   - Regenerate lib/supabase/types.ts when a CLI login is available and delete
 *     this file's casts. The row types can stay as documentation.
 */

export type AnalyticsEventName =
  | "page_view"
  | "search"
  | "view_item"
  | "select_item"
  | "add_to_cart";

export type AnalyticsEventRow = {
  id: string;
  name: AnalyticsEventName;
  occurred_at: string;
  visitor_id: string;
  session_id: string;
  user_id?: string | null;
  path?: string | null;
  locale?: string | null;
  referrer_domain?: string | null;
  device_type?: string | null;
  query_raw?: string | null;
  query_norm?: string | null;
  result_count?: number | null;
  result_ids?: string[] | null;
  category?: string | null;
  sort?: string | null;
  product_id?: string | null;
  search_id?: string | null;
  list_id?: string | null;
  position?: number | null;
  props?: Record<string, unknown> | null;
};

export type AnalyticsVisitorRow = {
  id: string;
  first_seen_at: string;
  last_seen_at: string;
};

export type SearchSynonymRow = {
  id: string;
  term: string;
  maps_to: string;
  created_at: string;
};

type AnalyticsTables = {
  analytics_events: AnalyticsEventRow;
  analytics_visitors: AnalyticsVisitorRow;
  search_synonyms: SearchSynonymRow;
};

type AnalyticsTable = keyof AnalyticsTables;

/** Minimal surface: exactly what the ingest and admin paths use. */
type AnalyticsQuery<T> = {
  upsert: (
    rows: T[],
    opts?: { onConflict?: string; ignoreDuplicates?: boolean },
  ) => Promise<{ error: { message: string } | null }>;
  insert: (rows: T[]) => Promise<{ error: { message: string } | null }>;
};

export function analyticsTable<K extends AnalyticsTable>(
  table: K,
): AnalyticsQuery<AnalyticsTables[K]> {
  return getSupabaseAdminClient().from(table) as unknown as AnalyticsQuery<
    AnalyticsTables[K]
  >;
}
