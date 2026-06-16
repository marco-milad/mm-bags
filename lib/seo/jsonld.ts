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
export function organizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/assets/logos/logo-navbar.svg"),
    description: SITE_DESCRIPTION_EN,
    founder: { "@type": "Person", name: SITE_FOUNDER },
    address: {
      "@type": "PostalAddress",
      addressCountry: "EG",
      addressRegion: "Cairo",
    },
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
  /** Effective price (sale_price ?? base_price). */
  price: number;
  /** Original price; null when no sale. */
  originalPrice?: number | null;
  /** Total stock across all variants — drives availability. */
  totalStock: number;
  sku?: string | null;
  averageRating?: number | null;
  reviewCount?: number;
};

export function productSchema(p: ProductSchemaInput): Record<string, unknown> {
  const url = absoluteUrl(`/${p.locale}/products/${p.slug}`);
  const availability =
    p.totalStock > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";
  const offers: Record<string, unknown> = {
    "@type": "Offer",
    url,
    priceCurrency: "EGP",
    price: p.price.toFixed(2),
    availability,
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: SITE_NAME },
  };

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.images.length > 0 ? p.images : undefined,
    sku: p.sku ?? p.slug,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers,
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
