import {
  Award,
  Box,
  Briefcase,
  Grid3x3,
  Layers,
  Shield,
  Shirt,
  type LucideIcon,
} from "lucide-react";

/**
 * Material buckets — group the free-form `material_type` strings written
 * on each product (e.g. "Polyester", "Premium Leather", "Faux Leather (Croc)")
 * into a small set of customer-facing families so the homepage doesn't
 * render 16 near-duplicate cards. The Shop-by-Material section uses these
 * directly; the catalog page accepts the bucket id as `?materialBucket=<id>`
 * and expands it into the underlying member list for the actual filter.
 *
 * Matching is FIRST-WIN, so more-specific compound rules (faux/pu/vegan)
 * must come before the generic "leather" catch-all. The "nylon" bucket
 * sweeps up Polyester + Ripstop + Nylon Canvas + variants because, on a
 * customer-facing landing, the textile distinction isn't useful.
 */
export type MaterialBucketMeta = {
  /** URL-safe slug; used as `?materialBucket=<id>` on the catalog page. */
  id: string;
  ar: string;
  en: string;
  icon: LucideIcon;
  matches: (material: string) => boolean;
};

const BUCKETS: ReadonlyArray<MaterialBucketMeta> = [
  // ─── Compound textiles → "Nylon" ──────────────────────────────────
  // "Nylon Canvas" matches both nylon and canvas; we want it in nylon
  // (the textile family), so nylon is checked before canvas.
  {
    id: "nylon",
    ar: "نايلون",
    en: "Nylon",
    icon: Layers,
    matches: (m) => /nylon|polyester|ripstop/i.test(m),
  },
  // ─── Specific faux-leather variants → "Faux Leather" ──────────────
  // Has to run BEFORE the generic-leather rule so "Faux Leather (PVC)"
  // doesn't fall into the natural-leather bucket.
  {
    id: "faux-leather",
    ar: "جلد صناعي",
    en: "Faux Leather",
    icon: Briefcase,
    matches: (m) => /faux\s*leather/i.test(m),
  },
  {
    id: "pu-leather",
    ar: "جلد PU",
    en: "PU Leather",
    icon: Briefcase,
    matches: (m) => /pu\s*leather/i.test(m),
  },
  {
    id: "vegan-leather",
    ar: "جلد نباتي",
    en: "Vegan Leather",
    icon: Briefcase,
    matches: (m) => /vegan\s*leather/i.test(m),
  },
  // ─── Catch-all leather → "Genuine Leather" ────────────────────────
  // "Premium Leather", "Soft Leather", and bare "Leather" all land here
  // because none of the more specific leather buckets above matched.
  {
    id: "genuine-leather",
    ar: "جلد طبيعي",
    en: "Genuine Leather",
    icon: Award,
    matches: (m) => /leather/i.test(m),
  },
  // ─── Standalone material families ─────────────────────────────────
  {
    id: "polycarbonate",
    ar: "بولي كاربونيت",
    en: "Polycarbonate",
    icon: Shield,
    matches: (m) => /polycarbonate/i.test(m),
  },
  {
    id: "abs",
    ar: "ABS",
    en: "ABS",
    icon: Box,
    matches: (m) => /\babs\b/i.test(m),
  },
  // "Denim Canvas" → denim (denim is the distinguishing fabric).
  {
    id: "denim",
    ar: "جينز",
    en: "Denim",
    icon: Shirt,
    matches: (m) => /denim/i.test(m),
  },
  {
    id: "canvas",
    ar: "قماش كانفاس",
    en: "Canvas",
    icon: Grid3x3,
    matches: (m) => /canvas/i.test(m),
  },
  {
    id: "metal",
    ar: "معدن",
    en: "Metal",
    icon: Shield,
    matches: (m) => /zinc|alloy|metal/i.test(m),
  },
];

/**
 * Resolves a raw `material_type` to its bucket. Unknown values get a
 * synthetic singleton bucket so admins typing a new value still see a
 * card on the homepage — no silent drop.
 */
export function bucketForMaterial(material: string): MaterialBucketMeta {
  for (const b of BUCKETS) if (b.matches(material)) return b;
  return {
    id:
      material.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      "other",
    ar: material,
    en: material,
    icon: Layers,
    matches: () => false,
  };
}

/** Lookup by bucket id — used by the catalog page to expand ?materialBucket. */
export function bucketById(id: string): MaterialBucketMeta | null {
  return BUCKETS.find((b) => b.id === id) ?? null;
}
