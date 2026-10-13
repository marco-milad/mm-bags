import { describe, it, expect } from "vitest";
import {
  buildSearchOrFilter,
  expandSearchTerm,
  MAX_SYNONYM_TARGETS,
  toIlikeSafe,
  type SynonymPair,
} from "@/lib/search/expand";

const SYN: SynonymPair[] = [
  { term: "شنطه سفر", maps_to: "ترولي" },
  { term: "backpack", maps_to: "شنطه ظهر" },
  { term: "كاب", maps_to: "شنطة كتف" },
];

describe("expandSearchTerm (synonyms in live search)", () => {
  it("no synonym → only the normalized query", () => {
    expect(expandSearchTerm("  Milano ", SYN)).toEqual(["milano"]);
    expect(expandSearchTerm("milano", [])).toEqual(["milano"]);
  });

  it("matches through normalization on both sides (ة/ه, case, spacing)", () => {
    // Query typed with ة and extra spaces; row stored as ه.
    expect(expandSearchTerm("شنطة   سفر", SYN)).toEqual(["شنطه سفر", "ترولي"]);
    expect(expandSearchTerm("BackPack", SYN)).toEqual(["backpack", "شنطه ظهر"]);
    // Target is normalized too (ة → ه), so it compares against search_blob.
    expect(expandSearchTerm("كاب", SYN)).toEqual(["كاب", "شنطه كتف"]);
  });

  it("only a WHOLE-query match fires (no substring expansion)", () => {
    expect(expandSearchTerm("شنطه سفر كبيره", SYN)).toEqual(["شنطه سفر كبيره"]);
    expect(expandSearchTerm("back", SYN)).toEqual(["back"]);
  });

  it("multiple targets: separators split, duplicates and self-maps dropped", () => {
    const rows: SynonymPair[] = [
      { term: "luggage", maps_to: "ترولي، trolley ; ترولي, luggage" },
    ];
    expect(expandSearchTerm("Luggage", rows)).toEqual(["luggage", "ترولي", "trolley"]);
  });

  it("caps the number of targets", () => {
    const many = Array.from({ length: 12 }, (_, i) => `t${i}`).join(",");
    const out = expandSearchTerm("x", [{ term: "x", maps_to: many }]);
    expect(out[0]).toBe("x");
    expect(out.length).toBe(1 + MAX_SYNONYM_TARGETS);
  });

  it("empty or syntax-only query → nothing to search", () => {
    expect(expandSearchTerm("   ", SYN)).toEqual([]);
    expect(expandSearchTerm("*,()", SYN)).toEqual([]);
  });
});

describe("buildSearchOrFilter", () => {
  it("keeps the pre-synonym clauses when nothing maps", () => {
    expect(buildSearchOrFilter("شنطة", [])).toBe(
      "search_blob.ilike.*شنطه*,name_ar.ilike.*شنطة*,name_en.ilike.*شنطة*",
    );
  });

  it("ORs each synonym target into blob and name clauses", () => {
    expect(buildSearchOrFilter("Backpack", SYN)).toBe(
      [
        "search_blob.ilike.*backpack*",
        "name_ar.ilike.*Backpack*",
        "name_en.ilike.*Backpack*",
        "search_blob.ilike.*شنطه ظهر*",
        "name_ar.ilike.*شنطه ظهر*",
        "name_en.ilike.*شنطه ظهر*",
      ].join(","),
    );
  });

  it("strips PostgREST syntax from the query and from targets", () => {
    const f = buildSearchOrFilter("a*b,(c)", [{ term: "a b c", maps_to: "x(y)*" }]);
    expect(f).not.toBeNull();
    // Only the separators we insert ourselves may appear.
    const values = f!.split(",").map((c) => c.replace(/^[a-z_]+\.ilike\.\*|\*$/g, ""));
    for (const v of values) expect(v).not.toMatch(/[*,()]/);
    expect(values).toContain("x y");
  });

  it("returns null for an empty query", () => {
    expect(buildSearchOrFilter("  ", SYN)).toBeNull();
  });

  it("toIlikeSafe collapses whitespace left behind by stripped characters", () => {
    expect(toIlikeSafe(" a , b ")).toBe("a b");
  });
});
