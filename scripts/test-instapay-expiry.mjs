// Integration tests for migration 0014 (expire_unpaid_instapay_orders)
// against the live Supabase project, using a hidden throwaway product.
// Creates everything it needs, asserts the 6 cases + ledger integrity,
// then deletes every row it created. Test orders are MM-TEST-* and the
// product is inactive + hidden from store, so nothing surfaces to
// customers even mid-run.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// ── env ──────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? `  — ${detail}` : ""}`); }
}
const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString();
const CUTOFF_4H = hoursAgo(4);

async function getStock(variantId) {
  const { data } = await admin.from("product_variants").select("stock_qty").eq("id", variantId).single();
  return data?.stock_qty;
}
async function getOrder(id) {
  const { data } = await admin.from("orders").select("status, payment_status").eq("id", id).single();
  return data;
}
async function expiryMovements(orderId) {
  const { data } = await admin
    .from("stock_movements")
    .select("id, qty_change, type, reference_type")
    .eq("reference_type", "instapay_expiry")
    .eq("reference_id", orderId);
  return data ?? [];
}
async function runSweep(cutoff = CUTOFF_4H) {
  const { data, error } = await admin.rpc("expire_unpaid_instapay_orders", {
    p_cutoff: cutoff,
    p_limit: 50,
  });
  if (error) throw new Error(`RPC failed: ${error.message}`);
  return data ?? [];
}

// ── fixtures ─────────────────────────────────────────────────────────
const created = { orders: [], variantId: null, productId: null };

async function makeTestProduct() {
  const { data: product, error: pErr } = await admin
    .from("products")
    .insert({
      name_ar: "منتج اختبار — لا تلمسه",
      name_en: "TEST PRODUCT instapay-expiry — do not touch",
      slug: `test-instapay-expiry-${Date.now()}`,
      base_price: 100,
      is_active: false,
      show_in_store: false,
    })
    .select("id")
    .single();
  if (pErr) throw new Error(`test product insert failed: ${pErr.message}`);
  created.productId = product.id;

  const { data: variant, error: vErr } = await admin
    .from("product_variants")
    .insert({
      product_id: product.id,
      color_ar: "أسود",
      color_en: "Black",
      stock_qty: 10,
    })
    .select("id")
    .single();
  if (vErr) throw new Error(`test variant insert failed: ${vErr.message}`);
  created.variantId = variant.id;
  return { productId: product.id, variantId: variant.id };
}

async function makeInstapayOrder({ qty, ageHours, paymentStatus = "pending", status = "pending" }) {
  const token = Math.random().toString(36).slice(2, 8).toUpperCase();
  const { data: order, error: oErr } = await admin
    .from("orders")
    .insert({
      order_number: `MM-TEST-${token}`,
      status,
      payment_method: "instapay",
      payment_status: paymentStatus,
      subtotal: 100 * qty,
      shipping_fee: 50,
      total: 100 * qty + 50,
      guest_phone: "01000000000",
      shipping_address: { name: "TEST", phone: "01000000000" },
    })
    .select("id, order_number")
    .single();
  if (oErr) throw new Error(`test order insert failed: ${oErr.message}`);
  created.orders.push(order.id);

  const { error: iErr } = await admin.from("order_items").insert({
    order_id: order.id,
    variant_id: created.variantId,
    product_id: created.productId,
    qty,
    unit_price: 100,
    snapshot_name: "TEST instapay-expiry",
  });
  if (iErr) throw new Error(`test order_items insert failed: ${iErr.message}`);

  // Deduct through the REAL sale path so the ledger mirrors production.
  const { error: dErr } = await admin.rpc("deduct_stock_atomic", {
    p_variant_id: created.variantId,
    p_qty: qty,
    p_reference_type: "online_sale",
    p_reference_id: order.id,
    p_created_by: null,
    p_movement_type: "online_sale",
  });
  if (dErr) throw new Error(`deduct failed: ${dErr.message}`);

  if (ageHours > 0) {
    const { error: uErr } = await admin
      .from("orders")
      .update({ created_at: hoursAgo(ageHours) })
      .eq("id", order.id);
    if (uErr) throw new Error(`backdate failed: ${uErr.message}`);
  }
  return order;
}

async function cleanup() {
  if (created.variantId) {
    await admin.from("stock_movements").delete().eq("variant_id", created.variantId);
  }
  for (const id of created.orders) {
    await admin.from("order_items").delete().eq("order_id", id);
    await admin.from("orders").delete().eq("id", id);
  }
  if (created.variantId) await admin.from("product_variants").delete().eq("id", created.variantId);
  if (created.productId) await admin.from("products").delete().eq("id", created.productId);
}

// ── tests ────────────────────────────────────────────────────────────
async function run() {
  console.log("Setting up hidden test product…");
  const { variantId } = await makeTestProduct();
  const initialStock = await getStock(variantId);
  check("setup: initial stock is 10", initialStock === 10);

  // ─ Case 1: recent pending order — must survive the sweep ─
  console.log("\n=== Case 1: recent pending (age <4h) ===");
  const recent = await makeInstapayOrder({ qty: 2, ageHours: 0 });
  await runSweep();
  let o = await getOrder(recent.id);
  check("stays pending", o.status === "pending" && o.payment_status === "pending");
  check("stock still deducted (8)", (await getStock(variantId)) === 8);
  check("no expiry ledger rows", (await expiryMovements(recent.id)).length === 0);

  // ─ Case 2: old pending order — must expire + restock once ─
  console.log("\n=== Case 2: old pending (age >4h) ===");
  const old = await makeInstapayOrder({ qty: 3, ageHours: 5 });
  check("after deduct stock is 5", (await getStock(variantId)) === 5);
  const expired1 = await runSweep();
  o = await getOrder(old.id);
  check("sweep reported exactly this order", expired1.length === 1 && expired1[0].expired_order_id === old.id);
  check("status → cancelled", o.status === "cancelled");
  check("payment_status → failed", o.payment_status === "failed");
  check("stock restored (8)", (await getStock(variantId)) === 8);
  const moves2 = await expiryMovements(old.id);
  check("exactly ONE expiry ledger row", moves2.length === 1);
  check("ledger row is +3 type=return", moves2[0]?.qty_change === 3 && moves2[0]?.type === "return");

  // ─ Case 3: old but already PAID — untouched ─
  console.log("\n=== Case 3: old but paid ===");
  const paid = await makeInstapayOrder({ qty: 1, ageHours: 6, paymentStatus: "paid", status: "confirmed" });
  const stockBeforePaidSweep = await getStock(variantId);
  const expired3 = await runSweep();
  o = await getOrder(paid.id);
  check("sweep returned nothing", expired3.length === 0);
  check("stays paid/confirmed", o.status === "confirmed" && o.payment_status === "paid");
  check("stock unchanged", (await getStock(variantId)) === stockBeforePaidSweep);
  check("no expiry ledger rows", (await expiryMovements(paid.id)).length === 0);

  // ─ Case 4: already expired — no duplicate op ─
  console.log("\n=== Case 4: already expired order re-swept ===");
  const expired4 = await runSweep();
  check("old order not re-processed", !expired4.some((r) => r.expired_order_id === old.id));
  check("still exactly ONE expiry ledger row", (await expiryMovements(old.id)).length === 1);
  check("stock NOT double-restored", (await getStock(variantId)) === stockBeforePaidSweep);

  // ─ Case 5: sweep twice back-to-back on a fresh expirable order ─
  console.log("\n=== Case 5: cron retry (sweep twice) ===");
  const retry = await makeInstapayOrder({ qty: 2, ageHours: 5 });
  const s1 = await runSweep();
  const s2 = await runSweep();
  check("first sweep expired it", s1.some((r) => r.expired_order_id === retry.id));
  check("second sweep returned nothing for it", !s2.some((r) => r.expired_order_id === retry.id));
  check("exactly ONE expiry ledger row", (await expiryMovements(retry.id)).length === 1);

  // ─ Case 6: admin-confirm vs expire, both orders of operations ─
  console.log("\n=== Case 6: confirm-vs-expire race (both orderings) ===");
  // 6a: admin confirms FIRST (same conditional update markInstapayPaid runs)
  const race6a = await makeInstapayOrder({ qty: 1, ageHours: 5 });
  const { data: confirmRows } = await admin
    .from("orders")
    .update({ payment_status: "paid", status: "confirmed" })
    .eq("id", race6a.id)
    .eq("payment_status", "pending")
    .select("id");
  check("6a admin confirm succeeded", (confirmRows ?? []).length === 1);
  await runSweep();
  o = await getOrder(race6a.id);
  check("6a paid order NOT expired afterwards", o.payment_status === "paid" && o.status === "confirmed");
  check("6a no restock", (await expiryMovements(race6a.id)).length === 0);

  // 6b: sweep expires FIRST, then admin tries to confirm
  const race6b = await makeInstapayOrder({ qty: 1, ageHours: 5 });
  await runSweep();
  const { data: lateConfirm } = await admin
    .from("orders")
    .update({ payment_status: "paid", status: "confirmed" })
    .eq("id", race6b.id)
    .eq("payment_status", "pending")
    .select("id");
  o = await getOrder(race6b.id);
  check("6b late confirm matched 0 rows", (lateConfirm ?? []).length === 0);
  check("6b order stays expired", o.payment_status === "failed" && o.status === "cancelled");

  // ─ Case 7: admin manually confirmed WITHOUT payment — sweep must not override ─
  console.log("\n=== Case 7: confirmed-but-unpaid order (admin decision) ===");
  const manual = await makeInstapayOrder({ qty: 1, ageHours: 6, paymentStatus: "pending", status: "confirmed" });
  const s7 = await runSweep();
  o = await getOrder(manual.id);
  check("7 sweep skipped it", !s7.some((r) => r.expired_order_id === manual.id));
  check("7 stays confirmed + payment pending", o.status === "confirmed" && o.payment_status === "pending");
  check("7 no restock", (await expiryMovements(manual.id)).length === 0);

  // ─ Guard: cutoff sanity check in the function itself ─
  console.log("\n=== Guard: too-recent cutoff refused ===");
  const { error: guardErr } = await admin.rpc("expire_unpaid_instapay_orders", {
    p_cutoff: new Date().toISOString(),
    p_limit: 50,
  });
  check("cutoff=now() raises", !!guardErr && /too recent/.test(guardErr.message));

  // ─ Part 16: inventory integrity vs the ledger ─
  console.log("\n=== Inventory integrity ===");
  const finalStock = await getStock(variantId);
  const { data: allMoves } = await admin
    .from("stock_movements")
    .select("qty_change")
    .eq("variant_id", variantId);
  const ledgerSum = (allMoves ?? []).reduce((s, m) => s + m.qty_change, 0);
  check(
    `final stock (${finalStock}) === initial (10) + ledger sum (${ledgerSum})`,
    finalStock === 10 + ledgerSum,
  );
  // Expected by hand: deducts −(2+3+1+2+1+1+1)=−11; restocks: old(+3), retry(+2), 6b(+1)=+6 → sum −5 → stock 5.
  check("ledger sum is exactly -5 (deducts -11, restocks +6)", ledgerSum === -5);
  check("final stock is exactly 5", finalStock === 5);

  console.log(`\n${pass} passed, ${fail} failed`);
  return fail === 0;
}

let ok = false;
try {
  ok = await run();
} catch (err) {
  console.error("\nFATAL:", err.message);
} finally {
  console.log("\nCleaning up test rows…");
  try {
    await cleanup();
    console.log("Cleanup done.");
  } catch (err) {
    console.error("CLEANUP FAILED — manual cleanup needed:", err.message, JSON.stringify(created));
  }
}
process.exit(ok ? 0 : 1);
