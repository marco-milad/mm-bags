// Accounts: email/password login, wrong password, sign out, set-a-new-password
// page, Google button visibility, open-redirect guard, and guest orders
// joining the account whose confirmed email matches.
import {
  createQaProduct, createQaUser, db, deleteOrder, deleteQaProduct, deleteQaUser, env, newPage,
  placeOrderUI, reporter, sessionCookies, sleep,
} from "./lib.mjs";

const SLUG = "zz-qa-auth";

async function login(browser, base, email, password) {
  const { ctx, page } = await newPage(browser);
  await page.goto(`${base}/ar/auth/login`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await page.evaluate(() => document.querySelector('form button[type="submit"]').click());
  for (let i = 0; i < 20 && !page.url().includes("/account"); i++) await sleep(500);
  await sleep(1500);
  return { ctx, page };
}

export async function run(browser, base) {
  const r = reporter("auth");
  let user = null;
  const orders = [];
  try {
    user = await createQaUser("e2e");

    // Google button matches the Supabase provider setting
    const settings = await (await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    })).json();
    {
      const { ctx, page } = await newPage(browser);
      await page.goto(`${base}/ar/auth/login`, { waitUntil: "networkidle2", timeout: 120000 });
      const shown = await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => /google/i.test(b.textContent)));
      r.check("Google button shown only when the provider is enabled", shown === (settings.external?.google === true), `enabled=${settings.external?.google} shown=${shown}`);
      await ctx.close();
    }

    // Open redirect guard
    const cb = await fetch(`${base}/auth/callback?next=//evil.example/x&locale=ar`, { redirect: "manual" });
    r.check("login callback refuses //evil.example redirects", !(cb.headers.get("location") || "").includes("evil.example"));

    // Wrong password, right password, ?next=, sign out
    {
      const { ctx, page } = await login(browser, base, user.email, "definitely-wrong-123");
      const alert = await page.evaluate(() => document.querySelector('[role="alert"]')?.textContent?.trim() || "");
      r.check("wrong password shows an error and stays signed out", !page.url().includes("/account") && alert.length > 0, alert);
      await ctx.close();
    }
    {
      const { ctx, page } = await login(browser, base, user.email, user.password);
      r.check("email + password login lands on My account", page.url().includes("/ar/account") && (await page.evaluate(() => document.body.innerText)).includes("QA Tester"));
      await page.goto(`${base}/ar/auth/login?next=%2Far%2Faccount%2Fwishlist`, { waitUntil: "networkidle2", timeout: 120000 });
      r.check("signed-in visit to login?next= goes to next", page.url().includes("/ar/account/wishlist"));
      await page.goto(`${base}/ar/account`, { waitUntil: "networkidle2", timeout: 120000 });
      const clicked = await page.evaluate(() => {
        const b = [...document.querySelectorAll("button")].find((x) => /تسجيل الخروج|خروج|Sign out/.test(x.textContent));
        if (b) { b.click(); return true; }
        return false;
      });
      await sleep(3000);
      await page.goto(`${base}/ar/account`, { waitUntil: "networkidle2", timeout: 120000 });
      r.check("sign out ends the session", clicked && !(await page.evaluate(() => document.body.innerText)).includes("QA Tester"));
      await ctx.close();
    }

    // Set-a-new-password page
    {
      const { ctx, page } = await newPage(browser);
      await page.goto(`${base}/ar/auth/reset-password`, { waitUntil: "networkidle2", timeout: 120000 });
      r.check("reset page without a session says the link expired", (await page.evaluate(() => document.body.innerText)).includes("انتهى"));
      await ctx.close();
    }
    {
      const { ctx, page } = await newPage(browser);
      await page.setCookie(...(await sessionCookies(user.email, base)));
      await page.goto(`${base}/ar/auth/reset-password`, { waitUntil: "networkidle2", timeout: 120000 });
      const newPass = `Qa-${Date.now()}-New`;
      await page.type("#reset-password", newPass);
      await page.type("#reset-confirm", newPass + "x");
      await page.evaluate(() => document.querySelector('form button[type="submit"]').click());
      await sleep(800);
      r.check("reset form rejects mismatched passwords", ((await page.evaluate(() => document.querySelector("#reset-error")?.textContent)) || "").includes("متطابقتين"));
      // Fresh form (clearing a React-controlled input is flaky in headless).
      await page.goto(`${base}/ar/auth/reset-password`, { waitUntil: "networkidle2", timeout: 120000 });
      await page.type("#reset-password", newPass);
      await page.type("#reset-confirm", newPass);
      await page.evaluate(() => document.querySelector('form button[type="submit"]').click());
      await sleep(3000);
      r.check(
        "reset form saves the new password",
        (await page.evaluate(() => document.body.innerText)).includes("اتغيّرت كلمة المرور"),
        await page.evaluate(() => document.querySelector("#reset-error")?.textContent || document.querySelector("main")?.innerText.slice(0, 160)),
      );
      await ctx.close();
      const oldTry = await login(browser, base, user.email, user.password);
      r.check("old password no longer works", !oldTry.page.url().includes("/account"));
      await oldTry.ctx.close();
      const newTry = await login(browser, base, user.email, newPass);
      r.check("new password signs in", newTry.page.url().includes("/ar/account"));
      await newTry.ctx.close();
    }

    // Guest order with the account's email joins the account on sign-in
    {
      await createQaProduct({ slug: SLUG, stock: 5 });
      const placed = await placeOrderUI(browser, base, { slug: SLUG, name: "Claim Qzv", email: user.email.toUpperCase() });
      if (placed.orderId) orders.push(placed.orderId);
      const note = (await placed.page.evaluate(() => document.body.innerText)).includes("اعمل حساب بنفس الإيميل");
      r.check("guest who gave an email is told how to see the order in an account", note);
      await placed.ctx.close();
      const { ctx, page } = await newPage(browser);
      await page.setCookie(...(await sessionCookies(user.email, base)));
      await page.goto(`${base}/ar/account`, { waitUntil: "networkidle2", timeout: 120000 });
      const { data: o } = await db.from("orders").select("order_number, user_id").eq("id", placed.orderId).single();
      r.check("guest order joins the account with the same confirmed email", o.user_id === user.id && (await page.evaluate(() => document.body.innerText)).includes(o.order_number));
      await ctx.close();
    }
  } catch (e) {
    r.check("auth suite crashed", false, String(e?.stack || e).slice(0, 300));
  } finally {
    for (const id of orders) await deleteOrder(id).catch(() => {});
    await deleteQaProduct(SLUG);
    if (user) await deleteQaUser(user.id);
  }
  return r.lines;
}
