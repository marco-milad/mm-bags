// Free-tier backup for M.M Bags (Supabase Free has no automatic backups).
//
//   node scripts/backup/export-data.mjs [outRoot]
//
// Writes <outRoot>/<YYYY-MM-DD_HHmm>/ with one JSON file per public table,
// auth users, and a manifest; product images go to <outRoot>/storage/
// incrementally (only files not already downloaded — keeps Supabase egress
// low). Keeps the newest KEEP snapshots. The schema itself lives in
// supabase/migrations, so data + migrations = a full restore.
//
// The output contains customer PII: outRoot must not be inside ANY git
// repository (this repo is public on GitHub, and the folder above it is
// another GitHub-connected repo). Default: ~/MM-Bags-Backups.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const KEEP = 8;
const PAGE = 1000;
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");
const outRoot = path.resolve(process.argv[2] || path.join(os.homedir(), "MM-Bags-Backups"));
for (let dir = outRoot; ; dir = path.dirname(dir)) {
  if (fs.existsSync(path.join(dir, ".git"))) {
    console.error(`Refusing to write backups inside a git repository (${dir}) — they contain customer data.`);
    process.exit(1);
  }
  if (path.dirname(dir) === dir) break;
}

const env = Object.fromEntries(
  fs.readFileSync(path.join(repo, ".env.local"), "utf8").split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("Missing Supabase URL / service role key in .env.local"); process.exit(1); }
const db = createClient(URL_, KEY, { auth: { persistSession: false } });

const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
const snap = path.join(outRoot, stamp);
fs.mkdirSync(snap, { recursive: true });
const manifest = { createdAt: new Date().toISOString(), project: URL_, tables: {}, authUsers: 0, storage: {}, errors: [] };

async function withRetry(fn, label) {
  for (let attempt = 1; ; attempt++) {
    try { return await fn(); } catch (e) {
      if (attempt >= 3) throw e;
      console.warn(`  retry ${attempt} for ${label}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

// 1) Tables — discovered from PostgREST's OpenAPI description, so new
//    tables are backed up without editing this script.
const spec = await withRetry(async () => {
  const r = await fetch(`${URL_}/rest/v1/`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`openapi ${r.status}`);
  return r.json();
}, "openapi");
const tables = Object.keys(spec.definitions || {}).sort();
for (const t of tables) {
  try {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await withRetry(() => db.from(t).select("*").range(from, from + PAGE - 1), t);
      if (error) throw new Error(error.message);
      rows.push(...data);
      if (data.length < PAGE) break;
    }
    fs.writeFileSync(path.join(snap, `${t}.json`), JSON.stringify(rows));
    manifest.tables[t] = rows.length;
    console.log(`table ${t}: ${rows.length}`);
  } catch (e) {
    manifest.errors.push(`table ${t}: ${e.message}`);
    console.warn(`table ${t}: FAILED ${e.message}`);
  }
}

// 2) Auth users (emails, providers, metadata — no passwords; those are hashed
//    inside Supabase and not exportable via the API).
try {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await withRetry(() => db.auth.admin.listUsers({ page, perPage: 1000 }), "auth");
    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  fs.writeFileSync(path.join(snap, "_auth_users.json"), JSON.stringify(users));
  manifest.authUsers = users.length;
  console.log(`auth users: ${users.length}`);
} catch (e) {
  manifest.errors.push(`auth users: ${e.message}`);
}

// 3) Storage — incremental: a file already on disk with the same size is skipped.
async function listAll(bucket, prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await withRetry(() => db.storage.from(bucket).list(prefix, { limit: 100, offset }), `list ${bucket}/${prefix}`);
    if (error) throw new Error(error.message);
    for (const item of data) {
      const p = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) out.push(...(await listAll(bucket, p))); // folder
      else out.push({ path: p, size: item.metadata?.size ?? null });
    }
    if (data.length < 100) break;
  }
  return out;
}
try {
  const { data: buckets, error } = await db.storage.listBuckets();
  if (error) throw new Error(error.message);
  for (const b of buckets) {
    const files = await listAll(b.name);
    let downloaded = 0, skipped = 0, bytes = 0;
    for (const f of files) {
      const dest = path.join(outRoot, "storage", b.name, ...f.path.split("/"));
      if (fs.existsSync(dest) && f.size !== null && fs.statSync(dest).size === f.size) { skipped++; continue; }
      const { data, error: dErr } = await withRetry(() => db.storage.from(b.name).download(f.path), f.path);
      if (dErr) { manifest.errors.push(`storage ${b.name}/${f.path}: ${dErr.message}`); continue; }
      const buf = Buffer.from(await data.arrayBuffer());
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      downloaded++; bytes += buf.length;
    }
    manifest.storage[b.name] = { files: files.length, downloaded, skipped, downloadedMB: +(bytes / 1048576).toFixed(1) };
    console.log(`bucket ${b.name}: ${files.length} files (${downloaded} new, ${skipped} unchanged)`);
  }
} catch (e) {
  manifest.errors.push(`storage: ${e.message}`);
}

fs.writeFileSync(path.join(snap, "_manifest.json"), JSON.stringify(manifest, null, 2));

// 4) Retention — keep the newest KEEP snapshot folders (storage/ is shared).
const snaps = fs.readdirSync(outRoot).filter((d) => /^\d{4}-\d{2}-\d{2}_\d{4}$/.test(d)).sort();
for (const old of snaps.slice(0, Math.max(0, snaps.length - KEEP))) {
  fs.rmSync(path.join(outRoot, old), { recursive: true, force: true });
  console.log(`pruned old snapshot ${old}`);
}

console.log(`\nbackup written to ${snap}`);
if (manifest.errors.length) {
  console.log(`WITH ${manifest.errors.length} ERROR(S):\n - ` + manifest.errors.join("\n - "));
  process.exit(2);
}
