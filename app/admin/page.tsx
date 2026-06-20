import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  Banknote,
  Clock,
  CreditCard,
  FileText,
  Globe,
  ShoppingCart,
  Smartphone,
  Wallet,
} from "lucide-react";
import {
  getHighReturnProducts,
  getLowStockVariants,
  getMonthlyRevenue,
  getOverduePurchaseOrders,
  getRecentOrders,
  getRecentPosSales,
  getTodayStats,
} from "@/lib/queries/admin-dashboard";
import { getSupabaseUsage } from "@/lib/queries/admin-usage";
import { RevenueChart } from "@/components/admin/dashboard/RevenueChart";
import { SupabaseUsageCard } from "@/components/admin/dashboard/SupabaseUsageCard";
import { getAdminLocale, type AdminLocale } from "@/lib/admin/locale";
import { orderStatusLabel, paymentMethodLabel } from "@/lib/admin/labels";
import { cn, formatPriceEGP } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";

  const [
    today,
    monthly,
    recentOrders,
    recentPos,
    lowStock,
    overdue,
    highReturnProducts,
    usage,
  ] = await Promise.all([
    getTodayStats(),
    getMonthlyRevenue(),
    getRecentOrders(5),
    getRecentPosSales(5),
    getLowStockVariants(5, 12),
    getOverduePurchaseOrders(30, 5),
    getHighReturnProducts(),
    getSupabaseUsage(),
  ]);

  // Derive the project ref from the Supabase URL so the widget's
  // "open dashboard" links go straight to OUR project's usage page
  // instead of the generic Supabase home. Same env var already used
  // by the storefront — no new config required.
  const supabaseProjectRef = (() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return undefined;
    try {
      const host = new URL(url).hostname; // e.g. nrlcypdrfmjdwuvuaryp.supabase.co
      const ref = host.split(".")[0];
      return ref && ref.length > 0 ? ref : undefined;
    } catch {
      return undefined;
    }
  })();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-text)]">
            {isAr ? "لوحة التحكم" : "Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <a
          href="/admin/reports/export-pdf?report=dashboard"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          <FileText className="h-3.5 w-3.5" />
          {isAr ? "تصدير تقرير PDF" : "Export PDF report"}
        </a>
      </header>

      {/* ── Row 1: Today's stats ──────────────────────────────────── */}
      <section
        aria-label={isAr ? "اليوم" : "Today"}
        className="grid grid-cols-2 gap-3 md:grid-cols-5"
      >
        <StatCard
          label={isAr ? "إيراد اليوم" : "Today's revenue"}
          sub={isAr ? "إجمالي إيراد اليوم" : "Total revenue today"}
          value={formatPriceEGP(today.totalRevenue)}
          tone="primary"
          emoji="💰"
        />
        <StatCard
          label={isAr ? "مبيعات أونلاين" : "Online sales"}
          sub={
            isAr
              ? `${today.online.count} طلب`
              : `${today.online.count} orders`
          }
          value={formatPriceEGP(today.online.revenue)}
          emoji="🛒"
        />
        <StatCard
          label={isAr ? "مبيعات المحل" : "Store sales"}
          sub={
            isAr
              ? `${today.pos.count} بيعة`
              : `${today.pos.count} sales`
          }
          value={formatPriceEGP(today.pos.revenue)}
          emoji="🏪"
        />
        <StatCard
          label={isAr ? "طلبات معلقة" : "Pending orders"}
          sub={isAr ? "بانتظار التجهيز" : "Awaiting fulfillment"}
          value={String(today.pendingOrders)}
          tone={today.pendingOrders > 0 ? "warn" : "muted"}
          emoji="📦"
        />
        <StatCard
          label={isAr ? "تقييمات منتظرة" : "Pending reviews"}
          sub={isAr ? "بانتظار الموافقة" : "Awaiting approval"}
          value={String(today.pendingReviews)}
          tone={today.pendingReviews > 0 ? "warn" : "muted"}
          emoji="⭐"
          href="/admin/reviews"
        />
      </section>

      {/* ── Row 2: Monthly chart ──────────────────────────────────── */}
      <section
        aria-label={isAr ? "هذا الشهر" : "This month"}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5"
      >
        <header className="mb-4 flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-lg text-[var(--color-text)]">
              {isAr ? "الإيراد هذا الشهر" : "Revenue this month"}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {isAr
                ? "الإيراد اليومي — أونلاين + محل"
                : "Stacked daily revenue — online + POS"}
            </p>
          </div>
        </header>
        <RevenueChart data={monthly} locale={locale} />
      </section>

      {/* ── Row 3: Recent activity (two columns) ──────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Recent online orders */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
          <header className="mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <h2 className="font-display text-base text-[var(--color-text)]">
              {isAr ? "آخر الطلبات أونلاين" : "Recent online orders"}
            </h2>
            <Link
              href="/admin/orders"
              className="ms-auto text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
            >
              {isAr ? "عرض الكل ←" : "View all →"}
            </Link>
          </header>
          {recentOrders.length === 0 ? (
            <EmptyRow text={isAr ? "لا توجد طلبات أونلاين بعد." : "No online orders yet."} />
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
                      {address?.name ?? (isAr ? "(زائر)" : "(guest)")}
                    </span>
                    <OrderStatusBadge status={o.status ?? "pending"} locale={locale} />
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
              {isAr ? "آخر مبيعات المحل" : "Recent POS sales"}
            </h2>
            <Link
              href="/admin/pos"
              className="ms-auto text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
            >
              {isAr ? "افتح المحل ←" : "Open POS →"}
            </Link>
          </header>
          {recentPos.length === 0 ? (
            <EmptyRow text={isAr ? "لا توجد مبيعات محل بعد." : "No POS sales yet."} />
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
                    <PaymentMethodChip method={s.payment_method} locale={locale} />
                  </span>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">
                    {formatClockTime(s.created_at, locale)}
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
              {isAr ? "تنبيهات المخزون المنخفض" : "Low stock alerts"}
            </h2>
            <Link
              href="/admin/stock"
              className="ms-auto text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
            >
              {isAr ? "إدارة ←" : "Manage →"}
            </Link>
          </header>
          {lowStock.length === 0 ? (
            <EmptyRow
              text={
                isAr
                  ? "كل الفاريانتس فوق حد المخزون المنخفض."
                  : "All variants above the low-stock threshold."
              }
            />
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
              {isAr ? "أوامر شراء متأخرة" : "Overdue purchase orders"}
            </h2>
            <Link
              href="/admin/purchase-orders"
              className="ms-auto text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
            >
              {isAr ? "عرض الكل ←" : "View all →"}
            </Link>
          </header>
          {overdue.length === 0 ? (
            <EmptyRow
              text={
                isAr
                  ? "لا توجد أرصدة موردين متأخرة أكتر من 30 يوم."
                  : "No outstanding supplier balances older than 30 days."
              }
            />
          ) : (
            <ul className="space-y-2">
              {overdue.map((po) => (
                <li
                  key={po.id}
                  className="flex items-center gap-3 rounded-md bg-[var(--color-surface)] px-3 py-2 text-sm"
                >
                  <span className="flex-1 truncate text-[var(--color-text)]">
                    {po.supplier_name ?? (isAr ? "(مورد غير معروف)" : "(unknown supplier)")}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">
                    {formatRelativeDays(po.created_at, isAr)}
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

      {/* ── Row 5: High return rate alert ───────────────────────── */}
      <section aria-label={isAr ? "معدّل الإرجاع" : "Return rate"}>
        <div className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error)]/5 p-5">
          <header className="mb-3 flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-[var(--color-error)]" />
            <h2 className="font-display text-base text-[var(--color-text)]">
              {isAr ? "منتجات بمعدّل إرجاع مرتفع" : "High return rate products"}
            </h2>
            <Link
              href="/admin/reports?tab=returns"
              className="ms-auto text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
            >
              {isAr ? "التقرير ←" : "Report →"}
            </Link>
          </header>
          {highReturnProducts.length === 0 ? (
            <p className="rounded-md bg-[var(--color-bg)] px-3 py-3 text-xs text-[var(--color-text-secondary)]">
              {isAr
                ? "كل المنتجات بمعدّل إرجاع طبيعي خلال آخر 30 يوم."
                : "All products within normal return rates over the last 30 days."}
            </p>
          ) : (
            <ul className="space-y-2">
              {highReturnProducts.map((p) => (
                <li
                  key={p.productId}
                  className="flex items-center gap-3 rounded-md bg-[var(--color-bg)] px-3 py-2 text-sm"
                >
                  <Link
                    href={`/ar/products/${p.productSlug}`}
                    className="flex-1 truncate text-[var(--color-text)] hover:underline"
                    target="_blank"
                  >
                    {p.productName}
                  </Link>
                  <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">
                    {p.unitsReturned}/{p.unitsSold} {isAr ? "قطعة" : "units"}
                  </span>
                  <span className="rounded-full bg-[var(--color-error)]/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--color-error)]">
                    {p.returnRatePct.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Row 6: Supabase free-plan headroom ──────────────────── */}
      <SupabaseUsageCard
        usage={usage}
        locale={locale}
        supabaseProjectRef={supabaseProjectRef}
      />
    </div>
  );
}

// ─── Building blocks ─────────────────────────────────────────────────

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

function OrderStatusBadge({
  status,
  locale,
}: {
  status: string;
  locale: AdminLocale;
}) {
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
      {orderStatusLabel(status, locale)}
    </span>
  );
}

function PaymentMethodChip({
  method,
  locale,
}: {
  method: string;
  locale: AdminLocale;
}) {
  const iconMap: Record<string, typeof Banknote> = {
    cash: Banknote,
    "e-wallet": Wallet,
    instapay: Smartphone,
    card: CreditCard,
    cod: Banknote,
  };
  const Icon = iconMap[method] ?? CreditCard;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text)]">
      <Icon className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
      {paymentMethodLabel(method, locale)}
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

function formatClockTime(iso: string, locale: AdminLocale): string {
  return new Date(iso).toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeDays(iso: string, isAr: boolean): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
  return isAr ? `متأخر ${days} يوم` : `${days}d overdue`;
}
