// Subscriber coupons: pending subscriber → admin approves → personal code →
// shopper redeems it at checkout (server-priced) → the code can't be reused.
// Needs migration 0029. Creates and deletes its own data.
import {
  DESKTOP, clickByText, createQaProduct, db, deleteOrder, deleteQaProduct, env,
  newPage, placeOrderUI, qaPhone, reporter, sessionCookies, sleep,
} from "./lib.mjs";

const SLUG = "zz-qa-coupon";

export async function run(browser, base) {
  const r = reporter("coupons");
  const orders = [];
  let subId = null;
  const email = `zz-qa-coupon-${Date.now()}@example.com`;
  try {
    await createQaProduct({ slug: SLUG, stock: 5, price: 1000 });
    const { data: sub, error: subErr } = await db
      .from("newsletter_subscribers")
      .insert({ email, locale: "ar" })
      .select("id, status")
      .single();
    if (subErr) throw subErr;
    subId = sub.id;
    r.check("a new subscriber starts as pending", sub.status === "pending", sub.status);

    // ── Admin approves from the dashboard ────────────────────────────────
    {
      const { ctx, page } = await newPage(browser, DESKTOP);
      const host = new URL(base).hostname;
      await page.setCookie(...(await sessionCookies(env.ADMIN_EMAIL, base)), { name: "admin_locale", value: "ar", domain: host, path: "/" });
      await page.goto(`${base}/admin/newsletter?review=pending&q=${encodeURIComponent(email)}`, { waitUntil: "networkidle2", timeout: 120000 });
      await sleep(1500);
      await clickByText(page, "button", "موافقة وإصدار كود");
      await sleep(5000);
      const { data: coupons } = await db.from("coupons").select("code, percent_off, expires_at, used_at").eq("subscriber_id", subId);
      const c = coupons?.[0];
      const days = c ? (Date.parse(c.expires_at) - Date.now()) / 86_400_000 : 0;
      r.check("approving issues one personal 10% code", coupons?.length === 1 && c.percent_off === 10 && /^MM-[A-HJ-NP-Z2-9]{6}$/.test(c.code), c?.code);
      r.check("the code expires in ~60 days", days > 59 && days <= 60, days.toFixed(2));
      const { data: s2 } = await db.from("newsletter_subscribers").select("status").eq("id", subId).single();
      r.check("subscriber is now approved", s2.status === "approved");
      await page.goto(`${base}/admin/newsletter?q=${encodeURIComponent(email)}`, { waitUntil: "networkidle2", timeout: 120000 });
      const gmail = await page.evaluate(() => [...document.querySelectorAll('a[href^="https://mail.google.com/"]')].map((a) => a.href));
      const g = gmail[0] ? new URL(gmail[0]) : null;
      r.check("dashboard shows a Gmail message with the code for the subscriber", !!g && g.searchParams.get("to") === email && (g.searchParams.get("body") || "").includes(c.code));
      await ctx.close();
    }
    const { data: [coupon] } = await db.from("coupons").select("code").eq("subscriber_id", subId);

    // ── Wrong code is refused in the preview ─────────────────────────────
    {
      const bad = await placeOrderUI(browser, base, { slug: SLUG, name: "Coupon Qzv", phone: qaPhone(), coupon: "MM-ZZZZZZ" });
      r.check("an unknown code is refused", bad.couponText.includes("الكود ده مش صحيح"));
      if (bad.orderId) {
        orders.push(bad.orderId);
        const { data: o } = await db.from("orders").select("discount_amount").eq("id", bad.orderId).single();
        r.check("…and the order is placed at full price", Number(o.discount_amount) === 0);
      }
      await bad.ctx.close();
    }

    // ── Real redemption ──────────────────────────────────────────────────
    {
      const p = await placeOrderUI(browser, base, { slug: SLUG, name: "Coupon Qzv", phone: qaPhone(), coupon: coupon.code });
      r.check("checkout shows the code discount before ordering", p.couponText.includes("خصم الكود"), p.couponText.slice(0, 0));
      r.check("order with the code goes through", !!p.orderId, p.page.url());
      if (p.orderId) {
        orders.push(p.orderId);
        const { data: o } = await db.from("orders").select("subtotal, discount_amount, shipping_fee, total, coupon_code").eq("id", p.orderId).single();
        // 1000 products − 100 (10%) + 50 shipping + 25 COD
        r.check("server priced it: 10% off products only", Number(o.subtotal) === 1000 && Number(o.discount_amount) === 100 && Number(o.total) === 975 && o.coupon_code === coupon.code, JSON.stringify(o));
        const { data: cu } = await db.from("coupons").select("used_at, order_id").eq("code", coupon.code).single();
        r.check("the code is marked used on that order", !!cu.used_at && cu.order_id === p.orderId);
        const txt = await p.page.evaluate(() => document.body.innerText);
        r.check("confirmation page shows the discount", txt.includes("خصم الكود"));
      }
      await p.ctx.close();
    }

    // ── Same code again ─────────────────────────────────────────────────
    {
      const again = await placeOrderUI(browser, base, { slug: SLUG, name: "Coupon Qzv", phone: qaPhone(), coupon: coupon.code });
      r.check("a used code is refused", again.couponText.includes("اتستخدم قبل كده"));
      if (again.orderId) {
        orders.push(again.orderId);
        const { data: o } = await db.from("orders").select("discount_amount").eq("id", again.orderId).single();
        r.check("…and gives no discount", Number(o.discount_amount) === 0);
      }
      await again.ctx.close();
    }

    // ── Redemption is atomic: of two claims, exactly one wins ────────────
    {
      const code = `MM-QA${String(Date.now()).slice(-4).replace(/[01]/g, "7")}`;
      await db.from("coupons").insert({ code, percent_off: 10, email });
      const claim = () =>
        db.from("coupons").update({ used_at: new Date().toISOString() }).eq("code", code).is("used_at", null).select("id");
      const [a, b] = await Promise.all([claim(), claim()]);
      r.check("two simultaneous redemptions: exactly one wins", (a.data?.length ?? 0) + (b.data?.length ?? 0) === 1);
      await db.from("coupons").delete().eq("code", code);
    }
  } catch (e) {
    r.check("coupons suite crashed", false, e?.stack?.split("\n").slice(0, 3).join("\n") ?? String(e));
  } finally {
    for (const id of orders) await deleteOrder(id).catch(() => {});
    if (subId) {
      await db.from("coupons").delete().eq("subscriber_id", subId);
      await db.from("newsletter_subscribers").delete().eq("id", subId);
    }
    await db.from("newsletter_subscribers").delete().like("email", "zz-qa-coupon-%");
    await deleteQaProduct(SLUG).catch(() => {});
  }
  return r.lines;
}
