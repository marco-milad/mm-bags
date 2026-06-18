import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { localeAlternates } from "@/lib/seo/site";
import {
  Body,
  Bullet,
  PolicyHeader,
  RelatedLinks,
  Section,
} from "@/components/policy/PolicyComponents";

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
      ? "تفاصيل الشحن لكل 27 محافظة في مصر — مواعيد التوصيل، تكلفة الشحن، الشحن السريع، وتتبع الطلب."
      : "How M.M Bags ships across all 27 Egyptian governorates — delivery windows, fees, express options, and order tracking.",
    alternates: localeAlternates("/shipping-policy"),
  };
}

export default async function ShippingPolicyPage({
  params,
}: PageProps<"/[locale]/shipping-policy">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const isAr = locale === "ar";

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
        updated={isAr ? "آخر تحديث: يونيو 2026" : "Last updated: June 2026"}
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
                ? "التوصيل عادةً بياخد من 2 لـ 5 أيام عمل حسب المحافظة."
                : "Delivery typically takes 2–5 business days, depending on the governorate."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "الشحن بـ 50 ج.م، ومجاني لأي طلب فوق 1,500 ج.م."
                : "Shipping is LE 50, and free on every order over LE 1,500."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "في القاهرة والجيزة، الشحن السريع متاح خلال 24 ساعة."
                : "Express delivery in Cairo and Giza arrives within 24 hours."}
            </Bullet>
          </ul>
        </Section>

        <Section title={isAr ? "مواعيد تجهيز الطلب" : "Order processing"}>
          <Body isAr={isAr}>
            {isAr
              ? "بنبدأ نجهز طلبك بمجرد ما يتأكد. أغلب الطلبات بتطلع من المخزن في خلال يوم عمل أو اتنين على الأكثر، وبتاخد رسالة WhatsApp أو SMS بمجرد ما الشحنة تخرج للمندوب."
              : "We start processing your order the moment it's confirmed. Most orders leave our warehouse within one to two business days, and you'll receive a WhatsApp or SMS notification the moment your shipment is handed to the courier."}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "أيام الجمعة والأجازات الرسمية مش محسوبة من أيام العمل، لكن بنستقبل الطلبات على مدار الأسبوع."
              : "Fridays and public holidays don't count as business days, but you can place orders any day of the week."}
          </Body>
        </Section>

        <Section title={isAr ? "مدة التوصيل حسب المنطقة" : "Delivery windows by region"}>
          <Body isAr={isAr}>
            {isAr
              ? "المواعيد دي تقديرية وبتبدأ من ساعة ما الشحنة تخرج للمندوب — مش من ساعة تأكيد الطلب:"
              : "These windows are estimates that start the moment the shipment is handed to the courier — not when you confirm the order:"}
          </Body>
          <ul className="space-y-2">
            <Bullet isAr={isAr}>
              {isAr
                ? "القاهرة الكبرى والجيزة: يوم لـ يومين عمل."
                : "Greater Cairo & Giza: 1–2 business days."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "الإسكندرية ومدن الدلتا والقناة: يومين لـ 3 أيام عمل."
                : "Alexandria, Delta, and Canal cities: 2–3 business days."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "محافظات الصعيد والساحل الشمالي والبحر الأحمر: 3 لـ 5 أيام عمل."
                : "Upper Egypt, North Coast, and Red Sea governorates: 3–5 business days."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "المناطق النائية: ممكن توصل لـ 7 أيام عمل، وبنعلمك مسبقًا لو الأمر هياخد وقت أطول."
                : "Remote areas: may reach 7 business days; we'll flag this up front if so."}
            </Bullet>
          </ul>
        </Section>

        <Section title={isAr ? "تكلفة الشحن" : "Shipping fees"}>
          <Body isAr={isAr}>
            {isAr
              ? "تكلفة الشحن ثابتة 50 ج.م لكل المحافظات. الطلبات اللي إجماليها يعدي 1,500 ج.م بتيجي بشحن مجاني تلقائياً عند الـ checkout."
              : "Shipping is a flat LE 50 to every governorate. Orders that exceed LE 1,500 ship free automatically at checkout."}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "لو اخترت الدفع عند الاستلام، في رسوم إضافية 25 ج.م على الطلب بيغطيها مزود الخدمة الخارجي."
              : "If you choose cash on delivery, an additional LE 25 fee applies — charged by the third-party COD provider."}
          </Body>
        </Section>

        <Section title={isAr ? "الشحن السريع — 24 ساعة" : "Express delivery — 24 hours"}>
          <Body isAr={isAr}>
            {isAr
              ? "متاح في القاهرة الكبرى والجيزة. لو طلبت قبل الساعة 4 العصر في يوم عمل، الطلب بيوصل خلال 24 ساعة (يعني تاني يوم على الأكثر)."
              : "Available throughout Greater Cairo and Giza. Order before 4 PM on a business day and we deliver within 24 hours."}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "الشحن السريع رسوم إضافية 75 ج.م فوق رسوم الشحن العادية. اختار الخدمة من صفحة الـ checkout قبل تأكيد الطلب."
              : "Express service adds LE 75 on top of standard shipping. Select it at checkout before confirming your order."}
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
