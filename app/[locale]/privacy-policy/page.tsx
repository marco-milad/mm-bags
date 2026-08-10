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
}: PageProps<"/[locale]/privacy-policy">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const isAr = locale === "ar";
  return {
    title: isAr
      ? "سياسة الخصوصية | M.M Bags"
      : "Privacy Policy | M.M Bags",
    description: isAr
      ? "بياناتك في M.M Bags — إيه اللي بنجمعه، ليه، مع مين بنشاركه، وحقوقك تحت قانون حماية البيانات المصري (١٥١ لسنة ٢٠٢٠)."
      : "Your data at M.M Bags — what we collect, why, who we share it with, and your rights under Egypt's Personal Data Protection Law (151/2020).",
    alternates: localeAlternates("/privacy-policy"),
  };
}

export default async function PrivacyPolicyPage({
  params,
}: PageProps<"/[locale]/privacy-policy">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const isAr = locale === "ar";

  return (
    <article className="bg-[var(--color-bg)]">
      <PolicyHeader
        eyebrow={isAr ? "السياسات" : "Policies"}
        title={isAr ? "سياسة الخصوصية" : "Privacy Policy"}
        subtitle={
          isAr
            ? "بياناتك ليك. هنا شرح واضح لكل ما نجمعه، ليه، ومع مين بنشاركه."
            : "Your data is yours. Here's a clear breakdown of what we collect, why, and who we share it with."
        }
        updated={isAr ? "آخر تحديث: يونيو 2026" : "Last updated: June 2026"}
      />

      <div className="mx-auto max-w-3xl space-y-10 px-4 pb-20 md:px-6 md:pb-24">
        <Section title={isAr ? "نظرة سريعة" : "At a glance"}>
          <ul className="space-y-2 ps-0 [&>li]:list-none">
            <Bullet isAr={isAr}>
              {isAr
                ? "بنجمع بس البيانات اللي محتاجينها عشان نوصّلك طلبك ونتواصل معاك."
                : "We collect only what we need to fulfil your order and stay in touch."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "ما بنبيعش بياناتك لحد ولا بنستخدمها في إعلانات خارجية."
                : "We never sell your data or use it for third-party advertising."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "من حقك تعرف اللي عندنا عنك، تصحّحه، أو تطلب حذفه في أي وقت."
                : "You have the right to access, correct, or delete your data at any time."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "بنستخدم مقدمي خدمات موثوقين (Supabase، Paymob، Twilio، Resend، Vercel) — كلهم ملتزمين بمعايير أمان الصناعة."
                : "We use trusted service providers (Supabase, Paymob, Twilio, Resend, Vercel) — all bound by industry-standard security."}
            </Bullet>
          </ul>
        </Section>

        <Section title={isAr ? "البيانات اللي بنجمعها" : "What we collect"}>
          <Body isAr={isAr}>
            {isAr
              ? "بنجمع البيانات دي عشان نقدر نخدمك، ومحدش تاني:"
              : "We collect the following categories of data, and no others:"}
          </Body>
          <ul className="space-y-2">
            <Bullet isAr={isAr}>
              <strong>
                {isAr ? "بيانات الحساب: " : "Account data: "}
              </strong>
              {isAr
                ? "إيميلك واسمك — لما تسجّل حساب أو تشترك في الـ newsletter."
                : "Your email and name — when you register an account or subscribe to the newsletter."}
            </Bullet>
            <Bullet isAr={isAr}>
              <strong>
                {isAr ? "بيانات الطلب: " : "Order data: "}
              </strong>
              {isAr
                ? "الاسم، رقم التليفون، عنوان الشحن، المنتجات، وتفاصيل الدفع (كارت أو دفع عند الاستلام)."
                : "Name, phone, shipping address, purchased items, and payment method (card or COD)."}
            </Bullet>
            <Bullet isAr={isAr}>
              <strong>
                {isAr ? "بيانات الدفع: " : "Payment data: "}
              </strong>
              {isAr
                ? "أرقام الكارت بتتعامل معاها Paymob مباشرة — إحنا مش بنشوفها ولا بنحفظها. بنستقبل بس مرجع للطلب وحالة الدفع."
                : "Card numbers are handled directly by Paymob — we never see or store them. We only receive a transaction reference and the payment status."}
            </Bullet>
            <Bullet isAr={isAr}>
              <strong>
                {isAr ? "التقييمات والمراجعات: " : "Reviews: "}
              </strong>
              {isAr
                ? "لما تشارك رأيك في منتج، بنحفظ الاسم اللي دخلته، المحافظة (اختياري)، ونص المراجعة."
                : "When you share a product review, we store the name you provided, your governorate (optional), and the review text."}
            </Bullet>
            <Bullet isAr={isAr}>
              <strong>
                {isAr ? "بيانات تقنية: " : "Technical data: "}
              </strong>
              {isAr
                ? "الـ IP، نوع المتصفح، وصفحات الموقع اللي زرتها — بنستخدمها بس عشان أمان الموقع وتحسينه."
                : "IP address, browser type, and pages visited — used only for site security and improvements."}
            </Bullet>
          </ul>
        </Section>

        <Section title={isAr ? "ليه بنجمع البيانات دي" : "Why we collect it"}>
          <Body isAr={isAr}>
            {isAr
              ? "كل نوع بيانات ليه سبب واضح ومباشر:"
              : "Every category has a clear, direct purpose:"}
          </Body>
          <ul className="space-y-2">
            <Bullet isAr={isAr}>
              {isAr
                ? "نوصّل طلبك للعنوان الصحيح ونتواصل معاك لو في مشكلة (رقم التليفون + العنوان)."
                : "To deliver your order to the correct address and reach you if there's an issue (phone + address)."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "نأكد عملية الدفع ونمنع الاحتيال (Paymob + إحنا)."
                : "To confirm payment and prevent fraud (Paymob + us)."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "نبعتلك تأكيد الطلب وتحديثات الشحن (WhatsApp + Email)."
                : "To send you order confirmations and shipping updates (WhatsApp + Email)."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "نبعتلك رسائل الـ newsletter لو انت اخترت تشترك — تقدر تلغي في أي وقت."
                : "To send you newsletter messages if you opted in — you can unsubscribe anytime."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "نحسّن تجربتك على الموقع ونحمي حسابك من أي محاولة اختراق."
                : "To improve your site experience and protect your account from abuse."}
            </Bullet>
          </ul>
        </Section>

        <Section title={isAr ? "مع مين بنشارك بياناتك" : "Who we share it with"}>
          <Body isAr={isAr}>
            {isAr
              ? "ما بنبيعش بياناتك أبداً. بنشاركها بس مع مقدمي خدمات محدودين، وبس بالقدر اللي محتاجينه عشان يقدروا يخدموك:"
              : "We never sell your data. We share it only with a small set of service providers, and only to the extent needed for them to serve you:"}
          </Body>
          <ul className="space-y-2">
            <Bullet isAr={isAr}>
              <strong>Supabase</strong>{" "}
              {isAr
                ? "— قاعدة البيانات وتخزين الصور. بيتحفظ فيها كل بيانات الحسابات والطلبات."
                : "— our database and file storage. Holds all account and order data."}
            </Bullet>
            <Bullet isAr={isAr}>
              <strong>Paymob</strong>{" "}
              {isAr
                ? "— بوابة الدفع بالكارت. بيستقبل بيانات الكارت مباشرة (إحنا مش بنشوفها)."
                : "— card payment gateway. Receives card details directly (we never see them)."}
            </Bullet>
            <Bullet isAr={isAr}>
              <strong>Twilio (WhatsApp)</strong>{" "}
              {isAr
                ? "— لإرسال رسائل WhatsApp لتأكيد الطلبات والتحديثات."
                : "— sends order confirmations and shipping updates via WhatsApp."}
            </Bullet>
            <Bullet isAr={isAr}>
              <strong>Resend</strong>{" "}
              {isAr
                ? "— لإرسال الإيميلات (تأكيد الاشتراك، كوبونات، إلخ)."
                : "— sends transactional emails (subscription confirmations, coupons, etc.)."}
            </Bullet>
            <Bullet isAr={isAr}>
              <strong>Vercel</strong>{" "}
              {isAr
                ? "— بيستضيف الموقع نفسه. بيرى الطلبات HTTP الجاية للـ site."
                : "— hosts the site itself. Sees inbound HTTP requests to the site."}
            </Bullet>
          </ul>
          <Body isAr={isAr}>
            {isAr
              ? "كل مقدم خدمة من دول عنده سياسة خصوصية خاصة بيه — ممكن تراجعها على موقعه الرسمي."
              : "Each of these providers has its own privacy policy — you can review each on their official site."}
          </Body>
        </Section>

        <Section title={isAr ? "حقوقك في بياناتك" : "Your data rights"}>
          <Body isAr={isAr}>
            {isAr
              ? "تحت قانون حماية البيانات الشخصية المصري (رقم 151 لسنة 2020)، ليك الحقوق دي:"
              : "Under Egypt's Personal Data Protection Law (151/2020), you have the following rights:"}
          </Body>
          <ul className="space-y-2">
            <Bullet isAr={isAr}>
              <strong>
                {isAr ? "حق الاطلاع: " : "Right of access: "}
              </strong>
              {isAr
                ? "تعرف إيه البيانات اللي عندنا عنك."
                : "Know what data we hold about you."}
            </Bullet>
            <Bullet isAr={isAr}>
              <strong>
                {isAr ? "حق التصحيح: " : "Right to correct: "}
              </strong>
              {isAr
                ? "تعدّل أي بيانات غلط."
                : "Fix any incorrect data."}
            </Bullet>
            <Bullet isAr={isAr}>
              <strong>
                {isAr ? "حق الحذف: " : "Right to erasure: "}
              </strong>
              {isAr
                ? "تطلب حذف حسابك وكل بياناتك — إلا في الحالات اللي القانون بيطلبنا نحتفظ بها (زي الفواتير للأغراض الضريبية)."
                : "Request deletion of your account and all data — except records the law requires us to keep (like invoices for tax purposes)."}
            </Bullet>
            <Bullet isAr={isAr}>
              <strong>
                {isAr ? "حق الاعتراض: " : "Right to object: "}
              </strong>
              {isAr
                ? "توقف الرسائل التسويقية في أي وقت — كل newsletter فيها لينك واضح للإلغاء."
                : "Stop marketing messages any time — every newsletter includes an unsubscribe link."}
            </Bullet>
            <Bullet isAr={isAr}>
              <strong>
                {isAr ? "حق نقل البيانات: " : "Right to portability: "}
              </strong>
              {isAr
                ? "تطلب نسخة من بياناتك بصيغة قابلة للقراءة."
                : "Request a copy of your data in a portable format."}
            </Bullet>
          </ul>
          <Body isAr={isAr}>
            {isAr ? (
              <>
                لتفعيل أي حق من دول، ابعتلنا على{" "}
                <a
                  href="mailto:miladmarco68@gmail.com"
                  className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                >
                  miladmarco68@gmail.com
                </a>{" "}
                أو من خلال{" "}
                <Link
                  href={`/${locale}/contact`}
                  className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                >
                  صفحة التواصل
                </Link>
                . هنرد خلال 7 أيام عمل.
              </>
            ) : (
              <>
                To exercise any of these rights, email us at{" "}
                <a
                  href="mailto:miladmarco68@gmail.com"
                  className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                >
                  miladmarco68@gmail.com
                </a>{" "}
                or use our{" "}
                <Link
                  href={`/${locale}/contact`}
                  className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                >
                  contact page
                </Link>
                . We reply within 7 business days.
              </>
            )}
          </Body>
        </Section>

        <Section title={isAr ? "مدة الاحتفاظ بالبيانات" : "How long we keep it"}>
          <Body isAr={isAr}>
            {isAr
              ? "بنحتفظ بالبيانات بس للمدة الضرورية:"
              : "We keep data only as long as strictly necessary:"}
          </Body>
          <ul className="space-y-2">
            <Bullet isAr={isAr}>
              {isAr
                ? "بيانات الحساب: لحد ما تحذف حسابك بنفسك أو تطلب حذفها."
                : "Account data: until you delete your account or request deletion."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "بيانات الطلبات والفواتير: 5 سنوات — مطلوبة قانونياً للأغراض الضريبية."
                : "Order and invoice records: 5 years — legally required for tax purposes."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "بيانات الـ newsletter: لحد ما تلغي الاشتراك."
                : "Newsletter data: until you unsubscribe."}
            </Bullet>
            <Bullet isAr={isAr}>
              {isAr
                ? "التقييمات: بتفضل معروضة على الموقع كجزء من محتوى المنتج، إلا لو طلبت حذفها."
                : "Reviews: remain displayed on the site as part of product content, unless you request removal."}
            </Bullet>
          </ul>
        </Section>

        <Section title={isAr ? "الكوكيز" : "Cookies"}>
          <Body isAr={isAr}>
            {isAr
              ? "بنستخدم عدد صغير جداً من الكوكيز الأساسية — بس اللي محتاجينها عشان الموقع يشتغل. مثلاً: تسجيل الدخول، لغة الموقع، ومحتويات عربة التسوّق. مفيش كوكيز إعلانية أو تتبّع خارجي."
              : "We use a very small set of essential cookies — only those needed for the site to work. Examples: login sessions, language preference, and shopping cart contents. We don't use advertising cookies or third-party tracking."}
          </Body>
        </Section>

        <Section title={isAr ? "أمان بياناتك" : "Data security"}>
          <Body isAr={isAr}>
            {isAr
              ? "بياناتك بتنتقل عبر اتصال مشفّر (HTTPS) وبتتخزن في قواعد بيانات آمنة عند Supabase مع Row-Level Security. الوصول للـ admin panel محدود ومحمي بمصادقة صارمة."
              : "Your data travels over encrypted HTTPS and is stored in Supabase's secure databases with Row-Level Security enabled. Admin panel access is restricted and protected by strict authentication."}
          </Body>
          <Body isAr={isAr}>
            {isAr
              ? "لو حصل أي اختراق للبيانات (لا سمح الله)، هنبلّغك في خلال 72 ساعة حسب متطلبات القانون."
              : "In the unlikely event of a data breach, we'll notify affected users within 72 hours as required by law."}
          </Body>
        </Section>

        <Section title={isAr ? "الأطفال" : "Children"}>
          <Body isAr={isAr}>
            {isAr
              ? "الموقع مش موجّه للأطفال تحت 16 سنة، ومش بنجمع بيانات منهم عن قصد. لو كنت ولي أمر واكتشفت إن طفلك سجّل بيانات، تواصل معانا وهنحذفها."
              : "This site is not intended for children under 16. We don't knowingly collect data from them. If you're a parent and discover your child submitted data, contact us and we'll delete it."}
          </Body>
        </Section>

        <Section title={isAr ? "تعديلات على السياسة" : "Changes to this policy"}>
          <Body isAr={isAr}>
            {isAr
              ? "لو عدّلنا في السياسة دي، هنحدث تاريخ 'آخر تحديث' في أعلى الصفحة. التعديلات الجوهرية بنبلّغ بيها المشتركين على الإيميل."
              : "If we update this policy, we'll change the 'last updated' date at the top. Material changes are announced to subscribers by email."}
          </Body>
        </Section>

        <Section title={isAr ? "تواصل معنا في أي سؤال" : "Contact us with any question"}>
          <Body isAr={isAr}>
            {isAr ? (
              <>
                لأي سؤال عن بياناتك أو ممارسة حقوقك، تواصل مع:{" "}
                <a
                  href="mailto:miladmarco68@gmail.com"
                  className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                >
                  miladmarco68@gmail.com
                </a>
                {" — "}
                ماركو ميلاد (مسؤول حماية البيانات في M.M Bags).
              </>
            ) : (
              <>
                For any question about your data or to exercise your rights,
                contact:{" "}
                <a
                  href="mailto:miladmarco68@gmail.com"
                  className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                >
                  miladmarco68@gmail.com
                </a>
                {" — "}
                Marco Milad (Data Protection Officer at M.M Bags).
              </>
            )}
          </Body>
        </Section>

        <RelatedLinks
          isAr={isAr}
          items={[
            {
              href: `/${locale}/terms-of-service`,
              ar: "شروط الاستخدام",
              en: "Terms of service",
            },
            {
              href: `/${locale}/refund-policy`,
              ar: "سياسة الإرجاع والاسترداد",
              en: "Refund & Return Policy",
            },
            {
              href: `/${locale}/shipping-policy`,
              ar: "سياسة الشحن",
              en: "Shipping policy",
            },
            {
              href: `/${locale}/contact`,
              ar: "تواصل معنا",
              en: "Contact us",
            },
          ]}
        />
      </div>
    </article>
  );
}
