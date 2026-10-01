import type { Acquisition } from "@/lib/admin/analytics";
import { channelLabel } from "@/lib/analytics/channel-labels";

/**
 * Acquisition & tech: where visitors come from (channel / campaign / country)
 * and what they browse with (device / browser / OS). Server component — pure
 * presentation of the analytics_acquisition RPC output. Hidden entirely until
 * there is data, matching the dashboard's "nothing yet" posture.
 */

type Row = { label: string; value: number };

function Bar({ rows, unit }: { rows: Row[]; unit: string }) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  return (
    <ul className="mt-2 space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-[var(--color-text)]">{r.label}</span>
            <span className="shrink-0 font-mono text-[var(--color-text-secondary)]">
              {r.value.toLocaleString()}
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
}: {
  title: string;
  hint: string;
  rows: Row[];
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{hint}</p>
      ) : (
        <Bar rows={rows} unit={unit} />
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

  const sessions = isAr ? "جلسة" : "sessions";
  const visitors = isAr ? "زائر" : "visitors";

  const channelRows: Row[] = acquisition.channels.map((c) => ({
    label: channelLabel(c.channel, isAr),
    value: c.sessions,
  }));
  const countryRows: Row[] = acquisition.countries.map((c) => ({ label: c.country, value: c.visitors }));
  const deviceRows: Row[] = acquisition.devices.map((d) => ({ label: d.device, value: d.visitors }));
  const browserRows: Row[] = acquisition.browsers.map((b) => ({ label: b.browser, value: b.visitors }));
  const osRows: Row[] = acquisition.os.map((o) => ({ label: o.os, value: o.visitors }));
  const campaignRows: Row[] = acquisition.campaigns.map((c) => ({ label: c.campaign, value: c.sessions }));
  const sourceRows: Row[] = acquisition.sources.map((s) => ({ label: s.source, value: s.sessions }));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          {isAr ? "مصادر الزيارات والأجهزة" : "Acquisition & tech"}
        </h2>
        <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
          {isAr
            ? "القنوات والحملات بتُنسب لأول زيارة في الجلسة. الدولة من موقع الحافة (من غير تخزين IP)."
            : "Channels/campaigns are attributed to the session's landing touch. Country is edge-derived (no IP stored)."}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          title={isAr ? "القنوات (جلسات)" : "Channels (sessions)"}
          hint={isAr ? "لا يوجد" : "None"}
          rows={channelRows}
          unit={sessions}
        />
        <Card
          title={isAr ? "الدول (زوّار)" : "Countries (visitors)"}
          hint={isAr ? "لا يوجد" : "None"}
          rows={countryRows}
          unit={visitors}
        />
        <Card
          title={isAr ? "الأجهزة (زوّار)" : "Devices (visitors)"}
          hint={isAr ? "لا يوجد" : "None"}
          rows={deviceRows}
          unit={visitors}
        />
        <Card
          title={isAr ? "المتصفحات (زوّار)" : "Browsers (visitors)"}
          hint={isAr ? "لا يوجد" : "None"}
          rows={browserRows}
          unit={visitors}
        />
        <Card
          title={isAr ? "أنظمة التشغيل (زوّار)" : "Operating systems (visitors)"}
          hint={isAr ? "لا يوجد" : "None"}
          rows={osRows}
          unit={visitors}
        />
        {campaignRows.length > 0 ? (
          <Card
            title={isAr ? "أعلى الحملات (جلسات)" : "Top campaigns (sessions)"}
            hint={isAr ? "لا يوجد" : "None"}
            rows={campaignRows}
            unit={sessions}
          />
        ) : (
          <Card
            title={isAr ? "أعلى المصادر (جلسات)" : "Top sources (sessions)"}
            hint={
              isAr
                ? "استخدم روابط ‎?utm_source=…&utm_campaign=… في إعلاناتك عشان تظهر هنا."
                : "Tag your ad/campaign links with ?utm_source=…&utm_campaign=… to see them here."
            }
            rows={sourceRows}
            unit={sessions}
          />
        )}
      </div>
    </section>
  );
}
