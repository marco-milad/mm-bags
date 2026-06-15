import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Clock,
  CreditCard,
  Globe,
  ShoppingCart,
  Smartphone,
  Star,
  Wallet,
} from "lucide-react";
import {
  getLowStockVariants,
  getMonthlyRevenue,
  getOverduePurchaseOrders,
  getRecentOrders,
  getRecentPosSales,
  getTodayStats,
} from "@/lib/queries/admin-dashboard";
import { RevenueChart } from "@/components/admin/dashboard/RevenueChart";
import { cn, formatPriceEGP } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Admin overview dashboard.
 *
 * Layout, top → bottom:
 *  1. Five today-cards: total / online / POS / pending orders / pending reviews.
 *  2. Stacked monthly revenue chart (online + POS bars per day).
 *  3. Two columns of recent activity (online + POS).
 *  4. Two alert cards (low stock + overdue purchase orders).
 *
 * All data fetched in a single `Promise.all`. Each helper returns
 * narrow shapes — no `select(*)` here, so the round-trip stays cheap.
 */
export default async function AdminDashboard() {
  const [
    today,
    monthly,
    recentOrders,
    recentPos,
    lowStock,
    overdue,
  ] = await Promise.all([
    getTodayStats(),
    getMonthlyRevenue(),
    getRecentOrders(5),
    getRecentPosSales(5),
    getLowStockVariants(5, 12),
    getOverduePurchaseOrders(30, 5),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl text-[var(--color-text)]">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      {/* ── Row 1: Today's stats ──────────────────────────────────── */}
      <section
        aria-label="Today"
        className="grid grid-cols-2 gap-3 md:grid-cols-5"
      >
        <StatCard
          label="إيراد اليوم"
          sub="Total revenue today"
          value={formatPriceEGP(today.totalRevenue)}
          tone="primary"
          emoji="💰"
        />
        <StatCard
          label="مبيعات أونلاين"
          sub={`${today.online.count} orders`}
          value={formatPriceEGP(today.online.revenue)}
          emoji="🛒"
        />
        <StatCard
          label="مبيعات المحل"
          sub={`${today.pos.count} sales`}
          value={formatPriceEGP(today.pos.revenue)}
          emoji="🏪"
        />
        <StatCard
          label="طلبات معلقة"
          sub="Awaiting fulfillment"
          value={String(today.pendingOrders)}
          tone={today.pendingOrders > 0 ? "warn" : "muted"}
          emoji="📦"
        />
        <StatCard
          label="تقييمات منتظرة"
          sub="Awaiting approval"
          value={String(today.pendingReviews)}
          tone={today.pendingReviews > 0 ? "warn" : "muted"}
          emoji="⭐"
          href="/admin/reviews"
        />
      </section>

      {/* ── Row 2: Monthly chart ──────────────────────────────────── */}
      <section
        aria-label="This month"
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5"
      >
        <header className="mb-4 flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-lg text-[var(--color-text)]">
              Revenue this month
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Stacked daily revenue — online + POS
            </p>
          </div>
        </header>
        <RevenueChart data={monthly} />
      </section>

      {/* ── Row 3: Recent activity (two columns) ──────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Recent online orders */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
          <header className="mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <h2 className="font-display text-base text-[var(--color-text)]">
              Recent online orders
            </h2>
            <Link
              href="/admin/orders"
              className="ml-auto text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
            >
              View all →
            </Link>
          </header>
          {recentOrders.length === 0 ? (
            <EmptyRow text="No online orders yet." />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {recentOrders.map((o) => {
                const address = o.shipping_address as { name?: string } | null;
                return (
                  <li
                    key={o.id}
                    className="flex items-center gap-3 py-2.5 text-sm"
                  >
                    <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                      {o.order_number}
                    </span>
                    <span className="flex-1 truncate text-[var(--color-text)]">
                      {address?.name ?? "(guest)"}
                    </span>
                    <OrderStatusBadge status={o.status ?? "pending"} />
                    <span className="font-mono text-xs font-semibold text-[var(--color-primary)]">
                      {formatPriceEGP(o.total)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent POS sales */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
          <header className="mb-3 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <h2 className="font-display text-base text-[var(--color-text)]">
              Recent POS sales
            </h2>
            <Link
              href="/admin/pos"
              className="ml-auto text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
            >
              Open POS →
            </Link>
          </header>
          {recentPos.length === 0 ? (
            <EmptyRow text="No POS sales yet." />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {recentPos.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 py-2.5 text-sm"
                >
                  <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                    {s.sale_number}
                  </span>
                  <span className="flex-1">
                    <PaymentMethodChip method={s.payment_method} />
                  </span>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">
                    {formatClockTime(s.created_at)}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[var(--color-primary)]">
                    {formatPriceEGP(s.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Row 4: Alerts ─────────────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Low stock */}
        <div className="rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 p-5">
          <header className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
            <h2 className="font-display text-base text-[var(--color-text)]">
              Low stock alerts
            </h2>
            <Link
              href="/admin/stock"
              className="ml-auto text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
            >
              Manage →
            </Link>
          </header>
          {lowStock.length === 0 ? (
            <EmptyRow text="All variants above the low-stock threshold." />
          ) : (
            <ul className="space-y-2">
              {lowStock.map((v) => (
                <li
                  key={v.variantId}
                  className="flex items-center gap-3 rounded-md bg-[var(--color-bg)] px-3 py-2 text-sm"
                >
                  {v.colorHex && (
                    <span
                      aria-hidden
                      className="h-4 w-4 shrink-0 rounded-full ring-1 ring-[var(--color-border)]"
                      style={{ background: v.colorHex }}
                    />
                  )}
                  <Link
                    href={`/ar/products/${v.productSlug}`}
                    className="flex-1 truncate text-[var(--color-text)] hover:underline"
                    target="_blank"
                  >
                    {v.productName}
                  </Link>
                  <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">
                    {v.colorAr ?? ""}
                    {v.sizeInches ? ` · ${v.sizeInches}"` : ""}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold",
                      v.stockQty === 0
                        ? "bg-[var(--color-error)]/15 text-[var(--color-error)]"
                        : "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
                    )}
                  >
                    {v.stockQty}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Overdue purchase orders */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
          <header className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <h2 className="font-display text-base text-[var(--color-text)]">
              Overdue purchase orders
            </h2>
            <Link
              href="/admin/purchase-orders"
              className="ml-auto text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
            >
              View all →
            </Link>
          </header>
          {overdue.length === 0 ? (
            <EmptyRow text="No outstanding supplier balances older than 30 days." />
          ) : (
            <ul className="space-y-2">
              {overdue.map((po) => (
                <li
                  key={po.id}
                  className="flex items-center gap-3 rounded-md bg-[var(--color-surface)] px-3 py-2 text-sm"
                >
                  <span className="flex-1 truncate text-[var(--color-text)]">
                    {po.supplier_name ?? "(unknown supplier)"}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">
                    {formatRelativeDays(po.created_at)}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[var(--color-error)]">
                    {formatPriceEGP(po.amount_owed)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Building blocks (kept inline so the page reads top-to-bottom) ───

function StatCard({
  label,
  sub,
  value,
  tone = "default",
  emoji,
  href,
}: {
  label: string;
  sub: string;
  value: string;
  tone?: "default" | "primary" | "warn" | "muted";
  emoji: string;
  href?: string;
}) {
  // Tone variants drive the value color so urgent counts (pending orders,
  // pending reviews) jump off the row. Muted = "zero, no action needed".
  const valueColor =
    tone === "warn"
      ? "text-[var(--color-warning)]"
      : tone === "primary"
        ? "text-[var(--color-primary)]"
        : tone === "muted"
          ? "text-[var(--color-text-secondary)]"
          : "text-[var(--color-text)]";

  const body = (
    <div className="flex h-full flex-col gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition hover:border-[var(--color-accent)] hover:shadow-sm">
      <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)]">
        <span aria-hidden>{emoji}</span>
        {label}
      </p>
      <p className={cn("font-mono text-xl font-semibold leading-tight md:text-2xl", valueColor)}>
        {value}
      </p>
      <p className="text-[11px] text-[var(--color-text-secondary)]">{sub}</p>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  // Match the order-status palette used on the storefront's tracking page
  // so the admin doesn't have to context-switch between two color systems.
  const style: Record<string, string> = {
    pending: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
    confirmed: "bg-[var(--color-accent)]/15 text-[var(--color-accent-dark)]",
    processing: "bg-[var(--color-accent)]/15 text-[var(--color-accent-dark)]",
    shipped: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
    out_for_delivery:
      "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
    delivered: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
    cancelled: "bg-[var(--color-error)]/15 text-[var(--color-error)]",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        style[status] ?? "bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PaymentMethodChip({ method }: { method: string }) {
  // Icon + label per method. Kept small so the row reads as a single
  // glanceable line.
  const meta: Record<
    string,
    { Icon: typeof Banknote; label: string }
  > = {
    cash: { Icon: Banknote, label: "Cash" },
    "e-wallet": { Icon: Wallet, label: "E-wallet" },
    instapay: { Icon: Smartphone, label: "Instapay" },
    card: { Icon: CreditCard, label: "Card" },
  };
  const m = meta[method] ?? { Icon: CreditCard, label: method };
  const Icon = m.Icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text)]">
      <Icon className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
      {m.label}
    </span>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-6 text-center text-xs text-[var(--color-text-secondary)]">
      {text}
    </p>
  );
}

function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeDays(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
  return `${days}d overdue`;
}
