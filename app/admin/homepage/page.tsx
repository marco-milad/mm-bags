import { getAdminLocale } from "@/lib/admin/locale";
import {
  getFeaturedHomepageProducts,
  getFeaturedSpotlightProductId,
  getProducts,
} from "@/lib/queries/catalog";
import { FeaturedProductsManager } from "@/components/admin/homepage/FeaturedProductsManager";
import { FeaturedSpotlightManager } from "@/components/admin/homepage/FeaturedSpotlightManager";

export const dynamic = "force-dynamic";

export default async function HomepagePage() {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";

  const [initialFeatured, initialSpotlightId, allProductsRaw] =
    await Promise.all([
      getFeaturedHomepageProducts(),
      getFeaturedSpotlightProductId(),
      getProducts({ limit: 1000 }),
    ]);

  const allProducts = allProductsRaw.map((p) => ({
    id: p.id,
    slug: p.slug,
    name_ar: p.name_ar,
    name_en: p.name_en,
    image: p.images?.[0] ?? null,
    collectionSlug: null,
  }));

  return (
    <section className="space-y-12">
      {/* ─── Spotlight (single featured product) ─── */}
      <article>
        <header className="mb-6">
          <h1 className="font-display text-3xl">
            {isAr ? "البقعة الضوئية — الأكثر طلباً هذا الموسم" : "Spotlight — Most-wanted this season"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {isAr
              ? "اختار المنتج الواحد اللي هيظهر في قسم 'الأكثر طلباً هذا الموسم' على الصفحة الرئيسية."
              : "Pick the single product that appears in the 'Most-wanted this season' spotlight on the homepage."}
          </p>
        </header>

        <FeaturedSpotlightManager
          initialProductId={initialSpotlightId}
          allProducts={allProducts}
          locale={locale}
        />
      </article>

      {/* ─── Best-sellers carousel (existing) ─── */}
      <article>
        <header className="mb-6">
          <h2 className="font-display text-3xl">
            {isAr ? "المنتجات المميزة على الواجهة" : "Homepage featured products"}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {isAr
              ? "اختار المنتجات اللي هتظهر في قسم 'الأكثر مبيعاً' على الصفحة الرئيسية، وحدد ترتيبها."
              : "Pick which products appear in the 'Best sellers' section on the homepage, and set their order."}
          </p>
        </header>

        <FeaturedProductsManager
          initialFeatured={initialFeatured}
          allProducts={allProducts}
          locale={locale}
        />
      </article>
    </section>
  );
}
