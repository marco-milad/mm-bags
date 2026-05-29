import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MessageCircle, Package } from "lucide-react";
import { hasLocale } from "@/lib/i18n-config";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatPriceEGP } from "@/lib/utils";

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
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+201000000000"
  ).replace(/[^\d]/g, "");
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    locale === "ar"
      ? `أهلاً، عندي استفسار عن طلبي رقم ${order.order_number}.`
      : `Hi, I have a question about order ${order.order_number}.`,
  )}`;

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 md:px-6 md:py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)]">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="font-display text-3xl md:text-4xl">
          {locale === "ar" ? "طلبك اتأكد ✅" : "Order confirmed ✅"}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {locale === "ar"
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
                order.payment_method === "card"
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
          {order.payment_method === "cod" && (
            <Link
              href={`/${locale}/track/${order.order_number}${phoneDigits ? `?p=${phoneDigits.slice(-4)}` : ""}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
            >
              <Package className="h-4 w-4" />
              {locale === "ar" ? "تتبع الطلب" : "Track order"}
            </Link>
          )}
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
