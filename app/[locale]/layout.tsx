import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cormorant_Garamond, Jost, Tajawal, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { UrgencyBanner } from "@/components/layout/UrgencyBanner";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { WhatsAppFAB } from "@/components/shared/WhatsAppFAB";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { SizeGuideFAB } from "@/components/size-guide/SizeGuideFAB";
import { direction, hasLocale, locales } from "@/lib/i18n-config";
import { getDictionary } from "@/lib/i18n";
import { getTopLevelCategoriesWithCounts } from "@/lib/queries/categories";
import { getProducts } from "@/lib/queries/catalog";
import "../globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  display: "swap",
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://mmbags.com"),
  title: {
    default: "M.M Bags — Travel Smart. Travel in Style.",
    template: "%s · M.M Bags",
  },
  description:
    "M.M Bags — شنط سفر بجودة عالية وسعر معقول. علامة شخصية من ماركو ميلاد، صُممت للمسافر المصري.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
  openGraph: {
    siteName: "M.M Bags",
    type: "website",
  },
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const [t, megaCategories, megaFeatured] = await Promise.all([
    getDictionary(locale),
    getTopLevelCategoriesWithCounts(),
    getProducts({ tag: "best-seller", limit: 3 }),
  ]);
  const dir = direction(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${cormorant.variable} ${jost.variable} ${tajawal.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
        <UrgencyBanner locale={locale} />
        <Navbar
          locale={locale}
          t={t.nav}
          brandName={t.brand.name}
          megaCategories={megaCategories}
          megaFeatured={megaFeatured}
        />
        {/* overflow-x-clip contains any horizontal-bleed sections (e.g.
            VideosStrip's negative-margin carousel) so the page can't
            sideways-scroll on mobile. Using `clip` instead of `hidden` so
            we don't establish a scroll container that would break sticky
            children. */}
        <main className="flex-1 overflow-x-clip pb-20 md:pb-0">{children}</main>
        <Footer locale={locale} t={t.footer} brand={t.brand} />
        <MobileBottomNav locale={locale} t={t.nav} />
        <WhatsAppFAB locale={locale} />
        <SizeGuideFAB locale={locale} />
        <CartDrawer locale={locale} />
      </body>
    </html>
  );
}
