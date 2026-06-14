import { Clock, Mail, MessageCircle, Share2 } from "lucide-react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata = {
  title: "Contact — M.M Bags",
  description:
    "تواصل مع M.M Bags: WhatsApp، البريد الإلكتروني، وحسابات السوشيال ميديا. هنرد عليك خلال 24 ساعة.",
};

export default async function ContactPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const isRTL = locale === "ar";

  // Same WhatsApp number as the FAB / Mobile menu — env-driven so it stays
  // in lockstep across the site.
  const waNumber = (
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+201229749608"
  ).replace(/[^\d]/g, "");
  const waMessage = isRTL
    ? "أهلاً ماركو، عايز أتواصل بخصوص M.M Bags."
    : "Hi Marco, I'd like to get in touch about M.M Bags.";
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

  return (
    <div className="bg-[var(--color-bg)]">
      {/* Hero */}
      <header className="mx-auto max-w-3xl px-4 pt-14 pb-8 text-center md:px-6 md:pt-20 md:pb-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-accent-dark)]">
          {isRTL ? "تواصل معنا" : "Contact"}
        </p>
        <h1 className="mt-4 font-serif text-4xl text-[var(--color-text)] md:text-5xl">
          {isRTL ? "تواصل معنا" : "Get in Touch"}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)] md:text-base">
          {isRTL
            ? "اي سؤال، استفسار، أو ملاحظة — هنرد عليك خلال 24 ساعة."
            : "Any question, request, or feedback — we'll get back within 24 hours."}
        </p>
      </header>

      {/* Contact methods */}
      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-10 md:grid-cols-3 md:px-6">
        <MethodCard
          Icon={MessageCircle}
          title={isRTL ? "WhatsApp" : "WhatsApp"}
          value={isRTL ? "ابعتلنا رسالة" : "Send us a message"}
          href={waHref}
          external
        />
        <MethodCard
          Icon={Mail}
          title={isRTL ? "البريد الإلكتروني" : "Email"}
          value="marco@mmbags.com"
          href="mailto:marco@mmbags.com"
        />
        <MethodCard
          Icon={Share2}
          title={isRTL ? "السوشيال ميديا" : "Social"}
          value="Instagram · Facebook · TikTok"
          social={[
            { href: "https://instagram.com/mmbags.eg", label: "Instagram" },
            { href: "https://facebook.com/mmbags.eg", label: "Facebook" },
            { href: "https://tiktok.com/@mmbags.eg", label: "TikTok" },
          ]}
        />
      </section>

      {/* Form + business hours */}
      <section className="mx-auto grid max-w-5xl gap-10 px-4 pb-20 md:grid-cols-[1fr_280px] md:gap-12 md:px-6">
        <div>
          <h2 className="mb-1 font-serif text-2xl text-[var(--color-text)]">
            {isRTL ? "ابعتلنا رسالة" : "Send us a message"}
          </h2>
          <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
            {isRTL
              ? "املأ الفورم وهنوصلك على الإيميل في أسرع وقت."
              : "Fill out the form and we'll get back to you via email."}
          </p>
          <ContactForm locale={locale} />
        </div>

        <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:sticky md:top-24 md:self-start">
          <div className="mb-3 flex items-center gap-2 text-[var(--color-text)]">
            <Clock className="h-4 w-4 text-[var(--color-accent-dark)]" />
            <p className="font-mono text-[11px] uppercase tracking-[0.3em]">
              {isRTL ? "ساعات العمل" : "Business hours"}
            </p>
          </div>
          <p className="text-sm text-[var(--color-text)]">
            {isRTL ? "السبت – الخميس" : "Saturday – Thursday"}
          </p>
          <p className="font-mono text-sm text-[var(--color-text-secondary)]">
            {isRTL ? "9 ص – 10 م" : "9 AM – 10 PM"}
          </p>
          <p className="mt-4 text-xs text-[var(--color-text-secondary)]">
            {isRTL
              ? "الجمعة إجازة. رسائل WhatsApp بنرد عليها على مدار الساعة."
              : "Closed Fridays. WhatsApp messages handled around the clock."}
          </p>
        </aside>
      </section>
    </div>
  );
}

type SocialLink = { href: string; label: string };

function MethodCard({
  Icon,
  title,
  value,
  href,
  external,
  social,
}: {
  Icon: typeof Mail;
  title: string;
  value: string;
  href?: string;
  external?: boolean;
  social?: SocialLink[];
}) {
  // Either a single linked card OR a card with multiple social links.
  const cardCls =
    "group block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-accent)] hover:shadow-md";

  const inner = (
    <>
      <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent-dark)] transition group-hover:bg-[var(--color-accent)] group-hover:text-[var(--color-primary)]">
        <Icon className="h-5 w-5" />
      </span>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
        {title}
      </p>
      <p className="mt-1 font-medium text-[var(--color-text)]">{value}</p>
    </>
  );

  if (social) {
    return (
      <div className={cardCls}>
        {inner}
        <ul className="mt-3 flex flex-wrap gap-2">
          {social.map((s) => (
            <li key={s.href}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-bg)]"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <a
      href={href}
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : undefined)}
      className={cardCls}
    >
      {inner}
    </a>
  );
}
