import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Supabase Free-Plan usage snapshot for the admin dashboard widget.
 *
 * Source: a single SECURITY DEFINER RPC (admin_supabase_usage, see
 * migration 0008) that returns both the database size and the
 * per-bucket storage breakdown. The RPC route exists because the
 * `storage` schema isn't exposed via PostgREST by default, and
 * `pg_database_size` is a built-in that needs a wrapper before
 * PostgREST will call it as RPC.
 *
 * The only metric we still link OUT for is monthly bandwidth /
 * egress — that's tracked in the Supabase dashboard's billing page
 * and isn't reflected anywhere queryable from the project.
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
  database: {
    /** Null when the RPC hasn't been migrated yet — the widget falls
        back to "—" and a "run migration 0008" hint rather than break. */
    totalBytes: number | null;
    pctOfLimit: number | null;
  };
  tables: TableCount[];
  authUsers: number | null;
};

type AdminUsageRpcRow = {
  db_bytes: number | null;
  buckets: Array<{
    bucket_id: string | null;
    file_count: number;
    bytes: number;
  }> | null;
};

/**
 * Fetches one usage snapshot. Designed to be cheap enough to run on
 * every dashboard load — the RPC executes a single GROUP BY + a
 * built-in size lookup, both sub-millisecond on Supabase free tier.
 */
export async function getSupabaseUsage(): Promise<SupabaseUsage> {
  const admin = getSupabaseAdminClient();

  // The RPC returns the canonical numbers from inside Postgres so the
  // widget reflects deletes + uploads in real time on the very next
  // dashboard load. The `rpc` call type-checks even though our
  // generated Database type doesn't list the function explicitly —
  // supabase-js falls back to a permissive shape for unknown RPCs.
  let storageTotalBytes = 0;
  let buckets: BucketUsage[] = [];
  let dbBytes: number | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC isn't in generated types
  const { data: usageRow, error } = await (admin as any).rpc(
    "admin_supabase_usage",
  );
  if (!error && usageRow) {
    const row = usageRow as AdminUsageRpcRow;
    dbBytes = typeof row.db_bytes === "number" ? row.db_bytes : null;
    for (const b of row.buckets ?? []) {
      const bucket = b.bucket_id ?? "(unknown)";
      const bytes = Number(b.bytes ?? 0);
      const fileCount = Number(b.file_count ?? 0);
      storageTotalBytes += bytes;
      buckets.push({ bucket, fileCount, bytes });
    }
    buckets = buckets.sort((a, b) => b.bytes - a.bytes);
  } else if (error) {
    // Most likely the migration hasn't been applied yet. Don't
    // crash the dashboard — the widget will render zeros with a
    // hint and the rest of /admin keeps working.
    console.warn(
      "[admin-usage] admin_supabase_usage RPC failed",
      error.message,
    );
  }

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
    database: {
      totalBytes: dbBytes,
      pctOfLimit:
        dbBytes === null
          ? null
          : Math.round(
              (dbBytes / FREE_PLAN_LIMITS.databaseBytes) * 10_000,
            ) / 100,
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
