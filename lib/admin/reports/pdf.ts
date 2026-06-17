import "server-only";
import type {
  DailyDetailedReport,
  DailyOnlineOrderRow,
  DailyPosSaleRow,
} from "@/lib/queries/admin-reports";
import {
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/admin/labels";

/**
 * Server-side PDF builder for the admin reports.
 *
 * Why headless Chrome (and not jsPDF or react-pdf):
 *   - jsPDF doesn't apply the Unicode bidi algorithm to RTL text and
 *     ships no Arabic shaper, so even after pre-shaping with
 *     arabic-reshaper the words read reversed once the PDF viewer
 *     applies its own bidi to the Presentation Forms.
 *   - react-pdf uses Fontkit which DOES shape Arabic — but its
 *     textkit bidi reorder pass (v6.3.0) silently drops the
 *     "mark" glyphs that carry the dots on ج / خ / ز / ش / etc.
 *     so letters render as their dotless lookalikes.
 *   - Chrome's text engine is industrial-grade for bidi + shaping;
 *     every project that needs correct Arabic PDFs lands here.
 *
 * Trade-off: the @sparticuz/chromium binary is ~50 MB, which adds
 * to the serverless function bundle and means a 2-5 s cold start
 * for the first PDF after a deploy. Subsequent renders complete in
 * a few hundred milliseconds.
 */

type Locale = "ar" | "en";

const BRAND_NAVY = "#0d2540";
const BRAND_BRASS = "#c89b3c";
const BRASS_LIGHT = "#f4f1ea";
const PAPER = "#fbf9f4";
const INK = "#1f2937";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";

const ROLE_LABEL: Record<string, { ar: string; en: string }> = {
  admin: { ar: "مدير عام", en: "Admin" },
  manager: { ar: "مدير", en: "Manager" },
  cashier: { ar: "كاشير", en: "Cashier" },
};

// ─── Browser handle (lazy + cached) ──────────────────────────────────

let browserPromise: Promise<import("puppeteer-core").Browser> | null = null;

async function getBrowser(): Promise<import("puppeteer-core").Browser> {
  if (browserPromise) {
    const existing = await browserPromise;
    if (existing.connected) return existing;
    browserPromise = null;
  }
  browserPromise = launchBrowser();
  return browserPromise;
}

async function launchBrowser() {
  const puppeteer = (await import("puppeteer-core")).default;
  // CHROME_PATH lets local dev (Windows) point at a system-installed
  // Chrome — sparticuz/chromium is Linux-only and won't run on win32.
  if (process.env.CHROME_PATH) {
    return puppeteer.launch({
      executablePath: process.env.CHROME_PATH,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  const chromium = (await import("@sparticuz/chromium")).default;
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

// ─── HTML escaping + small formatters ────────────────────────────────

function esc(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtEGP(n: number, locale: Locale): string {
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return locale === "ar" ? `${formatted} ج.م` : `${formatted} EGP`;
}
function fmtInt(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(n);
}
function fmtClock(iso: string, locale: Locale): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(
    locale === "ar" ? "ar-EG" : "en-US",
    { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" },
  );
}
function fmtFullDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(
    locale === "ar" ? "ar-EG" : "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  );
}
function fmtToday(locale: Locale): string {
  return new Date().toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Africa/Cairo",
  });
}

function cashierDisplay(row: DailyPosSaleRow, locale: Locale): string {
  if (!row.cashierName || row.cashierName === "—") {
    return locale === "ar" ? "غير محدد" : "Unassigned";
  }
  const role = ROLE_LABEL[row.cashierRole];
  const roleStr = role
    ? locale === "ar"
      ? role.ar
      : role.en
    : row.cashierRole;
  return roleStr ? `${row.cashierName} · ${roleStr}` : row.cashierName;
}

// ─── HTML page shell ─────────────────────────────────────────────────

function pageShell(opts: {
  locale: Locale;
  title: string;
  bodyHtml: string;
}): string {
  const { locale, title, bodyHtml } = opts;
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const fontFamilies = isAr
    ? "'Cairo', 'Noto Sans Arabic', sans-serif"
    : "'Inter', 'Cairo', system-ui, sans-serif";
  // Google Fonts CDN is reachable from Vercel Lambda. Cairo handles
  // both Arabic and Latin glyphs cleanly + matches the storefront UI.
  const fontImport = isAr
    ? "@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');"
    : "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cairo:wght@400;600&display=swap');";

  return /* html */ `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  ${fontImport}
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ${fontFamilies};
    font-size: 9.5pt;
    color: ${INK};
    background: #ffffff;
    padding: 32px 36px 70px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .brand {
    text-align: center;
    margin-bottom: 18px;
  }
  .brand-name {
    font-family: 'Inter', sans-serif;
    font-size: 26pt;
    font-weight: 700;
    color: ${BRAND_NAVY};
    letter-spacing: 1px;
    line-height: 1;
  }
  .brand-tag {
    font-family: 'Inter', sans-serif;
    font-size: 7pt;
    color: ${BRAND_BRASS};
    letter-spacing: 5px;
    margin-top: 4px;
  }
  .brand-rule {
    width: 120px;
    height: 2px;
    background: ${BRAND_BRASS};
    margin: 8px auto 0;
  }
  h1.report-title {
    font-size: 18pt;
    font-weight: 600;
    color: ${BRAND_NAVY};
    text-align: center;
    margin: 16px 0 4px;
  }
  .report-subtitle {
    text-align: center;
    color: ${MUTED};
    font-size: 10pt;
    margin: 0 0 16px;
  }
  h2.section-header {
    font-size: 11pt;
    font-weight: 600;
    color: ${BRAND_NAVY};
    border-bottom: 1.5px solid ${BRAND_BRASS};
    padding: 0 0 6px;
    margin: 18px 0 8px;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin: 6px 0 4px;
  }
  .stat {
    border: 1px solid ${LINE};
    border-radius: 6px;
    padding: 10px 12px;
    min-height: 64px;
  }
  .stat-label {
    font-size: 7.5pt;
    color: ${MUTED};
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin: 0 0 4px;
  }
  .stat-value {
    font-size: 14pt;
    font-weight: 600;
    color: ${BRAND_NAVY};
    margin: 0;
    line-height: 1.2;
  }
  .stat-value.primary { color: ${BRAND_BRASS}; }
  .stat-sub {
    font-size: 8pt;
    color: ${MUTED};
    margin: 4px 0 0;
  }
  table.data {
    width: 100%;
    border-collapse: collapse;
    margin: 4px 0 8px;
    border: 1px solid ${LINE};
    border-radius: 4px;
    overflow: hidden;
    font-size: 9pt;
  }
  table.data thead {
    background: ${BRAND_NAVY};
    color: #ffffff;
  }
  table.data thead th {
    padding: 8px 10px;
    text-align: ${isAr ? "right" : "left"};
    font-weight: 500;
    font-size: 8.5pt;
    border-bottom: 0;
  }
  table.data thead th.num {
    text-align: ${isAr ? "left" : "right"};
  }
  table.data thead th.ctr { text-align: center; }
  table.data tbody td {
    padding: 7px 10px;
    border-top: 1px solid ${LINE};
    vertical-align: middle;
  }
  table.data tbody tr:nth-child(even) td {
    background: ${PAPER};
  }
  table.data td.num {
    text-align: ${isAr ? "left" : "right"};
    font-feature-settings: "tnum" 1;
  }
  table.data td.ctr { text-align: center; }
  table.data td.mono { font-variant-numeric: tabular-nums; }
  table.data tfoot td {
    background: ${BRASS_LIGHT};
    color: ${BRAND_NAVY};
    padding: 9px 10px;
    font-weight: 600;
    border-top: 1.5px solid ${BRAND_BRASS};
  }
  .empty {
    padding: 18px;
    text-align: center;
    color: ${MUTED};
    font-size: 10pt;
  }
  .pill-paid { color: #0f8f4a; font-weight: 500; }
  .pill-pending { color: ${MUTED}; }
  .pill-failed { color: #c0392b; }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 8pt;
    font-weight: 500;
    background: ${BRASS_LIGHT};
    color: ${BRAND_NAVY};
  }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function footerTemplate(opts: { adminName: string; locale: Locale }): string {
  const { adminName, locale } = opts;
  const printedAt = fmtToday(locale);
  // The page-number / total-pages spans are populated by Chrome at PDF
  // time. Inline styles only — external CSS doesn't reach this template.
  const leftHtml =
    locale === "ar"
      ? `M.M Bags — تم الطباعة بتاريخ ${esc(printedAt)} بواسطة ${esc(adminName)}`
      : `M.M Bags — printed on ${esc(printedAt)} by ${esc(adminName)}`;
  return `
<div style="width: 100%; padding: 0 36px; font-size: 8pt; color: ${MUTED}; display: flex; justify-content: space-between; font-family: 'Cairo', sans-serif;">
  <span>${leftHtml}</span>
  <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>`;
}

// ─── Daily report HTML builder ───────────────────────────────────────

const DAILY_ONLINE_COLUMNS_AR = [
  "الوقت",
  "رقم الطلب",
  "العميل",
  "قطع",
  "الدفع",
  "حالة الطلب",
  "الإجمالي",
];
const DAILY_ONLINE_COLUMNS_EN = [
  "Time",
  "Order #",
  "Customer",
  "Items",
  "Payment",
  "Status",
  "Total",
];
const DAILY_POS_COLUMNS_AR = [
  "الوقت",
  "رقم البيعة",
  "الكاشير / الموظف",
  "قطع",
  "طريقة الدفع",
  "مرجع",
  "الإجمالي",
];
const DAILY_POS_COLUMNS_EN = [
  "Time",
  "Sale #",
  "Cashier / Staff",
  "Items",
  "Payment",
  "Ref",
  "Total",
];

function dailyBody(opts: {
  report: DailyDetailedReport;
  locale: Locale;
}): string {
  const { report, locale } = opts;
  const isAr = locale === "ar";

  const summaryStats = [
    {
      label: isAr ? "إجمالي الإيراد" : "Total revenue",
      value: fmtEGP(report.total, locale),
      sub: isAr
        ? `${fmtInt(report.online.count + report.pos.count, locale)} عملية`
        : `${report.online.count + report.pos.count} transactions`,
      primary: true,
    },
    {
      label: isAr ? "أونلاين" : "Online",
      value: fmtEGP(report.online.revenue, locale),
      sub: isAr
        ? `${fmtInt(report.online.count, locale)} طلب · ${fmtInt(report.online.items, locale)} قطعة`
        : `${report.online.count} orders · ${report.online.items} items`,
    },
    {
      label: isAr ? "مبيعات المحل" : "In-store (POS)",
      value: fmtEGP(report.pos.revenue, locale),
      sub: isAr
        ? `${fmtInt(report.pos.count, locale)} بيعة · ${fmtInt(report.pos.items, locale)} قطعة`
        : `${report.pos.count} sales · ${report.pos.items} items`,
    },
    (() => {
      const txns = report.online.count + report.pos.count;
      const items = report.online.items + report.pos.items;
      const itemsPerTxn = txns > 0 ? (items / txns).toFixed(1) : "—";
      return {
        label: isAr ? "متوسط قيمة العملية" : "Avg transaction",
        value: fmtEGP(report.averageOrderValue, locale),
        sub: isAr ? `قطع/عملية: ${itemsPerTxn}` : `Items/txn: ${itemsPerTxn}`,
      };
    })(),
  ];

  const summaryHtml = summaryStats
    .map(
      (s) => `
    <div class="stat">
      <p class="stat-label">${esc(s.label)}</p>
      <p class="stat-value${s.primary ? " primary" : ""}">${esc(s.value)}</p>
      <p class="stat-sub">${esc(s.sub)}</p>
    </div>`,
    )
    .join("");

  const onlineHeaders = isAr ? DAILY_ONLINE_COLUMNS_AR : DAILY_ONLINE_COLUMNS_EN;
  const posHeaders = isAr ? DAILY_POS_COLUMNS_AR : DAILY_POS_COLUMNS_EN;

  const onlineRowsHtml =
    report.onlineRows.length === 0
      ? `<tr><td colspan="${onlineHeaders.length}" class="empty">${esc(isAr ? "مفيش طلبات أونلاين النهارده." : "No online orders today.")}</td></tr>`
      : report.onlineRows.map((r) => renderOnlineRowHtml(r, locale)).join("");

  const posRowsHtml =
    report.posRows.length === 0
      ? `<tr><td colspan="${posHeaders.length}" class="empty">${esc(isAr ? "مفيش مبيعات في المحل النهارده." : "No POS sales today.")}</td></tr>`
      : report.posRows.map((r) => renderPosRowHtml(r, locale)).join("");

  const onlineFoot =
    report.onlineRows.length > 0
      ? `<tfoot><tr>
          <td>${esc(isAr ? "الإجمالي" : "Totals")}</td>
          <td></td>
          <td></td>
          <td class="num">${esc(fmtInt(report.online.items, locale))}</td>
          <td></td>
          <td></td>
          <td class="num">${esc(fmtEGP(report.online.revenue, locale))}</td>
        </tr></tfoot>`
      : "";
  const posFoot =
    report.posRows.length > 0
      ? `<tfoot><tr>
          <td>${esc(isAr ? "الإجمالي" : "Totals")}</td>
          <td></td>
          <td></td>
          <td class="num">${esc(fmtInt(report.pos.items, locale))}</td>
          <td></td>
          <td></td>
          <td class="num">${esc(fmtEGP(report.pos.revenue, locale))}</td>
        </tr></tfoot>`
      : "";

  const headerCellHtml = (label: string, kind?: "num" | "ctr") =>
    `<th${kind ? ` class="${kind}"` : ""}>${esc(label)}</th>`;

  return `
    <div class="brand">
      <div class="brand-name">M.M Bags</div>
      <div class="brand-tag">TRAVEL · IN · STYLE</div>
      <div class="brand-rule"></div>
    </div>

    <h1 class="report-title">${esc(isAr ? "تقرير المبيعات اليومي" : "Daily sales report")}</h1>
    <p class="report-subtitle">${esc(fmtFullDate(`${report.date}T00:00:00Z`, locale))}</p>

    <h2 class="section-header">${esc(isAr ? "ملخص اليوم" : "Day at a glance")}</h2>
    <div class="summary-grid">${summaryHtml}</div>

    <h2 class="section-header">${esc(isAr ? `طلبات أونلاين (${fmtInt(report.online.count, locale)})` : `Online orders (${report.online.count})`)}</h2>
    <table class="data">
      <thead>
        <tr>
          ${headerCellHtml(onlineHeaders[0], "ctr")}
          ${headerCellHtml(onlineHeaders[1])}
          ${headerCellHtml(onlineHeaders[2])}
          ${headerCellHtml(onlineHeaders[3], "num")}
          ${headerCellHtml(onlineHeaders[4])}
          ${headerCellHtml(onlineHeaders[5])}
          ${headerCellHtml(onlineHeaders[6], "num")}
        </tr>
      </thead>
      <tbody>${onlineRowsHtml}</tbody>
      ${onlineFoot}
    </table>

    <h2 class="section-header">${esc(isAr ? `مبيعات المحل (${fmtInt(report.pos.count, locale)})` : `In-store sales (${report.pos.count})`)}</h2>
    <table class="data">
      <thead>
        <tr>
          ${headerCellHtml(posHeaders[0], "ctr")}
          ${headerCellHtml(posHeaders[1])}
          ${headerCellHtml(posHeaders[2])}
          ${headerCellHtml(posHeaders[3], "num")}
          ${headerCellHtml(posHeaders[4])}
          ${headerCellHtml(posHeaders[5])}
          ${headerCellHtml(posHeaders[6], "num")}
        </tr>
      </thead>
      <tbody>${posRowsHtml}</tbody>
      ${posFoot}
    </table>
  `;
}

function renderOnlineRowHtml(r: DailyOnlineOrderRow, locale: Locale): string {
  const paid = r.paymentStatus === "paid";
  const failed = r.paymentStatus === "failed";
  const pillClass = paid ? "pill-paid" : failed ? "pill-failed" : "pill-pending";
  return `<tr>
    <td class="ctr mono">${esc(fmtClock(r.createdAt, locale))}</td>
    <td class="mono">${esc(r.orderNumber)}</td>
    <td>${esc(r.customerName)}</td>
    <td class="num mono">${esc(fmtInt(r.items, locale))}</td>
    <td>${esc(paymentMethodLabel(r.paymentMethod, locale))} · <span class="${pillClass}">${esc(paymentStatusLabel(r.paymentStatus, locale))}</span></td>
    <td><span class="badge">${esc(orderStatusLabel(r.status, locale))}</span></td>
    <td class="num mono">${esc(fmtEGP(r.total, locale))}</td>
  </tr>`;
}

function renderPosRowHtml(r: DailyPosSaleRow, locale: Locale): string {
  return `<tr>
    <td class="ctr mono">${esc(fmtClock(r.createdAt, locale))}</td>
    <td class="mono">${esc(r.saleNumber)}</td>
    <td>${esc(cashierDisplay(r, locale))}</td>
    <td class="num mono">${esc(fmtInt(r.items, locale))}</td>
    <td>${esc(paymentMethodLabel(r.paymentMethod, locale))}</td>
    <td class="mono">${esc(r.paymentRef ?? "—")}</td>
    <td class="num mono">${esc(fmtEGP(r.total, locale))}</td>
  </tr>`;
}

// ─── Generic single-table report HTML builder ────────────────────────

export type GenericColumn = {
  header: { ar: string; en: string };
  align?: "start" | "end" | "center" | "numeric";
};

export type GenericPdfOpts = {
  title: { ar: string; en: string };
  subtitle: string; // already localized
  columns: GenericColumn[];
  rows: ReadonlyArray<ReadonlyArray<string | number>>;
  footer?: ReadonlyArray<string | number | null>;
  adminName: string;
  locale: Locale;
};

function genericBody(opts: GenericPdfOpts): string {
  const { title, subtitle, columns, rows, footer, locale } = opts;
  const isAr = locale === "ar";
  const headerCells = columns
    .map((c) => {
      const cls =
        c.align === "numeric" ? "num" : c.align === "center" ? "ctr" : "";
      return `<th${cls ? ` class="${cls}"` : ""}>${esc(isAr ? c.header.ar : c.header.en)}</th>`;
    })
    .join("");
  const bodyRows =
    rows.length === 0
      ? `<tr><td colspan="${columns.length}" class="empty">${esc(isAr ? "لا توجد بيانات." : "No data.")}</td></tr>`
      : rows
          .map(
            (row) =>
              `<tr>${row
                .map((cell, i) => {
                  const c = columns[i];
                  const cls =
                    c.align === "numeric"
                      ? "num mono"
                      : c.align === "center"
                        ? "ctr mono"
                        : "";
                  return `<td${cls ? ` class="${cls}"` : ""}>${esc(cell)}</td>`;
                })
                .join("")}</tr>`,
          )
          .join("");
  const footRow =
    footer && rows.length > 0
      ? `<tfoot><tr>${footer
          .map((cell, i) => {
            const c = columns[i];
            const cls =
              c.align === "numeric"
                ? "num"
                : c.align === "center"
                  ? "ctr"
                  : "";
            return `<td${cls ? ` class="${cls}"` : ""}>${esc(cell ?? "")}</td>`;
          })
          .join("")}</tr></tfoot>`
      : "";
  return `
    <div class="brand">
      <div class="brand-name">M.M Bags</div>
      <div class="brand-tag">TRAVEL · IN · STYLE</div>
      <div class="brand-rule"></div>
    </div>
    <h1 class="report-title">${esc(isAr ? title.ar : title.en)}</h1>
    <p class="report-subtitle">${esc(subtitle)}</p>
    <table class="data">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
      ${footRow}
    </table>
  `;
}

// ─── Public render functions (route calls these) ────────────────────

async function htmlToPdf(html: string, footer: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // setContent only accepts load / domcontentloaded — load handles
    // most cases. After that we explicitly wait for the network to
    // go idle so the Google Fonts CSS + WOFF2 finish before we snapshot.
    await page.setContent(html, { waitUntil: "load" });
    try {
      await page.waitForNetworkIdle({ idleTime: 300, timeout: 8000 });
    } catch {
      // Fonts may still be loading via a long-lived connection — fall
      // through and let Chrome render with whatever's available.
    }
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: footer,
      margin: {
        top: "10mm",
        right: "12mm",
        bottom: "18mm",
        left: "12mm",
      },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export type DailyPdfOpts = {
  report: DailyDetailedReport;
  adminName: string;
  locale: Locale;
};

export async function renderDailyPdf(opts: DailyPdfOpts): Promise<Buffer> {
  const html = pageShell({
    locale: opts.locale,
    title:
      opts.locale === "ar"
        ? "تقرير المبيعات اليومي"
        : "Daily sales report",
    bodyHtml: dailyBody({ report: opts.report, locale: opts.locale }),
  });
  const footer = footerTemplate({
    adminName: opts.adminName,
    locale: opts.locale,
  });
  return htmlToPdf(html, footer);
}

export async function renderGenericPdf(opts: GenericPdfOpts): Promise<Buffer> {
  const html = pageShell({
    locale: opts.locale,
    title: opts.locale === "ar" ? opts.title.ar : opts.title.en,
    bodyHtml: genericBody(opts),
  });
  const footer = footerTemplate({
    adminName: opts.adminName,
    locale: opts.locale,
  });
  return htmlToPdf(html, footer);
}

// Re-export formatters used by the route to keep its imports tight.
export { fmtEGP, fmtInt };
