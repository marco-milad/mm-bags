// Submit every URL in the live sitemap to IndexNow (Bing, Yandex, Seznam…).
//
//   node scripts/seo/indexnow-submit-all.mjs [siteUrl]
//
// Use after a big change (launch, domain move, bulk price update). Day-to-day
// product edits are pinged automatically (lib/seo/indexnow-submit.ts).
// The key file /<key>.txt must already be live on the site.
const KEY = "982bd34cf276206982cb753940f98d49"; // keep in sync with lib/seo/indexnow.ts
const site = (process.argv[2] || "https://mm-bags.vercel.app").replace(/\/+$/, "");
const host = new URL(site).host;

const keyRes = await fetch(`${site}/${KEY}.txt`);
const keyBody = (await keyRes.text()).trim();
if (!keyRes.ok || keyBody !== KEY) {
  console.error(`Key file not live at ${site}/${KEY}.txt (status ${keyRes.status}). Deploy first.`);
  process.exit(1);
}

const xml = await (await fetch(`${site}/sitemap.xml`)).text();
const urls = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]))].filter(
  (u) => new URL(u).host === host,
);
if (!urls.length) {
  console.error("No URLs found in the sitemap.");
  process.exit(1);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key: KEY, keyLocation: `${site}/${KEY}.txt`, urlList: urls.slice(0, 10000) }),
});
console.log(`IndexNow: submitted ${Math.min(urls.length, 10000)} URL(s) for ${host} → HTTP ${res.status} ${res.statusText}`);
console.log(res.status === 200 || res.status === 202 ? "Accepted." : await res.text());
