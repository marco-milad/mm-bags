import type { Locale } from "@/lib/i18n-config";
import {
  SITE_DESCRIPTION_AR,
  SITE_DESCRIPTION_EN,
  SITE_FOUNDER,
  SITE_NAME,
  SITE_URL,
  SOCIAL_LINKS,
  absoluteUrl,
} from "./site";
import { brandFor, buildOffers, type OfferVariant } from "./offers";

/**
 * JSON-LD builders. Each returns a plain object that the `<JsonLd>`
 * component serialises into a `<script type="application/ld+json">`
 * tag. Keep helpers narrow and composable — the page that knows the
 * data composes them (no implicit globals here).
 *
 * Schema spec references: schema.org/Product, /Organization, /WebSite,
 * /SearchAction, /BreadcrumbList, /CollectionPage, /FAQPage,
 * /AboutPage, /Person.
 */

// ─── Organization (homepage + global) ────────────────────────────────
// The store: two physical branches in Tama, Sohag (since 1998) + nationwide
// online orders. The old data said "Cairo", contradicting every page.
// Spellings match the footer exactly — consistent name/address/phone
// across pages is what lets search and answer engines trust a local store.
const BRANCHES = [
  { ar: "شارع الشهداء", en: "Shohada Street" },
  { ar: "شارع العزراء", en: "Al-Ozraa Street" },
] as const;

function branchAddress(street: string): Record<string, unknown> {
  return {
    "@type": "PostalAddress",
    streetAddress: street,
    addressLocality: "Tama",
    addressRegion: "Sohag",
    addressCountry: "EG",
  };
}

export function organizationSchema(): Record<string, unknown> {
  const phone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+201229749608").replace(/\s+/g, "");
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: ["M.M Bags Egypt", "إم إم باجز", "ام ام باجز"],
    url: SITE_URL,
    logo: absoluteUrl("/assets/logos/logo-navbar.svg"),
    description: SITE_DESCRIPTION_EN,
    foundingDate: "1998",
    founder: { "@type": "Person", name: SITE_FOUNDER },
    telephone: phone,
    address: branchAddress(BRANCHES[0].en),
    areaServed: { "@type": "Country", name: "Egypt" },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: phone,
      availableLanguage: ["Arabic", "English"],
      areaServed: "EG",
    },
    department: BRANCHES.map((b) => ({
      "@type": "Store",
      name: `${SITE_NAME} — ${b.en}, Tama`,
      address: branchAddress(b.en),
      telephone: phone,
      openingHours: "Mo-Su 11:00-22:00",
    })),
    paymentAccepted: "Cash on delivery, InstaPay",
    currenciesAccepted: "EGP",
    sameAs: SOCIAL_LINKS,
  };
}

// ─── WebSite + SearchAction (homepage sitelinks search box) ──────────
export function websiteSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ["ar-EG", "en"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/ar/catalog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ─── Breadcrumb list ─────────────────────────────────────────────────
export function breadcrumbSchema(
  items: ReadonlyArray<{ name: string; url: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url.startsWith("http") ? it.url : absoluteUrl(it.url),
    })),
  };
}

// ─── Product ────────────────────────────────────────────────────────
export type ProductSchemaInput = {
  name: string;
  description: string;
  slug: string;
  locale: Locale;
  images: string[];
  basePrice: number;
  salePrice: number | null;
  /** Per-size prices/stock — the offer is built from these (same rule as the buy box). */
  variants: ReadonlyArray<OfferVariant>;
  collectionSlug?: string | null;
  sku?: string | null;
  averageRating?: number | null;
  reviewCount?: number;
};

export function productSchema(p: ProductSchemaInput): Record<string, unknown> {
  const url = absoluteUrl(`/${p.locale}/products/${p.slug}`);
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.images.length > 0 ? p.images : undefined,
    sku: p.sku ?? p.slug,
    brand: { "@type": "Brand", name: brandFor(p.collectionSlug, SITE_NAME) },
    offers: buildOffers({
      url,
      variants: p.variants,
      base: p.basePrice,
      sale: p.salePrice,
      sellerName: SITE_NAME,
    }),
  };
  if (p.averageRating && p.reviewCount && p.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: p.averageRating.toFixed(1),
      reviewCount: p.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return schema;
}

// ─── CollectionPage ──────────────────────────────────────────────────
export function collectionPageSchema(opts: {
  name: string;
  description: string;
  url: string;
  itemCount: number;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: opts.url.startsWith("http") ? opts.url : absoluteUrl(opts.url),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    numberOfItems: opts.itemCount,
  };
}

// ─── FAQ ────────────────────────────────────────────────────────────
export function faqSchema(
  items: ReadonlyArray<{ question: string; answer: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}

// ─── Article (buying guides) ─────────────────────────────────────────
// A named author and dates are what answer engines weigh when deciding
// whether advice is trustworthy and current.
export function articleSchema(opts: {
  headline: string;
  description: string;
  url: string;
  locale: Locale;
  datePublished: string;
  dateModified: string;
}): Record<string, unknown> {
  const url = opts.url.startsWith("http") ? opts.url : absoluteUrl(opts.url);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    url,
    mainEntityOfPage: url,
    inLanguage: opts.locale === "ar" ? "ar-EG" : "en",
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    author: { "@type": "Person", name: SITE_FOUNDER, worksFor: { "@id": `${SITE_URL}/#organization` } },
    publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL },
  };
}

// ─── AboutPage + Person ──────────────────────────────────────────────
export function aboutPageSchema(opts: {
  url: string;
  description: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    url: opts.url.startsWith("http") ? opts.url : absoluteUrl(opts.url),
    name: `${SITE_NAME} — ${SITE_FOUNDER}`,
    description: opts.description,
    about: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    mainEntity: personSchema(),
  };
}

export function personSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE_FOUNDER,
    jobTitle: "Founder",
    worksFor: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    nationality: "EG",
  };
}

/** Re-export to keep callers' import lists short. */
export { SITE_DESCRIPTION_AR, SITE_DESCRIPTION_EN, absoluteUrl };
