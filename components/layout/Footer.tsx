import Image from "next/image";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";

type FooterStrings = {
  tagline: string;
  rights: string;
  shop: string;
  help: string;
  company: string;
};

type BrandStrings = {
  name: string;
  tagline: string;
  founder: string;
};

// Brand-glyph SVG paths (24×24 viewBox). Same set the SocialBar and
// WhatsAppFAB already use — kept co-local so the Footer doesn't
// depend on those floating widgets. lucide-react 1.x doesn't ship
// brand icons, hence the hand-inlined paths.
const SOCIAL_INSTAGRAM_PATH =
  "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z";
const SOCIAL_FACEBOOK_PATH =
  "M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z";
const SOCIAL_TIKTOK_PATH =
  "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z";
const SOCIAL_WHATSAPP_PATH =
  "M20.52 3.48A11.85 11.85 0 0 0 12.05 0C5.52 0 .2 5.32.2 11.86c0 2.09.55 4.13 1.6 5.93L0 24l6.36-1.66a11.84 11.84 0 0 0 5.7 1.45h.01c6.53 0 11.85-5.32 11.85-11.86 0-3.17-1.23-6.15-3.4-8.45ZM12.07 21.5h-.01a9.6 9.6 0 0 1-4.9-1.34l-.35-.21-3.78.99 1.01-3.68-.23-.38a9.6 9.6 0 0 1-1.47-5.07c0-5.3 4.32-9.6 9.62-9.6 2.57 0 4.98 1 6.8 2.82a9.55 9.55 0 0 1 2.82 6.79c0 5.3-4.32 9.6-9.51 9.68Zm5.27-7.18c-.29-.14-1.71-.84-1.98-.94-.27-.1-.47-.14-.66.14-.2.29-.76.94-.93 1.13-.17.2-.34.22-.63.07-.29-.14-1.23-.45-2.34-1.44-.87-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.59.13-.13.29-.34.43-.51.14-.17.19-.29.29-.49.1-.2.05-.37-.02-.51-.07-.14-.66-1.59-.9-2.18-.24-.57-.48-.49-.66-.5-.17-.01-.37-.01-.57-.01-.2 0-.51.07-.78.37-.27.29-1.03 1-1.03 2.46s1.05 2.85 1.2 3.05c.14.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.68.62.7.22 1.34.19 1.85.12.56-.08 1.71-.7 1.95-1.37.24-.67.24-1.25.17-1.37-.07-.13-.27-.2-.56-.34Z";

export function Footer({
  locale,
  t,
  brand,
}: {
  locale: Locale;
  t: FooterStrings;
  brand: BrandStrings;
}) {
  const base = `/${locale}`;
  const year = new Date().getFullYear();
  const isRTL = locale === "ar";

  // WhatsApp URL matches the pattern the Hero secondary CTA and the
  // floating WhatsAppFAB use — same number source (env var + safe
  // fallback), same pre-filled greeting shape. Footer icon opens the
  // thread directly, not the wa.me landing.
  const waNumber = (
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+201229749608"
  ).replace(/\D/g, "");
  const waMessage = isRTL
    ? "أهلاً، جيت من M.M Bags."
    : "Hi, I'm reaching out from M.M Bags.";
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

  const socialLinks = [
    { href: "https://instagram.com/mmbags.eg", label: "Instagram", path: SOCIAL_INSTAGRAM_PATH },
    { href: "https://facebook.com/mmbags.eg", label: "Facebook", path: SOCIAL_FACEBOOK_PATH },
    { href: "https://tiktok.com/@mmbags.eg", label: "TikTok", path: SOCIAL_TIKTOK_PATH },
    { href: waHref, label: "WhatsApp", path: SOCIAL_WHATSAPP_PATH },
  ];

  return (
    <footer className="bg-navy-900 text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4 md:px-12">
        <div className="md:col-span-1">
          <Link href={base} aria-label={brand.name} className="inline-flex">
            <Image
              src="/assets/logos/logo-navbar-light.svg"
              alt={brand.name}
              width={232}
              height={64}
              className="h-12 w-auto"
            />
          </Link>
          <p className="mt-4 max-w-xs text-sm text-navy-200">{t.tagline}</p>
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-brass-300">
            {brand.founder}
          </p>

          {/* Follow-us social icons — real icons (was a text link in
              the COMPANY column). Same brand-glyph paths the SocialBar
              floating widget uses, so the visual language stays
              consistent. WhatsApp is included here as an outreach
              channel (its floating FAB stays for cross-page reach). */}
          <div className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brass-300">
              {isRTL ? "تابعنا" : "Follow us"}
            </p>
            <ul className="flex gap-2">
              {socialLinks.map(({ href, label, path }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-navy-700 text-brass-300 transition hover:border-brass-500 hover:bg-brass-500 hover:text-navy-900"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      aria-hidden
                      fill="currentColor"
                    >
                      <path d={path} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <FooterColumn
          title={t.shop}
          links={[
            { href: `${base}/categories`, label: locale === "ar" ? "كل التشكيلات" : "All categories" },
            { href: `${base}/catalog/travel-bags`, label: locale === "ar" ? "شنط السفر" : "Travel bags" },
            { href: `${base}/catalog/backpacks`, label: locale === "ar" ? "شنط الظهر" : "Backpacks" },
            { href: `${base}/catalog/school-bags`, label: locale === "ar" ? "شنط المدارس" : "School bags" },
            { href: `${base}/catalog/ladies-bags`, label: locale === "ar" ? "شنط الحريم" : "Ladies bags" },
            { href: `${base}/catalog/laptop-bags`, label: locale === "ar" ? "شنط لاب توب" : "Laptop bags" },
          ]}
        />

        <FooterColumn
          title={t.help}
          links={[
            { href: `${base}/faq`, label: locale === "ar" ? "الأسئلة الشائعة" : "FAQ" },
            { href: `${base}/contact`, label: locale === "ar" ? "تواصل معنا" : "Contact us" },
            { href: `${base}/track`, label: locale === "ar" ? "تتبع طلبك" : "Track your order" },
            { href: `${base}/account`, label: locale === "ar" ? "حسابي" : "My account" },
            { href: `${base}/about`, label: locale === "ar" ? "عن M.M Bags" : "About" },
          ]}
        />

        {/* Contact column — replaces the previous COMPANY column,
            whose contents (Our story / Shipping / Refund / Terms) now
            live in HELP.About and the bottom-bar legal micro-nav
            respectively. In their place: real contact channels a
            first-time visitor can act on immediately. Both branch
            addresses in Sohag are shown by design — physical
            presence is a Egyptian-market trust signal that pure
            digital brands can't match. */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brass-300">
            {isRTL ? "تواصل معنا" : "Contact"}
          </p>
          <ul className="space-y-2.5 text-xs text-navy-200">
            <li className="flex items-start gap-2">
              <Phone
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass-300"
                aria-hidden
              />
              {/* `tel:` link so mobile visitors get a one-tap dial;
                  dir="ltr" so the digits render in Latin reading
                  order under an Arabic parent. */}
              <a
                href="tel:+201229749608"
                className="transition hover:text-paper"
                dir="ltr"
              >
                01229749608
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MessageCircle
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass-300"
                aria-hidden
              />
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-paper"
                dir="ltr"
              >
                01229749608 {isRTL ? "(واتساب)" : "(WhatsApp)"}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Mail
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass-300"
                aria-hidden
              />
              <a
                href="mailto:miladmarco68@gmail.com"
                className="break-all transition hover:text-paper"
                dir="ltr"
              >
                miladmarco68@gmail.com
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass-300"
                aria-hidden
              />
              <span>
                {isRTL
                  ? "سوهاج – طما – شارع الشهداء"
                  : "Sohag – Tama – Shohada Street"}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass-300"
                aria-hidden
              />
              <span>
                {isRTL
                  ? "سوهاج – طما – شارع العزراء"
                  : "Sohag – Tama – Al-Ozraa Street"}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Clock
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass-300"
                aria-hidden
              />
              <span>
                {isRTL ? "من 11 ص إلى 10 م" : "11 AM – 10 PM daily"}
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Payment-methods strip — sits between the columns and the
          bottom bar. Text pills (rather than card logos) both because
          we don't want to license Visa/Mastercard artwork for a
          footer, and because the pills nicely include the
          Egyptian-specific "cash on delivery" option which no card
          logo covers. */}
      <div className="border-t border-navy-700/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-6 py-4 md:px-12">
          <span className="font-mono text-[10px] uppercase tracking-wider text-navy-300">
            {isRTL ? "طرق الدفع" : "We accept"}
          </span>
          <span className="rounded-md border border-navy-700 bg-navy-800 px-2.5 py-1 text-[11px] font-semibold text-navy-100">
            Visa
          </span>
          <span className="rounded-md border border-navy-700 bg-navy-800 px-2.5 py-1 text-[11px] font-semibold text-navy-100">
            Mastercard
          </span>
          <span className="rounded-md border border-navy-700 bg-navy-800 px-2.5 py-1 text-[11px] font-semibold text-navy-100">
            {isRTL ? "الدفع عند الاستلام" : "Cash on delivery"}
          </span>
        </div>
      </div>

      {/* Bottom bar — legal micro-nav on inline-start, copyright
          centered-ish, and a "Made in Egypt" flag on the inline-end.
          Wraps on mobile so the three groups stack without collision. */}
      <div className="border-t border-navy-700/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 text-xs text-navy-300 md:px-12">
          <ul className="flex flex-wrap items-center gap-2">
            <li>
              <Link
                href={`${base}/terms-of-service`}
                className="transition hover:text-paper"
              >
                {isRTL ? "شروط الاستخدام" : "Terms"}
              </Link>
            </li>
            <li aria-hidden className="text-navy-500">
              ·
            </li>
            <li>
              <Link
                href={`${base}/privacy-policy`}
                className="transition hover:text-paper"
              >
                {isRTL ? "سياسة الخصوصية" : "Privacy"}
              </Link>
            </li>
            <li aria-hidden className="text-navy-500">
              ·
            </li>
            <li>
              <Link
                href={`${base}/refund-policy`}
                className="transition hover:text-paper"
              >
                {isRTL ? "سياسة الإرجاع" : "Refund policy"}
              </Link>
            </li>
            <li aria-hidden className="text-navy-500">
              ·
            </li>
            <li>
              <Link
                href={`${base}/shipping-policy`}
                className="transition hover:text-paper"
              >
                {isRTL ? "سياسة الشحن" : "Shipping policy"}
              </Link>
            </li>
          </ul>

          <p className="text-center">
            © {year} · {t.rights}
          </p>

          <p className="inline-flex items-center gap-1">
            {isRTL ? (
              <>
                <span aria-hidden>🇪🇬</span> صنع في مصر
              </>
            ) : (
              <>
                Made in Egypt <span aria-hidden>🇪🇬</span>
              </>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brass-300">
        {title}
      </p>
      <ul className="space-y-2 text-sm text-navy-200">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link href={link.href} className="transition hover:text-paper">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
