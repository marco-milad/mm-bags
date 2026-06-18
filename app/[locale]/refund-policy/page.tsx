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
  Step,
} from "@/components/policy/PolicyComponents";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/refund-policy">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const isAr = locale === "ar";
  return {
    title: isAr
      ? "سياسة الإرجاع والاسترداد | M.M Bags"
      : "Refund & Return Policy | M.M Bags",
    description: isAr
      ? "اعرف خطوات إرجاع شنطة M.M Bags خلال 14 يوم: الحالات المؤهلة، طريقة الاسترداد، ومتى نتحمل مصاريف الشحن."
      : "Learn how to return an M.M Bags piece within 14 days — eligibility, refund timing, and when we cover the return shipping.",
    alternates: localeAlternates("/refund-policy"),
  };
}

export default async function RefundPolicyPage({
  params,
}: PageProps<"/[locale]/refund-policy">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const isAr = locale === "ar";

  return (
    <article className="bg-[var(--color-bg)]">
      <PolicyHeader
        eyebrow={isAr ? "السياسات" : "Policies"}
        title={isAr ? "سياسة الإرجاع والاسترداد" : "Refund & Return Policy"}
        subtitle={
          isAr
            ? "كل اللي محتاج تعرفه عشان ترجع منتج أو تطلب استرداد."
            : "Everything you need to know about returning a piece or claiming a refund."
        }
        updated={isAr ? "آخر تحديث: يونيو 2026" : "Last updated: June 2026"}
      />

      <div className="mx-auto max-w-3xl space-y-10 px-4 pb-20 md:px-6 md:pb-24">
        <Section title={isAr ? "نظرة سريعة" : "At a glance"}>
          <ul className="space-y-2 ps-0 [&>li]:list-none">
            <Bullet isAr={isAr}>
              {isAr
                ? "عندك 14 يوم من يوم استلام الطلب ترجع المنتج أو تستبدله."
                : "You have 14 days from the day you receive your order to return or exchange."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "المنتج لازم يكون جديد، في عبوته الأصلية، ومعاه الفاتورة."
                : "The piece must be unused, in its original packaging, with the invoice included."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "لو في عيب تصنيع، إحنا نتحمل مصاريف الإرجاع — ضمان كامل لمدة سنة."
                : "If there's a manufacturing defect, we cover return shipping — full one-year warranty."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "الاسترداد بنفس طريقة الدفع اللي استخدمتها أول مرة."
                : "Refunds are issued to the same payment method used at checkout."}
            </Bullet>
          </ul>
        </Section>

        <Section title={isAr ? "متى يحق لك الإرجاع" : "When you can return"}>
          <Body isAr={isAr}>
            {isAr
              ? "يحق لك إرجاع أي منتج خلال 14 يوم من تاريخ استلامك للطلب، طول ما المنتج بحالته الأصلية: جديد، غير مستخدم، في عبوته السليمة، ومعاه فاتورة الشراء. لو حد تاني استلم الطلب نيابة عنك، التاريخ بيبدأ من ساعة الاستلام الفعلي."
              : "You may return any piece within 14 days of delivery, provided it's in its original condition — unused, in undamaged packaging, with the purchase invoice included. If someone received the order on your behalf, the 14-day window starts from the actual delivery time."}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "بعد الـ 14 يوم، الطلب بيدخل تحت بنود الضمان فقط (يعني عيوب التصنيع). تفاصيل الضمان موضحة بالأسفل."
              : "After the 14-day window, returns are only accepted under the manufacturing warranty (details below)."}
          </Body>
        </Section>

        <Section title={isAr ? "حالات مش مغطاة بالإرجاع" : "What we can't take back"}>
          <Body isAr={isAr}>
            {isAr
              ? "في حالات معينة مش بنقدر نقبل فيها الإرجاع، عشان نضمن جودة المنتجات لكل عملائنا:"
              : "There are a few cases where we can't accept a return, so we can keep quality consistent for every customer:"}
          </Body>
          <ul className="space-y-2">
            <Bullet isAr={isAr}>
              {isAr
                ? "منتجات اتفتحت واستُخدمت بشكل واضح."
                : "Items that have clearly been opened and used."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "منتجات نزل عليها خصم نهائي (نوضحها وقت الشراء)."
                : "Items sold under a final-sale label (clearly flagged at checkout)."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "منتجات بعبوة ناقصة أو تالفة بسبب الاستخدام."
                : "Items with missing or use-damaged packaging."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "طلبات اتعدى عليها الـ 14 يوم من الاستلام."
                : "Orders past the 14-day window from delivery."}
            </Bullet>
          </ul>
        </Section>

        <Section title={isAr ? "خطوات الإرجاع" : "How the return works"}>
          <ol className="space-y-3 ps-0 [&>li]:list-none">
            <Step n={1} isAr={isAr}>
              {isAr ? (
                <>
                  ابعتلنا على{" "}
                  <a
                    href="https://wa.me/201229749608"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                  >
                    WhatsApp
                  </a>{" "}
                  أو من خلال{" "}
                  <Link
                    href={`/${locale}/contact`}
                    className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                  >
                    صفحة التواصل
                  </Link>
                  ، واكتب رقم الطلب وسبب الإرجاع.
                </>
              ) : (
                <>
                  Message us on{" "}
                  <a
                    href="https://wa.me/201229749608"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                  >
                    WhatsApp
                  </a>{" "}
                  or use our{" "}
                  <Link
                    href={`/${locale}/contact`}
                    className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                  >
                    contact page
                  </Link>
                  , and share your order number and the reason for the return.
                </>
              )}
            </Step>
            <Step n={2} isAr={isAr}>
              {isAr
                ? "هنرد عليك خلال 24 ساعة عمل ونؤكد قبول الإرجاع، ونرتب لك معاد استلام المنتج من العنوان."
                : "We'll reply within one business day to confirm the return and schedule a pickup from your address."}
            </Step>
            <Step n={3} isAr={isAr}>
              {isAr
                ? "بعد ما يوصلنا المنتج، بنفحصه خلال 3 أيام عمل ونؤكد الاسترداد."
                : "Once it reaches us, we inspect it within 3 business days and confirm the refund."}
            </Step>
            <Step n={4} isAr={isAr}>
              {isAr
                ? "الاسترداد بنفس طريقة الدفع — كارت بيرجع للكارت، الدفع عند الاستلام بنتفق معاك على تحويل بنكي أو محفظة إلكترونية."
                : "The refund is issued to your original payment method — card refunds return to the card; cash-on-delivery refunds are settled by bank transfer or e-wallet of your choice."}
            </Step>
          </ol>
        </Section>

        <Section title={isAr ? "مصاريف شحن الإرجاع" : "Return shipping costs"}>
          <Body isAr={isAr}>
            {isAr
              ? "لو رجعت المنتج لأنك غيرت رأيك أو طلبت مقاس / لون مختلف، بتتحمل مصاريف شحن الإرجاع (في حدود 50 ج.م لمعظم المحافظات)."
              : "If you're returning because you changed your mind or want a different size or colour, you cover the return shipping (typically LE 50 across most governorates)."}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "أما لو المنتج فيه عيب تصنيع أو وصل تالف، إحنا نتحمل المصاريف بالكامل — كل اللي عليك تبعتلنا صورة توضح المشكلة قبل ما نرتب الاستلام."
              : "If the piece has a manufacturing defect or arrived damaged, we cover the return shipping fully — just send us a photo showing the issue before we schedule the pickup."}
          </Body>
        </Section>

        <Section title={isAr ? "ضمان السنة" : "One-year warranty"}>
          <Body isAr={isAr}>
            {isAr
              ? "كل شنطة M.M Bags بتيجي بضمان سنة كاملة ضد عيوب التصنيع. الضمان بيغطي مشاكل العجلات، الزرار، السحابات، والهيكل الخارجي في حالات الاستخدام العادي."
              : "Every M.M Bags piece comes with a full one-year warranty against manufacturing defects. The warranty covers wheel, handle, zipper, and shell issues under normal use."}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "الضمان ما بيشملش الأضرار الناتجة عن إساءة الاستخدام، السقوط، أو الحوادث. لتفعيل الضمان، تواصل معنا ومعاك فاتورة الشراء وصور توضح المشكلة."
              : "The warranty doesn't cover damage from misuse, drops, or accidents. To claim it, contact us with your purchase invoice and photos of the issue."}
          </Body>
        </Section>

        <RelatedLinks
          isAr={isAr}
          items={[
            {
              href: `/${locale}/faq`,
              ar: "الأسئلة الشائعة — قسم الإرجاع والضمان",
              en: "FAQ — Returns & Warranty section",
            },
            {
              href: `/${locale}/shipping-policy`,
              ar: "سياسة الشحن والتوصيل",
              en: "Shipping policy",
            },
            {
              href: `/${locale}/track`,
              ar: "تتبع طلبك",
              en: "Track your order",
            },
            {
              href: `/${locale}/contact`,
              ar: "تواصل معنا مباشرة",
              en: "Contact us directly",
            },
          ]}
        />
      </div>
    </article>
  );
}
