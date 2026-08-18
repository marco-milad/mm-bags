import "server-only";

import { isCatalogSort } from "@/lib/catalog-shared";
import { getMaterialCounts } from "@/lib/queries/catalog";
import { bucketById } from "@/lib/material-buckets";

/**
 * Filters the catalog page understands, mirrored 1:1 from the URL
 * search params (see app/[locale]/catalog/page.tsx). Kept as plain
 * strings so the client can forward the current query verbatim and the
 * server stays the single place that interprets them.
 */
export type CatalogFilterParams = {
  sort?: string;
  size?: string;
  type?: string;
  q?: string;
  material?: string;
  materialBucket?: string;
};

/**
 * Turn raw URL-ish filter strings into getCatalogPage options. Shared
 * by the page (first render) and the load-more action so both agree on
 * exactly what a filter means — the rules are lifted verbatim from the
 * page's previous inline parsing.
 */
export async function resolveCatalogFilters(filters: CatalogFilterParams) {
  const sort = isCatalogSort(filters.sort) ? filters.sort : "featured";
  const sizeRaw = filters.size ? Number(filters.size) : NaN;
  const sizeInches = Number.isInteger(sizeRaw) && sizeRaw > 0 ? sizeRaw : undefined;
  const setOnly = filters.type === "set";
  const q = filters.q?.trim().slice(0, 80) || undefined;
  const material = filters.material?.trim().slice(0, 80) || undefined;
  const bucketId = filters.materialBucket?.trim().slice(0, 40) || undefined;
  const bucket = bucketId ? bucketById(bucketId) : null;
  let materials: string[] | undefined;
  if (bucket) {
    const all = await getMaterialCounts();
    materials = all.find((b) => b.id === bucket.id)?.members;
  }
  return { sort, sizeInches, setOnly, q, material, materials, bucket } as const;
}

/** Pick only the known filter keys out of arbitrary search params. */
export function pickCatalogFilters(
  sp: Record<string, string | string[] | undefined> | undefined,
): CatalogFilterParams {
  const str = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;
  return {
    sort: str(sp?.sort),
    size: str(sp?.size),
    type: str(sp?.type),
    q: str(sp?.q),
    material: str(sp?.material),
    materialBucket: str(sp?.materialBucket),
  };
}
