/**
 * One-time backfill of products.search_blob.
 *
 * Run once after migration 0020:
 *   node --experimental-strip-types scripts/backfill-search-blob.mjs
 *
 * The normalization is imported from lib/, not reimplemented here. That is the
 * whole point: the query side and the product side must fold identically, and a
 * second copy of the rules is a second answer waiting to drift. After this runs,
 * saveProduct() keeps every subsequent write in sync.
 *
 * Idempotent — re-running recomputes the same values.
 */
import { readFileSync } from "node:fs";
import { buildSearchBlob } from "../lib/analytics/text.ts";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("Missing Supabase env vars in .env.local");
const H = { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json" };

const products = await (
  await fetch(`${URL_}/rest/v1/products?select=id,slug,name_ar,name_en,tags,search_keywords`, { headers: H })
).json();

console.log(`Backfilling search_blob for ${products.length} products…`);

let changed = 0;
for (const p of products) {
  const blob = buildSearchBlob(p);
  const res = await fetch(`${URL_}/rest/v1/products?id=eq.${p.id}`, {
    method: "PATCH",
    headers: { ...H, prefer: "return=minimal" },
    body: JSON.stringify({ search_blob: blob }),
  });
  if (!res.ok) {
    console.error(`  FAILED ${p.slug}: ${res.status} ${await res.text()}`);
    continue;
  }
  changed++;
}

console.log(`Done. ${changed}/${products.length} rows written.`);
const sample = products.slice(0, 3).map((p) => `  ${p.slug}\n    -> ${buildSearchBlob(p)}`);
console.log("Sample:\n" + sample.join("\n"));
