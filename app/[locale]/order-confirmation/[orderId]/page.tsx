import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, MessageCircle, Package, XCircle } from "lucide-react";
import { hasLocale } from "@/lib/i18n-config";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatPriceEGP } from "@/lib/utils";
import { InstapayInstructions } from "@/components/order/InstapayInstructions";

// InstaPay handle read from env so Marco can edit it without a code
// change. NO fallback: a fake placeholder handle would send customers'
// bank apps to a dead recipient. When unset, InstapayInstructions
// renders without the handle row and points the customer to WhatsApp
// for transfer details (checkout also hides the InstaPay option, so
// this only matters for orders placed before a misconfigured deploy).
const INSTAPAY_HANDLE =
  process.env.NEXT_PUBLIC_INSTAPAY_HANDLE?.trim() || null;

// App-generated share link (ipn.eg is InstaPay's verified Universal /
// App Link domain — a real anchor tap opens the app with the recipient
// prefilled). We only accept links on that domain: the trailing code is
// opaque and app-generated, so anything else in this var is a config
// mistake we refuse to ship to customers.
function instapayShareLink(): string | null {
  const raw = process.env.NEXT_PUBLIC_INSTAPAY_SHARE_LINK?.trim();
  if (!raw) return null;
  if (!/^https:\/\/ipn\.eg\//i.test(raw)) {
    console.warn(
      "[order-confirmation] NEXT_PUBLIC_INSTAPAY_SHARE_LINK is set but is not an https://ipn.eg/ link — ignoring it.",
    );
    return null;
  }
  return raw;
}

// QR of the share link, rendered server-side into a data URL so the
// client bundle never ships the qrcode library. Encodes EXACTLY the
// configured link — no amount, no order id, no invented parameters.
async function shareLinkQrDataUrl(link: string): Promise<string | null> {
  try {
    const QRCode = (await import("qrcode")).default;
    return await QRCode.toDataURL(link, { margin: 1, width: 220 });
  } catch (err) {
    console.warn(
      "[order-confirmation] QR generation failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Order confirmed",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ShippingAddressShape = {
  name?: string;
  phone?: string;
  governorate?: string;
  city?: string;
};

export default async function OrderConfirmationPage({
  params,
}: PageProps<"/[locale]/order-confirmation/[orderId]">) {
  const { locale, orderId } = await params;
  if (!hasLocale(locale)) notFound();
  if (!UUID_RE.test(orderId)) notFound();

  const admin = getSupabaseAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "id, order_number, status, payment_method, payment_status, subtotal, shipping_fee, total, shipping_address, created_at, order_items (qty, unit_price, snapshot_name)",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();

  const address = (order.shipping_address as ShippingAddressShape) ?? {};
  const phoneDigits = address.phone?.replace(/[^\d]/g, "") ?? "";
  const whatsappNumber = (
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+201229749608"
  ).replace(/[^\d]/g, "");
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    locale === "ar"
      ? `أهلاً، عندي استفسار عن طلبي رقم ${order.order_number}.`
      : `Hi, I have a question about order ${order.order_number}.`,
  )}`;

  const isInstapay = order.payment_method === "instapay";
  // Any cancelled InstaPay order gets the "window closed" treatment —
  // whether the expiry sweep cancelled it (payment_status='failed') or
  // an admin cancelled it manually (payment_status may still be
  // 'pending'). Either way, showing transfer instructions on a
  // cancelled order would invite the customer to pay for nothing.
  const paymentExpired = isInstapay && order.status === "cancelled";
  const awaitingPayment =
    isInstapay && order.payment_status === "pending" && !paymentExpired;
  if (awaitingPayment && !INSTAPAY_HANDLE) {
    console.warn(
      `[order-confirmation/${order.order_number}] NEXT_PUBLIC_INSTAPAY_HANDLE is not configured — rendering InstaPay instructions without a transfer handle.`,
    );
  }

  const shareLink = awaitingPayment ? instapayShareLink() : null;
  const qrDataUrl = shareLink ? await shareLinkQrDataUrl(shareLink) : null;

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 md:px-6 md:py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Three states: a warm "confirmed" tick for COD / paid
            orders, an amber "waiting for your transfer" clock for
            InstaPay orders that still owe payment, and a muted "window
            expired" mark for InstaPay orders the expiry sweep
            cancelled. The heading copy adjusts to match — we don't
            want to say "confirmed ✅" to a customer we haven't been
            paid by yet. */}
        {paymentExpired ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error)]/10 text-[var(--color-error)]">
            <XCircle className="h-9 w-9" />
          </div>
        ) : awaitingPayment ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent-dark)]">
            <Clock className="h-9 w-9" />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)]">
            <CheckCircle2 className="h-9 w-9" />
          </div>
        )}
        <h1 className="font-display text-3xl md:text-4xl">
          {paymentExpired
            ? locale === "ar"
              ? "انتهت مهلة الدفع"
              : "Payment window expired"
            : awaitingPayment
              ? locale === "ar"
                ? "طلبك اتحجز — باقي الدفع"
                : "Order reserved — payment pending"
              : locale === "ar"
                ? "طلبك اتأكد ✅"
                : "Order confirmed ✅"}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {paymentExpired
            ? locale === "ar"
              ? "الطلب اتلغى لأننا لم نستلم التحويل في الوقت المحدد. تقدر تعمل طلب جديد في أي وقت — ولو كنت حوّلت بالفعل، كلمنا على واتساب فوراً ومعاك الإيصال."
              : "The order was cancelled because the transfer didn't arrive in time. You can place a new order anytime — and if you already transferred, message us on WhatsApp right away with the receipt."
            : awaitingPayment
              ? locale === "ar"
                ? "حوّل المبلغ عبر InstaPay وابعت الإيصال — هنبدأ التجهيز فوراً."
                : "Transfer via InstaPay and send us the receipt — we start prep the moment it's verified."
              : locale === "ar"
                ? "شكراً يا فندم — هنتواصل معاك خلال ساعات للتأكيد."
                : "Thanks! We'll reach out shortly to confirm details."}
        </p>
        <div className="mt-2 rounded-lg bg-[var(--color-surface)] px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            {locale === "ar" ? "رقم الطلب" : "Order number"}
          </p>
          <p className="font-mono text-xl font-semibold text-[var(--color-primary)]" dir="ltr">
            {order.order_number}
          </p>
        </div>
      </div>

      <div className="mt-10 space-y-6">
        {/* InstaPay payment instructions — first thing the customer
            sees under the header when payment is pending. Copy-to-
            clipboard handle + WhatsApp receipt CTA are inside the
            client subtree; this file stays a server component. */}
        {awaitingPayment && (
          <InstapayInstructions
            locale={locale}
            orderNumber={order.order_number}
            totalDue={order.total}
            whatsappNumber={whatsappNumber}
            instapayHandle={INSTAPAY_HANDLE}
            shareLink={shareLink}
            qrDataUrl={qrDataUrl}
          />
        )}

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {locale === "ar" ? "ملخص" : "Summary"}
          </h2>
          <ul className="divide-y divide-[var(--color-border)]">
            {order.order_items.map((item, i) => (
              <li key={i} className="flex justify-between gap-3 py-2 text-sm">
                <span className="line-clamp-1 text-[var(--color-text)]">
                  {item.snapshot_name} · × {item.qty}
                </span>
                <span className="font-mono text-[var(--color-text)]">
                  {formatPriceEGP(item.unit_price * item.qty, locale)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-[var(--color-border)] pt-3 text-sm">
            <Row
              label={locale === "ar" ? "الإجمالي الفرعي" : "Subtotal"}
              value={formatPriceEGP(order.subtotal, locale)}
            />
            <Row
              label={locale === "ar" ? "الشحن" : "Shipping"}
              value={
                order.shipping_fee === 0
                  ? locale === "ar"
                    ? "مجاناً"
                    : "Free"
                  : formatPriceEGP(order.shipping_fee, locale)
              }
            />
            <Row
              label={locale === "ar" ? "طريقة الدفع" : "Payment"}
              value={
                order.payment_method === "instapay"
                  ? locale === "ar"
                    ? "InstaPay"
                    : "InstaPay"
                  : order.payment_method === "card"
                    ? locale === "ar"
                      ? "بطاقة ائتمان"
                      : "Card"
                    : locale === "ar"
                      ? "الدفع عند الاستلام"
                      : "Cash on delivery"
              }
            />
            <div className="flex justify-between border-t border-[var(--color-border)] pt-2 text-base">
              <dt className="font-semibold">{locale === "ar" ? "الإجمالي" : "Total"}</dt>
              <dd className="font-mono font-semibold text-[var(--color-primary)]">
                {formatPriceEGP(order.total, locale)}
              </dd>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {locale === "ar" ? "هيوصل لـ" : "Shipping to"}
          </h2>
          <p className="text-sm font-medium text-[var(--color-text)]">{address.name}</p>
          <p className="text-sm text-[var(--color-text-secondary)]" dir="ltr">
            {address.phone}
          </p>
          <p className="text-sm text-[var(--color-text)]">
            {[address.city, address.governorate].filter(Boolean).join(" — ")}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {/* Track-order CTA — visible for both COD and InstaPay orders
              once they exist. For an InstaPay order still awaiting
              payment, tracking shows the "waiting for transfer" state,
              which is honest and still useful. */}
          <Link
            href={`/${locale}/track/${order.order_number}${phoneDigits ? `?p=${phoneDigits.slice(-4)}` : ""}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
          >
            <Package className="h-4 w-4" />
            {locale === "ar" ? "تتبع الطلب" : "Track order"}
          </Link>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
          >
            <MessageCircle className="h-4 w-4" />
            {locale === "ar" ? "كلمنا على واتساب" : "Message us on WhatsApp"}
          </a>
          <Link
            href={`/${locale}/catalog`}
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text)]"
          >
            {locale === "ar" ? "مواصلة التسوق" : "Continue shopping"}
          </Link>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-[var(--color-text-secondary)]">{label}</dt>
      <dd className="font-mono text-[var(--color-text)]">{value}</dd>
    </div>
  );
}
