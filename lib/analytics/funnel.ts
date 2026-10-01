/**
 * Funnel math — pure, dependency-free, unit-tested.
 *
 * Every rate is `null` (rendered "—") when its denominator is zero: "no data"
 * and "measured zero" are different answers and must never be swapped. Same
 * convention as the product-demand table.
 */

export type FunnelChannelRaw = {
  channel: string;
  sessions: number;
  purchased: number;
  revenue: number | string;
};

/** Shape returned by the analytics_funnel RPC (migration 0024). */
export type FunnelRaw = {
  sessions: number;
  viewed: number;
  carted: number;
  purchased: number;
  cartedVisitors: number;
  abandonedVisitors: number;
  revenue: number | string;
  byChannel: FunnelChannelRaw[];
};

export type FunnelChannel = {
  channel: string;
  sessions: number;
  purchased: number;
  revenue: number;
  /** purchased ÷ sessions, % */
  conversionRate: number | null;
};

export type Funnel = {
  sessions: number;
  viewed: number;
  carted: number;
  purchased: number;
  cartedVisitors: number;
  abandonedVisitors: number;
  revenue: number;
  /** viewed ÷ sessions — sessions that opened at least one product */
  viewRate: number | null;
  /** carted ÷ viewed — of those who looked, how many added to cart */
  cartRate: number | null;
  /** purchased ÷ sessions — the classic session conversion rate */
  conversionRate: number | null;
  /** abandonedVisitors ÷ cartedVisitors — carted but never bought */
  abandonmentRate: number | null;
  byChannel: FunnelChannel[];
};

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Percentage with one decimal, or null when the denominator is zero. */
export function pct(numerator: number, denominator: number): number | null {
  return denominator > 0 ? round1((100 * numerator) / denominator) : null;
}

/** Postgres numeric arrives as a string through PostgREST; normalize it. */
const num = (v: number | string | null | undefined) => Number(v ?? 0) || 0;

export const EMPTY_FUNNEL_RAW: FunnelRaw = {
  sessions: 0,
  viewed: 0,
  carted: 0,
  purchased: 0,
  cartedVisitors: 0,
  abandonedVisitors: 0,
  revenue: 0,
  byChannel: [],
};

export function computeFunnel(raw: FunnelRaw): Funnel {
  return {
    sessions: raw.sessions,
    viewed: raw.viewed,
    carted: raw.carted,
    purchased: raw.purchased,
    cartedVisitors: raw.cartedVisitors,
    abandonedVisitors: raw.abandonedVisitors,
    revenue: num(raw.revenue),
    viewRate: pct(raw.viewed, raw.sessions),
    cartRate: pct(raw.carted, raw.viewed),
    conversionRate: pct(raw.purchased, raw.sessions),
    abandonmentRate: pct(raw.abandonedVisitors, raw.cartedVisitors),
    byChannel: (raw.byChannel ?? []).map((c) => ({
      channel: c.channel,
      sessions: c.sessions,
      purchased: c.purchased,
      revenue: num(c.revenue),
      conversionRate: pct(c.purchased, c.sessions),
    })),
  };
}
