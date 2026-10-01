import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";

/**
 * Admin read layer for analytics.
 *
 * requireAdmin() runs BEFORE the admin client is constructed in every one of
 * these. The service-role client bypasses RLS entirely, so that call is the
 * only thing standing between a logged-out visitor and the whole event log.
 */

export type OverviewSeriesPoint = {
  date: string;
  visitors: number;
  sessions: number;
  page_views: number;
  searches: number;
};

export type Overview = {
  visitors: number;
  newVisitors: number;
  sessions: number;
  pageViews: number;
  productOpens: number;
  searches: number;
  zeroResults: number;
  zeroResultRate: number;
  /** raw ÷ settled searches. Null when there were no searches. */
  collapseRatio: number | null;
  series: OverviewSeriesPoint[];
};

export type LiveEvent = {
  visitor: string;
  name: string;
  path: string | null;
  locale: string | null;
  device_type: string | null;
  query_raw: string | null;
  result_count: number | null;
  occurred_at: string;
};

export type Live = { activeNow: number; events: LiveEvent[] };

export type RangeKey = "7d" | "30d" | "all";

export function rangeToDates(range: RangeKey): { from: Date; to: Date } {
  const to = new Date();
  if (range === "all") return { from: new Date("2020-01-01T00:00:00Z"), to };
  const days = range === "7d" ? 7 : 30;
  return { from: new Date(to.getTime() - days * 24 * 60 * 60 * 1000), to };
}

export async function getOverview(range: RangeKey = "30d"): Promise<Overview> {
  await requireAdmin();
  const { from, to } = rangeToDates(range);
  const { data, error } = await getSupabaseAdminClient().rpc(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated
    // types predate migration 0018; see lib/analytics/db.ts for the same note.
    "analytics_overview" as any,
    { p_from: from.toISOString(), p_to: to.toISOString() } as any,
  );
  if (error) throw new Error(`analytics_overview failed: ${error.message}`);
  return data as unknown as Overview;
}

export async function getLive(): Promise<Live> {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient().rpc(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "analytics_live" as any,
  );
  if (error) throw new Error(`analytics_live failed: ${error.message}`);
  return data as unknown as Live;
}

export type DemandRow = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  impressions: number;
  clicks: number;
  opens: number;
  orders: number;
  /**
   * Derived here, not in SQL, and null rather than zero when the denominator
   * is zero. "No data" and "nobody bought" are different answers and the table
   * must render — for one and 0% for the other; swapping them invents a
   * finding that was never measured.
   */
  ctr: number | null;
  openToOrder: number | null;
};

const round1 = (v: number) => Math.round(v * 10) / 10;

export async function getProductDemand(range: RangeKey = "30d"): Promise<DemandRow[]> {
  await requireAdmin();
  const { from, to } = rangeToDates(range);
  const { data, error } = await getSupabaseAdminClient().rpc(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "analytics_product_demand" as any,
    { p_from: from.toISOString(), p_to: to.toISOString(), p_limit: 50 } as any,
  );
  if (error) throw new Error(`analytics_product_demand failed: ${error.message}`);
  const rows = (data ?? []) as unknown as Omit<DemandRow, "ctr" | "openToOrder">[];
  return rows.map((r) => ({
    ...r,
    ctr: r.impressions ? round1((100 * r.clicks) / r.impressions) : null,
    openToOrder: r.opens ? round1((100 * r.orders) / r.opens) : null,
  }));
}

export type TermRow = {
  query_norm: string;
  sample_raw: string | null;
  searches: number;
};

export type TopTermRow = TermRow & {
  zero_results: number;
  clicks: number;
  top_product_slug: string | null;
  top_product_ar: string | null;
  top_product_en: string | null;
};

export type SearchReport = {
  topTerms: TopTermRow[];
  /**
   * Queried INDEPENDENTLY of topTerms, never filtered out of it. A term nobody
   * finds is rarely also a term everybody searches, so deriving these from the
   * top-N slice truncates away exactly the rows worth acting on.
   */
  zeroTerms: TermRow[];
  noClickTerms: TermRow[];
};

export async function getSearchReport(range: RangeKey = "30d"): Promise<SearchReport> {
  await requireAdmin();
  const { from, to } = rangeToDates(range);
  const { data, error } = await getSupabaseAdminClient().rpc(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "analytics_search_report" as any,
    { p_from: from.toISOString(), p_to: to.toISOString(), p_limit: 20 } as any,
  );
  if (error) throw new Error(`analytics_search_report failed: ${error.message}`);
  return data as unknown as SearchReport;
}

export type Acquisition = {
  /** Sessions grouped by acquisition channel (landing touch). */
  channels: { channel: string; sessions: number }[];
  /** Top UTM sources by sessions. */
  sources: { source: string; sessions: number }[];
  /** Top UTM campaigns by sessions. */
  campaigns: { campaign: string; sessions: number }[];
  /** Top countries by distinct visitors. */
  countries: { country: string; visitors: number }[];
  browsers: { browser: string; visitors: number }[];
  os: { os: string; visitors: number }[];
  devices: { device: string; visitors: number }[];
};

export async function getAcquisition(range: RangeKey = "30d"): Promise<Acquisition> {
  await requireAdmin();
  const empty: Acquisition = {
    channels: [],
    sources: [],
    campaigns: [],
    countries: [],
    browsers: [],
    os: [],
    devices: [],
  };
  const { from, to } = rangeToDates(range);
  const { data, error } = await getSupabaseAdminClient().rpc(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "analytics_acquisition" as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { p_from: from.toISOString(), p_to: to.toISOString(), p_limit: 10 } as any,
  );
  if (error) {
    // The acquisition RPC ships in migration 0023. If the code is deployed
    // before that migration is applied, degrade to an empty (hidden) section
    // instead of throwing and taking the whole analytics page down.
    console.warn("[analytics] acquisition unavailable:", error.message);
    return empty;
  }
  return (data as unknown as Acquisition) ?? empty;
}
