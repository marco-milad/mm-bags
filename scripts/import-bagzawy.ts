/* eslint-disable no-console */
/**
 * One-shot importer: pulls products from bagzawy.com, inserts them into
 * Supabase with full AR + EN metadata, downloads every image, re-hosts
 * it to the `products` Storage bucket under `<slug>/<filename>`, and
 * writes the new public URLs into `products.images[]`.
 *
 * Run: `npx tsx scripts/import-bagzawy.ts`
 *
 * Idempotent:
 *   - Existing products (by slug) are skipped — re-running won't double-
 *     insert or duplicate variants.
 *   - Storage uploads use upsert: true so the same destination paths
 *     get the same URLs across runs.
 *
 * Scoped to the four target collections from the audit:
 *   - lv-collection      (1 product)
 *   - two-piece-sets     (4 products)
 *   - travel-bags        (9 single-piece luggage)
 *   - travel-sets        (12 three-piece bundles)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ─── env + client ────────────────────────────────────────────────────

function loadEnv(): { url: string; serviceKey: string } {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[m[1]] = value;
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }
  return { url, serviceKey };
}

const { url: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_KEY } = loadEnv();
const BUCKET = "products";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── localisation helpers ────────────────────────────────────────────

// Hex values for the marketing colour palette — kept centralised so the
// generated variants render consistent swatches across the catalogue.
const COLOR_HEX: Record<string, string> = {
  pistachio: "#BCD9A0",
  pink: "#F7C6CC",
  "light pink": "#FFB6C1",
  "blue ocean": "#1E5780",
  blue: "#1E5780",
  navy: "#0F2B47",
  black: "#1C1C1C",
  beige: "#D9C4A0",
  gray: "#808080",
  grey: "#808080",
  mauve: "#B784A7",
  "rose gold": "#B76E79",
  silver: "#C0C0C0",
  kashmir: "#A89876",
  kashmiri: "#A89876",
  orange: "#FF6B35",
  "baby blue": "#A4C8E1",
};

const COLOR_AR: Record<string, string> = {
  pistachio: "فستقي",
  pink: "روز",
  "light pink": "روز فاتح",
  "blue ocean": "أزرق بحري",
  blue: "أزرق",
  navy: "كحلي",
  black: "أسود",
  beige: "بيج",
  gray: "رمادي",
  grey: "رمادي",
  mauve: "موف",
  "rose gold": "روز جولد",
  silver: "فضي",
  kashmir: "كشميري",
  kashmiri: "كشميري",
  orange: "برتقالي",
  "baby blue": "سماوي",
};

function colorAr(en: string): string {
  return COLOR_AR[en.toLowerCase()] ?? en;
}
function colorHex(en: string): string | null {
  return COLOR_HEX[en.toLowerCase()] ?? null;
}

// ─── plan ────────────────────────────────────────────────────────────

type ProductPlan = {
  /** bagzawy product handle — used to fetch /products/<handle>.json */
  source_handle: string;
  /** our DB slug */
  slug: string;
  /** target collection slug (must already exist) */
  collection_slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  /** SKU prefix for generated variant SKUs */
  sku_prefix: string;
  /** Optional spec fields */
  material_type?: string;
  weight_kg?: number;
  dimensions?: string;
  /** Photo treatment */
  image_fit?: "cover" | "contain";
  image_aspect?: "square" | "landscape" | "portrait";
  /** Initial stock per variant (Marco can adjust later) */
  initial_stock?: number;
};

const SET_DESC_AR =
  "طقم سفر فاخر ٣ قطع بمقاسات ٢٠ و ٢٤ و ٢٨ بوصة. خامة سيليكون متينة، عجلات دوارة 360 درجة، وقفل TSA. مناسب للرحلات الطويلة والقصيرة.";
const SET_DESC_EN =
  "Premium 3-piece travel set in 20\", 24\" and 28\" sizes. Durable silicone shell, 360° spinner wheels, TSA-approved lock. Built for short and long trips alike.";
const ONE_DESC_AR =
  "شنطة سفر سيليكون عالية الجودة بعجلات دوارة 360 درجة. متوفرة بمقاسات ٢٢ و ٢٦ و ٣٠ بوصة. مناسبة للسفر اليومي والرحلات الطويلة.";
const ONE_DESC_EN =
  "Premium silicone luggage with 360° spinner wheels. Available in 22\", 26\" and 30\" sizes. Built for everyday travel and longer trips.";

function twoPieceDesc(label: string): { ar: string; en: string } {
  return {
    ar: `طقم سفر قطعتين — ${label}. خامة سيليكون متينة، عجلات دوارة 360 درجة، وقفل TSA. مناسب للرحلات القصيرة والمتوسطة.`,
    en: `Two-piece travel set — ${label}. Durable silicone shell, 360° spinner wheels, TSA-approved lock. Built for short and mid-length trips.`,
  };
}

const PLAN: ProductPlan[] = [
  // ── LV (1) ──────────────────────────────────────────────────────
  {
    source_handle: "lv-3-piece-travel-bag-set",
    slug: "lv-3-piece-set",
    collection_slug: "lv-collection",
    name_ar: "إل في — طقم سفر ٣ قطع",
    name_en: "LV 3-Piece Travel Set",
    description_ar:
      "طقم سفر فاخر بتصميم إل في الكلاسيكي — ٣ قطع بمقاسات ٢٠ و ٢٤ و ٢٨ بوصة. خامة ٩٠٪ سيليكون و١٠٪ ألياف لمظهر أنيق وحماية كاملة للمحتويات. عجلات دوارة 360 درجة.",
    description_en:
      "Premium LV-inspired luggage — 3 pieces in 20\", 24\" and 28\" sizes. 90% silicone / 10% fibre shell for a sleek look and full content protection. 360° smooth spinner wheels.",
    sku_prefix: "LV",
    material_type: "Silicone + Fibre",
    weight_kg: 9.0,
    dimensions: "20\" / 24\" / 28\"",
    image_fit: "contain",
    image_aspect: "landscape",
    initial_stock: 15,
  },

  // ── 2-piece sets (4) ────────────────────────────────────────────
  {
    source_handle: "product",
    slug: "two-piece-28-20",
    collection_slug: "two-piece-sets",
    name_ar: "طقم سفر قطعتين — ٢٨ و ٢٠ بوصة",
    name_en: "2-Piece Travel Set — 28\" + 20\"",
    ...twoPieceDesc("28\" + 20\""),
    sku_prefix: "TWO",
    material_type: "Silicone",
    weight_kg: 6.0,
    dimensions: "28\" + 20\"",
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "product-3",
    slug: "two-piece-pistachio-26-22",
    collection_slug: "two-piece-sets",
    name_ar: "طقم سفر قطعتين فستقي — ٢٢ و ٢٦ بوصة",
    name_en: "2-Piece Travel Set Pistachio — 22\" + 26\"",
    ...twoPieceDesc("22\" + 26\" Pistachio"),
    sku_prefix: "TWO",
    material_type: "Silicone",
    weight_kg: 5.5,
    dimensions: "22\" + 26\"",
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "untitled-may14_19-52",
    slug: "two-piece-24-28",
    collection_slug: "two-piece-sets",
    name_ar: "طقم سفر قطعتين — ٢٤ و ٢٨ بوصة",
    name_en: "2-Piece Travel Set — 24\" + 28\"",
    ...twoPieceDesc("24\" + 28\""),
    sku_prefix: "TWO",
    material_type: "Silicone",
    weight_kg: 6.5,
    dimensions: "24\" + 28\"",
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "product-2",
    slug: "two-piece-30-22",
    collection_slug: "two-piece-sets",
    name_ar: "طقم سفر قطعتين — ٣٠ و ٢٢ بوصة",
    name_en: "2-Piece Travel Set — 30\" + 22\"",
    ...twoPieceDesc("30\" + 22\""),
    sku_prefix: "TWO",
    material_type: "Silicone",
    weight_kg: 6.5,
    dimensions: "30\" + 22\"",
    image_fit: "contain",
    image_aspect: "landscape",
  },

  // ── Single-piece luggage (9) — added to travel-bags ─────────────
  {
    source_handle: "product-4",
    slug: "pistachio-luggage",
    collection_slug: "travel-bags",
    name_ar: "شنطة سفر فستقي",
    name_en: "Pistachio Luggage",
    description_ar: ONE_DESC_AR,
    description_en: ONE_DESC_EN,
    sku_prefix: "BAG",
    material_type: "Silicone",
    weight_kg: 3.5,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "pink-luggage",
    slug: "pink-luggage",
    collection_slug: "travel-bags",
    name_ar: "شنطة سفر روز",
    name_en: "Pink Luggage",
    description_ar: ONE_DESC_AR,
    description_en: ONE_DESC_EN,
    sku_prefix: "BAG",
    material_type: "Silicone",
    weight_kg: 3.5,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "3-piece-travel-bag-8",
    slug: "blue-ocean-luggage",
    collection_slug: "travel-bags",
    name_ar: "شنطة سفر أزرق بحري",
    name_en: "Blue Ocean Luggage",
    description_ar:
      "شنطة سفر سيليكون عالية الجودة بعجلات دوارة 360 درجة. متوفرة باللون الأزرق البحري والموف، بمقاسات ٢٢ و ٢٦ و ٣٠ بوصة.",
    description_en:
      "Premium silicone luggage with 360° spinner wheels. Available in Blue Ocean and Mauve, sizes 22\", 26\" and 30\".",
    sku_prefix: "BAG",
    material_type: "Silicone 100%",
    weight_kg: 3.5,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "3-piece-travel-bag-9",
    slug: "black-onyx-luggage",
    collection_slug: "travel-bags",
    name_ar: "شنطة سفر أسود",
    name_en: "Black Luggage",
    description_ar: ONE_DESC_AR,
    description_en: ONE_DESC_EN,
    sku_prefix: "BAG",
    material_type: "Silicone",
    weight_kg: 3.5,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "beige-luggage",
    slug: "beige-luggage",
    collection_slug: "travel-bags",
    name_ar: "شنطة سفر بيج",
    name_en: "Beige Luggage",
    description_ar: ONE_DESC_AR,
    description_en: ONE_DESC_EN,
    sku_prefix: "BAG",
    material_type: "Silicone",
    weight_kg: 3.5,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "3-piece-travel-bag-1",
    slug: "classic-piece-luggage",
    collection_slug: "travel-bags",
    name_ar: "شنطة سفر كلاسيك",
    name_en: "Classic Travel Bag",
    description_ar: ONE_DESC_AR,
    description_en: ONE_DESC_EN,
    sku_prefix: "BAG",
    material_type: "Silicone",
    weight_kg: 3.5,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "product-1",
    slug: "gray-luggage",
    collection_slug: "travel-bags",
    name_ar: "شنطة سفر رمادي",
    name_en: "Gray Luggage",
    description_ar: ONE_DESC_AR,
    description_en: ONE_DESC_EN,
    sku_prefix: "BAG",
    material_type: "Silicone",
    weight_kg: 3.5,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "3-piece-travel-bag-10",
    slug: "mauve-luggage",
    collection_slug: "travel-bags",
    name_ar: "شنطة سفر موف",
    name_en: "Mauve Luggage",
    description_ar: ONE_DESC_AR,
    description_en: ONE_DESC_EN,
    sku_prefix: "BAG",
    material_type: "Silicone",
    weight_kg: 3.5,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "untitled-nov30_09-36",
    slug: "rose-gold-luggage",
    collection_slug: "travel-bags",
    name_ar: "شنطة سفر روز جولد",
    name_en: "Rose Gold Luggage",
    description_ar: ONE_DESC_AR,
    description_en: ONE_DESC_EN,
    sku_prefix: "BAG",
    material_type: "Silicone",
    weight_kg: 3.5,
    image_fit: "contain",
    image_aspect: "landscape",
  },

  // ── 3-piece bundles → travel-sets (12) ─────────────────────────
  {
    source_handle: "travel-bag-pistachio-copy",
    slug: "travel-set-pistachio",
    collection_slug: "travel-sets",
    name_ar: "طقم سفر فستقي ٣ قطع",
    name_en: "3-Piece Travel Set — Pistachio",
    description_ar: SET_DESC_AR,
    description_en: SET_DESC_EN,
    sku_prefix: "SET",
    material_type: "Silicone",
    weight_kg: 9.0,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "untitled-may20_05-31-19",
    slug: "travel-set-gray",
    collection_slug: "travel-sets",
    name_ar: "طقم سفر رمادي ٣ قطع",
    name_en: "3-Piece Travel Set — Gray",
    description_ar: SET_DESC_AR,
    description_en: SET_DESC_EN,
    sku_prefix: "SET",
    material_type: "Silicone",
    weight_kg: 9.0,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "pink-travel-bag-3-piece-travel-bag",
    slug: "travel-set-pink",
    collection_slug: "travel-sets",
    name_ar: "طقم سفر روز ٣ قطع",
    name_en: "3-Piece Travel Set — Pink",
    description_ar: SET_DESC_AR,
    description_en: SET_DESC_EN,
    sku_prefix: "SET",
    material_type: "Silicone",
    weight_kg: 9.0,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "black-travel-bag-copy",
    slug: "travel-set-black-premium",
    collection_slug: "travel-sets",
    name_ar: "طقم سفر أسود ٣ قطع — بريميوم",
    name_en: "3-Piece Travel Set — Black Premium",
    description_ar: SET_DESC_AR,
    description_en: SET_DESC_EN,
    sku_prefix: "SET",
    material_type: "Silicone",
    weight_kg: 9.0,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "travel-bag-copy",
    slug: "travel-set-blue-ocean",
    collection_slug: "travel-sets",
    name_ar: "طقم سفر أزرق بحري ٣ قطع",
    name_en: "3-Piece Travel Set — Blue Ocean",
    description_ar: SET_DESC_AR,
    description_en: SET_DESC_EN,
    sku_prefix: "SET",
    material_type: "Silicone",
    weight_kg: 9.0,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "untitled-may19_20-21-09",
    slug: "travel-set-pink-light",
    collection_slug: "travel-sets",
    name_ar: "طقم سفر روز فاتح ٣ قطع",
    name_en: "3-Piece Travel Set — Light Pink",
    description_ar: SET_DESC_AR,
    description_en: SET_DESC_EN,
    sku_prefix: "SET",
    material_type: "Silicone",
    weight_kg: 9.0,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "silver-travel-bag-3-piece-travel-bag",
    slug: "travel-set-silver",
    collection_slug: "travel-sets",
    name_ar: "طقم سفر فضي ٣ قطع",
    name_en: "3-Piece Travel Set — Silver",
    description_ar: SET_DESC_AR,
    description_en: SET_DESC_EN,
    sku_prefix: "SET",
    material_type: "Silicone",
    weight_kg: 9.0,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "black-travel-bag-3-piece-travel-bag",
    slug: "travel-set-black",
    collection_slug: "travel-sets",
    name_ar: "طقم سفر أسود ٣ قطع",
    name_en: "3-Piece Travel Set — Black",
    description_ar: SET_DESC_AR,
    description_en: SET_DESC_EN,
    sku_prefix: "SET",
    material_type: "Silicone",
    weight_kg: 9.0,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "3-piece-travel-bag-set-beige",
    slug: "travel-set-beige",
    collection_slug: "travel-sets",
    name_ar: "طقم سفر بيج ٣ قطع",
    name_en: "3-Piece Travel Set — Beige",
    description_ar: SET_DESC_AR,
    description_en: SET_DESC_EN,
    sku_prefix: "SET",
    material_type: "Silicone",
    weight_kg: 9.0,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "kashmir-travel-bag-3-piece-travel-bag",
    slug: "travel-set-kashmir",
    collection_slug: "travel-sets",
    name_ar: "طقم سفر كشميري ٣ قطع",
    name_en: "Kashmir 3-Piece Travel Set",
    description_ar: SET_DESC_AR,
    description_en: SET_DESC_EN,
    sku_prefix: "SET",
    material_type: "Silicone",
    weight_kg: 9.0,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "silver-travel-bag-3-piece-travel-bag-1",
    slug: "travel-set-silver-classic",
    collection_slug: "travel-sets",
    name_ar: "طقم سفر فضي كلاسيك ٣ قطع",
    name_en: "3-Piece Travel Set — Silver Classic",
    description_ar: SET_DESC_AR,
    description_en: SET_DESC_EN,
    sku_prefix: "SET",
    material_type: "Silicone",
    weight_kg: 9.0,
    image_fit: "contain",
    image_aspect: "landscape",
  },
  {
    source_handle: "untitled-may3_17-54",
    slug: "travel-set-silver-elite",
    collection_slug: "travel-sets",
    name_ar: "طقم سفر فضي إيليت ٣ قطع",
    name_en: "3-Piece Travel Set — Silver Elite",
    description_ar: SET_DESC_AR,
    description_en: SET_DESC_EN,
    sku_prefix: "SET",
    material_type: "Silicone",
    weight_kg: 9.0,
    image_fit: "contain",
    image_aspect: "landscape",
  },
];

// ─── HTTP + Storage helpers ──────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(
  src: string,
  attempts = 4,
  timeoutMs = 30_000,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(src, {
        signal: ctrl.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        },
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < attempts - 1) {
        await sleep(500 * 2 ** attempt);
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function filenameFor(originalUrl: string, index: number): string {
  const path = new URL(originalUrl).pathname;
  const last = path.substring(path.lastIndexOf("/") + 1);
  const safe = last.replace(/[^a-zA-Z0-9._-]/g, "_") || "image.jpg";
  return `${String(index).padStart(2, "0")}-${safe}`;
}
function contentTypeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}
function publicUrlFor(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function uploadImage(
  destPath: string,
  src: string,
): Promise<{ url: string; bytes: number } | null> {
  try {
    const res = await fetchWithRetry(src);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const filename = destPath.split("/").pop() ?? "image";
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(destPath, bytes, {
        contentType: contentTypeFor(filename),
        upsert: true,
        cacheControl: "31536000",
      });
    if (uploadError) throw uploadError;
    return { url: publicUrlFor(destPath), bytes: bytes.byteLength };
  } catch (err) {
    console.error(`    ✗ image ${destPath} — ${(err as Error).message}`);
    return null;
  }
}

// ─── bagzawy fetch + variant parsing ─────────────────────────────────

type BzVariant = {
  id: number;
  title: string;
  price: string;
  sku: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
};
type BzImage = { src: string; position: number };
type BzProduct = {
  handle: string;
  title: string;
  body_html: string;
  vendor: string;
  options: { name: string; values: string[] }[];
  variants: BzVariant[];
  images: BzImage[];
};

async function fetchBagzawyProduct(handle: string): Promise<BzProduct> {
  const res = await fetchWithRetry(
    `https://bagzawy.com/products/${handle}.json`,
  );
  const json = (await res.json()) as { product: BzProduct };
  return json.product;
}

/** Pull a size in inches out of a Shopify option string ("M 26Inch",
 *  "30 Inch", "26 Inch" → 26 / 30). Returns null if no size found. */
function parseSizeInches(opt: string | null): number | null {
  if (!opt) return null;
  const m = opt.match(/(\d+)\s*Inch/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 14 || n > 36) return null;
  return n;
}

/** Detect whether an option string is a size descriptor vs a colour
 *  name. We treat anything ending in "Inch" as a size. */
function isSizeOption(opt: string | null): boolean {
  return !!opt && /\d+\s*Inch/i.test(opt);
}

type ResolvedVariant = {
  sku: string;
  color_en: string | null;
  color_ar: string | null;
  color_hex: string | null;
  size_inches: number | null;
  size_label_ar: string | null;
  is_set: boolean;
  price_override: number | null;
  stock_qty: number;
};

function resolveVariants(
  plan: ProductPlan,
  bz: BzProduct,
  basePrice: number,
): ResolvedVariant[] {
  const isSet = plan.sku_prefix === "SET" || plan.sku_prefix === "LV";
  return bz.variants.map((v, idx) => {
    const opts = [v.option1, v.option2, v.option3];

    // Find the colour option (anything that isn't a size and isn't
    // the placeholder "Default Title").
    let colorEn: string | null = null;
    for (const o of opts) {
      if (!o) continue;
      if (o === "Default Title") continue;
      if (isSizeOption(o)) continue;
      colorEn = o.trim();
      break;
    }

    // Find size.
    let sizeInches: number | null = null;
    for (const o of opts) {
      const s = parseSizeInches(o);
      if (s !== null) {
        sizeInches = s;
        break;
      }
    }

    const price = parseFloat(v.price);
    const priceOverride =
      Number.isFinite(price) && Math.abs(price - basePrice) > 0.01
        ? price
        : null;

    // Take the FIRST 8 alphanumerics of the slug so two products whose
    // slugs end the same way (e.g. classic-piece-luggage + mauve-luggage
    // both ending in "luggage") don't collide on slice(-8).
    const sku = `${plan.sku_prefix}-${plan.slug
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 8)
      .padEnd(8, "0")}-${String(idx + 1).padStart(2, "0")}`;

    return {
      sku,
      color_en: colorEn,
      color_ar: colorEn ? colorAr(colorEn) : null,
      color_hex: colorEn ? colorHex(colorEn) : null,
      size_inches: sizeInches,
      size_label_ar: null,
      is_set: isSet,
      price_override: priceOverride,
      stock_qty: plan.initial_stock ?? 30,
    };
  });
}

// ─── import flow ─────────────────────────────────────────────────────

async function importOne(
  plan: ProductPlan,
  collectionId: string,
): Promise<{
  slug: string;
  status: "inserted" | "exists" | "failed";
  variants: number;
  images: number;
  errors: string[];
}> {
  const result = {
    slug: plan.slug,
    status: "failed" as "inserted" | "exists" | "failed",
    variants: 0,
    images: 0,
    errors: [] as string[],
  };

  // Skip if slug already taken (idempotent).
  const { data: existing } = await supabase
    .from("products")
    .select("id, slug")
    .eq("slug", plan.slug)
    .maybeSingle();
  if (existing) {
    result.status = "exists";
    return result;
  }

  let bz: BzProduct;
  try {
    bz = await fetchBagzawyProduct(plan.source_handle);
  } catch (err) {
    result.errors.push(`fetch failed: ${(err as Error).message}`);
    return result;
  }

  // Use the lowest variant price as the base. Variant rows then carry
  // a price_override when they differ — matches the existing Milano /
  // Calvin Klein data.
  const variantPrices = bz.variants
    .map((v) => parseFloat(v.price))
    .filter((p) => Number.isFinite(p));
  const basePrice =
    variantPrices.length > 0 ? Math.min(...variantPrices) : 0;

  // Sort order: bump to the back of the current max so new products
  // don't collide with existing zeros.
  const { data: maxRow } = await supabase
    .from("products")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = ((maxRow?.sort_order ?? 0) as number) + 1;

  // Insert the product row WITHOUT images first — we backfill them
  // after the Storage upload completes.
  const { data: inserted, error: insertErr } = await supabase
    .from("products")
    .insert({
      slug: plan.slug,
      collection_id: collectionId,
      name_ar: plan.name_ar,
      name_en: plan.name_en,
      description_ar: plan.description_ar,
      description_en: plan.description_en,
      base_price: basePrice,
      images: [],
      material_type: plan.material_type ?? null,
      weight_kg: plan.weight_kg ?? null,
      dimensions: plan.dimensions ?? null,
      image_fit: plan.image_fit ?? "contain",
      image_aspect: plan.image_aspect ?? "landscape",
      is_active: true,
      sort_order: nextSortOrder,
      tags: [],
      is_water_resistant: false,
      is_expandable: false,
    })
    .select("id")
    .single();
  if (insertErr || !inserted) {
    result.errors.push(
      `insert product failed: ${insertErr?.message ?? "unknown"}`,
    );
    return result;
  }
  const productId = inserted.id;

  // Variants.
  const variants = resolveVariants(plan, bz, basePrice);
  if (variants.length > 0) {
    const { error: varErr } = await supabase.from("product_variants").insert(
      variants.map((v) => ({
        product_id: productId,
        sku: v.sku,
        color_en: v.color_en,
        color_ar: v.color_ar,
        color_hex: v.color_hex,
        size_inches: v.size_inches,
        size_label_ar: v.size_label_ar,
        is_set: v.is_set,
        price_override: v.price_override,
        stock_qty: v.stock_qty,
      })),
    );
    if (varErr) {
      result.errors.push(`insert variants failed: ${varErr.message}`);
    } else {
      result.variants = variants.length;
    }
  }

  // Images — download + upload + collect URLs in source order.
  const newUrls: string[] = [];
  // Cap at 10 to match the admin ImageManager UI limit.
  const images = bz.images.slice(0, 10);
  for (let i = 0; i < images.length; i++) {
    const src = images[i].src;
    const filename = filenameFor(src, i);
    const dest = `${plan.slug}/${filename}`;
    const up = await uploadImage(dest, src);
    if (up) {
      newUrls.push(up.url);
      result.images++;
    } else {
      result.errors.push(`image upload failed for ${filename}`);
    }
    await sleep(150);
  }

  if (newUrls.length > 0) {
    const { error: updErr } = await supabase
      .from("products")
      .update({ images: newUrls })
      .eq("id", productId);
    if (updErr) {
      result.errors.push(`backfill images failed: ${updErr.message}`);
    }
  }

  result.status = "inserted";
  return result;
}

async function main(): Promise<void> {
  // Resolve collection IDs once.
  const slugs = Array.from(new Set(PLAN.map((p) => p.collection_slug)));
  const { data: collections, error: colErr } = await supabase
    .from("collections")
    .select("id, slug")
    .in("slug", slugs);
  if (colErr) throw colErr;
  const colIdBySlug = new Map<string, string>();
  for (const c of collections ?? []) colIdBySlug.set(c.slug, c.id);
  for (const s of slugs) {
    if (!colIdBySlug.has(s)) {
      throw new Error(`Collection "${s}" not found — create it first`);
    }
  }

  console.log(
    `Importing ${PLAN.length} products into ${slugs.length} collections.\n`,
  );

  const summary = {
    inserted: 0,
    exists: 0,
    failed: 0,
    variants: 0,
    images: 0,
    errors: [] as { slug: string; msg: string }[],
  };

  for (const plan of PLAN) {
    const collectionId = colIdBySlug.get(plan.collection_slug)!;
    process.stdout.write(`→ ${plan.slug.padEnd(34)}`);
    const r = await importOne(plan, collectionId);
    if (r.status === "inserted") {
      summary.inserted++;
      summary.variants += r.variants;
      summary.images += r.images;
      console.log(
        ` ok  variants=${r.variants} images=${r.images}${r.errors.length ? "  (with " + r.errors.length + " errors)" : ""}`,
      );
    } else if (r.status === "exists") {
      summary.exists++;
      console.log(" exists — skipped");
    } else {
      summary.failed++;
      console.log(" FAILED");
    }
    for (const e of r.errors) summary.errors.push({ slug: r.slug, msg: e });
  }

  console.log(
    `\nDone. inserted=${summary.inserted} exists=${summary.exists} failed=${summary.failed}  variants=${summary.variants} images=${summary.images}`,
  );
  if (summary.errors.length > 0) {
    console.log(`\nErrors (${summary.errors.length}):`);
    for (const e of summary.errors.slice(0, 50)) {
      console.log(`  ${e.slug}: ${e.msg}`);
    }
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
