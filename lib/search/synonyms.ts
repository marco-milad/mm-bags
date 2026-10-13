import "server-only";

import { cache } from "react";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SynonymPair } from "@/lib/search/expand";

/**
 * Read-only loader for `search_synonyms`, the table the admin analytics page
 * writes ("searched, found nothing" → map it to catalogue language). Until
 * this existed nothing on the storefront read it, so adding a synonym had no
 * effect on search.
 *
 * Service-role client on purpose: migration 0017 enables RLS on the table
 * with NO policies, and its comment forbids adding a public-read one. This
 * module only ever selects two text columns.
 *
 * Cheap by design: the whole (small) table is held in module memory for a
 * minute, so most searches pay no round-trip at all and a new synonym is live
 * within ~60s. cache() additionally collapses repeat calls within one render.
 * A failed load never fails a search — it falls back to the last good rows
 * (or none) and retries after the same TTL.
 */

const TTL_MS = 60_000;
const MAX_ROWS = 2000;

let memo: { at: number; rows: SynonymPair[] } | null = null;
let inflight: Promise<SynonymPair[]> | null = null;

// lib/supabase/types.ts predates migration 0017, so the table is unknown to
// the generated types. Cast once to exactly the surface used here (the same
// approach as lib/analytics/db.ts) rather than to `any`.
type SynonymSelect = {
  select: (columns: string) => {
    limit: (n: number) => PromiseLike<{
      data: SynonymPair[] | null;
      error: { message: string } | null;
    }>;
  };
};
const table = () =>
  getSupabaseAdminClient().from("search_synonyms" as never) as unknown as SynonymSelect;

async function load(): Promise<SynonymPair[]> {
  try {
    const { data, error } = await table().select("term, maps_to").limit(MAX_ROWS);
    if (error) throw new Error(error.message);
    const rows = (data ?? []).filter(
      (r) => typeof r.term === "string" && typeof r.maps_to === "string",
    );
    memo = { at: Date.now(), rows };
    return rows;
  } catch (e) {
    console.warn("[search] synonyms load failed", e);
    const rows = memo?.rows ?? [];
    memo = { at: Date.now(), rows };
    return rows;
  }
}

export const getSearchSynonyms = cache(async (): Promise<SynonymPair[]> => {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.rows;
  // Concurrent requests after expiry share one query.
  inflight ??= load().finally(() => {
    inflight = null;
  });
  return inflight;
});
