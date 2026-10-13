import { normalizeSearchTerm } from "@/lib/analytics/text";

/**
 * Pure half of the live-search synonym expansion. The loader that reads
 * `search_synonyms` lives in lib/search/synonyms.ts (server-only); this file
 * has no runtime dependencies so it can be unit-tested and reused anywhere.
 */

export type SynonymPair = { term: string; maps_to: string };

/** At most this many synonym targets are OR'd into one search. Each target
    adds three ilike clauses, and the filter travels in the request URL. */
export const MAX_SYNONYM_TARGETS = 5;

/**
 * PostgREST's `.or()` filter string uses `*` as the wildcard and `,` / parens
 * as syntax, so none of them may survive into a value — a shopper typing
 * them must not be able to break the parser or escape into another filter.
 */
export function toIlikeSafe(input: string): string {
  return input.replace(/[*,()]/g, " ").replace(/\s+/g, " ").trim();
}

/** Comparison key: the normalizer the analytics pipeline and the admin
    synonym form both use, then the same stripping the query gets. */
function key(input: string): string {
  return toIlikeSafe(normalizeSearchTerm(input));
}

/**
 * The normalized search term followed by every synonym target it maps to.
 *
 * A synonym fires only when its `term` equals the WHOLE normalized query —
 * that is the workflow it exists for: the owner sees a zero-result query in
 * analytics (stored as query_norm) and maps exactly that query. Both sides go
 * through the normalizer again here, so a row saved before normalization
 * existed (or typed with ة instead of ه) still matches.
 *
 * `maps_to` may hold several targets separated by `,` `،` or `;` — commas
 * could never have matched anything anyway, since they are stripped from
 * the filter.
 *
 * Returns [] when the query is empty after cleaning; otherwise element 0 is
 * always the normalized query itself. Targets are deduped and capped.
 */
export function expandSearchTerm(
  query: string,
  synonyms: readonly SynonymPair[],
): string[] {
  const base = key(query);
  if (!base) return [];

  const out = [base];
  for (const s of synonyms) {
    if (key(s.term) !== base) continue;
    for (const part of s.maps_to.split(/[,،;]/)) {
      const target = key(part);
      if (!target || out.includes(target)) continue;
      if (out.length > MAX_SYNONYM_TARGETS) return out;
      out.push(target);
    }
  }
  return out;
}

/**
 * The PostgREST `.or()` filter for a catalog search, or null when the query
 * is empty after cleaning.
 *
 * search_blob is stored normalized (see buildSearchBlob), so it is compared
 * against normalized terms. The name columns are raw text and stay as a
 * fallback for rows whose blob has not been built yet: the shopper's own
 * spelling is matched against them, and each synonym target is too.
 */
export function buildSearchOrFilter(
  query: string,
  synonyms: readonly SynonymPair[],
): string | null {
  const terms = expandSearchTerm(query, synonyms);
  if (terms.length === 0) return null;

  const raw = toIlikeSafe(query);
  const clauses = [`search_blob.ilike.*${terms[0]}*`];
  if (raw) clauses.push(`name_ar.ilike.*${raw}*`, `name_en.ilike.*${raw}*`);
  for (const t of terms.slice(1)) {
    clauses.push(
      `search_blob.ilike.*${t}*`,
      `name_ar.ilike.*${t}*`,
      `name_en.ilike.*${t}*`,
    );
  }
  return clauses.join(",");
}
