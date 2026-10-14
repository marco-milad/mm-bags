/**
 * Buying guides (/[locale]/guides/...) are plain data: one renderer, one
 * set of components, and the FAQ JSON-LD is built from the same items the
 * page shows, so the markup can never drift from the visible answer.
 *
 * Every number in a guide must come from a source we can name (the airline's
 * own page, a luggage maker's size chart, or our own product data). Sources
 * are listed on the guide so a reader — or an answer engine — can check them.
 */

/** One string per locale. */
export type Bi = { ar: string; en: string };

/** A table cell: same text in both locales (numbers, sizes) or translated. */
export type Cell = string | Bi;

export type GuideBlock =
  | { kind: "p"; text: Bi }
  | { kind: "list"; items: Bi[] }
  | {
      kind: "table";
      caption: Bi;
      head: Cell[];
      rows: Cell[][];
      /** Small print under the table (assumptions, "check your booking"). */
      note?: Bi;
    }
  /** A highlighted tip or warning. */
  | { kind: "callout"; text: Bi }
  /** A link into the catalog (or another guide); href has no locale prefix. */
  | { kind: "cta"; href: string; label: Bi };

export type GuideSection = {
  /** Anchor id — stable, used for the table of contents. */
  id: string;
  title: Bi;
  blocks: GuideBlock[];
};

export type GuideSource = { label: string; url: string };

export type Guide = {
  slug: string;
  title: Bi;
  /** Meta description: one or two factual sentences. */
  description: Bi;
  /**
   * The answer in two or three sentences, shown first. Answer engines quote
   * the opening of a page; it has to stand on its own.
   */
  summary: Bi;
  /** ISO date (YYYY-MM-DD) of the last content review. */
  updated: string;
  /** ISO date of first publication. */
  published: string;
  sections: GuideSection[];
  faq: { q: Bi; a: Bi }[];
  sources?: GuideSource[];
  /** Other guides / pages to read next; href has no locale prefix. */
  related?: { href: string; label: Bi }[];
};
