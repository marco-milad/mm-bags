// Shared helpers for the browser end-to-end suite (scripts/e2e).
//
// Every suite creates its own throwaway data (a QA product, orders, a test
// account) and deletes it in `finally`, so runs never depend on — or touch —
// real customers. Writes go to the Supabase project in .env.local, which is
// the production database: keep cleanups idempotent.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(here, "..", "..");

export const env = Object.fromEntries(
  fs.readFileSync(path.join(REPO, ".env.local"), "utf8").split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }),
);

export const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
export const MOBILE = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
export const DESKTOP = { width: 1366, height: 900 };
// Random per run: checkout caps orders per phone per day (rate limiting), so a
// fixed number would block repeated runs.
const rand4 = () => String(Math.floor(1000 + Math.random() * 9000));
export const QA_PHONE = `010${rand4()}${rand4()}`;
export const qaPhone = () => `011${rand4()}${rand4()}`;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

/** Collects PASS/FAIL lines for one suite. */
export function reporter(suite) {
  const lines = [];
  return {
    check(name, pass, detail = "") {
      lines.push({ suite, name, pass: !!pass, detail: String(detail ?? "") });
    },
    lines,
  };
}

export async function launch() {
  const exe = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!exe) throw new Error("No Chrome/Edge found — set CHROME_PATH");
  return puppeteer.launch({ executablePath: exe, headless: true, args: [`--user-agent=${UA}`] });
}

export async function newPage(browser, viewport = MOBILE) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewport);
  return { ctx, page };
}

export const overflowPx = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

export const clickByText = (page, selector, text) =>
  page.evaluate((sel, t) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(t) && !e.disabled);
    if (el) { el.click(); return true; }
    return false;
  }, selector, text);

/** Throwaway product + one variant, visible in the store while the suite runs. */
export async function createQaProduct({ slug, stock = 10, price = 100 }) {
  await deleteQaProduct(slug); // leftovers from a crashed run
  const { data: tmpl, error: tErr } = await db.from("products")
    .select("collection_id, images").eq("is_active", true).limit(1).single();
  if (tErr) throw tErr;
  const { data: product, error: pErr } = await db.from("products").insert({
    slug, collection_id: tmpl.collection_id, name_ar: "منتج اختبار QA", name_en: "QA test product",
    base_price: price, images: tmpl.images, is_active: true, sort_order: 999999,
  }).select("id").single();
  if (pErr) throw pErr;
  const { data: variant, error: vErr } = await db.from("product_variants").insert({
    product_id: product.id, color_ar: "أسود", color_en: "Black", color_hex: "#111111",
    sku: `QA-${slug}`.slice(0, 40), stock_qty: stock, price_override: price,
  }).select("id").single();
  if (vErr) { await db.from("products").delete().eq("id", product.id); throw vErr; }
  return { productId: product.id, variantId: variant.id, slug };
}

export async function deleteQaProduct(slug) {
  const { data: p } = await db.from("products").select("id").eq("slug", slug).maybeSingle();
  if (!p) return;
  const { data: vars } = await db.from("product_variants").select("id").eq("product_id", p.id);
  for (const v of vars ?? []) {
    const { data: lines } = await db.from("order_items").select("order_id").eq("variant_id", v.id);
    for (const l of lines ?? []) await deleteOrder(l.order_id, { restock: false });
    await db.from("stock_movements").delete().eq("variant_id", v.id);
    await db.from("product_variants").delete().eq("id", v.id);
  }
  await db.from("products").delete().eq("id", p.id);
}

export const variantStock = async (variantId) =>
  (await db.from("product_variants").select("stock_qty").eq("id", variantId).single()).data.stock_qty;

/** Deletes an order and its ledger rows; optionally puts net stock back first. */
export async function deleteOrder(orderId, { restock = true } = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (restock) {
        const { data: moves } = await db.from("stock_movements").select("variant_id, qty_change").eq("reference_id", orderId);
        const net = new Map();
        for (const m of moves ?? []) net.set(m.variant_id, (net.get(m.variant_id) || 0) + m.qty_change);
        for (const [vid, q] of net) {
          if (!q) continue;
          const { data: v } = await db.from("product_variants").select("stock_qty").eq("id", vid).maybeSingle();
          if (v) await db.from("product_variants").update({ stock_qty: v.stock_qty - q }).eq("id", vid);
        }
      }
      await db.from("stock_movements").delete().eq("reference_id", orderId);
      await db.from("order_items").delete().eq("order_id", orderId);
      await db.from("orders").delete().eq("id", orderId);
      return;
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(2000 * attempt);
    }
  }
}

/**
 * Guest checkout through the real UI. Leaves the page on the confirmation
 * page (the placing browser = owner). Returns { orderId, page, ctx }.
 */
// `phone`: pass a fresh qaPhone() when a suite places many orders — the
// per-phone order limit (4/day) applies even to local runs.
export async function placeOrderUI(browser, base, { slug, name, email = "", coupon = "", phone = QA_PHONE }) {
  const { ctx, page } = await newPage(browser);
  await page.goto(`${base}/ar/products/${slug}`, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(1500);
  await clickByText(page, "button", "أضف للكارت");
  await sleep(2000);
  await page.goto(`${base}/ar/checkout`, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(2500);
  await page.type("#shipping-name", name);
  await page.type("#shipping-phone", phone);
  if (email) await page.type("#shipping-email", email);
  const gov = await page.$eval("#shipping-governorate", (s) => [...s.options].find((o) => o.value)?.value);
  await page.select("#shipping-governorate", gov);
  await page.type("#shipping-city", "QA City");
  await page.type("#shipping-street", "QA Street 1");
  await clickByText(page, "form button", "التالي"); await sleep(1500);
  await clickByText(page, "form button", "التالي"); await sleep(1500);
  let couponText = "";
  if (coupon) {
    await page.type('input[placeholder="MM-XXXXXX"]', coupon);
    await clickByText(page, "form button", "تطبيق");
    await sleep(3000);
    couponText = await page.evaluate(() => document.querySelector("form")?.innerText ?? "");
  }
  await clickByText(page, 'form button[type="submit"]', "إتمام الطلب");
  for (let i = 0; i < 40 && !page.url().includes("/order-confirmation/"); i++) await sleep(1000);
  const orderId = (page.url().match(/order-confirmation\/([0-9a-f-]{36})/) || [])[1] || null;
  return { orderId, page, ctx, couponText };
}

/** Session cookies for any confirmed user (magic link verified server-side, no email sent). */
export async function sessionCookies(email, base) {
  const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  let jar = [];
  const ssr = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => jar, setAll: (c) => { jar = c; } },
  });
  const { error: vErr } = await ssr.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (vErr) throw vErr;
  const host = new URL(base).hostname;
  return jar.map((c) => ({ name: c.name, value: c.value, domain: host, path: "/", secure: base.startsWith("https") }));
}

/** Confirmed throwaway account (no email is sent). */
export async function createQaUser(label) {
  const base = (env.QA_EMAIL_BASE || "qa@example.com").split("@");
  const email = `${base[0]}+${label}${Date.now() % 1e6}@${base[1]}`;
  const password = `Qa-${Date.now()}-Pass`;
  const { data, error } = await db.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name: "QA Tester" },
  });
  if (error) throw error;
  return { id: data.user.id, email, password };
}

export const deleteQaUser = (id) => db.auth.admin.deleteUser(id);
