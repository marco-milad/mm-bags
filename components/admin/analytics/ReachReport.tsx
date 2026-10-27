import type { Reach } from "@/lib/admin/analytics";
import { channelLabel } from "@/lib/analytics/channel-labels";
import { consentRate, pct } from "@/lib/analytics/paths";

/**
 * Everyone, not just the consented: the cookieless anonymous count next to
 * the tracked one, the banner's acceptance rate, and where the anonymous
 * visits came from. Server component.
 */
export function ReachReport({ reach, isAr }: { reach: Reach; isAr: boolean }) {
  const n = (v: number) => v.toLocaleString(isAr ? "ar-EG" : "en-US");
  const totalVisits = reach.trackedVisits + reach.anonVisits;
  const totalViews = reach.trackedPageViews + reach.anonPageViews;
  if (totalVisits === 0 && reach.consentAccepted + reach.consentRejected === 0) return null;

  const rate = consentRate(reach.consentAccepted, reach.consentRejected);
  const anonShare = pct(reach.anonVisits, totalVisits);
  const DEVICES: Record<string, { ar: string; en: string }> = {
    mobile: { ar: "موبايل", en: "Mobile" },
    tablet: { ar: "تابلت", en: "Tablet" },
    desktop: { ar: "كمبيوتر", en: "Desktop" },
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          {isAr ? "كل الزوّار (حتى اللي رفضوا الكوكيز)" : "All visitors (including those who declined cookies)"}
        </h2>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
          {isAr
            ? "اللي رفض أو ماردّش على رسالة الكوكيز بيتعدّ بشكل مجهول: من غير كوكيز ولا IP، ومن غير ما نقدر نعرف لو رجع تاني. باقي التقارير فوق محسوبة على اللي وافقوا بس."
            : "Visitors who declined or didn't answer are counted anonymously: no cookies, no IP, and no way to tell if they return. The other reports cover consented visitors only."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={isAr ? "كل الزيارات" : "All visits"}
          value={n(totalVisits)}
          sub={isAr ? `${n(totalViews)} صفحة اتفتحت` : `${n(totalViews)} pages viewed`}
        />
        <Stat
          label={isAr ? "زيارات مجهولة" : "Anonymous visits"}
          value={n(reach.anonVisits)}
          sub={anonShare === null ? "—" : isAr ? `${n(anonShare)}٪ من كل الزيارات` : `${anonShare}% of all visits`}
        />
        <Stat
          label={isAr ? "وافقوا على الكوكيز" : "Accepted cookies"}
          value={rate === null ? "—" : isAr ? `${n(rate)}٪` : `${rate}%`}
          sub={
            isAr
              ? `${n(reach.consentAccepted)} وافق · ${n(reach.consentRejected)} رفض`
              : `${n(reach.consentAccepted)} yes · ${n(reach.consentRejected)} no`
          }
        />
        <Stat
          label={isAr ? "منتجات اتشافت (مجهول)" : "Product views (anonymous)"}
          value={n(reach.anonProductViews)}
          sub={isAr ? `${n(reach.anonAddToCart)} إضافة للسلة` : `${n(reach.anonAddToCart)} add-to-carts`}
        />
      </div>

      {(reach.anonChannels.length > 0 || reach.anonDevices.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <BarCard
            title={isAr ? "الزيارات المجهولة جت منين" : "Where anonymous visits came from"}
            rows={reach.anonChannels.map((c) => ({ label: channelLabel(c.channel, isAr), value: c.visits }))}
            isAr={isAr}
          />
          <BarCard
            title={isAr ? "الأجهزة (زيارات مجهولة)" : "Devices (anonymous visits)"}
            rows={reach.anonDevices.map((d) => ({
              label: DEVICES[d.device]?.[isAr ? "ar" : "en"] ?? d.device,
              value: d.visits,
            }))}
            isAr={isAr}
          />
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-[var(--color-text)]">{value}</p>
      <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{sub}</p>
    </div>
  );
}

function BarCard({
  title,
  rows,
  isAr,
}: {
  title: string;
  rows: { label: string; value: number }[];
  isAr: boolean;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[var(--color-text)]">{r.label}</span>
              <span className="shrink-0 font-mono text-[var(--color-text-secondary)]">
                {r.value.toLocaleString(isAr ? "ar-EG" : "en-US")}
              </span>
            </div>
            <div
              className="mt-1 h-1.5 rounded-full bg-[var(--color-primary)]/70"
              style={{ width: `${Math.max(4, Math.round((r.value / max) * 100))}%` }}
              aria-hidden
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
