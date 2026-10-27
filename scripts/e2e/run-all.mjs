// Browser end-to-end suite.
//
//   npm run e2e                                   # against http://localhost:3000
//   npm run e2e -- --only=orders                  # one suite: storefront | orders | auth | coupons
//   npm run e2e -- https://mm-bags.vercel.app --allow-prod
//
// Start the app first (`npm run build && npm run start`). The suites create
// and delete their own QA products, orders and a QA account in the Supabase
// project from .env.local (that is the production database), so running
// against the live site needs an explicit --allow-prod.
import { db, launch } from "./lib.mjs";
import * as storefront from "./storefront.mjs";
import * as orders from "./orders.mjs";
import * as auth from "./auth.mjs";
import * as coupons from "./coupons.mjs";

const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:\/\//.test(a)) || "http://localhost:3000").replace(/\/+$/, "");
const only = (args.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base);
if (!isLocal && !args.includes("--allow-prod")) {
  console.error(`Refusing to run against ${base} without --allow-prod (the suite places and deletes real orders).`);
  process.exit(1);
}

const suites = { storefront, orders, auth, coupons };
const chosen = Object.entries(suites).filter(([name]) => !only.length || only.includes(name));

try {
  const res = await fetch(`${base}/ar`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
} catch (e) {
  console.error(`App not reachable at ${base} (${e.message}). Start it with: npm run build && npm run start`);
  process.exit(1);
}

// Sweep leftovers from a crashed earlier run.
const { data: stale } = await db.from("products").select("slug").like("slug", "zz-qa-%");
if (stale?.length) console.log(`note: removing ${stale.length} leftover QA product(s) from an earlier run`);

const browser = await launch();
const all = [];
const started = Date.now();
try {
  for (const [name, suite] of chosen) {
    console.log(`\n▶ ${name}`);
    const lines = await suite.run(browser, base);
    for (const l of lines) console.log(`  ${l.pass ? "PASS" : "FAIL"}  ${l.name}${l.detail && !l.pass ? `  — ${l.detail}` : ""}`);
    all.push(...lines);
  }
} finally {
  await browser.close();
}

const failed = all.filter((l) => !l.pass);
console.log(`\n${all.length - failed.length}/${all.length} passed in ${Math.round((Date.now() - started) / 1000)}s against ${base}`);
if (failed.length) {
  console.log("FAILED:\n" + failed.map((l) => `  [${l.suite}] ${l.name}${l.detail ? ` — ${l.detail}` : ""}`).join("\n"));
  process.exit(1);
}
