import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { localeAlternates } from "@/lib/seo/site";
import { EG_GOVERNORATES } from "@/lib/checkout/governorates";
import { getActiveShippingZones } from "@/lib/shipping/zones";
import {
  COD_FEE_BAND,
  COD_FEE_BASE,
  COD_FEE_STEP,
  DELIVERY_HOURS_MAX,
  DELIVERY_HOURS_MIN,
  zoneName,
} from "@/lib/shipping/shared";
import { formatPriceEGP } from "@/lib/utils";
import {
  Body,
  Bullet,
  PolicyHeader,
  RelatedLinks,
  Section,
} from "@/components/policy/PolicyComponents";

// Static with hourly ISR. These pages fetch nothing of their own; the only
// per-request data in the tree is the [locale] layout's navigation, which is
// now read through the cookie-free public client. An hour bounds how stale
// the mega-menu can get, since the Step 5B invalidation helpers target the
// catalogue routes rather than the content pages.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/shipping-policy">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const isAr = locale === "ar";
  return {
    title: isAr
      ? "سياسة الشحن والتوصيل | M.M Bags"
      : "Shipping & Delivery Policy | M.M Bags",
    description: isAr
      ? "M.M Bags بتشحن لكل 27 محافظة في مصر: التوصيل خلال 28–36 ساعة من تسليم الطلب لشركة الشحن، أسعار الشحن لكل منطقة، ومجاني من 4,000 ج.م."
      : "M.M Bags ships to all 27 Egyptian governorates: delivered 28–36 hours after courier pickup, shipping prices for every area, free from LE 4,000.",
    alternates: localeAlternates("/shipping-policy", locale),
  };
}

export default async function ShippingPolicyPage({
  params,
}: PageProps<"/[locale]/shipping-policy">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const isAr = locale === "ar";
  const zones = await getActiveShippingZones();
  const band = COD_FEE_BAND.toLocaleString("en-US");

  return (
    <article className="bg-[var(--color-bg)]">
      <PolicyHeader
        eyebrow={isAr ? "السياسات" : "Policies"}
        title={isAr ? "سياسة الشحن والتوصيل" : "Shipping & Delivery Policy"}
        subtitle={
          isAr
            ? "بنوصل لكل 27 محافظة في مصر — هنا التفاصيل اللي محتاج تعرفها."
            : "We ship to every governorate in Egypt — here's what to expect."
        }
        updated={isAr ? "آخر تحديث: نوفمبر 2026" : "Last updated: November 2026"}
      />

      <div className="mx-auto max-w-3xl space-y-10 px-4 pb-20 md:px-6 md:pb-24">
        <Section title={isAr ? "نظرة سريعة" : "At a glance"}>
          <ul className="space-y-2 ps-0 [&>li]:list-none">
            <Bullet isAr={isAr}>
              {isAr
                ? "بنشحن لكل 27 محافظة في مصر، بما فيها الصعيد ومدن القناة والساحل."
                : "We deliver to all 27 governorates — including Upper Egypt, the Canal cities, and the North Coast."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? `بعد ما نأكد طلبك معاك ونسلّمه لشركة الشحن، بيوصلك خلال ${DELIVERY_HOURS_MIN}–${DELIVERY_HOURS_MAX} ساعة لأي محافظة.`
                : `Once we've confirmed your order with you and handed it to the courier, it arrives within ${DELIVERY_HOURS_MIN}–${DELIVERY_HOURS_MAX} hours, anywhere in Egypt.`}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "سعر الشحن حسب منطقتك (الجدول تحت)، ومجاني لأي طلب من 4,000 ج.م."
                : "Shipping is priced by area (table below), and free on every order from LE 4,000."}
            </Bullet>
          </ul>
        </Section>

        <Section title={isAr ? "مواعيد تجهيز الطلب" : "Order processing"}>
          <Body isAr={isAr}>
            {isAr
              ? "بنكلّمك نأكد الطلب خلال 24 ساعة من ما تطلبه، وبعدها بنجهزه ونسلّمه لشركة الشحن. أول ما المندوب يستلمه، التاريخ المتوقع للوصول بيظهرلك في صفحة تتبع الطلب."
              : "We call you to confirm the order within 24 hours of placing it, then pack it and hand it to the courier. As soon as the courier has it, the expected arrival date shows on your order tracking page."}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "شركة الشحن بتستلم وبتوصّل كل يوم، حتى يوم الجمعة."
              : "The courier picks up and delivers every day, Fridays included."}
          </Body>
        </Section>

        <Section title={isAr ? "مدة التوصيل" : "Delivery time"}>
          <Body isAr={isAr}>
            {isAr
              ? `التوصيل خلال ${DELIVERY_HOURS_MIN}–${DELIVERY_HOURS_MAX} ساعة لكل المحافظات، والمدة بتبدأ من ساعة ما شركة الشحن تستلم الطلب مننا، مش من ساعة ما تطلبه. شركة الشحن بتكلّمك قبل ما توصل عشان تنسّق معاك ميعاد الاستلام.`
              : `Delivery takes ${DELIVERY_HOURS_MIN}–${DELIVERY_HOURS_MAX} hours to every governorate, counted from when the courier picks the order up from us, not from when you place it. The courier calls you beforehand to arrange the handover.`}
          </Body>
        </Section>

        <Section title={isAr ? "أسعار الشحن" : "Shipping prices"}>
          <Body isAr={isAr}>
            {isAr
              ? "سعر الشحن ثابت لكل منطقة مهما كان وزن أو حجم الطلب، وبيظهرلك في صفحة الدفع أول ما تختار محافظتك. الطلبات اللي منتجاتها من 4,000 ج.م وأكتر شحنها مجاني."
              : "Each area has one shipping price whatever the order's size or weight, shown at checkout as soon as you pick your governorate. Orders with products worth LE 4,000 or more ship free."}
          </Body>
          {zones.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-start font-medium">
                      {isAr ? "المنطقة" : "Area"}
                    </th>
                    <th scope="col" className="px-3 py-2 text-end font-medium">
                      {isAr ? "الشحن" : "Shipping"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {EG_GOVERNORATES.flatMap((g) =>
                    zones
                      .filter((z) => z.governorate_code === g.code)
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((z) => {
                        const govName = isAr ? g.name_ar : g.name_en;
                        const name = zoneName(z, locale);
                        return (
                          <tr key={z.id} className="border-t border-[var(--color-border)]">
                            <td className="px-3 py-2 text-[var(--color-text)]">
                              {name}
                              {!name.includes(govName) && (
                                <span className="text-[var(--color-text-secondary)]"> · {govName}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-end font-mono text-[var(--color-text)]">
                              {formatPriceEGP(z.fee, locale)}
                            </td>
                          </tr>
                        );
                      }),
                  )}
                </tbody>
              </table>
            </div>
          )}
          <Body isAr={isAr}>
            {isAr
              ? `لو اخترت الدفع عند الاستلام، شركة الشحن بتاخد رسوم تحصيل: ${COD_FEE_BASE} ج.م لحد ${band} ج.م، و${COD_FEE_STEP} ج.م لكل ${band} ج.م بعدها (مثلًا طلب بـ 1,500 ج.م رسومه 35 ج.م). الرسوم دي للشركة مش لينا، وتقدر توفّرها لو دفعت بـ InstaPay.`
              : `With cash on delivery the courier charges a collection fee: LE ${COD_FEE_BASE} up to LE ${band}, plus LE ${COD_FEE_STEP} for every LE ${band} above that (an LE 1,500 order pays LE 35). It goes to the courier, not to us, and you save it by paying with InstaPay.`}
          </Body>
        </Section>

        <Section title={isAr ? "تتبع الطلب" : "Tracking your order"}>
          <Body isAr={isAr}>
            {isAr ? (
              <>
                بمجرد ما الطلب يطلع للمندوب، بنبعتلك رابط متابعة على WhatsApp أو SMS. تقدر كمان تتابع طلبك أي وقت من{" "}
                <Link
                  href={`/${locale}/track`}
                  className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                >
                  صفحة التتبع
                </Link>{" "}
                باستخدام رقم الطلب.
              </>
            ) : (
              <>
                The moment your order ships, we send a tracking link via WhatsApp or SMS. You can also check the status any time on the{" "}
                <Link
                  href={`/${locale}/track`}
                  className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                >
                  tracking page
                </Link>{" "}
                using your order number.
              </>
            )}
          </Body>
        </Section>

        <Section title={isAr ? "دقة العنوان وبيانات التواصل" : "Address & contact accuracy"}>
          <Body isAr={isAr}>
            {isAr
              ? "اتأكد دايماً إن العنوان ورقم الموبايل اللي بتكتبهم وقت الطلب كاملين وصح. لو المندوب ما لقاش الموقع أو الموبايل مقفول، بنرجع نتواصل معاك، وكل تأخير بسبب ده مش بنقدر نضمن مواعيده."
              : "Please make sure your address and phone number are complete and accurate at checkout. If the courier can't reach the address or your phone is unreachable, we'll contact you to re-arrange — any delay caused this way falls outside our delivery promise."}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "بعد ما الطلب يتأكد بساعة، تقدر تعدل العنوان بالتواصل معنا فوراً. بعد كده الشحنة بتكون اتسلمت لمزود الخدمة وبيصعب تعديلها."
              : "You have one hour after confirming the order to update the address by contacting us. After that, the shipment is handed to the courier and changes become difficult."}
          </Body>
        </Section>

        <Section title={isAr ? "إعادة المحاولة والشحنات المرفوضة" : "Re-delivery & refused shipments"}>
          <Body isAr={isAr}>
            {isAr
              ? "لو المندوب ما قدرش يسلم الطلب من أول محاولة، بيحاول تاني تلقائياً في اليوم اللي بعده. لو الـ 3 محاولات اتعملت من غير ما الطلب يتسلم، الشحنة بترجع للمخزن وبنتواصل معاك لتأكيد عنوان جديد أو إلغاء الطلب."
              : "If the courier can't deliver on the first attempt, they'll automatically try again the next day. After three failed attempts, the shipment returns to our warehouse and we contact you to confirm a new address or cancel the order."}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "لو اخترت الدفع عند الاستلام ورفضت تستلم الشحنة، رسوم الإرجاع الإجبارية ممكن تتخصم من أي طلب جديد."
              : "If you chose cash on delivery and refuse the shipment, the carrier's mandatory return fee may be deducted from any subsequent order."}
          </Body>
        </Section>

        <RelatedLinks
          isAr={isAr}
          items={[
            {
              href: `/${locale}/track`,
              ar: "تتبع طلبك دلوقتي",
              en: "Track your order now",
            },
            {
              href: `/${locale}/faq`,
              ar: "الأسئلة الشائعة — قسم الشحن",
              en: "FAQ — Shipping section",
            },
            {
              href: `/${locale}/refund-policy`,
              ar: "سياسة الإرجاع والاسترداد",
              en: "Refund & return policy",
            },
            {
              href: `/${locale}/contact`,
              ar: "تواصل معنا للاستفسارات",
              en: "Contact us with any questions",
            },
          ]}
        />
      </div>
    </article>
  );
}
