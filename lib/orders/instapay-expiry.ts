import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { emailFrom, getResend } from "@/lib/email";

/**
 * InstaPay order-expiration sweep.
 *
 * An InstaPay order that never got paid (payment_status stays
 * 'pending') is cancelled after EXPIRATION_HOURS and its stock is
 * restored. ALL of the state work — eligibility check, status flip,
 * restock, ledger rows — happens inside the
 * `expire_unpaid_instapay_orders` Postgres function (migration 0014)
 * in a single transaction, so this module never has to reason about
 * partial failure: either an order fully expired + restocked, or
 * nothing happened.
 *
 * Called from two places:
 *   - /api/cron/expire-instapay  (Vercel Cron, CRON_SECRET-gated)
 *   - the /admin/orders page render (opportunistic sweep — Vercel
 *     Hobby crons fire at most daily, so the sweep also runs whenever
 *     Marco opens the orders list; it's idempotent and returns in one
 *     indexed query when there's nothing to do)
 *
 * Emails are best-effort AFTER the transaction commits: each order is
 * returned by the RPC exactly once ever (the transition run), so a
 * retryed sweep can't re-email anyone. A crash between commit and
 * send loses the notification, not data — acceptable.
 */

const DEFAULT_EXPIRATION_HOURS = 4;

/** Server-only knob: INSTAPAY_ORDER_EXPIRATION_HOURS (default 4, clamped 1..168). */
export function instapayExpirationHours(): number {
  const raw = Number(process.env.INSTAPAY_ORDER_EXPIRATION_HOURS);
  if (!Number.isFinite(raw)) return DEFAULT_EXPIRATION_HOURS;
  return Math.min(168, Math.max(1, Math.floor(raw)));
}

export type ExpirySweepResult = {
  ok: boolean;
  expired: Array<{ orderNumber: string; itemsRestocked: number }>;
  emailed: number;
  error?: string;
};

const BATCH_SIZE = 50;
const MAX_BATCHES = 10;
// Subtracted from the cutoff so a 1-hour expiry config can never trip
// the DB function's "cutoff must be ≥1h old" guard when the app clock
// runs a few seconds ahead of the database clock.
const CLOCK_SKEW_MARGIN_MS = 5 * 60_000;

export async function runInstapayExpirySweep(): Promise<ExpirySweepResult> {
  const admin = getSupabaseAdminClient();
  const hours = instapayExpirationHours();
  const cutoff = new Date(
    Date.now() - hours * 3600_000 - CLOCK_SKEW_MARGIN_MS,
  ).toISOString();

  // Drain in batches: one RPC call handles at most BATCH_SIZE orders,
  // and with a daily Hobby cron a backlog bigger than that would
  // otherwise take days to clear.
  const rows: Array<{
    expired_order_id: string;
    order_number: string;
    items_restocked: number;
  }> = [];
  for (let i = 0; i < MAX_BATCHES; i++) {
    const { data, error } = await admin.rpc("expire_unpaid_instapay_orders", {
      p_cutoff: cutoff,
      p_limit: BATCH_SIZE,
    });
    if (error) {
      return { ok: false, expired: [], emailed: 0, error: error.message };
    }
    const batch = (data ?? []) as typeof rows;
    rows.push(...batch);
    if (batch.length < BATCH_SIZE) break;
  }

  let emailed = 0;
  if (rows.length > 0) {
    emailed = await sendExpiryEmailsBestEffort(rows.map((r) => r.expired_order_id));
  }

  return {
    ok: true,
    expired: rows.map((r) => ({
      orderNumber: r.order_number,
      itemsRestocked: r.items_restocked,
    })),
    emailed,
  };
}

type AddressShape = { email?: string | null; name?: string | null };

async function sendExpiryEmailsBestEffort(orderIds: string[]): Promise<number> {
  if (!process.env.RESEND_API_KEY) return 0;

  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("orders")
    .select("order_number, guest_email, shipping_address, total")
    .in("id", orderIds);
  if (!data) return 0;

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+201229749608";
  let sent = 0;

  for (const order of data) {
    const address = (order.shipping_address ?? {}) as AddressShape;
    const to = order.guest_email?.trim() || address.email?.trim();
    if (!to) continue;

    try {
      const resend = getResend();
      await resend.emails.send({
        from: emailFrom(),
        to,
        subject: `انتهت مهلة دفع طلبك ${order.order_number} — M.M Bags`,
        html: buildExpiryEmailHtml({
          name: address.name?.trim() || null,
          orderNumber: order.order_number,
          whatsapp,
        }),
      });
      sent++;
    } catch (err) {
      console.warn(
        `[instapay-expiry] expiry email failed for ${order.order_number}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return sent;
}

// Customer-controlled strings (the checkout name field is only
// length-validated) must never reach the email HTML raw.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildExpiryEmailHtml(opts: {
  name: string | null;
  orderNumber: string;
  whatsapp: string;
}): string {
  const greeting = opts.name ? `أهلاً ${escapeHtml(opts.name)}،` : "أهلاً،";
  // Deliberately does NOT claim any refund happened — InstaPay
  // transfers can't be auto-refunded. If the customer transferred
  // after expiry it's a manual support case via WhatsApp.
  return `<!doctype html>
<html dir="rtl" lang="ar">
<body style="font-family: Tahoma, Arial, sans-serif; color: #1a1a1a; line-height: 1.7;">
  <p>${greeting}</p>
  <p>انتهت مهلة الدفع لطلبك رقم <strong dir="ltr">${opts.orderNumber}</strong> لأننا لم نستلم تحويل InstaPay خلال المدة المحددة، فتم إلغاء الطلب وإرجاع المنتجات للمخزون.</p>
  <p>لو لسه حابب تشتري، تقدر تعمل طلب جديد من الموقع في أي وقت.</p>
  <p><strong>مهم:</strong> لو كنت حوّلت المبلغ بالفعل، كلمنا فوراً على واتساب <span dir="ltr">${opts.whatsapp}</span> ومعاك صورة الإيصال وهنظبطها معاك.</p>
  <p style="color:#777; font-size: 13px;">M.M Bags — سوهاج، مصر</p>
</body>
</html>`;
}
