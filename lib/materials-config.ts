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
 * Maps the free-form material_type values that admins enter on the products
 * table to a Lucide icon + Arabic display name. New material_type values
 * surface in ShopByMaterial automatically — the only thing this map gives
 * up is the curated icon/AR-name; unknown materials fall back to a generic
 * Layers icon and pass the English value through unchanged.
 *
 * Matching is keyword-based so variants like "Premium Nylon",
 * "Faux Leather (PVC)", or "Soft Leather" all resolve to the right bucket.
 */
type MaterialMeta = {
  icon: LucideIcon;
  ar: string;
};

// Order matters — first matching rule wins. Genuine Leather is checked
// before any other "leather" rule so it doesn't get caught by the generic
// faux-leather branch.
const RULES: ReadonlyArray<{ test: RegExp; meta: MaterialMeta }> = [
  { test: /polycarbonate/i,                meta: { icon: Shield,    ar: "بولي كاربونيت" } },
  { test: /\babs\b/i,                      meta: { icon: Box,       ar: "ABS" } },
  { test: /genuine\s*leather|real\s*leather/i, meta: { icon: Award,     ar: "جلد طبيعي" } },
  { test: /vegan\s*leather/i,              meta: { icon: Briefcase, ar: "جلد نباتي" } },
  { test: /pu\s*leather/i,                 meta: { icon: Briefcase, ar: "جلد PU" } },
  { test: /faux\s*leather/i,               meta: { icon: Briefcase, ar: "جلد صناعي" } },
  { test: /leather/i,                      meta: { icon: Briefcase, ar: "جلد" } },
  { test: /denim|jeans?/i,                 meta: { icon: Shirt,     ar: "جينز" } },
  { test: /canvas/i,                       meta: { icon: Grid3x3,   ar: "قماش كانفاس" } },
  { test: /nylon|polyester|ripstop/i,      meta: { icon: Layers,    ar: "نايلون / بوليستر" } },
  { test: /zinc|alloy|metal/i,             meta: { icon: Shield,    ar: "معدن" } },
];

const FALLBACK: MaterialMeta = {
  icon: Layers,
  ar: "", // empty → caller falls back to the EN material_type value
};

export function materialIcon(material: string): LucideIcon {
  for (const r of RULES) if (r.test.test(material)) return r.meta.icon;
  return FALLBACK.icon;
}

export function materialNameAr(material: string): string {
  for (const r of RULES) if (r.test.test(material)) return r.meta.ar;
  return material; // unknown — pass through whatever the admin typed
}

export function materialNameEn(material: string): string {
  // Pass-through for EN since material_type is stored in English already.
  return material;
}
