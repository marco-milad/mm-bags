// Orders: owner vs stranger on the confirmation page, tracking, admin cancel
// with restock, delivered-cancel refusal, sold-out cart block, and two
// shoppers racing for the last unit.
import {
  DESKTOP, QA_PHONE, qaPhone, clickByText, createQaProduct, db, deleteOrder, deleteQaProduct, env,
  newPage, overflowPx, placeOrderUI, reporter, sessionCookies, sleep, variantStock,
} from "./lib.mjs";

const SLUG = "zz-qa-orders";
const RACE_SLUG = "zz-qa-race";

export async function run(browser, base) {
  const r = reporter("orders");
  const orders = [];
  try {
    const qa = await createQaProduct({ slug: SLUG, stock: 10 });

    // ── Place a COD order; owner vs stranger ───────────────────────────
    const placed = await placeOrderUI(browser, base, { slug: SLUG, name: "Owner Qzv" });
    const orderId = placed.orderId;
    if (orderId) orders.push(orderId);
    r.check("guest COD order placed through the UI", !!orderId, placed.page.url());
    r.check("stock went down by one", (await variantStock(qa.variantId)) === 9);
    {
      const { page } = placed;
      await sleep(1500);
      const t = await page.evaluate(() => document.body.innerText);
      r.check("owner sees full name and phone", t.includes("Owner Qzv") && t.includes(QA_PHONE));
      const cookie = (await page.cookies()).find((c) => c.name === "mm_orders");
      r.check("ownership cookie is httpOnly + SameSite=Lax", !!cookie && cookie.httpOnly && /lax/i.test(cookie.sameSite || ""));
      const share = await page.evaluate(() => [...document.querySelectorAll('a[href^="https://wa.me/?text="]')].map((a) => decodeURIComponent(a.getAttribute("href"))));
      r.check("owner can send the order number to themselves (no ?p= credential)", share.some((h) => h.includes("/track/") && !h.includes("?p=")), share[0]);
      await placed.ctx.close();
    }
    const { data: o } = await db.from("orders").select("order_number").eq("id", orderId).single();
    {
      const { ctx, page } = await newPage(browser);
      await page.goto(`${base}/ar/order-confirmation/${orderId}`, { waitUntil: "networkidle2", timeout: 120000 });
      const html = await page.evaluate(() => (document.querySelector("main") || document.body).outerHTML);
      const text = await page.evaluate(() => document.body.innerText);
      r.check("stranger: phone hidden (incl. RSC payload)", !html.includes(QA_PHONE));
      r.check("stranger: surname hidden, first name shown", !text.includes("Qzv") && text.includes("Owner"));
      r.check("stranger: no save-number buttons", !text.includes("انسخ رقم الطلب"));

      // Tracking with order number + last 4 digits
      await page.goto(`${base}/ar/track/${orderId}`, { waitUntil: "networkidle2", timeout: 120000 });
      await sleep(1000);
      await page.type('input[name="phoneLast4"]', QA_PHONE.slice(-4));
      await page.evaluate(() => document.querySelector('form button[type="submit"]')?.click());
      await sleep(5000);
      const wa = await page.evaluate(() => [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => decodeURIComponent(a.getAttribute("href"))));
      r.check("tracking shows a real WhatsApp updates link", wa.some((h) => h.includes(o.order_number)));
      r.check("no fake updates switch on tracking", !(await page.$('[role="switch"]')));
      r.check("no horizontal overflow: tracking 390px", (await overflowPx(page)) <= 0);

      // Brute-forcing the last 4 digits gets cut off (8 tries / 15 min / order).
      let blockedAt = 0;
      for (let attempt = 1; attempt <= 10 && !blockedAt; attempt++) {
        await page.goto(`${base}/ar/track/${orderId}`, { waitUntil: "networkidle2", timeout: 120000 });
        await page.type('input[name="phoneLast4"]', String(1000 + attempt));
        await page.evaluate(() => document.querySelector('form button[type="submit"]')?.click());
        await sleep(2500);
        const msg = await page.evaluate(() => [...document.querySelectorAll('[role="alert"]')].map((e) => e.textContent).join(" "));
        if (msg.includes("محاولات كتير")) blockedAt = attempt;
      }
      r.check("guessing the tracking code is blocked after a few tries", blockedAt > 0 && blockedAt <= 9, `blocked at attempt ${blockedAt}`);
      await ctx.close();
    }

    // ── Admin cancels it from the orders list → stock comes back ───────
    {
      const { ctx, page } = await newPage(browser, DESKTOP);
      const host = new URL(base).hostname;
      await page.setCookie(...(await sessionCookies(env.ADMIN_EMAIL, base)), { name: "admin_locale", value: "ar", domain: host, path: "/" });
      let dialog = "";
      page.on("dialog", async (d) => { dialog = d.message(); await d.accept(); });
      await page.goto(`${base}/admin/orders`, { waitUntil: "networkidle2", timeout: 120000 });
      await sleep(2000);
      const changed = await page.evaluate((num) => {
        const row = [...document.querySelectorAll("tr, li")].find((x) => x.textContent.includes(num) && x.querySelector("select"));
        const sel = row?.querySelector("select");
        if (!sel) return false;
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(sel, "cancelled");
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }, o.order_number);
      await sleep(6000);
      const { data: oc } = await db.from("orders").select("status").eq("id", orderId).single();
      r.check("admin cancel asks for confirmation", changed && dialog.includes("إلغاء الطلب"), dialog.slice(0, 50));
      r.check("cancelled order puts its stock back", oc.status === "cancelled" && (await variantStock(qa.variantId)) === 10, `status=${oc.status}`);
      const { data: again } = await db.rpc("cancel_order_with_restock", { p_order_id: orderId });
      r.check("cancelling twice restocks nothing more", again?.[0]?.was_cancelled === false && (await variantStock(qa.variantId)) === 10);
      await ctx.close();
    }

    // ── Delivered orders can't be cancelled (they're returns) ──────────
    {
      const p2 = await placeOrderUI(browser, base, { slug: SLUG, name: "Delivered Qzv" });
      if (p2.orderId) orders.push(p2.orderId);
      await p2.ctx.close();
      await db.from("orders").update({ status: "delivered" }).eq("id", p2.orderId);
      const { error } = await db.rpc("cancel_order_with_restock", { p_order_id: p2.orderId });
      r.check("delivered order cannot be cancelled", !!error);
    }

    // ── A sold-out line blocks checkout ────────────────────────────────
    {
      await db.from("product_variants").update({ stock_qty: 0 }).eq("id", qa.variantId);
      const { ctx, page } = await newPage(browser);
      await page.goto(`${base}/ar`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.evaluate((line) => localStorage.setItem("mm-cart", JSON.stringify({ state: { items: [line] }, version: 0 })), {
        variantId: qa.variantId, productId: qa.productId, productSlug: SLUG, name_ar: "QA", name_en: "QA",
        image: null, color_hex: null, color_ar: null, color_en: null, size_inches: null, unitPrice: 100, qty: 1,
      });
      await page.goto(`${base}/ar/cart`, { waitUntil: "networkidle2", timeout: 120000 });
      await sleep(3500);
      const st = await page.evaluate(() => ({
        reason: document.body.innerText.includes("شيل المنتجات اللي خلصت"),
        links: [...document.querySelectorAll('a[href$="/checkout"]')].filter((a) => a.offsetParent !== null).length,
      }));
      r.check("a sold-out item in the cart blocks checkout", st.reason && st.links === 0, JSON.stringify(st));
      await ctx.close();
    }

    // ── Two shoppers, one last unit ────────────────────────────────────
    {
      await createQaProduct({ slug: RACE_SLUG, stock: 1 });
      const toReview = async (n) => {
        const { ctx, page } = await newPage(browser);
        await page.goto(`${base}/ar/products/${RACE_SLUG}`, { waitUntil: "networkidle2", timeout: 120000 });
        await sleep(1500);
        await clickByText(page, "button", "أضف للكارت");
        await sleep(2000);
        await page.goto(`${base}/ar/checkout`, { waitUntil: "networkidle2", timeout: 120000 });
        await sleep(2500);
        await page.type("#shipping-name", `Racer ${n}`);
        await page.type("#shipping-phone", qaPhone());
        const gov = await page.$eval("#shipping-governorate", (s) => [...s.options].find((x) => x.value)?.value);
        await page.select("#shipping-governorate", gov);
        await page.type("#shipping-city", "QA City");
        await page.type("#shipping-street", "QA Street 1");
        await clickByText(page, "form button", "التالي"); await sleep(1500);
        await clickByText(page, "form button", "التالي"); await sleep(2000);
        return { ctx, page };
      };
      const [a, b] = await Promise.all([toReview(1), toReview(2)]);
      await Promise.all([a, b].map((s) => clickByText(s.page, 'form button[type="submit"]', "إتمام الطلب")));
      for (let i = 0; i < 30 && ![a, b].some((s) => s.page.url().includes("/order-confirmation/")); i++) await sleep(1000);
      await sleep(4000);
      const urls = [a.page.url(), b.page.url()];
      const winners = urls.filter((u) => u.includes("/order-confirmation/"));
      for (const u of winners) orders.push(u.match(/order-confirmation\/([0-9a-f-]{36})/)[1]);
      const { data: rv } = await db.from("products").select("id, product_variants(stock_qty)").eq("slug", RACE_SLUG).single();
      r.check("last unit: exactly one shopper gets it", winners.length === 1, JSON.stringify(urls.map((u) => u.replace(base, ""))));
      r.check("last unit: stock ends at 0, never negative", rv.product_variants[0].stock_qty === 0);
      await a.ctx.close(); await b.ctx.close();
    }
  } catch (e) {
    r.check("orders suite crashed", false, String(e?.stack || e).slice(0, 300));
  } finally {
    for (const id of orders) await deleteOrder(id, { restock: false }).catch(() => {});
    await deleteQaProduct(SLUG);
    await deleteQaProduct(RACE_SLUG);
  }
  return r.lines;
}
