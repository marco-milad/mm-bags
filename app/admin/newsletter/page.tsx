import Link from "next/link";
import { Download } from "lucide-react";
import {
  getNewsletterStats,
  listNewsletterSubscribers,
  type NewsletterFilters,
} from "@/lib/queries/admin-newsletter";
import {
  approveSubscriber,
  rejectSubscriber,
  toggleSubscriberActive,
} from "@/lib/admin/newsletter-actions";
import { BroadcastForm } from "@/components/admin/newsletter/BroadcastForm";
import { CouponCell } from "@/components/admin/newsletter/CouponCell";
import { getAdminLocale } from "@/lib/admin/locale";
import { SUBSCRIBER_PERCENT_OFF } from "@/lib/coupons/code";
import { couponMessage, gmailComposeUrl } from "@/lib/coupons/share";
import { SITE_URL } from "@/lib/seo/site";
import type { NewsletterSubscriberRow } from "@/lib/queries/admin-newsletter";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * /admin/newsletter — subscribers + broadcast.
 *
 * Sections:
 *   - 4 stat cards: total / active / AR / EN.
 *   - Broadcast form (AR + EN with preview).
 *   - Filter form (search + status + locale).
 *   - Subscribers table with per-row active toggle.
 *   - CSV export link honoring the active filter set.
 */
export default async function NewsletterPage({
  searchParams,
}: PageProps<"/admin/newsletter">) {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";
  const sp = await searchParams;
  const filters: NewsletterFilters = {
    q: typeof sp?.q === "string" ? sp.q : undefined,
    status:
      sp?.status === "active" || sp?.status === "inactive"
        ? (sp.status as "active" | "inactive")
        : undefined,
    locale:
      sp?.locale === "ar" || sp?.locale === "en"
        ? (sp.locale as "ar" | "en")
        : undefined,
    review:
      sp?.review === "pending" || sp?.review === "approved" || sp?.review === "rejected"
        ? sp.review
        : undefined,
  };

  const [subscribers, stats] = await Promise.all([
    listNewsletterSubscribers(filters),
    getNewsletterStats(),
  ]);

  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (typeof v === "string" && v) exportParams.set(k, v);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-text)]">
            {isAr ? "النشرة البريدية" : "Newsletter"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {isAr
              ? "إدارة المشتركين وإرسال رسائل جماعية عبر Resend."
              : "Manage subscribers and send broadcast emails via Resend."}
          </p>
        </div>
        <a
          href={`/admin/newsletter/export?${exportParams.toString()}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          <Download className="h-3.5 w-3.5" />
          {isAr ? "تصدير CSV" : "Export CSV"}
        </a>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Link
          href="/admin/newsletter?review=pending"
          className="rounded-xl transition hover:ring-2 hover:ring-[var(--color-accent)]"
        >
          <Stat
            label={isAr ? "مستني موافقتك" : "Awaiting approval"}
            value={String(stats.pending)}
            tone={stats.pending > 0 ? "primary" : undefined}
          />
        </Link>
        <Stat label={isAr ? "الإجمالي" : "Total"} value={String(stats.total)} />
        <Stat label={isAr ? "نشط" : "Active"} value={String(stats.active)} tone="primary" />
        <Stat label={isAr ? "عربي" : "Arabic"} value={String(stats.ar)} />
        <Stat label={isAr ? "إنجليزي" : "English"} value={String(stats.en)} />
      </section>

      {/* Broadcast form */}
      <BroadcastForm activeCount={stats.active} locale={locale} />

      {/* Filters */}
      <form
        action="/admin/newsletter"
        className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
      >
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "بحث بالإيميل" : "Search email"}
          </span>
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="example@..."
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "الحالة" : "Status"}
          </span>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="">{isAr ? "الكل" : "Any"}</option>
            <option value="active">{isAr ? "نشط" : "Active"}</option>
            <option value="inactive">{isAr ? "غير نشط" : "Inactive"}</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "المراجعة" : "Review"}
          </span>
          <select
            name="review"
            defaultValue={filters.review ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="">{isAr ? "الكل" : "Any"}</option>
            <option value="pending">{isAr ? "مستني موافقة" : "Pending"}</option>
            <option value="approved">{isAr ? "اتوافق عليه" : "Approved"}</option>
            <option value="rejected">{isAr ? "مرفوض" : "Rejected"}</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "اللغة" : "Locale"}
          </span>
          <select
            name="locale"
            defaultValue={filters.locale ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="">{isAr ? "الكل" : "Any"}</option>
            <option value="ar">{isAr ? "عربي" : "Arabic"}</option>
            <option value="en">{isAr ? "إنجليزي" : "English"}</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          {isAr ? "تطبيق" : "Apply"}
        </button>
        <Link
          href="/admin/newsletter"
          className="text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
        >
          {isAr ? "إعادة تعيين" : "Reset"}
        </Link>
      </form>

      <p className="text-xs text-[var(--color-text-secondary)]">
        {isAr
          ? `${subscribers.length} مشترك`
          : `${subscribers.length} subscriber${subscribers.length === 1 ? "" : "s"}`}
      </p>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th>{isAr ? "الإيميل" : "Email"}</Th>
              <Th>{isAr ? "اللغة" : "Locale"}</Th>
              <Th>{isAr ? "تاريخ الاشتراك" : "Subscribed"}</Th>
              <Th>{isAr ? `كود الخصم ${SUBSCRIBER_PERCENT_OFF}٪` : `${SUBSCRIBER_PERCENT_OFF}% code`}</Th>
              <Th>{isAr ? "الحالة" : "Status"}</Th>
              <Th aria-label={isAr ? "إجراءات" : "Actions"} />
            </tr>
          </thead>
          <tbody>
            {subscribers.map((s) => (
              <tr
                key={s.id}
                className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)]/50"
              >
                <td className="px-3 py-2 font-mono text-[12px] text-[var(--color-text)]" dir="ltr">
                  {s.email}
                </td>
                <td className="px-3 py-2 text-[12px] uppercase tracking-wider text-[var(--color-text-secondary)]">
                  {s.locale}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
                  {new Date(s.subscribed_at).toLocaleDateString(
                    isAr ? "ar-EG" : "en-US",
                    {
                      dateStyle: "medium",
                    },
                  )}
                </td>
                <td className="px-3 py-2">
                  <ReviewCell sub={s} isAr={isAr} />
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                      s.is_active
                        ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                        : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]",
                    )}
                  >
                    {s.is_active
                      ? isAr
                        ? "نشط"
                        : "Active"
                      : isAr
                        ? "غير نشط"
                        : "Inactive"}
                  </span>
                </td>
                <td className="px-3 py-2 text-end">
                  <form action={toggleSubscriberActive}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:text-[var(--color-text)] hover:underline"
                    >
                      {s.is_active
                        ? isAr
                          ? "إلغاء التفعيل"
                          : "Deactivate"
                        : isAr
                          ? "إعادة التفعيل"
                          : "Reactivate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {subscribers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]">
                  {isAr
                    ? "لا يوجد مشتركين مطابقين للفلاتر."
                    : "No subscribers match the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Pending → Approve / Reject. Approved → the personal code, its state and a
 * pre-filled Gmail message. Rejected → can still be approved later.
 */
function ReviewCell({ sub, isAr }: { sub: NewsletterSubscriberRow; isAr: boolean }) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(isAr ? "ar-EG" : "en-GB", { dateStyle: "medium", timeZone: "Africa/Cairo" });

  if (sub.status === "approved" && sub.coupon) {
    const c = sub.coupon;
    const expired = !c.used_at && c.expires_at !== null && Date.parse(c.expires_at) <= Date.now();
    const state = c.used_at
      ? isAr
        ? `اتستخدم ${c.order_number ? `في طلب ${c.order_number}` : ""} · ${fmt(c.used_at)}`
        : `Used ${c.order_number ? `on ${c.order_number}` : ""} · ${fmt(c.used_at)}`
      : expired
        ? isAr
          ? "انتهت صلاحيته"
          : "Expired"
        : isAr
          ? `لسه ماتستخدمش${c.expires_at ? ` · صالح لحد ${fmt(c.expires_at)}` : ""}`
          : `Unused${c.expires_at ? ` · valid until ${fmt(c.expires_at)}` : ""}`;
    const msg = couponMessage({
      locale: sub.locale,
      code: c.code,
      percentOff: SUBSCRIBER_PERCENT_OFF,
      expiresAt: c.expires_at,
      siteUrl: SITE_URL,
    });
    return (
      <CouponCell
        code={c.code}
        gmailUrl={gmailComposeUrl(sub.email, msg.subject, msg.body)}
        state={state}
        isAr={isAr}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {sub.status === "rejected" && (
        <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] text-[var(--color-text-secondary)]">
          {isAr ? "مرفوض" : "Rejected"}
        </span>
      )}
      <form action={approveSubscriber}>
        <input type="hidden" name="id" value={sub.id} />
        <button
          type="submit"
          className="min-h-9 rounded-full bg-[var(--color-primary)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
        >
          {isAr ? "موافقة وإصدار كود" : "Approve & issue code"}
        </button>
      </form>
      {sub.status === "pending" && (
        <form action={rejectSubscriber}>
          <input type="hidden" name="id" value={sub.id} />
          <button
            type="submit"
            className="min-h-9 rounded-full border border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-error)] hover:text-[var(--color-error)]"
          >
            {isAr ? "رفض" : "Reject"}
          </button>
        </form>
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
  tone?: "primary";
}) {
  const color =
    tone === "primary"
      ? "text-[var(--color-primary)]"
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

function Th({
  children,
  className,
  ...rest
}: {
  children?: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <th
      scope="col"
      className={
        "px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider " +
        (className ?? "")
      }
      {...rest}
    >
      {children}
    </th>
  );
}
