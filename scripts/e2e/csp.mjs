// Content-Security-Policy: crawl the storefront and the admin, and fail on
// any violation the browser reports (an asset or request the policy blocks)
// or any image that didn't load. Also checks the CSP header is present.
import { DESKTOP, createQaProduct, deleteQaProduct, env, newPage, reporter, sessionCookies, sleep } from "./lib.mjs";

const SLUG = "zz-qa-csp";

/** Collect violations in the page itself (works for workers/iframes too). */
async function watch(page) {
  await page.evaluateOnNewDocument(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      window.__csp.push(`${e.effectiveDirective} ← ${e.blockedURI || "(inline)"}`);
    });
  });
  const consoleHits = [];
  page.on("console", (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to (load|connect|frame|execute|apply)/i.test(t)) consoleHits.push(t.slice(0, 200));
  });
  return consoleHits;
}

async function visit(page, url, settle = 2500) {
  await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(settle);
  return page.evaluate(() => ({
    violations: window.__csp ?? [],
    brokenImages: [...document.images]
      .filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc && !i.loading?.includes("lazy"))
      .map((i) => i.currentSrc.slice(0, 120)),
  }));
}

export async function run(browser, base) {
  const r = reporter("csp");
  try {
    const head = await fetch(`${base}/ar`);
    const csp = head.headers.get("content-security-policy") ?? "";
    r.check("CSP header is sent", csp.includes("script-src") && csp.includes("connect-src"), csp.slice(0, 80));

    await createQaProduct({ slug: SLUG, stock: 5 });
    const pages = [
      "/ar", "/en", "/ar/catalog", "/ar/catalog/travel-bags", "/ar/categories", `/ar/products/${SLUG}`,
      "/ar/products/ck-luggage", "/ar/guides", "/ar/guides/cabin-bag-size-by-airline", "/ar/faq", "/ar/about",
      "/ar/privacy-policy", "/ar/track", "/ar/auth/login", "/ar/cart", "/en/catalog",
    ];

    // Storefront, phone and desktop (desktop also plays the hero video).
    for (const viewport of [undefined, DESKTOP]) {
      const { ctx, page } = await newPage(browser, viewport);
      const consoleHits = await watch(page);
      const bad = [];
      for (const p of pages) {
        const res = await visit(page, `${base}${p}`);
        if (res.violations.length || res.brokenImages.length) bad.push(`${p}: ${[...res.violations, ...res.brokenImages].join(", ")}`);
      }
      const label = viewport ? "desktop" : "phone";
      r.check(`storefront (${label}): no CSP violations or broken images`, bad.length === 0 && consoleHits.length === 0, [...bad, ...consoleHits].slice(0, 4).join(" | "));
      await ctx.close();
    }

    // Forms that load Cloudflare Turnstile (frame + script from challenges.cloudflare.com).
    {
      const { ctx, page } = await newPage(browser);
      const consoleHits = await watch(page);
      await page.goto(`${base}/ar/contact`, { waitUntil: "networkidle2", timeout: 120000 });
      await page.focus("#contact-name");
      await page
        .waitForFunction(() => !!document.querySelector('input[name="cf-turnstile-response"]')?.value, { timeout: 30000 })
        .catch(() => {});
      const st = await page.evaluate(() => ({
        token: !!document.querySelector('input[name="cf-turnstile-response"]')?.value,
        violations: window.__csp ?? [],
      }));
      r.check("Turnstile loads and issues a token under the CSP", st.token && st.violations.length === 0 && consoleHits.length === 0, [...st.violations, ...consoleHits].join(" | "));
      await ctx.close();
    }

    // Admin pages.
    {
      const { ctx, page } = await newPage(browser, DESKTOP);
      const consoleHits = await watch(page);
      const host = new URL(base).hostname;
      await page.setCookie(...(await sessionCookies(env.ADMIN_EMAIL, base)), { name: "admin_locale", value: "ar", domain: host, path: "/" });
      const bad = [];
      for (const p of ["/admin", "/admin/orders", "/admin/products", "/admin/analytics", "/admin/newsletter", "/admin/reports", "/admin/pos", "/admin/stock"]) {
        const res = await visit(page, `${base}${p}`, 3000);
        if (res.violations.length || res.brokenImages.length) bad.push(`${p}: ${[...res.violations, ...res.brokenImages].join(", ")}`);
      }
      r.check("admin: no CSP violations or broken images", bad.length === 0 && consoleHits.length === 0, [...bad, ...consoleHits].slice(0, 4).join(" | "));
      await ctx.close();
    }
  } catch (e) {
    r.check("csp suite crashed", false, e?.stack?.split("\n").slice(0, 3).join("\n") ?? String(e));
  } finally {
    await deleteQaProduct(SLUG).catch(() => {});
  }
  return r.lines;
}
