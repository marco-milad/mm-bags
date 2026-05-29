import Link from "next/link";
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

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-4 md:px-12">
        <div className="md:col-span-1">
          <p className="font-display text-2xl text-[var(--color-primary)]">{brand.name}</p>
          <p className="mt-3 max-w-xs text-sm text-[var(--color-text-secondary)]">
            {t.tagline}
          </p>
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            {brand.founder}
          </p>
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
            { href: `${base}/about`, label: locale === "ar" ? "عن M.M Bags" : "About" },
            {
              href: `${base}/track`,
              label: locale === "ar" ? "تتبع طلبك" : "Track your order",
            },
            {
              href: `${base}/account`,
              label: locale === "ar" ? "حسابي" : "My account",
            },
          ]}
        />

        <FooterColumn
          title={t.company}
          links={[
            { href: `${base}/about`, label: locale === "ar" ? "قصتنا" : "Our story" },
            { href: "https://instagram.com/mmbags.eg", label: "Instagram" },
            { href: "https://facebook.com/mmbags.eg", label: "Facebook" },
          ]}
        />
      </div>

      <div className="border-t border-[var(--color-border)] py-4 text-center text-xs text-[var(--color-text-secondary)]">
        © {year} · {t.rights}
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
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">
        {title}
      </p>
      <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link href={link.href} className="transition hover:text-[var(--color-text)]">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
