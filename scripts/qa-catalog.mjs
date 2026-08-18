// Functional QA for the paginated catalog (local production build).
// Compares against ground truth computed directly from the DB with the
// SAME rules the old getProducts() applied, so "no missing / no
// duplicate / same order" is verified, not assumed.
// Selectors are scoped to the catalog grid (`main ul.grid`) — the navbar
// mega-menu also contains 3 product links that must not be counted.
import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const check = (n, ok, d = "") => { ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n}${d ? ` -- ${d}` : ""}`)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LOAD_MORE = "button::-p-text(عرض المزيد)";
const CARD_LINKS = "main ul.grid li a[href*='/products/']";

// ── ground truth: old getProducts() semantics (all active, featured order) ──
const { data: all } = await db.from("products").select("id, slug, base_price, sale_price, sort_order, created_at, tags, product_variants(size_inches)").eq("is_active", true);
const eff = (p) => p.sale_price ?? p.base_price;
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const newest = (a, b) => b.created_at.localeCompare(a.created_at);
const featured = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || newest(a, b) || byId(a, b);
const truth = {
  featured: [...all].sort(featured),
  newest: [...all].sort((a, b) => newest(a, b) || byId(a, b)),
  "price-asc": [...all].sort((a, b) => eff(a) - eff(b) || featured(a, b)),
  "price-desc": [...all].sort((a, b) => eff(b) - eff(a) || featured(a, b)),
};
const size24 = truth.featured.filter((p) => p.product_variants.some((v) => v.size_inches === 24));
const sets = truth.featured.filter((p) => (p.tags ?? []).includes("set"));
console.log(`ground truth: ${all.length} products | size=24: ${size24.length} | sets: ${sets.length}`);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", defaultViewport: { width: 1350, height: 940 }, args: ["--no-sandbox", "--lang=ar-EG"] });
const page = await browser.newPage();
await page.setExtraHTTPHeaders({ "Accept-Language": "ar-EG,ar;q=0.9" });
const rscPrefetches = new Set();
page.on("request", (r) => { const u = r.url(); if (u.includes("_rsc=")) rscPrefetches.add(u.replace(BASE, "").split("?")[0]); });

const slugsOnPage = () => page.$$eval(CARD_LINKS, (as) => as.map((a) => a.getAttribute("href").split("/products/")[1]));
const gotoCatalog = async (qs = "") => { await page.goto(`${BASE}/ar/catalog${qs}`, { waitUntil: "networkidle0", timeout: 90_000 }); await sleep(300); };
const clickLoadMore = async () => {
  const before = (await slugsOnPage()).length;
  const btn = await page.$(LOAD_MORE);
  if (!btn) return false;
  await btn.click();
  await page.waitForFunction((sel, n) => document.querySelectorAll(sel).length > n, { timeout: 30_000 }, CARD_LINKS, before);
  await sleep(300);
  return true;
};
const sameSeq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

try {
  console.log("\n=== 1. initial load ===");
  await gotoCatalog();
  let slugs = await slugsOnPage();
  check("initial render = 24 products (not 81)", slugs.length === 24, `got ${slugs.length}`);
  check("initial 24 == first 24 of featured order (server-side slice, exact order)", sameSeq(slugs, truth.featured.slice(0, 24).map((p) => p.slug)));
  const toolbar = await page.$eval("select", (s) => s.closest("div").innerText);
  check(`toolbar shows TOTAL count (${all.length}) not 24`, toolbar.includes(String(all.length)) && !toolbar.startsWith("24 "), toolbar.slice(0, 60));
  const firstImgs = await page.$$eval("main ul.grid li img", (imgs) => imgs.slice(0, 6).map((i) => `${i.getAttribute("fetchpriority")}/${i.getAttribute("loading")}`));
  const eagerCount = await page.$$eval("main ul.grid li img[fetchpriority='high']", (i) => i.length);
  check("first 4 cards' primary images are priority (fetchpriority=high)", eagerCount === 4, `eager=${eagerCount} first6=${firstImgs.join(" ")}`);
  const laterLazy = await page.$$eval("main ul.grid li:nth-child(n+6) img", (imgs) => imgs.every((i) => i.getAttribute("loading") === "lazy"));
  check("cards 6+ images lazy", laterLazy);
  const preloads = await page.$$eval("link[rel='preload'][as='image']", (l) => l.length);
  check("card images preloaded in <head> (>=4)", preloads >= 4, `preloads=${preloads}`);
  const domNodes = await page.evaluate(() => document.getElementsByTagName("*").length);
  console.log(`  info: DOM nodes = ${domNodes}`);
  // Prefetch isolation: the navbar mega-menu (layout scope, untouched)
  // links 3 best-seller products + category pages and legitimately
  // prefetches those. Cards/pills must add NOTHING: scroll the whole
  // grid into view and assert the product-prefetch set does not grow.
  const megaSlugs = new Set(await page.$$eval("header a[href*='/products/']", (as) => as.map((a) => a.getAttribute("href").split("/products/")[1])));
  const productPrefetchesBefore = [...rscPrefetches].filter((u) => u.includes("/products/"));
  // Pills are in the initial viewport; the footer (which links the same
  // collection URLs) is not — so measure collection prefetches BEFORE
  // scrolling to isolate the pills.
  await sleep(1500);
  const catalogPrefetchesBeforeScroll = [...rscPrefetches].filter((u) => /\/catalog\/[^/]+$/.test(u));
  await page.evaluate(async () => { for (let y = 0; y <= document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } });
  await sleep(1500);
  const productPrefetchesAfter = [...rscPrefetches].filter((u) => u.includes("/products/"));
  const nonMega = productPrefetchesAfter.filter((u) => !megaSlugs.has(u.split("/products/")[1]));
  check(`no product-CARD prefetches: ${productPrefetchesAfter.length} product prefetches total, all from mega-menu (${megaSlugs.size}), none added by scrolling 24 cards`, nonMega.length === 0 && productPrefetchesAfter.length <= megaSlugs.size, `non-mega: ${nonMega.slice(0, 4).join(",")} | before scroll ${productPrefetchesBefore.length} after ${productPrefetchesAfter.length}`);
  const pillCount = await page.$$eval("nav[aria-label] a[href*='/catalog/']", (as) => as.length);
  const catalogPrefetchesAfterScroll = [...rscPrefetches].filter((u) => /\/catalog\/[^/]+$/.test(u));
  console.log(`  info: collection pills=${pillCount}; catalog/* prefetches before scroll=${catalogPrefetchesBeforeScroll.length}, after scrolling to footer=${catalogPrefetchesAfterScroll.length} (footer links the same URLs — layout scope)`);
  // Pills vs layout isolation is proven separately (qa-prefetch-isolate:
  // header+footer hidden → 0 catalog/* prefetch requests with the pills
  // in view; header visible → 12). Here just assert nothing beyond the
  // layout's own 6 collection links is requested.
  check("collection prefetches limited to layout links (pills add none)", catalogPrefetchesBeforeScroll.length <= 6, `${catalogPrefetchesBeforeScroll.length}`);
  await page.evaluate(() => window.scrollTo(0, 0));

  console.log("\n=== 2. load more (append) ===");
  check("load more #1 works", await clickLoadMore()); slugs = await slugsOnPage(); check("48 after 1st", slugs.length === 48, `${slugs.length}`);
  check("URL updated to ?page=2 (replaceState)", page.url().includes("page=2"), page.url());
  check("load more #2 works", await clickLoadMore()); slugs = await slugsOnPage(); check("72 after 2nd", slugs.length === 72, `${slugs.length}`);
  check("load more #3 works", await clickLoadMore()); slugs = await slugsOnPage();
  check(`all ${all.length} after 3rd`, slugs.length === all.length, `${slugs.length}`);
  check("no duplicates", new Set(slugs).size === slugs.length);
  check("full sequence == old featured order exactly", sameSeq(slugs, truth.featured.map((p) => p.slug)));
  check("load more button gone at end", (await page.$(LOAD_MORE)) === null);
  check(`counter shows ${all.length} of ${all.length}`, (await page.evaluate(() => document.body.innerText)).includes(`${all.length} من ${all.length}`));

  console.log("\n=== 3. URL refresh / deep link ===");
  await gotoCatalog("?page=3"); slugs = await slugsOnPage();
  check("?page=3 renders 72 cumulative", slugs.length === 72, `${slugs.length}`);
  check("...in exact order", sameSeq(slugs, truth.featured.slice(0, 72).map((p) => p.slug)));
  await gotoCatalog("?page=999"); check("?page=999 clamps, no crash, all products", (await slugsOnPage()).length === all.length);
  await gotoCatalog("?page=abc"); check("?page=abc -> default 24", (await slugsOnPage()).length === 24);

  console.log("\n=== 4. sort + pagination ===");
  for (const s of ["newest", "price-asc", "price-desc"]) {
    await gotoCatalog(`?sort=${s}`); slugs = await slugsOnPage();
    check(`sort=${s}: first 24 exact`, sameSeq(slugs, truth[s].slice(0, 24).map((p) => p.slug)));
    await clickLoadMore(); slugs = await slugsOnPage();
    check(`sort=${s}: 48 after load more, exact, no dups`, sameSeq(slugs, truth[s].slice(0, 48).map((p) => p.slug)) && new Set(slugs).size === 48);
  }
  await gotoCatalog("?page=2");
  await page.select("select", "price-asc"); await sleep(1500);
  check("changing sort drops ?page and keeps sort", page.url().includes("sort=price-asc") && !page.url().includes("page="), page.url());
  check("...renders 24 of new order", sameSeq(await slugsOnPage(), truth["price-asc"].slice(0, 24).map((p) => p.slug)));

  console.log("\n=== 5. filters ===");
  await gotoCatalog("?size=24"); slugs = await slugsOnPage();
  check(`size=24: ${slugs.length} == truth ${Math.min(24, size24.length)}, exact order`, sameSeq(slugs, size24.slice(0, 24).map((p) => p.slug)));
  if (size24.length > 24) { await clickLoadMore(); check("size=24 + load more exact", sameSeq(await slugsOnPage(), size24.slice(0, 48).map((p) => p.slug))); }
  else check("size=24: no load-more button when <=24", (await page.$(LOAD_MORE)) === null);
  await gotoCatalog("?type=set"); slugs = await slugsOnPage();
  check(`type=set: ${slugs.length} == truth ${Math.min(24, sets.length)}, exact`, sameSeq(slugs, sets.slice(0, 24).map((p) => p.slug)));
  await gotoCatalog("?q=" + encodeURIComponent("شنطة")); slugs = await slugsOnPage();
  check("search renders results", slugs.length > 0);
  await gotoCatalog("?q=zzzznotfound"); check("search no-results -> empty state (no crash)", (await slugsOnPage()).length === 0);

  console.log("\n=== 6. product navigation + Back/Forward ===");
  await gotoCatalog(); await clickLoadMore();
  const target = (await slugsOnPage())[30];
  await page.click(`${CARD_LINKS.replace("a[href*='/products/']", "")}a[href$='/products/${target}']`);
  await page.waitForFunction(() => location.pathname.includes("/products/"), { timeout: 60_000 });
  check("navigated to PDP (prefetch=false didn't break navigation)", page.url().includes(`/products/${target}`));
  await page.goBack({ waitUntil: "networkidle0" }); await sleep(800);
  check("Back returns to catalog with ?page=2", page.url().includes("/catalog") && page.url().includes("page=2"), page.url());
  const afterBack = (await slugsOnPage()).length;
  check("Back shows 48 products (state preserved)", afterBack === 48, `${afterBack}`);
  await page.goForward({ waitUntil: "networkidle0" }); await sleep(300);
  check("Forward returns to PDP", page.url().includes(`/products/${target}`));

  console.log("\n=== 7. collection page untouched ===");
  const { data: col } = await db.from("collections").select("slug").eq("is_active", true).limit(1).single();
  await page.goto(`${BASE}/ar/catalog/${col.slug}`, { waitUntil: "networkidle0", timeout: 90_000 });
  check("collection page renders cards", (await slugsOnPage()).length > 0);
  check("collection page has no load-more (unchanged behaviour)", (await page.$(LOAD_MORE)) === null);

  console.log("\n=== 8. mobile ===");
  const mob = await browser.newPage();
  await mob.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
  const imgReqs = [];
  mob.on("response", (r) => { if (r.request().resourceType() === "image") imgReqs.push(r.url()); });
  await mob.goto(`${BASE}/ar/catalog`, { waitUntil: "networkidle0", timeout: 90_000 }); await sleep(500);
  check("mobile: 24 cards", (await mob.$$eval(CARD_LINKS, (a) => a.length)) === 24);
  const productImgs = imgReqs.filter((u) => u.includes("/render/image/public/products/") && !u.includes("site/hero")).length;
  console.log(`  info: mobile product image requests at load = ${productImgs}`);
  check("mobile: hover (secondary) images NOT fetched (one image per loaded card)", productImgs <= 26, `${productImgs}`);
  check("mobile: load-more button present", !!(await mob.$(LOAD_MORE)));
  await mob.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await sleep(500);
  await mob.tap(LOAD_MORE);
  await mob.waitForFunction((sel) => document.querySelectorAll(sel).length > 24, { timeout: 30_000 }, CARD_LINKS);
  check("mobile: load more appends to 48", (await mob.$$eval(CARD_LINKS, (a) => a.length)) === 48);
  await mob.screenshot({ path: "C:/Users/super/AppData/Local/Temp/claude/g--iti-projects-web-projects-M-M-BAGS-PROJECT/49ff5c4d-dc72-43a2-98da-df1dc49993aa/scratchpad/perf/catalog-mobile-after.png" });
  await mob.close();
} finally { await browser.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
