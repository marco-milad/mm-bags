// Integration tests for the business-hours InstaPay expiry (migration
// 0015) against the live Supabase project.
//
// Part A — deadline math: calls cairo_business_deadline directly with
//   crafted timestamps and asserts the returned instant formats to the
//   expected Africa/Cairo local time (Intl does the DST work — no
//   hand-rolled offsets in assertions).
// Part B — sweep flow: hidden throwaway product + MM-TEST-* orders,
//   same strategy as before. These tests require the CURRENT time to
//   be inside Cairo business hours (11:00–22:00) because the sweep
//   correctly refuses to expire anything off-hours; when run at night
//   they are SKIPPED loudly (the off-hours no-op itself is asserted).
// Cleans up everything it creates.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let pass = 0, fail = 0, skipped = 0;
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? `  — ${detail}` : ""}`); }
}

// ── Cairo time helpers (Intl-backed, DST-proof) ─────────────────────
const cairoFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Cairo",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
/** UTC instant → "YYYY-MM-DD HH:MM" in Cairo local time. */
function toCairoLocal(isoOrDate) {
  const parts = Object.fromEntries(
    cairoFmt.formatToParts(new Date(isoOrDate)).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}
/** Cairo local "YYYY-MM-DD" + "HH:MM" → UTC ISO instant. */
function cairoToUtc(dateStr, timeStr) {
  for (const off of ["+02:00", "+03:00"]) {
    const candidate = new Date(`${dateStr}T${timeStr}:00${off}`);
    if (toCairoLocal(candidate) === `${dateStr} ${timeStr}`) return candidate.toISOString();
  }
  throw new Error(`cannot map Cairo local ${dateStr} ${timeStr} to UTC`);
}
function cairoNowHour() {
  const [, hm] = toCairoLocal(new Date()).split(" ");
  return Number(hm.split(":")[0]) + Number(hm.split(":")[1]) / 60;
}
const inBusinessHoursNow = () => cairoNowHour() >= 11 && cairoNowHour() < 22;

async function deadline(startIso, businessSeconds = 7200) {
  const { data, error } = await admin.rpc("cairo_business_deadline", {
    p_start: startIso,
    p_business_seconds: businessSeconds,
  });
  if (error) throw new Error(`cairo_business_deadline failed: ${error.message}`);
  return data;
}

async function runSweep() {
  const { data, error } = await admin.rpc("expire_unpaid_instapay_orders", {
    p_business_seconds: 7200,
    p_limit: 50,
  });
  if (error) throw new Error(`sweep RPC failed: ${error.message}`);
  return data ?? [];
}

// ── Part A: deadline math ───────────────────────────────────────────
async function deadlineTests() {
  console.log("=== Part A: cairo_business_deadline (2 business hours) ===");
  // Mon 2026-08-24 — plain summer (DST, +03) week, no transition nearby.
  const CASES = [
    ["spec 1: created Mon 12:00 → Mon 14:00", "2026-08-24", "12:00", "2026-08-24 14:00"],
    ["spec 2: created Mon 21:00 → Tue 12:00", "2026-08-24", "21:00", "2026-08-25 12:00"],
    ["spec 3: created Mon 22:00 sharp → Tue 13:00", "2026-08-24", "22:00", "2026-08-25 13:00"],
    ["spec 4: created Mon 22:30 → Tue 13:00", "2026-08-24", "22:30", "2026-08-25 13:00"],
    ["spec 5: created Mon 08:00 (before open) → Mon 13:00", "2026-08-24", "08:00", "2026-08-24 13:00"],
    ["spec 6: created Mon 21:30 → Tue 12:30", "2026-08-24", "21:30", "2026-08-25 12:30"],
    ["spec 7: created Mon 11:00 sharp → Mon 13:00", "2026-08-24", "11:00", "2026-08-24 13:00"],
    ["boundary: created Mon 20:00 → deadline exactly Mon 22:00", "2026-08-24", "20:00", "2026-08-24 22:00"],
    ["overnight creation Mon 00:30 → Mon 13:00", "2026-08-24", "00:30", "2026-08-24 13:00"],
    // DST spring-forward: Egypt DST starts Fri 2026-04-24 00:00 (+02 → +03).
    ["DST spring: Thu Apr-23 21:30 (+02) → Fri Apr-24 12:30 (+03)", "2026-04-23", "21:30", "2026-04-24 12:30"],
    // DST fall-back: Egypt DST ends after Thu 2026-10-29 (Fri 00:00 → 23:00, +03 → +02).
    ["DST fall: Thu Oct-29 21:30 (+03) → Fri Oct-30 12:30 (+02)", "2026-10-29", "21:30", "2026-10-30 12:30"],
  ];
  for (const [name, d, t, expected] of CASES) {
    const got = toCairoLocal(await deadline(cairoToUtc(d, t)));
    check(name, got === expected, `got ${got}`);
  }

  // TTL guard: below 1 business hour must raise
  const { error: guardErr } = await admin.rpc("expire_unpaid_instapay_orders", {
    p_business_seconds: 600,
    p_limit: 50,
  });
  check("guard: p_business_seconds < 3600 raises", !!guardErr && /3600/.test(guardErr.message));

  // is_cairo_business_hours agrees with JS Intl right now
  const { data: dbSaysBH, error: bhErr } = await admin.rpc("is_cairo_business_hours", {
    p_at: new Date().toISOString(),
  });
  check(
    "is_cairo_business_hours(now) matches Intl computation",
    !bhErr && dbSaysBH === inBusinessHoursNow(),
    bhErr ? bhErr.message : `db=${dbSaysBH} intl=${inBusinessHoursNow()}`,
  );
}

// ── Part B: sweep flow (hidden test product) ────────────────────────
const created = { orders: [], variantId: null, productId: null };
const hoursAgoIso = (h) => new Date(Date.now() - h * 3600_000).toISOString();

async function makeTestProduct() {
  const { data: product, error: pErr } = await admin.from("products").insert({
    name_ar: "منتج اختبار — لا تلمسه",
    name_en: "TEST PRODUCT instapay-expiry — do not touch",
    slug: `test-instapay-expiry-${Date.now()}`,
    base_price: 100, is_active: false, show_in_store: false,
  }).select("id").single();
  if (pErr) throw new Error(pErr.message);
  created.productId = product.id;
  const { data: variant, error: vErr } = await admin.from("product_variants").insert({
    product_id: product.id, color_ar: "أسود", color_en: "Black", stock_qty: 10,
  }).select("id").single();
  if (vErr) throw new Error(vErr.message);
  created.variantId = variant.id;
}

async function makeInstapayOrder({ qty, ageHours, paymentStatus = "pending", status = "pending" }) {
  const token = Math.random().toString(36).slice(2, 8).toUpperCase();
  const { data: order, error: oErr } = await admin.from("orders").insert({
    order_number: `MM-TEST-${token}`, status, payment_method: "instapay",
    payment_status: paymentStatus, subtotal: 100 * qty, shipping_fee: 50,
    total: 100 * qty + 50, guest_phone: "01000000000",
    shipping_address: { name: "TEST", phone: "01000000000" },
  }).select("id, order_number").single();
  if (oErr) throw new Error(oErr.message);
  created.orders.push(order.id);
  const { error: iErr } = await admin.from("order_items").insert({
    order_id: order.id, variant_id: created.variantId, product_id: created.productId,
    qty, unit_price: 100, snapshot_name: "TEST instapay-expiry",
  });
  if (iErr) throw new Error(iErr.message);
  const { error: dErr } = await admin.rpc("deduct_stock_atomic", {
    p_variant_id: created.variantId, p_qty: qty, p_reference_type: "online_sale",
    p_reference_id: order.id, p_created_by: null, p_movement_type: "online_sale",
  });
  if (dErr) throw new Error(dErr.message);
  if (ageHours > 0) {
    await admin.from("orders").update({ created_at: hoursAgoIso(ageHours) }).eq("id", order.id);
  }
  return order;
}

const getStock = async () =>
  (await admin.from("product_variants").select("stock_qty").eq("id", created.variantId).single()).data?.stock_qty;
const getOrder = async (id) =>
  (await admin.from("orders").select("status, payment_status").eq("id", id).single()).data;
const expiryMoves = async (orderId) =>
  (await admin.from("stock_movements").select("id, qty_change, type")
    .eq("reference_type", "instapay_expiry").eq("reference_id", orderId)).data ?? [];

async function flowTests() {
  console.log("\n=== Part B: sweep flow ===");
  if (!inBusinessHoursNow()) {
    // Off-hours: prove the gate blocks a GENUINELY eligible order —
    // create a 72h-old fixture first so the no-op assertion isn't
    // vacuous, then clean it up.
    await makeTestProduct();
    const eligible = await makeInstapayOrder({ qty: 1, ageHours: 72 });
    const res = await runSweep();
    const o = await getOrder(eligible.id);
    check(
      "off-hours: sweep refuses a genuinely eligible order",
      res.length === 0 && o.status === "pending" && (await expiryMoves(eligible.id)).length === 0,
    );
    skipped++;
    console.log("  SKIP  remaining flow tests need Cairo business hours (11:00–22:00) — rerun during the day.");
    return;
  }
  if (cairoNowHour() >= 21.4) {
    // Too close to 22:00 — the DB gate re-evaluates on every RPC, so a
    // suite that straddles closing would fail confusingly mid-run.
    skipped++;
    console.log("  SKIP  under 40 minutes to closing — rerun earlier in the business day.");
    return;
  }

  await makeTestProduct();
  check("setup: initial stock 10", (await getStock()) === 10);

  // Case: recent order (deadline not reached) survives
  const recent = await makeInstapayOrder({ qty: 2, ageHours: 0 });
  await runSweep();
  let o = await getOrder(recent.id);
  check("recent order stays pending", o.status === "pending" && o.payment_status === "pending");
  check("recent order stock still held (8)", (await getStock()) === 8);

  // Case: old order (3 days back — deadline long past) expires exactly once
  const old = await makeInstapayOrder({ qty: 3, ageHours: 72 });
  const s1 = await runSweep();
  o = await getOrder(old.id);
  check("old order expired", s1.some((r) => r.expired_order_id === old.id));
  check("→ cancelled + failed", o.status === "cancelled" && o.payment_status === "failed");
  check("→ stock restored (8)", (await getStock()) === 8);
  const m1 = await expiryMoves(old.id);
  check("→ exactly ONE ledger row (+3, return)", m1.length === 1 && m1[0].qty_change === 3 && m1[0].type === "return");

  // Case: paid order immune
  const paid = await makeInstapayOrder({ qty: 1, ageHours: 72, paymentStatus: "paid", status: "confirmed" });
  const stockBefore = await getStock();
  const s2 = await runSweep();
  o = await getOrder(paid.id);
  check("paid order untouched", s2.length === 0 && o.payment_status === "paid" && (await getStock()) === stockBefore);

  // Case: double-run idempotency
  const retry = await makeInstapayOrder({ qty: 2, ageHours: 72 });
  const r1 = await runSweep();
  const r2 = await runSweep();
  check("double-run: expired exactly once", r1.some((r) => r.expired_order_id === retry.id) && !r2.some((r) => r.expired_order_id === retry.id));
  check("double-run: ONE ledger row", (await expiryMoves(retry.id)).length === 1);

  // Case: confirm-vs-expire, both orderings
  const a = await makeInstapayOrder({ qty: 1, ageHours: 72 });
  const { data: confirmed } = await admin.from("orders")
    .update({ payment_status: "paid", status: "confirmed" })
    .eq("id", a.id).eq("payment_status", "pending").neq("status", "cancelled").select("id");
  check("race 6a: admin confirm won", (confirmed ?? []).length === 1);
  await runSweep();
  o = await getOrder(a.id);
  check("race 6a: paid order not expired after", o.payment_status === "paid");

  const b = await makeInstapayOrder({ qty: 1, ageHours: 72 });
  await runSweep();
  const { data: late } = await admin.from("orders")
    .update({ payment_status: "paid", status: "confirmed" })
    .eq("id", b.id).eq("payment_status", "pending").neq("status", "cancelled").select("id");
  o = await getOrder(b.id);
  check("race 6b: late confirm matched 0 rows; stays expired", (late ?? []).length === 0 && o.payment_status === "failed");

  // Case: admin manually confirmed WITHOUT payment — sweep must skip
  const manual = await makeInstapayOrder({ qty: 1, ageHours: 72, status: "confirmed" });
  const s7 = await runSweep();
  o = await getOrder(manual.id);
  check("confirmed-unpaid order skipped by sweep", !s7.some((r) => r.expired_order_id === manual.id) && o.status === "confirmed");

  // ── Discriminator: business-hours vs wall-clock AT THE SWEEP LEVEL ─
  // Fixture backdated to YESTERDAY at (current Cairo time + 30 min):
  // business time elapsed since then is a constant 10.5h regardless of
  // when the suite runs (yesterday's tail + today's 11:00→now), while
  // wall-clock age is ~23.5h. With an 11-business-hour TTL (39600s)
  // the order must SURVIVE — under any wall-clock regression of the
  // sweep WHERE it would expire. Then backdating one more hour pushes
  // business-elapsed to 11.5h and the same sweep must EXPIRE it.
  {
    const nowLocal = toCairoLocal(new Date());          // "YYYY-MM-DD HH:MM"
    const [today, hm] = nowLocal.split(" ");
    const yesterday = new Date(new Date(`${today}T12:00:00Z`).getTime() - 86400_000)
      .toISOString().slice(0, 10);
    const createdIso = cairoToUtc(yesterday, hm.replace(/^(\d{2}):(\d{2})$/, (_, h, m) => {
      const t = Number(h) * 60 + Number(m) + 30;        // +30 min
      return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    }));
    const disc = await makeInstapayOrder({ qty: 1, ageHours: 0 });
    await admin.from("orders").update({ created_at: createdIso }).eq("id", disc.id);

    const sweep11h = async () => {
      const { data, error } = await admin.rpc("expire_unpaid_instapay_orders", {
        p_business_seconds: 39600, p_limit: 50,
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    };
    const d1 = await sweep11h();
    let od = await getOrder(disc.id);
    check(
      "discriminator: 10.5 business hours < 11h TTL → SURVIVES (wall age ~23.5h)",
      !d1.some((r) => r.expired_order_id === disc.id) && od.status === "pending",
    );
    // one more hour back → 11.5 business hours elapsed → must expire
    const olderIso = new Date(new Date(createdIso).getTime() - 3600_000).toISOString();
    await admin.from("orders").update({ created_at: olderIso }).eq("id", disc.id);
    const d2 = await sweep11h();
    od = await getOrder(disc.id);
    check(
      "discriminator: 11.5 business hours > 11h TTL → EXPIRES + restocks",
      d2.some((r) => r.expired_order_id === disc.id) && od.status === "cancelled",
    );
    check("discriminator: ONE ledger row", (await expiryMoves(disc.id)).length === 1);
  }

  // Inventory integrity: final = initial + Σledger
  const finalStock = await getStock();
  const { data: allMoves } = await admin.from("stock_movements").select("qty_change").eq("variant_id", created.variantId);
  const sum = (allMoves ?? []).reduce((s, m) => s + m.qty_change, 0);
  check(`integrity: final (${finalStock}) === 10 + Σledger (${sum})`, finalStock === 10 + sum);
  // deducts −(2+3+1+2+1+1+1)=−11; restocks old+retry+b = +3+2+1 = +6 → −5 → 5
  check("integrity: Σledger === -5, final === 5", sum === -5 && finalStock === 5);
}

async function cleanup() {
  if (created.variantId) await admin.from("stock_movements").delete().eq("variant_id", created.variantId);
  for (const id of created.orders) {
    await admin.from("order_items").delete().eq("order_id", id);
    await admin.from("orders").delete().eq("id", id);
  }
  if (created.variantId) await admin.from("product_variants").delete().eq("id", created.variantId);
  if (created.productId) await admin.from("products").delete().eq("id", created.productId);
}

let ok = false;
try {
  await deadlineTests();
  await flowTests();
  ok = fail === 0;
} catch (err) {
  console.error("\nFATAL:", err.message);
} finally {
  console.log("\nCleaning up…");
  try { await cleanup(); console.log("Cleanup done."); }
  catch (err) { console.error("CLEANUP FAILED:", err.message, JSON.stringify(created)); }
}
console.log(`\n${pass} passed, ${fail} failed${skipped ? `, flow tests skipped (off-hours)` : ""}`);
process.exit(ok ? 0 : 1);
