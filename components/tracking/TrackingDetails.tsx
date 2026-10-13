"use client";

import Image from "next/image";
import { Bell, Calendar, MessageCircle, Package, Truck } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { TrackingResult } from "@/lib/tracking/schema";
import { cn, formatPriceEGP } from "@/lib/utils";
import { waLink } from "@/lib/whatsapp";
import { TrackingTimeline } from "./TrackingTimeline";

export function TrackingDetails({
  tracking,
  locale,
}: {
  tracking: TrackingResult;
  locale: Locale;
}) {
  const whatsappHref = waLink(
    locale === "ar"
      ? `أهلاً، عندي استفسار عن طلبي رقم ${tracking.orderNumber}.`
      : `Hi, I have a question about order ${tracking.orderNumber}.`,
  );

  const createdDate = new Date(tracking.createdAt).toLocaleDateString(
    locale === "ar" ? "ar-EG" : "en-EG",
    { year: "numeric", month: "long", day: "numeric" },
  );
  const eta = tracking.estimatedDelivery
    ? new Date(tracking.estimatedDelivery).toLocaleDateString(
        locale === "ar" ? "ar-EG" : "en-EG",
        { year: "numeric", month: "long", day: "numeric" },
      )
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Card>
          <Header
            title={locale === "ar" ? "حالة الطلب" : "Order status"}
            note={
              locale === "ar"
                ? `طلب رقم ${tracking.orderNumber}`
                : `Order ${tracking.orderNumber}`
            }
          />
          <TrackingTimeline status={tracking.status} locale={locale} />
        </Card>

        {(tracking.courierName || tracking.trackingNumber || eta) && (
          <Card>
            <Header title={locale === "ar" ? "تفاصيل الشحن" : "Shipping details"} />
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {tracking.courierName && (
                <Row
                  icon={<Truck className="h-4 w-4" />}
                  label={locale === "ar" ? "شركة الشحن" : "Courier"}
                  value={tracking.courierName}
                />
              )}
              {tracking.trackingNumber && (
                <Row
                  icon={<Package className="h-4 w-4" />}
                  label={locale === "ar" ? "رقم الشحنة" : "Tracking #"}
                  value={tracking.trackingNumber}
                  mono
                />
              )}
              {eta && (
                <Row
                  icon={<Calendar className="h-4 w-4" />}
                  label={locale === "ar" ? "موعد التسليم المتوقع" : "Estimated delivery"}
                  value={eta}
                />
              )}
            </dl>
          </Card>
        )}

        <Card>
          <Header title={locale === "ar" ? "محتويات الطلب" : "Order contents"} />
          <ul className="divide-y divide-[var(--color-border)]">
            {tracking.items.map((item, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                {item.image && (
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-2)]">
                    <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                  </span>
                )}
                <span className="flex-1 text-sm text-[var(--color-text)]">{item.name}</span>
                <span className="font-mono text-sm text-[var(--color-text-secondary)]">
                  × {item.qty}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-[var(--color-border)] pt-3 text-sm">
            <span className="text-[var(--color-text-secondary)]">
              {locale === "ar" ? "الإجمالي" : "Total"}
            </span>
            <span className="font-mono font-semibold text-[var(--color-primary)]">
              {formatPriceEGP(tracking.total, locale)}
            </span>
          </div>
        </Card>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <Card>
          <Header title={locale === "ar" ? "هيوصل لـ" : "Shipping to"} />
          <p className="text-sm font-medium text-[var(--color-text)]">
            {tracking.recipientName}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]" dir="ltr">
            {tracking.recipientPhone}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text)]">
            {[tracking.city, tracking.governorate].filter(Boolean).join(" — ")}
          </p>
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            {locale === "ar" ? "تاريخ الطلب" : "Ordered on"} · {createdDate}
          </p>
        </Card>

        <WhatsAppUpdatesCard
          locale={locale}
          orderNumber={tracking.orderNumber}
        />

        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" />
          {locale === "ar" ? "كلمنا على واتساب" : "Message us on WhatsApp"}
        </a>
      </aside>
    </div>
  );
}

// M3: a real wa.me deep link — the customer starts the chat with the order
// number prefilled, and the team replies with the latest status. (There is
// no automated push, so the copy must not promise one.)
function WhatsAppUpdatesCard({
  locale,
  orderNumber,
}: {
  locale: Locale;
  orderNumber: string;
}) {
  const href = waLink(
    locale === "ar"
      ? `أهلاً، عايز أتابع تحديثات طلب رقم ${orderNumber} على واتساب`
      : `Hi, I'd like to follow updates for order ${orderNumber} on WhatsApp`,
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 transition hover:border-[#25D366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
    >
      <Bell className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
      <span className="flex-1">
        <span className="block text-sm font-semibold text-[var(--color-text)]">
          {locale === "ar"
            ? "تابع طلبك على واتساب"
            : "Follow your order on WhatsApp"}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--color-text-secondary)]">
          {locale === "ar"
            ? "ابعتلنا رسالة برقم الطلب، وهنرد عليك بآخر تحديث."
            : "Send us a message with your order number and we'll reply with the latest update."}
        </span>
        <span className="mt-3 inline-flex h-11 items-center gap-2 rounded-full border border-[#25D366] px-4 text-sm font-semibold text-[var(--color-text)] transition group-hover:bg-[#25D366]/10">
          <MessageCircle className="h-4 w-4 text-[#25D366]" />
          {locale === "ar" ? "ابعت رسالة" : "Send a message"}
        </span>
      </span>
    </a>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
      {children}
    </div>
  );
}

function Header({ title, note }: { title: string; note?: string }) {
  return (
    <header className="mb-4 flex items-baseline justify-between gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
        {title}
      </h3>
      {note && (
        <p className="font-mono text-xs text-[var(--color-text-secondary)]">{note}</p>
      )}
    </header>
  );
}

function Row({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-[var(--color-text-secondary)]">{icon}</span>
      <div className="flex-1">
        <dt className="text-xs text-[var(--color-text-secondary)]">{label}</dt>
        <dd className={cn("text-sm text-[var(--color-text)]", mono && "font-mono")}>
          {value}
        </dd>
      </div>
    </div>
  );
}
