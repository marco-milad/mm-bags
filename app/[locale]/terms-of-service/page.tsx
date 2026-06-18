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
}: PageProps<"/[locale]/terms-of-service">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const isAr = locale === "ar";
  return {
    title: isAr
      ? "شروط الاستخدام | M.M Bags"
      : "Terms of Service | M.M Bags",
    description: isAr
      ? "الشروط القانونية لاستخدام موقع M.M Bags والشراء منه — الحساب، الطلبات، الملكية الفكرية، القانون الحاكم، وحدود المسؤولية."
      : "The legal terms for using M.M Bags and shopping with us — account rules, orders, intellectual property, governing law, and liability limits.",
    alternates: localeAlternates("/terms-of-service"),
  };
}

export default async function TermsOfServicePage({
  params,
}: PageProps<"/[locale]/terms-of-service">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const isAr = locale === "ar";

  return (
    <article className="bg-[var(--color-bg)]">
      <PolicyHeader
        eyebrow={isAr ? "السياسات" : "Policies"}
        title={isAr ? "شروط الاستخدام" : "Terms of Service"}
        subtitle={
          isAr
            ? "الشروط دي بتحكم العلاقة بينك وبين M.M Bags — اقرأها قبل ما تتسوق."
            : "These terms govern your relationship with M.M Bags — please read them before you shop."
        }
        updated={isAr ? "آخر تحديث: يونيو 2026" : "Last updated: June 2026"}
      />

      <div className="mx-auto max-w-3xl space-y-10 px-4 pb-20 md:px-6 md:pb-24">
        <Section title={isAr ? "1. مقدمة وقبول الشروط" : "1. Introduction & acceptance"}>
          <Body isAr={isAr}>
            {isAr
              ? 'M.M Bags هو متجر إلكتروني مصري ومقره القاهرة، متخصص في شنط السفر والظهر والمدارس وشنط اليد، تحت إدارة ماركو ميلاد ("إحنا" / "M.M Bags"). الموقع موجود على mmbags.com وصفحاته الفرعية.'
              : 'M.M Bags is an Egyptian online retailer headquartered in Cairo, specialising in travel, school, and everyday bags, operated by Marco Milad ("we" / "M.M Bags"). The store lives at mmbags.com and its sub-pages.'}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "باستخدامك للموقع، تصفح المنتجات، أو إتمام أي طلب، أنت بتأكد إنك قرأت الشروط دي وموافق عليها بالكامل. لو مش موافق على أي بند، الرجاء عدم استخدام الموقع."
              : "By using the site, browsing products, or completing any order, you confirm you've read these terms and agree to them in full. If you don't agree to any clause, please stop using the site."}
          </Body>
        </Section>

        <Section title={isAr ? "2. الأهلية لاستخدام الموقع" : "2. Eligibility"}>
          <Body isAr={isAr}>
            {isAr
              ? "لازم تكون 18 سنة فأكتر عشان تنشئ حساب أو تأكد طلب على الموقع. لو أقل من 18، تقدر تستخدم الموقع تحت إشراف وليّ أمر يتحمل المسؤولية القانونية عن أي شراء."
              : "You must be 18 or older to create an account or place an order. Customers under 18 may use the site under the supervision of a guardian, who assumes legal responsibility for any purchase."}
          </Body>
        </Section>

        <Section title={isAr ? "3. الحساب وأمان الدخول" : "3. Account & login security"}>
          <Body isAr={isAr}>
            {isAr
              ? "وقت إنشاء الحساب، البيانات اللي بتدخلها (الاسم، الإيميل، رقم الموبايل) لازم تكون صحيحة ومحدثة. أنت المسؤول عن سرية بيانات دخولك، وكل النشاط اللي بيحصل على الحساب بيتحسب عليك."
              : "When you create an account, the details you submit (name, email, phone) must be accurate and up to date. You are responsible for the confidentiality of your login credentials, and any activity on your account is attributed to you."}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "لو شككت إن في حد دخل على حسابك من غير إذنك، تواصل معنا فوراً عشان نأمن الحساب."
              : "If you suspect anyone has accessed your account without your permission, contact us immediately so we can secure it."}
          </Body>
        </Section>

        <Section title={isAr ? "4. المنتجات والأسعار" : "4. Products, pricing & availability"}>
          <Body isAr={isAr}>
            {isAr
              ? "بنبذل مجهود كامل عشان نعرض المنتجات بدقة — صور، ألوان، ومقاسات — لكن ممكن تظهر فروق طفيفة في اللون بين الصورة والمنتج الفعلي بسبب إعدادات الشاشة. أي مقاسات بيتم ذكرها تقديرية بهامش بسيط."
              : "We do our best to represent each product accurately — photos, colours, and dimensions — but minor colour variation between the photo and the actual piece is possible due to screen settings. Any dimensions are approximate, within reasonable tolerance."}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "الأسعار بالجنيه المصري وشاملة الضرائب المطبقة. بنحتفظ بحقنا في تعديل الأسعار أو إيقاف بيع منتج في أي وقت من غير إنذار مسبق، لكن السعر اللي اتأكد عليه طلبك ساعة الـ checkout هو السعر الملزم."
              : "Prices are in Egyptian Pounds and include applicable taxes. We reserve the right to change prices or discontinue any product at any time without prior notice — but the price confirmed at checkout is the binding price for that order."}
          </Body>
        </Section>

        <Section title={isAr ? "5. الطلبات والدفع" : "5. Orders & payment"}>
          <Body isAr={isAr}>
            {isAr
              ? "بمجرد تأكيد الطلب، بتاخد رسالة تأكيد على الإيميل أو WhatsApp. التأكيد ده مش قبول نهائي للطلب — بنحتفظ بحقنا نرفض أو نلغي أي طلب لأسباب زي نفاذ المخزون، شك في التحايل، أو خطأ واضح في السعر."
              : "Once you confirm an order, you'll receive a confirmation by email or WhatsApp. This confirmation is not a final acceptance — we reserve the right to refuse or cancel any order due to stock-outs, suspected fraud, or an obvious pricing error."}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "وسائل الدفع المتاحة: بطاقات الكارت (Visa / Mastercard / Meeza)، التقسيط عن طريق Valu و Sympl، أو الدفع عند الاستلام. كل وسيلة دفع بشروطها زي رسوم الدفع عند الاستلام (25 ج.م إضافية)."
              : "Accepted payment methods: card payments (Visa / Mastercard / Meeza), instalments via Valu and Sympl, or cash on delivery. Each method has its own terms, such as the LE 25 cash-on-delivery surcharge."}
          </Body>
        </Section>

        <Section title={isAr ? "6. الشحن وانتقال المخاطر" : "6. Shipping & risk transfer"}>
          <Body isAr={isAr}>
            {isAr ? (
              <>
                مواعيد التوصيل والتكاليف موضحة في{" "}
                <Link
                  href={`/${locale}/shipping-policy`}
                  className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                >
                  سياسة الشحن
                </Link>
                . المواعيد دي تقديرية — مش بنتحمل مسؤولية تأخيرات لأسباب خارج عن إرادتنا (طقس، أعطال نقل، أحداث طارئة).
              </>
            ) : (
              <>
                Delivery windows and fees are detailed in our{" "}
                <Link
                  href={`/${locale}/shipping-policy`}
                  className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                >
                  shipping policy
                </Link>
                . Those windows are estimates — we don't accept liability for delays caused by events outside our control (weather, carrier disruption, force majeure).
              </>
            )}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "ملكية المنتج ومسؤولية الفقدان أو التلف بتنتقل إليك بمجرد ما المندوب يسلمك الشحنة على العنوان المسجل."
              : "Ownership and risk of loss or damage transfer to you the moment the courier hands the shipment over at your registered address."}
          </Body>
        </Section>

        <Section title={isAr ? "7. الإرجاع والاسترداد" : "7. Returns & refunds"}>
          <Body isAr={isAr}>
            {isAr ? (
              <>
                إجراءات الإرجاع والاسترداد، والحالات المؤهلة لكل واحد، موضحة في{" "}
                <Link
                  href={`/${locale}/refund-policy`}
                  className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                >
                  سياسة الإرجاع
                </Link>
                . البنود اللي هناك بتعتبر جزء لا يتجزأ من شروط الاستخدام دي.
              </>
            ) : (
              <>
                The return process and the cases that qualify for a refund are set out in our{" "}
                <Link
                  href={`/${locale}/refund-policy`}
                  className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                >
                  refund policy
                </Link>
                . Those terms form an integral part of these Terms of Service.
              </>
            )}
          </Body>
        </Section>

        <Section title={isAr ? "8. الملكية الفكرية" : "8. Intellectual property"}>
          <Body isAr={isAr}>
            {isAr
              ? "كل المحتوى المعروض على الموقع — اللوجو، الاسم التجاري، صور المنتجات، النصوص، التصميمات، والكود — ملك حصري لـ M.M Bags ومحمي بقوانين الملكية الفكرية المصرية والدولية."
              : "All content on the site — the logo, brand name, product photography, copy, design, and code — is the exclusive property of M.M Bags and is protected by Egyptian and international intellectual-property law."}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "تقدر تشوف المحتوى وتشاركه على حسابك الشخصي بشكل غير تجاري. ممنوع نسخه أو إعادة استخدامه لأغراض تجارية، أو إعادة بيع المنتجات تحت اسم تاني، من غير إذن كتابي صريح منا."
              : "You may view and share content on your personal social accounts for non-commercial purposes. Copying it for commercial use, or reselling our products under a different brand, requires our express written permission."}
          </Body>
        </Section>

        <Section title={isAr ? "9. الاستخدامات الممنوعة" : "9. Prohibited uses"}>
          <Body isAr={isAr}>
            {isAr
              ? "بمنع استخدام الموقع لأي غرض من دول:"
              : "You may not use the site for any of the following:"}
          </Body>
          <ul className="space-y-2">
            <Bullet isAr={isAr}>
              {isAr
                ? "أي نشاط مخالف للقوانين المصرية أو الدولية، أو لمصلحة طرف ثالث بطريقة غير قانونية."
                : "Any activity that violates Egyptian or international law, or harms a third party unlawfully."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "محاولة الدخول بدون إذن، اختبار اختراق، أو تشغيل أدوات scraping على الموقع."
                : "Attempting unauthorised access, security testing, or running scraping tools against the site."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "نشر محتوى تشهيري، عنصري، أو يحرض على الكراهية في التقييمات أو نماذج التواصل."
                : "Posting defamatory, racist, or hate-filled content via reviews or contact forms."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "إنشاء طلبات وهمية، أو استخدام بيانات دفع غير مصرح بها."
                : "Placing fake orders or using payment details you don't have permission to use."}
            </Bullet>
          </ul>
          <Body isAr={isAr}>
            {isAr
              ? "أي مخالفة للبنود دي ممكن تأدي لإغلاق الحساب فوراً وملاحقة قانونية لو الموقف اقتضى."
              : "Any breach of these clauses may result in immediate account suspension and legal action where warranted."}
          </Body>
        </Section>

        <Section title={isAr ? "10. إخلاء المسؤولية" : "10. Disclaimer of warranties"}>
          <Body isAr={isAr}>
            {isAr
              ? 'الموقع وكل خدماته بتقدم "كما هي" بدون أي ضمانات صريحة أو ضمنية تتعدى الضمانات المنصوص عليها قانوناً وفي سياسة الإرجاع. مش بنضمن إن الموقع هيكون متاح بدون توقف، أو خالي من الأخطاء، أو إن النتائج اللي بتطلع منه هتطابق توقعاتك تماماً.'
              : 'The site and all its services are provided "as is" without any warranty — express or implied — beyond what is guaranteed by law and our refund policy. We do not warrant that the site will be uninterrupted, error-free, or that any results will exactly meet your expectations.'}
          </Body>
        </Section>

        <Section title={isAr ? "11. حدود المسؤولية" : "11. Limitation of liability"}>
          <Body isAr={isAr}>
            {isAr
              ? "في حدود ما يسمح به القانون، إجمالي مسؤولية M.M Bags عن أي مطالبة مرتبطة بالموقع أو بالطلب لا يتعدى قيمة الطلب اللي نشأت منه المطالبة. مش بنتحمل أي أضرار غير مباشرة، تبعية، أو فقدان ربح، تحت أي ظرف."
              : "To the extent permitted by law, M.M Bags' aggregate liability for any claim related to the site or your order is capped at the value of the order that gave rise to the claim. We are not liable for any indirect, consequential, or lost-profit damages under any circumstances."}
          </Body>
        </Section>

        <Section title={isAr ? "12. التعويض" : "12. Indemnification"}>
          <Body isAr={isAr}>
            {isAr
              ? "بتوافق إنك تعوض M.M Bags وموظفيها عن أي خسارة، مطالبة، أو مصاريف (بما فيها أتعاب المحاماة المعقولة) تنشأ من خرقك للشروط دي، أو أي استخدام منك للموقع بشكل غير قانوني."
              : "You agree to indemnify M.M Bags and its staff against any loss, claim, or expense (including reasonable legal fees) arising from your breach of these terms or any unlawful use of the site by you."}
          </Body>
        </Section>

        <Section title={isAr ? "13. إنهاء الخدمة" : "13. Termination"}>
          <Body isAr={isAr}>
            {isAr
              ? "بنحتفظ بحقنا في إنهاء أو إيقاف حسابك أو وصولك للموقع في أي وقت، وبدون إنذار، لو خرقت الشروط دي أو شاركت في نشاط بنعتبره ضار بالموقع أو بعملائنا."
              : "We reserve the right to terminate or suspend your account or access to the site at any time, without notice, if you breach these terms or engage in activity we consider harmful to the store or to other customers."}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "بنود الملكية الفكرية، حدود المسؤولية، والتعويض بتفضل سارية حتى بعد إنهاء استخدامك للموقع."
              : "The clauses on intellectual property, limitation of liability, and indemnification survive any termination of your use of the site."}
          </Body>
        </Section>

        <Section title={isAr ? "14. الخصوصية" : "14. Privacy"}>
          <Body isAr={isAr}>
            {isAr
              ? "بنحترم بياناتك الشخصية ومش بنبيعها لطرف ثالث. بنستخدم البيانات اللي بتدخلها بس عشان نجهز الطلبات، نتواصل معاك بخصوص خدمتك، ونحسّن تجربتك على الموقع. التفاصيل الكاملة لجمع البيانات واستخدامها بنشرها في سياسة خصوصية منفصلة عند صدورها."
              : "We respect your personal data and don't sell it to third parties. The information you submit is used solely to fulfil your orders, communicate with you about service, and improve your experience on the site. A separate privacy policy will detail collection and use practices in full when published."}
          </Body>
        </Section>

        <Section title={isAr ? "15. القانون الحاكم والاختصاص" : "15. Governing law & jurisdiction"}>
          <Body isAr={isAr}>
            {isAr
              ? "الشروط دي بتخضع لقوانين جمهورية مصر العربية. أي نزاع ينشأ عن استخدامك للموقع أو الشراء منه بيكون من اختصاص المحاكم المختصة في القاهرة بشكل حصري."
              : "These terms are governed by the laws of the Arab Republic of Egypt. Any dispute arising from your use of the site or purchases from it falls under the exclusive jurisdiction of the competent courts in Cairo."}
          </Body>
        </Section>

        <Section title={isAr ? "16. تعديلات على الشروط" : "16. Changes to these terms"}>
          <Body isAr={isAr}>
            {isAr
              ? "ممكن نعدّل الشروط دي في أي وقت لما يكون فيه تغيير في قوانين العمل أو في طريقة تشغيل المتجر. كل نسخة بتاخد تاريخ تحديث في أعلى الصفحة. استمرارك في استخدام الموقع بعد التعديل اعتباره موافقة على النسخة الجديدة."
              : "We may update these terms whenever business law or store operations change. Each version carries an update date at the top of the page. Continued use of the site after a change is taken as acceptance of the new version."}
          </Body>
        </Section>

        <Section title={isAr ? "17. التواصل" : "17. Contact"}>
          <Body isAr={isAr}>
            {isAr ? (
              <>
                لأي استفسار قانوني أو شكوى متعلقة بالشروط دي، تواصل معنا من خلال{" "}
                <Link
                  href={`/${locale}/contact`}
                  className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                >
                  صفحة التواصل
                </Link>{" "}
                أو على البريد marco@mmbags.com. بنرد خلال 48 ساعة عمل.
              </>
            ) : (
              <>
                For any legal question or complaint regarding these terms, reach out via our{" "}
                <Link
                  href={`/${locale}/contact`}
                  className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                >
                  contact page
                </Link>{" "}
                or by email at marco@mmbags.com. We respond within two business days.
              </>
            )}
          </Body>
        </Section>

        <RelatedLinks
          isAr={isAr}
          items={[
            {
              href: `/${locale}/refund-policy`,
              ar: "سياسة الإرجاع والاسترداد",
              en: "Refund & return policy",
            },
            {
              href: `/${locale}/shipping-policy`,
              ar: "سياسة الشحن والتوصيل",
              en: "Shipping & delivery policy",
            },
            {
              href: `/${locale}/faq`,
              ar: "الأسئلة الشائعة",
              en: "Frequently asked questions",
            },
            {
              href: `/${locale}/contact`,
              ar: "صفحة التواصل",
              en: "Contact page",
            },
          ]}
        />
      </div>
    </article>
  );
}
