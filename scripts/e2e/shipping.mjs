// Shipping by area (0032): the area picker and prices at checkout, the
// server-priced order (area fee + courier COD fee), the admin "handed to
// courier" button and the expected date the customer then sees, the admin
// price table and the public price list.
import {
  DESKTOP, clickByText, createQaProduct, db, deleteOrder, deleteQaProduct, env,
  newPage, overflowPx, placeOrderUI, qaPhone, reporter, sessionCookies, sleep,
} from "./lib.mjs";
import path from "node:path";

const SLUG = "zz-qa-shipping";
const SHOTS = process.env.E2E_SHOTS_DIR || "";

const shot = async (page, name) => {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
};
// Arabic pages print prices in Arabic-Indic digits (١٦٥); compare in Western.
const text = (page) =>
  page.evaluate(() =>
    document.body.innerText
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/٬/g, ","),
  );

export async function run(browser, base) {
  const r = reporter("shipping");
  const orders = [];
  try {
    await createQaProduct({ slug: SLUG, stock: 10, price: 1000 });
    const { data: zones } = await db.from("shipping_zones").select("id, code, fee, name_ar").eq("is_active", true);
    const zone = (code) => zones.find((z) => z.code === code);
    r.check("areas are seeded", zones.length >= 30, `${zones.length} areas`);

    // ── Checkout: the picker and the prices ─────────────────────────────
    {
      const { ctx, page } = await newPage(browser);
      await page.goto(`${base}/ar/products/${SLUG}`, { waitUntil: "networkidle2", timeout: 120000 });
      await sleep(1500);
      await clickByText(page, "button", "أضف للكارت");
      await sleep(2000);
      await page.goto(`${base}/ar/checkout`, { waitUntil: "networkidle2", timeout: 120000 });
      await sleep(2500);
      const before = await text(page);
      r.check("shipping says 'depends on your area' before a governorate is picked", before.includes("حسب منطقتك"));

      await page.select("#shipping-governorate", "sohag");
      await sleep(500);
      r.check("a one-area governorate (Sohag) needs no area picker", !(await page.$("#shipping-zone")));
      const sohag = await text(page);
      r.check("Sohag shows its price and the 28–36 h promise", sohag.includes(String(zone("sohag").fee)) && sohag.includes("28–36"));

      await page.select("#shipping-governorate", "cairo");
      await sleep(500);
      const options = await page.$$eval("#shipping-zone option", (o) => o.filter((x) => x.value).length);
      r.check("Cairo asks for the area (2 choices)", options === 2, `${options} options`);
      await page.select("#shipping-zone", zone("cairo-east").id);
      await sleep(500);
      const east = await text(page);
      r.check("picking Shorouk/Badr shows its own price", east.includes(String(zone("cairo-east").fee)));
      await shot(page, "checkout-area-ar-390");
      r.check("no horizontal overflow at 390px", (await overflowPx(page)) <= 0);

      await page.type("#shipping-name", "Ship Qzv");
      await page.type("#shipping-phone", qaPhone());
      await page.type("#shipping-city", "QA City");
      await page.type("#shipping-street", "QA Street 1");
      await clickByText(page, "form button", "التالي");
      await sleep(1500);
      const pay = await text(page);
      r.check("COD is labelled as the courier's fee", pay.includes("رسوم تحصيل لشركة الشحن") && pay.includes("مش إحنا"));
      // InstaPay is only offered where its handle is configured.
      if (await page.$("#pm-instapay")) r.check("InstaPay shows what it saves", pay.includes("وفّر"));
      await shot(page, "checkout-payment-ar-390");
      await ctx.close();
    }

    // ── A real order is priced on the server ────────────────────────────
    const placed = await placeOrderUI(browser, base, { slug: SLUG, name: "Ship Qzv", phone: qaPhone() });
    const orderId = placed.orderId;
    if (orderId) orders.push(orderId);
    r.check("COD order placed with an area", !!orderId, placed.page.url());
    await placed.ctx.close();
    if (!orderId) return r.lines;

    const { data: o } = await db.from("orders")
      .select("shipping_fee, cod_fee, total, shipping_zone_id, shipping_address, view_token").eq("id", orderId).single();
    const cairo = zone("cairo");
    // 1000 + 155 = 1,155 collected → 35 (1,190 stays in the same band).
    r.check(
      "server charged the area fee + the courier COD fee",
      Number(o.shipping_fee) === Number(cairo.fee) && Number(o.cod_fee) === 35 &&
        Number(o.total) === 1000 + Number(cairo.fee) + 35 && o.shipping_zone_id === cairo.id,
      JSON.stringify({ fee: o.shipping_fee, cod: o.cod_fee, total: o.total }),
    );
    r.check("the order remembers the area name", o.shipping_address?.shipping_zone === cairo.name_ar);

    // ── Admin: price table, then hand the order to the courier ──────────
    {
      const { ctx, page } = await newPage(browser, DESKTOP);
      const host = new URL(base).hostname;
      await page.setCookie(...(await sessionCookies(env.ADMIN_EMAIL, base)), { name: "admin_locale", value: "ar", domain: host, path: "/" });
      await page.goto(`${base}/admin/shipping`, { waitUntil: "networkidle2", timeout: 120000 });
      const table = await text(page);
      r.check("admin price table lists the areas and flags the unconfirmed ones", table.includes("أسعار الشحن") && table.includes("راجع السعر"));
      await shot(page, "admin-shipping");

      await db.from("orders").update({ status: "confirmed" }).eq("id", orderId);
      await page.goto(`${base}/admin/orders/${orderId}`, { waitUntil: "networkidle2", timeout: 120000 });
      const detail = await text(page);
      r.check("admin order shows the area and the courier fee", detail.includes(cairo.name_ar) && detail.includes("رسوم التحصيل"));
      await clickByText(page, "button", "اتسلّم للمندوب");
      await sleep(5000);
      await shot(page, "admin-order-handed");
      const { data: after } = await db.from("orders").select("status, shipped_at").eq("id", orderId).single();
      const { data: cod } = await db.from("cod_tracking").select("courier_name, estimated_delivery").eq("order_id", orderId).maybeSingle();
      const expected = new Date(new Date(after.shipped_at ?? 0).getTime() + 36 * 3600 * 1000)
        .toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
      r.check("handover marks it shipped and stamps the time", after.status === "shipped" && !!after.shipped_at, JSON.stringify(after));
      r.check("expected date = pickup + 36 h, courier Urgent", cod?.estimated_delivery === expected && cod?.courier_name === "Urgent", JSON.stringify(cod));
      await ctx.close();
    }

    // ── The customer's order link shows the date and the fee ────────────
    {
      const { ctx, page } = await newPage(browser);
      await page.goto(`${base}/ar/o/${o.view_token}`, { waitUntil: "networkidle2", timeout: 120000 });
      const t = await text(page);
      r.check("order link shows 'arrives by' and the courier fee", t.includes("يوصلك لحد") && t.includes("رسوم التحصيل"));
      await shot(page, "order-link-shipped-390");
      await ctx.close();
    }

    // ── Public price list ───────────────────────────────────────────────
    {
      const { ctx, page } = await newPage(browser);
      await page.goto(`${base}/ar/shipping-policy`, { waitUntil: "networkidle2", timeout: 120000 });
      const t = await text(page);
      r.check("shipping policy lists area prices", t.includes("أسعار الشحن") && t.includes("مرسى علم") && t.includes("28–36"));
      r.check("policy page has no horizontal overflow at 390px", (await overflowPx(page)) <= 0);
      await ctx.close();
    }
  } catch (e) {
    r.check("suite ran without crashing", false, e.message);
  } finally {
    for (const id of orders) await deleteOrder(id).catch(() => {});
    await deleteQaProduct(SLUG).catch(() => {});
  }
  return r.lines;
}
