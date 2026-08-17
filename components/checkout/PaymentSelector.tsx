"use client";

import type { UseFormReturn } from "react-hook-form";
import { Banknote, Smartphone } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import {
  COD_FEE,
  type CheckoutPaymentMethod,
  type CheckoutValues,
} from "@/lib/checkout/schema";
import { cn, formatPriceEGP } from "@/lib/utils";

/**
 * Payment selector — Cash on Delivery and InstaPay.
 *
 * Card via Paymob is intentionally NOT offered here. Paymob merchant
 * onboarding + integration is deferred; leaving a selectable Card
 * option would let a customer "place order" without ever being
 * charged (fraud vector flagged by the launch audit). When Paymob
 * lands, add the card option back and gate the placeOrder action
 * on a real payment-intent id.
 *
 * InstaPay is a manual bank-transfer flow: the customer sees
 * transfer instructions on the order-confirmation page, sends the
 * money to Marco's InstaPay handle, then WhatsApps the receipt.
 * The admin manually marks payment_status='paid' once the transfer
 * arrives. `payment_status` stays at 'pending' until that manual
 * confirmation — nothing here can auto-mark an order paid.
 *
 * The InstaPay option only renders when `instapayEnabled` is true —
 * computed server-side at request time in the checkout page from
 * NEXT_PUBLIC_INSTAPAY_HANDLE and threaded down as a prop, so the
 * client bundle can never disagree with the placeOrder server guard
 * (a module-level env read here would freeze at build time and drift
 * from runtime env changes). Offering a transfer flow with no real
 * destination handle would strand customers after checkout.
 */
export function PaymentSelector({
  form,
  locale,
  instapayEnabled,
}: {
  form: UseFormReturn<CheckoutValues>;
  locale: Locale;
  instapayEnabled: boolean;
}) {
  const { register, watch } = form;
  const selected = watch("paymentMethod");

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="space-y-3">
        <legend className="sr-only">
          {locale === "ar" ? "طريقة الدفع" : "Payment method"}
        </legend>

        <PaymentOption
          id="pm-cod"
          value="cod"
          checked={selected === "cod"}
          register={register("paymentMethod")}
          icon={<Banknote className="h-5 w-5" />}
          title={locale === "ar" ? "الدفع عند الاستلام" : "Cash on delivery"}
          subtitle={
            locale === "ar"
              ? `يضاف ${formatPriceEGP(COD_FEE, locale)} رسوم تحصيل`
              : `${formatPriceEGP(COD_FEE, locale)} collection fee added`
          }
        />

        {instapayEnabled && (
          <PaymentOption
            id="pm-instapay"
            value="instapay"
            checked={selected === "instapay"}
            register={register("paymentMethod")}
            icon={<Smartphone className="h-5 w-5" />}
            title={locale === "ar" ? "InstaPay / تحويل بنكي" : "InstaPay / Bank transfer"}
            subtitle={
              locale === "ar"
                ? "تحويل مباشر بدون رسوم. هنبعتلك التفاصيل بعد التأكيد."
                : "Direct transfer with zero fees. We'll send you the details after checkout."
            }
          />
        )}
      </fieldset>

      {selected === "cod" && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text)]">
          {locale === "ar" ? (
            <>
              <p className="font-medium">هتدفع للمندوب عند استلام الطلب.</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                تأكد إن المبلغ جاهز عشان نخلص بسرعة.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">You&apos;ll pay the courier on delivery.</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Have the exact amount ready to keep things quick.
              </p>
            </>
          )}
        </div>
      )}

      {selected === "instapay" && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text)]">
          {locale === "ar" ? (
            <>
              <p className="font-medium">
                بعد ما تأكد الطلب، هنعرضلك رقم الـ InstaPay و تحوّل.
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                ابعت صورة الإيصال على WhatsApp — بنراجع التحويلات ونأكّدها خلال ساعات العمل (يومياً 11 ص – 10 م).
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">
                After you confirm, we&apos;ll show you the InstaPay account to transfer to.
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Send us the receipt on WhatsApp — we confirm your order as soon as the transfer lands.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentOption({
  id,
  value,
  checked,
  register,
  icon,
  title,
  subtitle,
}: {
  id: string;
  value: CheckoutPaymentMethod;
  checked: boolean;
  register: ReturnType<UseFormReturn<CheckoutValues>["register"]>;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
        checked
          ? "border-[var(--color-primary)] bg-[var(--color-bg)] ring-2 ring-[var(--color-primary)]/15"
          : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-border-dark)]",
      )}
    >
      <input
        id={id}
        type="radio"
        value={value}
        {...register}
        className="sr-only"
      />
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          checked
            ? "bg-[var(--color-primary)] text-white"
            : "bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
        )}
      >
        {icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-[var(--color-text)]">{title}</span>
        <span className="text-xs text-[var(--color-text-secondary)]">{subtitle}</span>
      </span>
    </label>
  );
}
