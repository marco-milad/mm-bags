"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Loader2, ShoppingBag } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { checkoutSchema, type CheckoutValues, calcTotals } from "@/lib/checkout/schema";
import { placeOrder } from "@/lib/checkout/actions";
import {
  useCartHydrated,
  useCartItems,
  useCartStore,
} from "@/store/cart";
import { cn, formatPriceEGP } from "@/lib/utils";
import { StepIndicator, type CheckoutStep } from "./StepIndicator";
import { ShippingForm } from "./ShippingForm";
import { PaymentSelector } from "./PaymentSelector";
import { OrderReview } from "./OrderReview";

const SHIPPING_FIELDS = [
  "name",
  "phone",
  "email",
  "governorate",
  "city",
  "street",
  "building",
  "notes",
] as const;

export function CheckoutFlow({ locale }: { locale: Locale }) {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const items = useCartItems();
  const clearCart = useCartStore((s) => s.clearCart);

  const [step, setStep] = useState<CheckoutStep>(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      governorate: undefined,
      city: "",
      street: "",
      building: "",
      notes: "",
      paymentMethod: "card",
    },
  });

  const isRTL = locale === "ar";
  const Forward = isRTL ? ArrowLeft : ArrowRight;
  const Back = isRTL ? ArrowRight : ArrowLeft;

  const goNext = async () => {
    setServerError(null);
    if (step === 1) {
      const ok = await form.trigger([...SHIPPING_FIELDS]);
      if (!ok) return;
      setStep(2);
    } else if (step === 2) {
      const ok = await form.trigger(["paymentMethod"]);
      if (!ok) return;
      setStep(3);
    }
  };

  const goBack = () => {
    setServerError(null);
    if (step > 1) setStep((s) => (s - 1) as CheckoutStep);
  };

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await placeOrder({
        checkout: values,
        items: items.map((i) => ({
          variantId: i.variantId,
          productId: i.productId,
          qty: i.qty,
          unitPrice: i.unitPrice,
          name_ar: i.name_ar,
          name_en: i.name_en,
          image: i.image,
          color_ar: i.color_ar,
          color_en: i.color_en,
          color_hex: i.color_hex,
          size_inches: i.size_inches,
        })),
      });
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      clearCart();
      router.push(`/${locale}/order-confirmation/${result.orderId}`);
    });
  });

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--color-text-secondary)]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
          <ShoppingBag className="h-7 w-7" />
        </div>
        <h2 className="font-display text-2xl">
          {locale === "ar" ? "سلتك فاضية" : "Your cart is empty"}
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {locale === "ar"
            ? "ضيف منتجات للسلة الأول وبعدين كمّل الشراء."
            : "Add some products to your cart before checking out."}
        </p>
        <Link
          href={`/${locale}/catalog`}
          className="mt-2 rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
        >
          {locale === "ar" ? "ابدأ التسوق" : "Browse products"}
        </Link>
      </div>
    );
  }

  const values = form.watch();
  const totals = calcTotals(items, values.paymentMethod ?? "card");

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <StepIndicator current={step} locale={locale} />

        <div className="space-y-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 md:p-7">
          {step === 1 && (
            <>
              <header>
                <h2 className="font-display text-xl">
                  {locale === "ar" ? "بيانات الشحن" : "Shipping details"}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {locale === "ar"
                    ? "ادخل البيانات اللي هنوصلك عليها."
                    : "Tell us where to ship your order."}
                </p>
              </header>
              <ShippingForm form={form} locale={locale} />
            </>
          )}

          {step === 2 && (
            <>
              <header>
                <h2 className="font-display text-xl">
                  {locale === "ar" ? "طريقة الدفع" : "Payment method"}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {locale === "ar"
                    ? "اختار اللي يناسبك."
                    : "Pick what works for you."}
                </p>
              </header>
              <PaymentSelector form={form} locale={locale} />
            </>
          )}

          {step === 3 && (
            <>
              <header>
                <h2 className="font-display text-xl">
                  {locale === "ar" ? "راجع طلبك" : "Review your order"}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {locale === "ar"
                    ? "تأكد من كل البيانات قبل ما تكمل."
                    : "Confirm everything looks right before placing the order."}
                </p>
              </header>
              <OrderReview values={values} items={items} locale={locale} />
              {serverError && (
                <p
                  role="alert"
                  className="rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2 text-sm text-[var(--color-error)]"
                >
                  {serverError}
                </p>
              )}
            </>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-5">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || isPending}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition",
                step === 1
                  ? "invisible"
                  : "border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-border-dark)]",
              )}
            >
              <Back className="h-4 w-4" />
              {locale === "ar" ? "رجوع" : "Back"}
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
              >
                {locale === "ar" ? "التالي" : "Next"}
                <Forward className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)] disabled:opacity-70"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {locale === "ar" ? "إتمام الطلب" : "Place order"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky summary (desktop) / inline (mobile) */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {locale === "ar" ? "ملخص الطلب" : "Order summary"}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {locale === "ar"
              ? `${items.length} منتج · ${items.reduce((s, i) => s + i.qty, 0)} قطعة`
              : `${items.length} items · ${items.reduce((s, i) => s + i.qty, 0)} units`}
          </p>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--color-text-secondary)]">
                {locale === "ar" ? "الإجمالي الفرعي" : "Subtotal"}
              </dt>
              <dd className="font-mono text-[var(--color-text)]">
                {formatPriceEGP(totals.subtotal, locale)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-text-secondary)]">
                {locale === "ar" ? "الشحن" : "Shipping"}
              </dt>
              <dd className="font-mono text-[var(--color-text)]">
                {totals.shippingFee === 0
                  ? locale === "ar"
                    ? "مجاناً"
                    : "Free"
                  : formatPriceEGP(totals.shippingFee, locale)}
              </dd>
            </div>
            {totals.codFee > 0 && (
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">
                  {locale === "ar" ? "رسوم الدفع" : "Payment fee"}
                </dt>
                <dd className="font-mono text-[var(--color-text)]">
                  {formatPriceEGP(totals.codFee, locale)}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t border-[var(--color-border)] pt-2 text-base">
              <dt className="font-semibold text-[var(--color-text)]">
                {locale === "ar" ? "الإجمالي" : "Total"}
              </dt>
              <dd className="font-mono font-semibold text-[var(--color-primary)]">
                {formatPriceEGP(totals.total, locale)}
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </form>
  );
}
