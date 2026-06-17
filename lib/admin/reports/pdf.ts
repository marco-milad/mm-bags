import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- arabic-reshaper@1.x ships no type declarations
import ArabicReshaper from "arabic-reshaper";
import { NOTO_ARABIC_BASE64 } from "./fonts/noto-arabic-base64";

/**
 * Server-side PDF builder for the admin reports.
 *
 * Arabic in jsPDF is fiddly: the engine draws glyphs LTR and does no
 * shaping. The standard fix is two-step: `arabic-reshaper` converts
 * the input into Presentation Form codepoints (correct contextual
 * glyphs for initial / medial / final / isolated positions), and then
 * we reverse the string so visual order matches RTL. We register Noto
 * Sans Arabic for the Arabic-heavy parts (title, headers, footer);
 * body cells stay on jsPDF's default Helvetica because the report
 * data is overwhelmingly Latin (product names, numeric values).
 */

const BRAND_NAVY = "#0d2540";
const BRAND_BRASS = "#c89b3c";
const TEXT_DARK = "#222222";
const TEXT_MUTED = "#666666";

const ARABIC_RANGE = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

export type PdfColumn = {
  header: string;
  /** Numeric columns get right-aligned in LTR / left-aligned in RTL so
   *  the digits line up under the header. */
  isNumeric?: boolean;
};

export type PdfRow = ReadonlyArray<string | number>;

export type BuildPdfOpts = {
  /** Report title — already in the target locale's language. */
  title: string;
  /** Free-form date / range subtitle — already localized. */
  dateRange: string;
  columns: ReadonlyArray<PdfColumn>;
  rows: ReadonlyArray<PdfRow>;
  /** Totals / summary row appended below the body in autoTable's foot. */
  totals?: ReadonlyArray<string | number | null>;
  /** Admin display name (or email) for the footer signature line. */
  adminName: string;
  locale: "ar" | "en";
};

/** Shape Arabic glyphs + reverse for visual RTL. */
function shapeArabic(text: string): string {
  const shaped: string = ArabicReshaper.convertArabic(text);
  // Codepoint-aware reverse keeps astral characters intact (Presentation
  // Forms-A is in the BMP, so simple char reverse would also work here,
  // but iterating via the spread handles future glyph blocks safely).
  return [...shaped].reverse().join("");
}

/** Render a string for jsPDF: shape if AR + the string actually has
 *  Arabic codepoints; pass through otherwise. Used for title / header
 *  / footer strings that are written directly via doc.text(). */
function ar(s: string, isAr: boolean): string {
  if (!isAr) return s;
  return ARABIC_RANGE.test(s) ? shapeArabic(s) : s;
}

export function buildReportPdf(opts: BuildPdfOpts): Uint8Array {
  const { title, dateRange, columns, rows, totals, adminName, locale } = opts;
  const isAr = locale === "ar";

  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Register Noto Sans Arabic from inlined base64 so the font is part
  // of the function bundle (no fs / network round-trip at request time).
  // Register both `normal` and `bold` style slots pointing at the same
  // TTF: autoTable defaults to bold for head + foot rows, and jsPDF
  // throws "Unable to look up font label" if the requested style isn't
  // registered. We don't have a real bold cut of Noto Sans Arabic
  // Regular — visually identical to normal — but this satisfies the
  // lookup and keeps both surfaces rendering correctly.
  doc.addFileToVFS("NotoArabic.ttf", NOTO_ARABIC_BASE64);
  doc.addFont("NotoArabic.ttf", "NotoArabic", "normal");
  doc.addFont("NotoArabic.ttf", "NotoArabic", "bold");

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ── Brand mark (text-only — sidesteps SVG-to-PDF conversion + keeps
  //    the bundle slim. The display-font weight + brass tagline reads
  //    as "logo enough" for a printed report.)
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_NAVY);
  doc.setFontSize(24);
  doc.text("M.M Bags", pageW / 2, 50, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND_BRASS);
  doc.setFontSize(8);
  doc.text("TRAVEL · IN · STYLE", pageW / 2, 64, { align: "center" });

  // Brass underline bar
  doc.setDrawColor(BRAND_BRASS);
  doc.setLineWidth(1.5);
  doc.line(pageW / 2 - 60, 72, pageW / 2 + 60, 72);

  // ── Title + date range
  doc.setFont(isAr ? "NotoArabic" : "helvetica", "normal");
  doc.setTextColor(TEXT_DARK);
  doc.setFontSize(16);
  doc.text(ar(title, isAr), pageW / 2, 102, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(TEXT_MUTED);
  doc.text(ar(dateRange, isAr), pageW / 2, 120, { align: "center" });

  // ── Table
  const head = [columns.map((c) => ar(c.header, isAr))];
  const body = rows.map((row) =>
    row.map((cell) => {
      const s = typeof cell === "number" ? String(cell) : cell;
      // Body cells are overwhelmingly Latin. If we DO hit an Arabic
      // substring (e.g. an Arabic-typed supplier name) shape it so it
      // renders correctly — the cell font will fall back to NotoArabic
      // implicitly via the body styles override below.
      return ARABIC_RANGE.test(s) ? (isAr ? shapeArabic(s) : s) : s;
    }),
  );
  const foot = totals
    ? [
        totals.map((cell) => {
          if (cell === null) return "";
          const s = typeof cell === "number" ? String(cell) : cell;
          return ARABIC_RANGE.test(s) && isAr ? shapeArabic(s) : s;
        }),
      ]
    : undefined;

  autoTable(doc, {
    startY: 140,
    head,
    body,
    foot,
    theme: "grid",
    margin: { left: 36, right: 36 },
    styles: {
      // Use NotoArabic so Arabic glyphs in any cell render. Helvetica
      // is missing Arabic block entirely.
      font: "NotoArabic",
      fontSize: 9,
      cellPadding: 6,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: BRAND_NAVY,
      textColor: "#ffffff",
      halign: isAr ? "right" : "left",
    },
    bodyStyles: {
      halign: isAr ? "right" : "left",
    },
    footStyles: {
      fillColor: "#f4f1ea",
      textColor: BRAND_NAVY,
      fontStyle: "bold",
      halign: isAr ? "right" : "left",
    },
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [
        i,
        c.isNumeric ? { halign: isAr ? "left" : "right" } : {},
      ]),
    ),
  });

  // ── Footer (every page)
  const printedAt = new Date().toLocaleDateString(
    isAr ? "ar-EG" : "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );
  const footerText = isAr
    ? `M.M Bags — تم الطباعة بتاريخ ${printedAt} بواسطة ${adminName}`
    : `M.M Bags — printed on ${printedAt} by ${adminName}`;

  // jsPDF's typings don't expose getNumberOfPages on the public surface
  // even though it exists at runtime. Cast through unknown.
  const pageCount =
    (doc as unknown as { internal: { getNumberOfPages: () => number } })
      .internal.getNumberOfPages();

  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont(isAr ? "NotoArabic" : "helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED);
    doc.text(ar(footerText, isAr), pageW / 2, pageH - 28, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(`${p} / ${pageCount}`, pageW - 40, pageH - 28);
  }

  // jsPDF's `output("arraybuffer")` returns an ArrayBuffer at runtime.
  const buf = doc.output("arraybuffer") as ArrayBuffer;
  return new Uint8Array(buf);
}
