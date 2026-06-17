import Link from "next/link";
import {
  getWaitlistStats,
  listWaitlistGroups,
  listWaitlistProducts,
  type WaitlistFilters,
} from "@/lib/queries/admin-notifications";
import {
  sendAllPendingNotifications,
  sendVariantNotificationsForm,
} from "@/lib/admin/notification-actions";
import { SendButton } from "@/components/admin/notifications/SendButton";
import { getAdminLocale } from "@/lib/admin/locale";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * /admin/notifications — back-in-stock waitlist.
 *
 * Groups every notification_subscriptions row by variant. Each group
 * shows the product, variant label, current stock, pending count,
 * and a "Send notifications" button that batches Resend/Twilio
 * dispatches for all pending subscribers of that variant.
 *
 * Bulk send button at the top fires the same dispatch for every
 * variant that currently has pending rows.
 */
export default async function NotificationsPage({
  searchParams,
}: PageProps<"/admin/notifications">) {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";
  const sp = await searchParams;
  const filters: WaitlistFilters = {
    status: sp?.status === "all" ? "all" : "pending",
    productId:
      typeof sp?.product === "string" ? sp.product : undefined,
  };

  const [groups, stats, products] = await Promise.all([
    listWaitlistGroups(filters),
    getWaitlistStats(),
    listWaitlistProducts(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-text)]">
            {isAr ? "إشعارات توفر المخزون" : "Back-in-stock notifications"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {isAr
              ? "العملاء اللي مستنيين رجوع المنتجات. الإرسال يفعّل Resend للإيميل أو Twilio للواتساب حسب القناة اللي اختاروها."
              : "Customers waiting for restocks. Sending fires Resend email or Twilio WhatsApp depending on the channel they signed up with."}
          </p>
        </div>
        {stats.pendingTotal > 0 && (
          <form action={sendAllPendingNotifications}>
            <SendButton
              pendingCount={stats.pendingTotal}
              variant="bulk"
              locale={locale}
              confirmMessage={
                isAr
                  ? `إرسال واتساب + إيميل لـ ${stats.pendingTotal} مشترك معلق؟ كل رسالة بتكلف فلوس — الحد الأقصى 100 فاريانت في المرة.`
                  : `Send WhatsApp + email to ${stats.pendingTotal} pending subscribers? Each message costs money — capped at 100 variants per run.`
              }
            />
          </form>
        )}
      </header>

      {/* Stats */}
      <section className="grid gap-3 md:grid-cols-3">
        <Stat
          label={isAr ? "إشعارات معلقة" : "Pending notifications"}
          value={String(stats.pendingTotal)}
          tone={stats.pendingTotal > 0 ? "warn" : "muted"}
        />
        <Stat
          label={isAr ? "منتجات في قائمة الانتظار" : "Products with waitlist"}
          value={String(stats.productsWithPending)}
        />
        <Stat
          label={isAr ? "فاريانتس في الطابور" : "Variants in queue"}
          value={String(groups.length)}
        />
      </section>

      {/* Filters */}
      <form
        action="/admin/notifications"
        className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
      >
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "الحالة" : "Status"}
          </span>
          <select
            name="status"
            defaultValue={filters.status ?? "pending"}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="pending">{isAr ? "المعلق فقط" : "Pending only"}</option>
            <option value="all">{isAr ? "الكل" : "All"}</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "المنتج" : "Product"}
          </span>
          <select
            name="product"
            defaultValue={filters.productId ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="">{isAr ? "كل المنتجات" : "All products"}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.pendingCount})
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          {isAr ? "تطبيق" : "Apply"}
        </button>
        <Link
          href="/admin/notifications"
          className="text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
        >
          {isAr ? "إعادة تعيين" : "Reset"}
        </Link>
      </form>

      {/* Groups */}
      {groups.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]">
          {isAr
            ? "لا يوجد قوائم انتظار مطابقة للفلاتر."
            : "No waitlist entries match the current filters."}
        </p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => {
            const backInStock = g.stockQty > 0;
            return (
              <li
                key={g.variantId}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5"
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/ar/products/${g.productSlug}`}
                      target="_blank"
                      className="font-display text-lg text-[var(--color-text)] hover:underline"
                    >
                      {g.productName}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                      {g.colorHex && (
                        <span
                          aria-hidden
                          className="h-3 w-3 rounded-full ring-1 ring-[var(--color-border)]"
                          style={{ background: g.colorHex }}
                        />
                      )}
                      <span>{g.variantLabel}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                          backInStock
                            ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                            : "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
                        )}
                      >
                        {isAr ? "المخزون" : "Stock"}: {g.stockQty}
                      </span>
                    </div>
                  </div>
                  <form action={sendVariantNotificationsForm}>
                    <input type="hidden" name="variantId" value={g.variantId} />
                    <SendButton
                      pendingCount={g.pendingCount}
                      // Server-side dispatcher refuses to send when
                      // stock=0; the disabled flag here just makes
                      // the UI honest.
                      disabled={!backInStock}
                      locale={locale}
                      confirmMessage={
                        isAr
                          ? `إرسال واتساب/إيميل لـ ${g.pendingCount} مشترك من ${g.productName} (${g.variantLabel})؟`
                          : `Send WhatsApp/email to ${g.pendingCount} pending subscribers of ${g.productName} (${g.variantLabel})?`
                      }
                    />
                  </form>
                </header>

                {/* Subscriber list */}
                <ul className="mt-4 divide-y divide-[var(--color-border)]">
                  {g.subscribers.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center gap-3 py-2 text-sm"
                    >
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                          s.channel === "email"
                            ? "bg-[var(--color-accent)]/15 text-[var(--color-accent-dark)]"
                            : "bg-brass-500/15 text-brass-700",
                        )}
                      >
                        {s.channel === "email"
                          ? isAr
                            ? "إيميل"
                            : "Email"
                          : isAr
                            ? "واتساب"
                            : s.channel}
                      </span>
                      <span
                        className="flex-1 truncate font-mono text-[12px] text-[var(--color-text)]"
                        dir="ltr"
                      >
                        {s.channel === "email"
                          ? s.guest_email ?? "—"
                          : s.guest_phone ?? "—"}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-secondary)]">
                        {new Date(s.created_at).toLocaleDateString(
                          isAr ? "ar-EG" : "en-US",
                          {
                            dateStyle: "medium",
                          },
                        )}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                          s.notified
                            ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                            : "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
                        )}
                      >
                        {s.notified
                          ? isAr
                            ? "تم الإرسال"
                            : "Sent"
                          : isAr
                            ? "معلق"
                            : "Pending"}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn" | "muted";
}) {
  const color =
    tone === "warn"
      ? "text-[var(--color-warning)]"
      : tone === "muted"
        ? "text-[var(--color-text-secondary)]"
        : "text-[var(--color-text)]";
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${color}`}>
        {value}
      </p>
    </div>
  );
}
