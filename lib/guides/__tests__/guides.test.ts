import { describe, expect, it } from "vitest";
import { GUIDES, formatGuideDate, getGuide } from "@/lib/guides";
import type { Bi, Cell } from "@/lib/guides/types";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const filled = (b: Bi) => b.ar.trim().length > 0 && b.en.trim().length > 0;
const cellFilled = (c: Cell) => (typeof c === "string" ? c.trim().length > 0 : filled(c));

describe("buying guides data", () => {
  it("has unique slugs that resolve", () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(getGuide(s)?.slug).toBe(s);
    expect(getGuide("nope")).toBeUndefined();
  });

  for (const g of GUIDES) {
    describe(g.slug, () => {
      it("has valid dates (updated not before published)", () => {
        expect(g.published).toMatch(ISO);
        expect(g.updated).toMatch(ISO);
        expect(g.updated >= g.published).toBe(true);
      });

      it("has both languages everywhere", () => {
        for (const b of [g.title, g.description, g.summary]) expect(filled(b)).toBe(true);
        for (const s of g.sections) {
          expect(filled(s.title)).toBe(true);
          for (const b of s.blocks) {
            if (b.kind === "p" || b.kind === "callout") expect(filled(b.text)).toBe(true);
            if (b.kind === "list") b.items.forEach((it) => expect(filled(it)).toBe(true));
            if (b.kind === "cta") expect(filled(b.label)).toBe(true);
          }
        }
        expect(g.faq.length).toBeGreaterThan(0);
        for (const f of g.faq) expect(filled(f.q) && filled(f.a)).toBe(true);
      });

      it("has rectangular tables with no empty cells", () => {
        for (const s of g.sections)
          for (const b of s.blocks) {
            if (b.kind !== "table") continue;
            for (const row of b.rows) {
              expect(row.length).toBe(b.head.length);
              row.forEach((c) => expect(cellFilled(c)).toBe(true));
            }
          }
      });

      it("links only to guides that exist or to real store routes", () => {
        const hrefs = [
          ...(g.related ?? []).map((r) => r.href),
          ...g.sections.flatMap((s) => s.blocks.flatMap((b) => (b.kind === "cta" ? [b.href] : []))),
        ];
        for (const h of hrefs) {
          expect(h.startsWith("/")).toBe(true);
          expect(h).not.toMatch(/^\/(ar|en)\//); // the renderer adds the locale
          const m = h.match(/^\/guides\/([^/?#]+)/);
          if (m) expect(getGuide(m[1]), h).toBeDefined();
        }
      });

      it("cites https sources", () => {
        for (const src of g.sources ?? []) expect(src.url).toMatch(/^https:\/\//);
      });

      it("has unique section ids", () => {
        const ids = g.sections.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).not.toContain("faq");
      });
    });
  }
});

describe("formatGuideDate", () => {
  it("formats without a timezone shift", () => {
    expect(formatGuideDate("2026-10-14", "en")).toBe("14 October 2026");
    expect(formatGuideDate("2026-10-14", "ar")).toContain("2026");
    expect(formatGuideDate("2026-10-14", "ar")).toContain("14");
  });
});
