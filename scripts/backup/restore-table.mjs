// Restore one table from a backup snapshot made by export-data.mjs.
//
//   node scripts/backup/restore-table.mjs <snapshotDir> <table>            (dry run)
//   node scripts/backup/restore-table.mjs <snapshotDir> <table> --confirm  (writes)
//
// Upserts every row of <snapshotDir>/<table>.json by primary key `id` (rows
// that still exist are overwritten with the backed-up values; rows missing
// from the live DB are re-inserted). It never deletes live rows. Restore
// parents before children (e.g. products → product_variants, orders →
// order_items) so foreign keys resolve. Auth users and storage files are not
// restored by this script.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const [snapDir, table, flag] = process.argv.slice(2);
if (!snapDir || !table) {
  console.error("usage: node scripts/backup/restore-table.mjs <snapshotDir> <table> [--confirm]");
  process.exit(1);
}
const file = path.join(path.resolve(snapDir), `${table}.json`);
if (!fs.existsSync(file)) { console.error(`no backup file: ${file}`); process.exit(1); }

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(repo, ".env.local"), "utf8").split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const rows = JSON.parse(fs.readFileSync(file, "utf8"));
const { count: live, error: cErr } = await db.from(table).select("*", { count: "exact", head: true });
if (cErr) { console.error(`cannot read live table ${table}: ${cErr.message}`); process.exit(1); }
const hasId = rows.length === 0 || "id" in rows[0];
console.log(`${table}: ${rows.length} rows in backup, ${live} rows live now`);
if (!hasId) { console.error(`${table} has no "id" column — restore it manually.`); process.exit(1); }
if (flag !== "--confirm") {
  console.log("dry run — nothing written. Re-run with --confirm to upsert these rows.");
  process.exit(0);
}
for (let i = 0; i < rows.length; i += 500) {
  const chunk = rows.slice(i, i + 500);
  const { error } = await db.from(table).upsert(chunk, { onConflict: "id" });
  if (error) { console.error(`failed at rows ${i}-${i + chunk.length}: ${error.message}`); process.exit(2); }
}
console.log(`restored ${rows.length} rows into ${table}.`);
