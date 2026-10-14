// Storefront browsing: search empty state, bottom nav, wishlist toast,
// cart quantity cap + tap targets, checkout form a11y, no horizontal overflow.
import {
  DESKTOP, MOBILE, clickByText, createQaProduct, deleteQaProduct, newPage, overflowPx, reporter, sleep,
} from "./lib.mjs";

const SLUG = "zz-qa-storefront";

export async function run(browser, base) {
  const r = reporter("storefront");
  try {
    await createQaProduct({ slug: SLUG, stock: 3 });

    // Search with no results + bottom nav (AR mobile)
    {
      const { ctx, page } = await newPage(browser, MOBILE);
      await page.goto(`${base}/ar/catalog?q=xyzxyzqa`, { waitUntil: "networkidle2", timeout: 120000 });
      const body = await page.evaluate(() => document.body.innerText);
      r.check("search with no results shows the no-results state (AR)", body.includes("مالقيناش"));
      const active = await page.evaluate(() => [...document.querySelectorAll('nav [aria-current="page"]')].map((e) => e.textContent.trim()));
      r.check("bottom nav marks the current tab", active.length === 1, JSON.stringify(active));
      r.check("no horizontal overflow: catalog AR 390px", (await overflowPx(page)) <= 0);
      await ctx.close();
    }
    {
      const { ctx, page } = await newPage(browser, DESKTOP);
      await page.goto(`${base}/en/catalog?q=xyzxyzqa`, { waitUntil: "networkidle2", timeout: 120000 });
      r.check("search with no results shows the no-results state (EN)", /No results for/i.test(await page.evaluate(() => document.body.innerText)));
      r.check("no horizontal overflow: catalog EN 1366px", (await overflowPx(page)) <= 0);
      await ctx.close();
    }

    // Product page: wishlist toast, add to cart, stock cap, 44px controls
    {
      const { ctx, page } = await newPage(browser, MOBILE);
      await page.goto(`${base}/ar/products/${SLUG}`, { waitUntil: "networkidle2", timeout: 120000 });
      await sleep(2000);
      await page.evaluate(() => document.querySelector('button[aria-label="إضافة للمفضلة"]')?.click());
      await sleep(1200);
      const toast = await page.evaluate(() => [...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.innerText));
      r.check("wishlist add shows a confirmation toast", toast.some((t) => t.includes("اتضافت")), JSON.stringify(toast));

      r.check("add to cart button works", await clickByText(page, "button", "أضف للكارت"));
      await sleep(2500);
      const sizes = await page.evaluate(() => ["نقصان", "زيادة", "إزالة من السلة"].map((l) => {
        const b = document.querySelector(`button[aria-label^="${l}"]`);
        if (!b) return { l, missing: true };
        const rc = b.getBoundingClientRect();
        return { l, w: Math.round(rc.width), h: Math.round(rc.height) };
      }));
      r.check("cart +/−/remove are at least 44px", sizes.every((s) => !s.missing && s.w >= 44 && s.h >= 44), JSON.stringify(sizes));
      const clicks = [];
      for (let i = 0; i < 6; i++) {
        const state = await page.evaluate(() => {
          const b = document.querySelector('button[aria-label^="زيادة"]');
          if (!b) return "missing";
          if (b.disabled || b.getAttribute("aria-disabled") === "true") return "capped";
          b.click(); return "clicked";
        });
        clicks.push(state);
        if (state !== "clicked") break;
        await sleep(400);
      }
      r.check("cart quantity stops at the stock (3)", clicks.filter((c) => c === "clicked").length === 2 && clicks.at(-1) === "capped", clicks.join(","));
      r.check("no horizontal overflow: product + cart drawer", (await overflowPx(page)) <= 0);

      // Checkout form: empty submit → errors announced
      await page.goto(`${base}/ar/checkout`, { waitUntil: "networkidle2", timeout: 120000 });
      await sleep(2000);
      await clickByText(page, "form button", "التالي");
      await sleep(1200);
      const a11y = await page.evaluate(() => ({
        invalid: document.querySelectorAll('[aria-invalid="true"]').length,
        alerts: document.querySelectorAll('form [role="alert"]').length,
        described: [...document.querySelectorAll('[aria-invalid="true"]')].every((el) => {
          const id = el.getAttribute("aria-describedby");
          return !!id && !!document.getElementById(id.split(" ")[0]);
        }),
      }));
      r.check("checkout form errors are announced to screen readers", a11y.invalid > 0 && a11y.alerts > 0 && a11y.described, JSON.stringify(a11y));
      await ctx.close();
    }

    // Missing product → real 404
    const res = await fetch(`${base}/ar/products/zz-qa-does-not-exist`);
    r.check("missing product returns HTTP 404", res.status === 404, res.status);
  } catch (e) {
    r.check("storefront suite crashed", false, String(e?.stack || e).slice(0, 300));
  } finally {
    await deleteQaProduct(SLUG);
  }
  return r.lines;
}
