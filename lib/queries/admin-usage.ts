import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Free-Plan usage snapshot for the admin dashboard widget.
 *
 * What we CAN measure from inside the project (no extra RPC needed):
 *   - Storage bytes per bucket  → cap is 1 GB total across all buckets
 *   - Row counts for key tables → proxy for "is data growing fast?"
 *
 * What we CANNOT measure here (Supabase doesn't expose them via the
 * REST API on the free tier without a custom RPC):
 *   - Total database size (`pg_database_size`) — would need a
 *     SECURITY DEFINER function. Worth adding if Marco ever asks; for
 *     now the storefront's text-only data stays in the low MB range
 *     so the 500 MB cap is unlikely to bite first.
 *   - Monthly bandwidth / egress — only the Supabase dashboard's
 *     usage page tracks this. The widget links out to it.
 *
 * The free-plan caps below are the published 2026 limits. They're
 * baked into the response so the widget can render progress bars
 * without re-fetching them.
 */

export const FREE_PLAN_LIMITS = {
  storageBytes: 1 * 1024 * 1024 * 1024, // 1 GB
  databaseBytes: 500 * 1024 * 1024, // 500 MB
  bandwidthBytesPerMonth: 5 * 1024 * 1024 * 1024, // 5 GB
  monthlyActiveUsers: 50_000,
} as const;

export type BucketUsage = {
  bucket: string;
  fileCount: number;
  bytes: number;
};

export type TableCount = {
  name: string;
  rows: number;
};

export type SupabaseUsage = {
  storage: {
    totalBytes: number;
    pctOfLimit: number;
    buckets: BucketUsage[];
  };
  tables: TableCount[];
  authUsers: number | null;
};

/**
 * Fetches one usage snapshot. Designed to be cheap enough to run on
 * every dashboard load — the storage query is the heaviest line and
 * the catalog currently sits around 250 image rows.
 */
export async function getSupabaseUsage(): Promise<SupabaseUsage> {
  const admin = getSupabaseAdminClient();

  // Storage — pull every object's bucket + size metadata and aggregate
  // in JS. Supabase doesn't expose a SUM aggregate on the storage.objects
  // PostgREST view, so we do the math here.
  //
  // The project's generated `Database` type only declares the `public`
  // schema, so `.schema("storage")` fails type-check. We cast to an
  // unconstrained client for this one query — the runtime call is
  // identical, and the only field we actually read (`metadata.size`)
  // is asserted at the destructure below.
  const storageAdmin =
    admin as unknown as SupabaseClient<Record<string, unknown>>;
  const { data: objects } = await storageAdmin
    .schema("storage")
    .from("objects")
    .select("bucket_id, metadata")
    .limit(10_000);

  const bucketsMap = new Map<string, BucketUsage>();
  let storageTotalBytes = 0;
  for (const row of (objects ?? []) as Array<{
    bucket_id: string | null;
    metadata: { size?: number } | null;
  }>) {
    const bucket = row.bucket_id ?? "(unknown)";
    const size = Number(row.metadata?.size ?? 0);
    storageTotalBytes += size;
    const existing = bucketsMap.get(bucket);
    if (existing) {
      existing.fileCount += 1;
      existing.bytes += size;
    } else {
      bucketsMap.set(bucket, { bucket, fileCount: 1, bytes: size });
    }
  }
  const buckets = Array.from(bucketsMap.values()).sort(
    (a, b) => b.bytes - a.bytes,
  );

  // Row counts for the tables that grow fastest. HEAD requests with
  // count: "exact" give us the count without pulling rows.
  const tableNames = [
    "products",
    "product_variants",
    "orders",
    "order_items",
    "pos_sales",
    "pos_sale_items",
    "stock_movements",
    "reviews",
    "newsletter_subscribers",
  ] as const;
  const counts = await Promise.all(
    tableNames.map(async (name) => {
      const { count } = await admin
        .from(name)
        .select("*", { count: "exact", head: true });
      return { name, rows: count ?? 0 } satisfies TableCount;
    }),
  );

  // Auth users — `auth.users` isn't exposed via PostgREST under the
  // public schema by default, but the admin client has a dedicated
  // `auth.admin.listUsers` endpoint that returns a total. We only need
  // the count, not the rows, so page 1 with perPage:1 is enough.
  let authUsers: number | null = null;
  try {
    const { data } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    // The listUsers response shape varies across supabase-js versions;
    // grab `total` if present, else fall back to whatever's there.
    const total = (data as unknown as { total?: number } | null)?.total;
    if (typeof total === "number") authUsers = total;
  } catch {
    // Non-fatal — auth listing requires the service role, which we
    // already have, but a transient 5xx shouldn't break the dashboard.
    authUsers = null;
  }

  return {
    storage: {
      totalBytes: storageTotalBytes,
      pctOfLimit:
        Math.round(
          (storageTotalBytes / FREE_PLAN_LIMITS.storageBytes) * 10_000,
        ) / 100,
      buckets,
    },
    tables: counts.sort((a, b) => b.rows - a.rows),
    authUsers,
  };
}

/** Pretty-print a byte count as "MB" / "GB" / "KB" for the UI. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
