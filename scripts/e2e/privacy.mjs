// Privacy promises of the analytics (migration 0030), checked in a real browser:
//   - no answer / "No thanks" → no analytics cookies or storage, visits counted
//     anonymously and linked only within one tab;
//   - opt-out cookie and the GPC signal stop even the anonymous count;
//   - "Accept" → the usual consented tracking.
// Works on its own rows (deleted at the end).
import { db, newPage, reporter, sleep } from "./lib.mjs";

const ANALYTICS_COOKIES = ["mm_vid", "mm_sid"];

/**
 * The suite deletes ONLY its own rows (real visitors may be writing to the
 * same tables): every anonymous beacon our pages send is captured here so
 * its visit key can be cleaned up afterwards.
 */
const ourVisitKeys = new Set();
const ourVisitorIds = new Set();
async function captureBeacons(page) {
  // A beacon sent while the page unloads never shows up as a Puppeteer
  // request, so read the key inside the page, before it leaves.
  await page.exposeFunction("__qaVisitKey", (k) => ourVisitKeys.add(k));
  await page.evaluateOnNewDocument(() => {
    const grab = (url, body) => {
      try {
        if (String(url).includes("/api/events/anon")) {
          const k = JSON.parse(String(body)).visitKey;
          if (k) window.__qaVisitKey(k);
        }
      } catch {
        /* not ours to parse */
      }
    };
    const beacon = navigator.sendBeacon?.bind(navigator);
    if (beacon) navigator.sendBeacon = (url, body) => (grab(url, body), beacon(url, body));
    const f = window.fetch.bind(window);
    window.fetch = (url, init) => (grab(url, init?.body), f(url, init));
  });
}

async function anonRowsSince(since, extra = (q) => q) {
  const { data } = await extra(
    db.from("analytics_anon_events").select("id, name, visit_key, path, occurred_at").gte("occurred_at", since).order("occurred_at"),
  );
  return data ?? [];
}

export async function run(browser, base) {
  const r = reporter("privacy");
  const since = new Date(Date.now() - 5_000).toISOString();
  try {
    const { error: tableErr } = await db.from("analytics_anon_events").select("id").limit(1);
    if (tableErr) {
      r.check("migration 0030 applied", false, tableErr.message);
      return r.lines;
    }

    // ── 1) Never answers the banner ────────────────────────────────────
    {
      const { ctx, page } = await newPage(browser);
      await captureBeacons(page);
      const before = await page.evaluate(() => Object.keys(localStorage)).catch(() => []);
      await page.goto(`${base}/ar`, { waitUntil: "networkidle2", timeout: 120000 });
      // Hide the tab (as when the shopper switches apps) so the queue flushes
      // while the page is alive and the suite can see its visit key.
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await sleep(1500);
      await page.goto(`${base}/ar/guides`, { waitUntil: "networkidle2", timeout: 120000 }); // full load = new tab memory
      // client-side navigation inside the same tab keeps the in-memory visit key
      await page.evaluate(() => document.querySelector('a[href="/ar/guides/luggage-size-guide"]')?.click());
      await sleep(3000);
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await sleep(4000);
      const cookies = (await page.cookies()).map((c) => c.name);
      r.check("no answer: no analytics id cookies", !cookies.some((c) => ANALYTICS_COOKIES.includes(c)), cookies.join(","));
      const storage = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
      const added = storage.filter((k) => !before.includes(k) && !/^mm-(cart|wishlist|size-guide|auth)/.test(k));
      r.check("no answer: nothing analytics-related in local/session storage", added.length === 0, added.join(","));
      const rows = (await anonRowsSince(since, (q) => q.eq("name", "page_view").like("path", "/ar%"))).filter((x) =>
        ourVisitKeys.has(x.visit_key),
      );
      const guideVisit = rows.filter((x) => x.path === "/ar/guides" || x.path === "/ar/guides/luggage-size-guide");
      r.check("no answer: page views counted anonymously", rows.length >= 2, `${rows.length} rows`);
      r.check(
        "client-side navigation stays one visit (same in-memory key)",
        guideVisit.length === 2 && guideVisit[0].visit_key === guideVisit[1].visit_key,
        JSON.stringify(guideVisit.map((g) => g.path)),
      );
      const keys = new Set(rows.map((x) => x.visit_key));
      r.check("a full page load starts a new, unlinkable visit", keys.size >= 2, `${keys.size} keys`);
      await ctx.close();
    }

    // ── 2) "No thanks" ─────────────────────────────────────────────────
    {
      const t0 = new Date().toISOString();
      const { ctx, page } = await newPage(browser);
      await captureBeacons(page);
      await page.goto(`${base}/ar/faq`, { waitUntil: "networkidle2", timeout: 120000 });
      await sleep(1500);
      await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("لا شكرًا"))?.click());
      await sleep(3000);
      const rows = (await anonRowsSince(t0)).filter((x) => ourVisitKeys.has(x.visit_key));
      r.check("declining is counted (anonymously) for the acceptance rate", rows.some((x) => x.name === "consent_rejected"));
      const cookies = (await page.cookies()).map((c) => c.name);
      r.check("declined: no analytics id cookies", !cookies.some((c) => ANALYTICS_COOKIES.includes(c)), cookies.join(","));
      await ctx.close();
    }

    // ── 3) Global Privacy Control in the browser → not even counted ───
    {
      const { ctx, page } = await newPage(browser);
      let beacons = 0;
      page.on("request", (req) => {
        if (req.url().includes("/api/events")) beacons++;
      });
      await page.evaluateOnNewDocument(() => Object.defineProperty(navigator, "globalPrivacyControl", { get: () => true }));
      await page.goto(`${base}/ar/contact`, { waitUntil: "networkidle2", timeout: 120000 });
      await sleep(7000);
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await sleep(1500);
      r.check("GPC browser: nothing is sent at all", beacons === 0, `${beacons} requests`);
      await ctx.close();
    }

    // ── 4) Server-side guards on the anonymous endpoint ────────────────
    {
      const visitKey = crypto.randomUUID();
      ourVisitKeys.add(visitKey);
      const send = (headers) =>
        fetch(`${base}/api/events/anon`, {
          method: "POST",
          headers: { "content-type": "text/plain", "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/130", ...headers },
          body: JSON.stringify({ visitKey, events: [{ id: crypto.randomUUID(), name: "page_view", path: "/ar/zz-qa-privacy" }] }),
        });
      await send({ "sec-gpc": "1" });
      await send({ cookie: "mm_optout=1" });
      await send({ "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" });
      await sleep(1500);
      let rows = await anonRowsSince(since, (q) => q.eq("visit_key", visitKey));
      r.check("endpoint drops Sec-GPC, opt-out cookie and bots", rows.length === 0, `${rows.length} rows`);
      const bad = await fetch(`${base}/api/events/anon`, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify({ visitKey, events: [{ id: crypto.randomUUID(), name: "page_view", searchId: crypto.randomUUID() }] }),
      });
      await send({});
      await sleep(1500);
      rows = await anonRowsSince(since, (q) => q.eq("visit_key", visitKey));
      r.check("unknown fields (e.g. a search id) are refused; a clean event is stored", bad.status === 204 && rows.length === 1, `${rows.length} rows`);
      const res = await send({});
      r.check("endpoint never sets a cookie", !res.headers.get("set-cookie"));
    }

    // ── 5) "Accept" → normal consented tracking ────────────────────────
    {
      const t0 = new Date().toISOString();
      const { ctx, page } = await newPage(browser);
      await captureBeacons(page);
      await page.goto(`${base}/ar/about`, { waitUntil: "networkidle2", timeout: 120000 });
      await sleep(1500);
      await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "موافق")?.click());
      await sleep(2500);
      await page.goto(`${base}/ar/categories`, { waitUntil: "networkidle2", timeout: 120000 });
      await sleep(6500);
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await sleep(3000);
      const jar = await page.cookies();
      const cookies = jar.map((c) => c.name);
      const vid = jar.find((c) => c.name === "mm_vid")?.value;
      if (vid) ourVisitorIds.add(vid);
      r.check("accepted: analytics id cookies are set", ANALYTICS_COOKIES.every((c) => cookies.includes(c)), cookies.join(","));
      const anon = (await anonRowsSince(t0)).filter((x) => ourVisitKeys.has(x.visit_key));
      r.check("accepting is counted for the acceptance rate", anon.some((x) => x.name === "consent_accepted"));
      const { data: tracked } = await db
        .from("analytics_events")
        .select("id")
        .eq("visitor_id", vid ?? "none")
        .eq("path", "/ar/categories");
      r.check("accepted: pages go to the consented event log", (tracked?.length ?? 0) >= 1, `${tracked?.length ?? 0} rows`);
      const anonAfter = anon.filter((x) => x.path === "/ar/categories" && x.name === "page_view" && ourVisitKeys.has(x.visit_key));
      r.check("accepted: not double-counted as anonymous", anonAfter.length === 0);
      await ctx.close();
    }
  } catch (e) {
    r.check("privacy suite crashed", false, e?.stack?.split("\n").slice(0, 3).join("\n") ?? String(e));
  } finally {
    // Only our own rows: captured visit keys, and the consented test visitor.
    if (ourVisitKeys.size) await db.from("analytics_anon_events").delete().in("visit_key", [...ourVisitKeys]);
    for (const vid of ourVisitorIds) {
      await db.from("analytics_events").delete().eq("visitor_id", vid);
      await db.from("analytics_visitors").delete().eq("id", vid);
    }
  }
  return r.lines;
}
