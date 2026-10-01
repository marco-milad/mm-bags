import type { Acquisition } from "@/lib/admin/analytics";
import { channelLabel } from "@/lib/analytics/channel-labels";

/**
 * Acquisition & tech: where visitors come from (channel / campaign / country)
 * and what they browse with (device / browser / OS). Server component — pure
 * presentation of the analytics_acquisition RPC output. Hidden entirely until
 * there is data, matching the dashboard's "nothing yet" posture.
 */

type Row = { label: string; value: number };

function Bar({ rows, unit, isAr }: { rows: Row[]; unit: string; isAr: boolean }) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  return (
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
          <span className="sr-only">{unit}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({
  title,
  hint,
  rows,
  unit,
  isAr,
}: {
  title: string;
  hint: string;
  rows: Row[];
  unit: string;
  isAr: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{hint}</p>
      ) : (
        <Bar rows={rows} unit={unit} isAr={isAr} />
      )}
    </div>
  );
}

export function AcquisitionReport({
  acquisition,
  isAr,
}: {
  acquisition: Acquisition;
  isAr: boolean;
}) {
  // Nothing tracked with acquisition dims yet (e.g. before the 0023 deploy).
  const hasData =
    acquisition.channels.length > 0 ||
    acquisition.countries.length > 0 ||
    acquisition.devices.length > 0;
  if (!hasData) return null;

  const sessions = isAr ? "زيارة" : "visits";
  const visitors = isAr ? "زائر" : "visitors";

  const channelRows: Row[] = acquisition.channels.map((c) => ({
    label: channelLabel(c.channel, isAr),
    value: c.sessions,
  }));
  // "(unknown)" = rows recorded before acquisition tracking shipped; say so.
  const UNKNOWN = "(unknown)";
  const unknownLabel = isAr ? "غير معروف (قبل التحديث)" : "Unknown (before update)";
  const tr = (v: string) => (v === UNKNOWN ? unknownLabel : v);
  const DEVICES: Record<string, { ar: string; en: string }> = {
    mobile: { ar: "موبايل", en: "Mobile" },
    tablet: { ar: "تابلت", en: "Tablet" },
    desktop: { ar: "كمبيوتر", en: "Desktop" },
  };
  // ISO code → localized country name (EG → مصر / Egypt), via the platform.
  let regionName: (code: string) => string = (c) => c;
  try {
    const dn = new Intl.DisplayNames([isAr ? "ar" : "en"], { type: "region" });
    regionName = (c) => (/^[A-Z]{2}$/.test(c) ? dn.of(c) ?? c : c);
  } catch {
    /* older runtimes: fall back to the raw code */
  }

  const countryRows: Row[] = acquisition.countries.map((c) => ({
    label: c.country === UNKNOWN ? unknownLabel : regionName(c.country),
    value: c.visitors,
  }));
  const deviceRows: Row[] = acquisition.devices.map((d) => ({
    label: DEVICES[d.device] ? DEVICES[d.device][isAr ? "ar" : "en"] : tr(d.device),
    value: d.visitors,
  }));
  const browserRows: Row[] = acquisition.browsers.map((b) => ({ label: tr(b.browser), value: b.visitors }));
  const osRows: Row[] = acquisition.os.map((o) => ({ label: tr(o.os), value: o.visitors }));
  const hasUnknown = [...acquisition.countries.map((c) => c.country), ...acquisition.browsers.map((b) => b.browser)].includes(UNKNOWN);
  const campaignRows: Row[] = acquisition.campaigns.map((c) => ({ label: c.campaign, value: c.sessions }));
  const sourceRows: Row[] = acquisition.sources.map((s) => ({ label: s.source, value: s.sessions }));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          {isAr ? "مصادر الزيارات والأجهزة" : "Acquisition & tech"}
        </h2>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
          {isAr
            ? "الزوّار جايين منين، وبيستخدموا إيه. كل زيارة بتتحسب للمصدر اللي دخلت منه أول مرة."
            : "Where visitors come from and what they use. Each visit counts toward the source it arrived from."}
        </p>
        {hasUnknown && (
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {isAr
              ? "«غير معروف» = زيارات اتسجّلت قبل ما نبدأ نتتبّع الدولة والمتصفح. النسبة دي هتقلّ لوحدها مع الوقت."
              : "“Unknown” = visits recorded before country/browser tracking started. It will shrink on its own over time."}
          </p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          title={isAr ? "القنوات (زيارات)" : "Channels (visits)"}
          hint={isAr ? "لا يوجد" : "None"}
          rows={channelRows}
          unit={sessions}
          isAr={isAr}
        />
        <Card
          title={isAr ? "الدول (زوّار)" : "Countries (visitors)"}
          hint={isAr ? "لا يوجد" : "None"}
          rows={countryRows}
          unit={visitors}
          isAr={isAr}
        />
        <Card
          title={isAr ? "الأجهزة (زوّار)" : "Devices (visitors)"}
          hint={isAr ? "لا يوجد" : "None"}
          rows={deviceRows}
          unit={visitors}
          isAr={isAr}
        />
        <Card
          title={isAr ? "المتصفحات (زوّار)" : "Browsers (visitors)"}
          hint={isAr ? "لا يوجد" : "None"}
          rows={browserRows}
          unit={visitors}
          isAr={isAr}
        />
        <Card
          title={isAr ? "أنظمة التشغيل (زوّار)" : "Operating systems (visitors)"}
          hint={isAr ? "لا يوجد" : "None"}
          rows={osRows}
          unit={visitors}
          isAr={isAr}
        />
        {campaignRows.length > 0 ? (
          <Card
            title={isAr ? "أعلى الحملات (زيارات)" : "Top campaigns (visits)"}
            hint={isAr ? "لا يوجد" : "None"}
            rows={campaignRows}
            unit={sessions}
            isAr={isAr}
          />
        ) : (
          <Card
            title={isAr ? "أعلى المصادر (زيارات)" : "Top sources (visits)"}
            hint={
              isAr
                ? "استخدم روابط ‎?utm_source=…&utm_campaign=… في إعلاناتك عشان تظهر هنا."
                : "Tag your ad/campaign links with ?utm_source=…&utm_campaign=… to see them here."
            }
            rows={sourceRows}
            unit={sessions}
            isAr={isAr}
          />
        )}
      </div>
    </section>
  );
}
