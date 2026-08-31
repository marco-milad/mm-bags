import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { CART_STATE_PROBE } from "@/components/cart/CartSkeleton";

// Personalized: the cart, the wishlist and the checkout form are all
// per-visitor. They used to be dynamic only as a side effect of the layout
// reading cookies(); now that the layout is cookie-free, say it directly so
// they are never prerendered or served from a shared cache.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout",
};

export default async function CheckoutPage({
  params,
}: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  // Evaluated server-side at request time — the single source of truth
  // for InstaPay availability, threaded down as a prop so the client
  // bundle can never disagree with the placeOrder guard (a module-level
  // NEXT_PUBLIC_ read in a client component freezes at build time and
  // drifts from runtime env changes).
  const instapayEnabled = !!process.env.NEXT_PUBLIC_INSTAPAY_HANDLE?.trim();

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
          {locale === "ar" ? "إكمال الشراء" : "Checkout"}
        </p>
        <h1 className="font-display text-3xl md:text-4xl">
          {locale === "ar" ? "اكمل طلبك" : "Complete your order"}
        </h1>
      </header>
      {/* Runs from the parser, before first paint, so the placeholder below
          reserves the height of the state the visitor is actually in. Without
          it the empty cart and the shipping form — which differ by roughly
          600px — would share one guess and one of them would always shift. */}
      <script dangerouslySetInnerHTML={{ __html: CART_STATE_PROBE }} />
      <CheckoutFlow locale={locale} instapayEnabled={instapayEnabled} />
    </section>
  );
}
