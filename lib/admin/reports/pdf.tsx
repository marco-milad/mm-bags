import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type React from "react";
import { NOTO_ARABIC_BASE64 } from "./fonts/noto-arabic-base64";
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
 * PDF reports for /admin/reports — rendered via @react-pdf/renderer.
 *
 * Why react-pdf vs jsPDF: jsPDF doesn't apply the Unicode bidi algorithm
 * or shape Arabic at draw-time, which left titles + headers reading as
 * reversed glyph runs. react-pdf is Yoga + Fontkit under the hood and
 * gets RTL + Arabic shaping right out of the box once we register a
 * font that has the Arabic block.
 *
 * Font registration happens at module load so every render call after
 * the first reuses the parsed font. The Noto Sans Arabic regular .ttf
 * is bundled as base64 inside `./fonts/noto-arabic-base64.ts` so
 * Next.js's serverless tracing can't drop it.
 */

Font.register({
  family: "NotoArabic",
  src: `data:font/ttf;base64,${NOTO_ARABIC_BASE64}`,
});
// React-pdf's default hyphenation breaks Arabic mid-word and triggers
// a crash in textkit's bidi reorder pass; opting out fixes both.
Font.registerHyphenationCallback((word) => [word]);

const NAVY = "#0d2540";
const BRASS = "#c89b3c";
const BRASS_LIGHT = "#f4f1ea";
const PAPER = "#fbf9f4";
const INK = "#1f2937";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";
const SUCCESS = "#0f8f4a";
const DANGER = "#c0392b";

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoArabic",
    fontSize: 9,
    color: INK,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 36,
    backgroundColor: "#ffffff",
  },
  brandWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  brandName: {
    fontSize: 22,
    color: NAVY,
    letterSpacing: 1,
  },
  brandTag: {
    fontSize: 7,
    color: BRASS,
    letterSpacing: 4,
    marginTop: 2,
  },
  brassRule: {
    width: 120,
    height: 1.5,
    backgroundColor: BRASS,
    marginTop: 6,
  },
  title: {
    fontSize: 16,
    color: NAVY,
    marginTop: 12,
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 10,
    color: MUTED,
    textAlign: "center",
    marginBottom: 14,
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BRASS,
    fontSize: 11,
    color: NAVY,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
    marginTop: 4,
  },
  summaryCell: {
    width: "25%",
    padding: 6,
  },
  summaryCellInner: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    padding: 8,
    minHeight: 50,
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 7,
    color: MUTED,
    letterSpacing: 1,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 14,
    color: NAVY,
  },
  summaryValuePrimary: {
    color: BRASS,
  },
  summarySub: {
    fontSize: 7,
    color: MUTED,
    marginTop: 2,
  },
  table: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 3,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: NAVY,
  },
  tableHeadCell: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    color: "#ffffff",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  tableRowAlt: {
    backgroundColor: PAPER,
  },
  tableCell: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 8,
  },
  tableFoot: {
    flexDirection: "row",
    backgroundColor: BRASS_LIGHT,
    borderTopWidth: 1,
    borderTopColor: BRASS,
  },
  tableFootCell: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 8,
    color: NAVY,
  },
  emptyRow: {
    padding: 14,
    textAlign: "center",
    color: MUTED,
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    color: MUTED,
    fontSize: 7,
  },
  pillSuccess: { color: SUCCESS },
  pillDanger: { color: DANGER },
  pillMuted: { color: MUTED },
  textEnd: { textAlign: "right" },
  textStart: { textAlign: "left" },
  textCenter: { textAlign: "center" },
  mono: { letterSpacing: 0 },
});

type Locale = "ar" | "en";

// ─── Small reusable pieces ─────────────────────────────────────────

function BrandHeader() {
  return (
    <View style={styles.brandWrap}>
      <Text style={styles.brandName}>M.M Bags</Text>
      <Text style={styles.brandTag}>TRAVEL · IN · STYLE</Text>
      <View style={styles.brassRule} />
    </View>
  );
}

function Footer({
  adminName,
  printedAt,
  locale,
}: {
  adminName: string;
  printedAt: string;
  locale: Locale;
}) {
  const isAr = locale === "ar";
  const left = isAr
    ? `M.M Bags — تم الطباعة بتاريخ ${printedAt} بواسطة ${adminName}`
    : `M.M Bags — printed on ${printedAt} by ${adminName}`;
  return (
    <View style={styles.footer} fixed>
      <Text>{left}</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

type Column = {
  /** Bilingual header text. */
  header: { ar: string; en: string };
  /** Tailwind-style relative width — share of available row width. */
  flex: number;
  /** Alignment within the cell. Defaults to start. */
  align?: "start" | "end" | "center";
  /** Mark numeric columns so we can flip alignment per direction. */
  numeric?: boolean;
};
type CellContent = string | React.ReactNode;

function HeaderRow({ columns, locale }: { columns: Column[]; locale: Locale }) {
  const isAr = locale === "ar";
  return (
    <View style={styles.tableHead}>
      {columns.map((c, i) => (
        <Text
          key={i}
          style={[
            styles.tableHeadCell,
            { flex: c.flex },
            alignStyle(c, isAr),
          ]}
        >
          {isAr ? c.header.ar : c.header.en}
        </Text>
      ))}
    </View>
  );
}

function alignStyle(c: Column, isAr: boolean) {
  // Numeric columns: align opposite the reading direction so digits
  // stack neatly under their header (right in LTR, left in RTL).
  if (c.align === "center") return styles.textCenter;
  if (c.numeric) return isAr ? styles.textStart : styles.textEnd;
  if (c.align === "end") return styles.textEnd;
  return isAr ? styles.textEnd : styles.textStart;
}

function BodyRow({
  cells,
  columns,
  locale,
  alt,
}: {
  cells: CellContent[];
  columns: Column[];
  locale: Locale;
  alt?: boolean;
}) {
  const isAr = locale === "ar";
  return (
    <View style={alt ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
      {cells.map((cell, i) => {
        const c = columns[i];
        return (
          <View key={i} style={[styles.tableCell, { flex: c.flex }]}>
            {typeof cell === "string" || typeof cell === "number" ? (
              <Text style={alignStyle(c, isAr)}>{cell}</Text>
            ) : (
              cell
            )}
          </View>
        );
      })}
    </View>
  );
}

function FootRow({
  cells,
  columns,
  locale,
}: {
  cells: (CellContent | null)[];
  columns: Column[];
  locale: Locale;
}) {
  const isAr = locale === "ar";
  return (
    <View style={styles.tableFoot}>
      {cells.map((cell, i) => {
        const c = columns[i];
        return (
          <Text
            key={i}
            style={[styles.tableFootCell, { flex: c.flex }, alignStyle(c, isAr)]}
          >
            {cell === null ? "" : (cell as string | number)}
          </Text>
        );
      })}
    </View>
  );
}

function SummaryStat({
  label,
  value,
  sub,
  primary,
}: {
  label: string;
  value: string;
  sub?: string;
  primary?: boolean;
}) {
  return (
    <View style={styles.summaryCell}>
      <View style={styles.summaryCellInner}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text
          style={
            primary
              ? [styles.summaryValue, styles.summaryValuePrimary]
              : styles.summaryValue
          }
        >
          {value}
        </Text>
        {sub ? <Text style={styles.summarySub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// ─── Formatting helpers (kept locale-aware) ──────────────────────────

function fmtEGP(n: number, locale: Locale): string {
  // Use Arabic-locale separators when AR so 1,234.56 → ١٬٢٣٤٫٥٦. The
  // brass " ج.م" suffix matches the storefront's spelling.
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
  const d = new Date(iso);
  // Cairo time so admin sees what the cashier rang on the wall clock.
  return d.toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  });
}

// ─── Detailed daily report ──────────────────────────────────────────

const DAILY_ONLINE_COLUMNS: Column[] = [
  { header: { ar: "الوقت", en: "Time" }, flex: 1.4, align: "center" },
  { header: { ar: "رقم الطلب", en: "Order #" }, flex: 1.8 },
  { header: { ar: "العميل", en: "Customer" }, flex: 3.2 },
  { header: { ar: "قطع", en: "Items" }, flex: 1, numeric: true },
  { header: { ar: "الدفع", en: "Payment" }, flex: 2 },
  { header: { ar: "حالة الطلب", en: "Status" }, flex: 1.8 },
  { header: { ar: "الإجمالي", en: "Total" }, flex: 2.2, numeric: true },
];

const DAILY_POS_COLUMNS: Column[] = [
  { header: { ar: "الوقت", en: "Time" }, flex: 1.4, align: "center" },
  { header: { ar: "رقم البيعة", en: "Sale #" }, flex: 1.8 },
  { header: { ar: "الكاشير / الموظف", en: "Cashier / Staff" }, flex: 3.2 },
  { header: { ar: "قطع", en: "Items" }, flex: 1, numeric: true },
  { header: { ar: "طريقة الدفع", en: "Payment" }, flex: 2 },
  { header: { ar: "مرجع", en: "Ref" }, flex: 1.8 },
  { header: { ar: "الإجمالي", en: "Total" }, flex: 2.2, numeric: true },
];

const ROLE_LABEL: Record<string, { ar: string; en: string }> = {
  admin: { ar: "مدير عام", en: "Admin" },
  manager: { ar: "مدير", en: "Manager" },
  cashier: { ar: "كاشير", en: "Cashier" },
};

function cashierDisplay(
  row: DailyPosSaleRow,
  locale: Locale,
): string {
  if (row.cashierName === "—") {
    return locale === "ar" ? "غير محدد" : "Unassigned";
  }
  const role = ROLE_LABEL[row.cashierRole];
  const roleStr = role ? (locale === "ar" ? role.ar : role.en) : row.cashierRole;
  return roleStr ? `${row.cashierName} · ${roleStr}` : row.cashierName;
}

export type DailyPdfOpts = {
  report: DailyDetailedReport;
  adminName: string;
  locale: Locale;
};

function DailyPdf({ report, adminName, locale }: DailyPdfOpts) {
  const isAr = locale === "ar";
  const direction = isAr ? "rtl" : "ltr";

  const printedAt = new Date().toLocaleDateString(
    isAr ? "ar-EG" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Africa/Cairo",
    },
  );
  const reportDate = new Date(`${report.date}T00:00:00Z`).toLocaleDateString(
    isAr ? "ar-EG" : "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  // Totals row for online orders table
  const onlineFootCells = [
    isAr ? "الإجمالي" : "Totals",
    "",
    "",
    fmtInt(report.online.items, locale),
    "",
    "",
    fmtEGP(report.online.revenue, locale),
  ];
  const posFootCells = [
    isAr ? "الإجمالي" : "Totals",
    "",
    "",
    fmtInt(report.pos.items, locale),
    "",
    "",
    fmtEGP(report.pos.revenue, locale),
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <BrandHeader />

        <Text style={styles.title}>
          {isAr ? "تقرير المبيعات اليومي" : "Daily sales report"}
        </Text>
        <Text style={styles.subtitle}>{reportDate}</Text>

        {/* Summary grid */}
        <Text style={styles.sectionHeader}>
          {isAr ? "ملخص اليوم" : "Day at a glance"}
        </Text>
        <View style={styles.summaryGrid}>
          <SummaryStat
            label={isAr ? "إجمالي الإيراد" : "Total revenue"}
            value={fmtEGP(report.total, locale)}
            sub={
              isAr
                ? `${fmtInt(
                    report.online.count + report.pos.count,
                    locale,
                  )} عملية`
                : `${report.online.count + report.pos.count} transactions`
            }
            primary
          />
          <SummaryStat
            label={isAr ? "أونلاين" : "Online"}
            value={fmtEGP(report.online.revenue, locale)}
            sub={
              isAr
                ? `${fmtInt(report.online.count, locale)} طلب · ${fmtInt(
                    report.online.items,
                    locale,
                  )} قطعة`
                : `${report.online.count} orders · ${report.online.items} items`
            }
          />
          <SummaryStat
            label={isAr ? "مبيعات المحل" : "In-store (POS)"}
            value={fmtEGP(report.pos.revenue, locale)}
            sub={
              isAr
                ? `${fmtInt(report.pos.count, locale)} بيعة · ${fmtInt(
                    report.pos.items,
                    locale,
                  )} قطعة`
                : `${report.pos.count} sales · ${report.pos.items} items`
            }
          />
          <SummaryStat
            label={isAr ? "متوسط قيمة العملية" : "Avg transaction"}
            value={fmtEGP(report.averageOrderValue, locale)}
            sub={
              isAr
                ? `قطع/عملية: ${
                    report.online.count + report.pos.count > 0
                      ? (
                          (report.online.items + report.pos.items) /
                          (report.online.count + report.pos.count)
                        ).toFixed(1)
                      : "—"
                  }`
                : `Items/txn: ${
                    report.online.count + report.pos.count > 0
                      ? (
                          (report.online.items + report.pos.items) /
                          (report.online.count + report.pos.count)
                        ).toFixed(1)
                      : "—"
                  }`
            }
          />
        </View>

        {/* Online orders detail */}
        <Text style={styles.sectionHeader}>
          {isAr
            ? `طلبات أونلاين (${fmtInt(report.online.count, locale)})`
            : `Online orders (${report.online.count})`}
        </Text>
        <View style={styles.table}>
          <HeaderRow columns={DAILY_ONLINE_COLUMNS} locale={locale} />
          {report.onlineRows.length === 0 ? (
            <Text style={styles.emptyRow}>
              {isAr ? "مفيش طلبات أونلاين النهارده." : "No online orders today."}
            </Text>
          ) : (
            <>
              {report.onlineRows.map((row, i) => (
                <BodyRow
                  key={row.id}
                  columns={DAILY_ONLINE_COLUMNS}
                  locale={locale}
                  alt={i % 2 === 1}
                  cells={renderOnlineRow(row, locale)}
                />
              ))}
              <FootRow
                columns={DAILY_ONLINE_COLUMNS}
                locale={locale}
                cells={onlineFootCells}
              />
            </>
          )}
        </View>

        {/* POS sales detail */}
        <Text style={styles.sectionHeader}>
          {isAr
            ? `مبيعات المحل (${fmtInt(report.pos.count, locale)})`
            : `In-store sales (${report.pos.count})`}
        </Text>
        <View style={styles.table}>
          <HeaderRow columns={DAILY_POS_COLUMNS} locale={locale} />
          {report.posRows.length === 0 ? (
            <Text style={styles.emptyRow}>
              {isAr ? "مفيش مبيعات في المحل النهارده." : "No POS sales today."}
            </Text>
          ) : (
            <>
              {report.posRows.map((row, i) => (
                <BodyRow
                  key={row.id}
                  columns={DAILY_POS_COLUMNS}
                  locale={locale}
                  alt={i % 2 === 1}
                  cells={renderPosRow(row, locale)}
                />
              ))}
              <FootRow
                columns={DAILY_POS_COLUMNS}
                locale={locale}
                cells={posFootCells}
              />
            </>
          )}
        </View>

        <Footer
          adminName={adminName}
          printedAt={printedAt}
          locale={locale}
        />
      </Page>
    </Document>
  );
}

function renderOnlineRow(
  row: DailyOnlineOrderRow,
  locale: Locale,
): CellContent[] {
  // Note: every cell is a flat string. react-pdf 4.x's textkit
  // crashes inside its bidi reorder pass when an Arabic Text node
  // contains other Text children — inline styled runs are not
  // supported when mixing scripts. We compose visually with a
  // single combined string instead.
  const sep = locale === "ar" ? " · " : " · ";
  return [
    fmtClock(row.createdAt, locale),
    row.orderNumber,
    row.customerName,
    fmtInt(row.items, locale),
    paymentMethodLabel(row.paymentMethod, locale) +
      sep +
      paymentStatusLabel(row.paymentStatus, locale),
    orderStatusLabel(row.status, locale),
    fmtEGP(row.total, locale),
  ];
}

function renderPosRow(row: DailyPosSaleRow, locale: Locale): CellContent[] {
  return [
    fmtClock(row.createdAt, locale),
    row.saleNumber,
    cashierDisplay(row, locale),
    fmtInt(row.items, locale),
    paymentMethodLabel(row.paymentMethod, locale),
    row.paymentRef ?? "—",
    fmtEGP(row.total, locale),
  ];
}

// ─── Generic table report (monthly / best-sellers / stock / suppliers) ──

export type GenericPdfOpts = {
  title: { ar: string; en: string };
  subtitle: string;          // Already localized
  columns: Column[];
  rows: CellContent[][];
  footer?: (CellContent | null)[];
  adminName: string;
  locale: Locale;
};

function GenericPdf({
  title,
  subtitle,
  columns,
  rows,
  footer: footerRow,
  adminName,
  locale,
}: GenericPdfOpts) {
  const isAr = locale === "ar";
  const direction = isAr ? "rtl" : "ltr";
  const printedAt = new Date().toLocaleDateString(
    isAr ? "ar-EG" : "en-US",
    { year: "numeric", month: "long", day: "numeric", timeZone: "Africa/Cairo" },
  );
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <BrandHeader />
        <Text style={styles.title}>{isAr ? title.ar : title.en}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.table}>
          <HeaderRow columns={columns} locale={locale} />
          {rows.length === 0 ? (
            <Text style={styles.emptyRow}>
              {isAr ? "لا توجد بيانات." : "No data."}
            </Text>
          ) : (
            <>
              {rows.map((cells, i) => (
                <BodyRow
                  key={i}
                  columns={columns}
                  locale={locale}
                  alt={i % 2 === 1}
                  cells={cells}
                />
              ))}
              {footerRow ? (
                <FootRow columns={columns} locale={locale} cells={footerRow} />
              ) : null}
            </>
          )}
        </View>
        <Footer
          adminName={adminName}
          printedAt={printedAt}
          locale={locale}
        />
      </Page>
    </Document>
  );
}

// ─── Public renderers (route calls these) ───────────────────────────

export async function renderDailyPdf(opts: DailyPdfOpts): Promise<Buffer> {
  return renderToBuffer(<DailyPdf {...opts} />);
}

export async function renderGenericPdf(opts: GenericPdfOpts): Promise<Buffer> {
  return renderToBuffer(<GenericPdf {...opts} />);
}

export type { Column as PdfColumn };
export { fmtEGP, fmtInt };
