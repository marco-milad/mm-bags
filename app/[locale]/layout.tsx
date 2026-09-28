import type { Metadata } from "next";
import { notFound } from "next/navigation";
import localFont from "next/font/local";
import { Navbar } from "@/components/layout/Navbar";
import { UrgencyBanner } from "@/components/layout/UrgencyBanner";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { WhatsAppFAB } from "@/components/shared/WhatsAppFAB";
import { SocialBar } from "@/components/shared/SocialBar";
import { ScrollToTop } from "@/components/shared/ScrollToTop";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { SizeGuideFAB } from "@/components/size-guide/SizeGuideFAB";
import { direction, hasLocale, locales } from "@/lib/i18n-config";
import { getDictionary } from "@/lib/i18n";
import { getTopLevelCategoriesWithCounts } from "@/lib/queries/categories";
import { getMegaFeaturedItems } from "@/lib/queries/catalog";
import "../globals.css";

// Fonts are served from app/fonts, not fetched from Google at build time.
// next/font/google downloads every family on every build, so a single
// blip between the build machine and fonts.gstatic.com fails the whole
// deploy — which is exactly what happened on 2026-09-28 and left the
// site running 20-day-old code while nobody noticed, because data edits
// kept flowing through Supabase regardless.
//
// The files are the same woff2 subsets Google was serving (latin, or
// arabic for Tajawal), so nothing changes visually. Re-download them
// with scripts/fetch-fonts.mjs if a family ever needs new weights.

const cormorant = localFont({
  variable: "--font-cormorant",
  display: "swap",
  // Times New Roman is the closest metric source for a serif fallback,
  // standing in for the metric adjustment next/font/google derived on
  // its own.
  adjustFontFallback: "Times New Roman",
  src: [
    { path: "../fonts/cormorant-garamond-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/cormorant-garamond-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/cormorant-garamond-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/cormorant-garamond-700.woff2", weight: "700", style: "normal" },
  ],
});

const jost = localFont({
  variable: "--font-jost",
  display: "swap",
  adjustFontFallback: "Arial",
  // 4A-1: paints nothing on ar (default locale / primary market); still
  // loads on demand via CSS for the en body+badges. Keeps 26KB and one
  // request off every page's critical path.
  preload: false,
  // Variable font: one file covers the whole range.
  src: [{ path: "../fonts/jost-variable.woff2", weight: "100 900", style: "normal" }],
});

const tajawal = localFont({
  variable: "--font-tajawal",
  display: "swap",
  adjustFontFallback: "Arial",
  src: [
    { path: "../fonts/tajawal-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/tajawal-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/tajawal-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/tajawal-800.woff2", weight: "800", style: "normal" },
  ],
});

const jetbrainsMono = localFont({
  variable: "--font-jetbrains-mono",
  display: "swap",
  adjustFontFallback: "Arial",
  // 4A-1: ar prices use Arabic-Indic digits (U+0660-0669) which the
  // latin subset cannot paint, so this 40KB preload never draws a glyph
  // on ar pages. Loads on demand where latin monospace really renders.
  preload: false,
  src: [{ path: "../fonts/jetbrains-mono-variable.woff2", weight: "100 800", style: "normal" }],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://mm-bags.vercel.app",
  ),
  title: {
    default: "M.M Bags — شنط سفر بجودة عالية | Cairo, Egypt",
    template: "%s · M.M Bags",
  },
  description:
    "تسوق أفضل شنط السفر والظهر والمدارس في مصر. جودة عالية بسعر معقول. شحن لكل 27 محافظة. الدفع عند الاستلام متاح.",
  applicationName: "M.M Bags",
  authors: [{ name: "Marco Milad" }],
  creator: "Marco Milad",
  publisher: "M.M Bags",
  keywords: [
    "M.M Bags",
    "شنط سفر مصر",
    "شنط ظهر",
    "شنط مدارس",
    "شنط حريم",
    "شنط لاب توب",
    "travel bags Egypt",
    "backpacks Cairo",
  ],
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
  openGraph: {
    siteName: "M.M Bags",
    type: "website",
    images: ["/api/og"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@mmbags_eg",
    creator: "@mmbags_eg",
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
    // Narrow 7-column rows — these serialize into the client MegaMenu's
    // props on EVERY page, so they must not carry `select *` weight.
    getMegaFeaturedItems(),
  ]);
  const dir = direction(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${cormorant.variable} ${jost.variable} ${tajawal.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      {/* No preconnect to Google's font hosts: the fonts are served from
          this origin now, so those hints only cost every visitor a TLS
          handshake to a server the page never calls. */}
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
        <SocialBar locale={locale} />
        <ScrollToTop locale={locale} />
        <CartDrawer locale={locale} />
        <PageViewTracker />
        {/* Reads its own cookie on the client. Deliberately NOT read here:
            calling cookies() in this layout would opt every route back into
            dynamic rendering and undo the eight prerendered content pages. */}
        <ConsentBanner locale={locale} />
      </body>
    </html>
  );
}
