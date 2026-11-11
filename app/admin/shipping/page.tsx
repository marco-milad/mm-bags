import { requireAdmin } from "@/lib/admin/auth";
import { getAdminLocale } from "@/lib/admin/locale";
import { addShippingZone, updateShippingZone } from "@/lib/admin/shipping-actions";
import { EG_GOVERNORATES } from "@/lib/checkout/governorates";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/checkout/schema";
import {
  COD_FEE_BAND,
  COD_FEE_BASE,
  COD_FEE_STEP,
  COURIER_NAME,
  DELIVERY_HOURS_MAX,
  DELIVERY_HOURS_MIN,
} from "@/lib/shipping/shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { cn, formatPriceEGP } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Shipping prices per area (0032). What the shopper pays at checkout is
 * read from here; placeOrder re-reads it, so a change applies to the next
 * order immediately. Areas are switched off rather than deleted, so old
 * orders keep pointing at the area they were charged for.
 */
export default async function ShippingZonesPage() {
  await requireAdmin(["admin"]);
  const locale = await getAdminLocale();
  const isAr = locale === "ar";

  const { data, error } = await getSupabaseAdminClient()
    .from("shipping_zones")
    .select("id, governorate_code, name_ar, name_en, fee, is_active, needs_review, sort_order")
    .order("sort_order");
  const zones = data ?? [];
  const toReview = zones.filter((z) => z.needs_review && z.is_active).length;

  const inputCls =
    "rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-[var(--color-text)]">
          {isAr ? "أسعار الشحن" : "Shipping prices"}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--color-text-secondary)]">
          {isAr
            ? `شركة الشحن: ${COURIER_NAME}. السعر اللي هنا هو اللي العميل بيدفعه في صفحة الدفع حسب منطقته، والتعديل بيتطبق على الطلب الجاي على طول. الشحن مجاني للطلبات من ${FREE_SHIPPING_THRESHOLD.toLocaleString("en-US")} ج.م. التوصيل خلال ${DELIVERY_HOURS_MIN}–${DELIVERY_HOURS_MAX} ساعة من التسليم للمندوب. رسوم التحصيل (الدفع عند الاستلام): ${COD_FEE_BASE} ج.م لحد ${COD_FEE_BAND.toLocaleString("en-US")} + ${COD_FEE_STEP} ج.م لكل ${COD_FEE_BAND.toLocaleString("en-US")} زيادة.`
            : `Courier: ${COURIER_NAME}. The price here is what the shopper pays at checkout for their area; changes apply to the next order. Free shipping from LE ${FREE_SHIPPING_THRESHOLD.toLocaleString("en-US")}. Delivery ${DELIVERY_HOURS_MIN}–${DELIVERY_HOURS_MAX} h after courier pickup. COD collection fee: LE ${COD_FEE_BASE} up to ${COD_FEE_BAND.toLocaleString("en-US")} + LE ${COD_FEE_STEP} per extra ${COD_FEE_BAND.toLocaleString("en-US")}.`}
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2 text-sm text-[var(--color-error)]">
          {isAr
            ? "مش قادرين نقرا جدول الشحن. اتأكد إن migration رقم 0032 اتشغّل في Supabase."
            : "Couldn't read the shipping table. Make sure migration 0032 has been applied in Supabase."}
        </p>
      )}

      {toReview > 0 && (
        <p className="rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-3 py-2 text-sm text-[var(--color-text)]">
          {isAr
            ? `فيه ${toReview} منطقة سعرها مش من شيت شركة الشحن (متحطلها أعلى سعر مؤقتًا). راجعها مع الشركة واضغط «حفظ».`
            : `${toReview} area(s) weren't on the courier's sheet (set to the highest price for now). Check them with the courier and press Save.`}
        </p>
      )}

      <div className="space-y-4">
        {EG_GOVERNORATES.map((g) => {
          const rows = zones.filter((z) => z.governorate_code === g.code);
          return (
            <section
              key={g.code}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
            >
              <h2 className="mb-2 text-sm font-semibold text-[var(--color-text)]">
                {isAr ? g.name_ar : g.name_en}
                {rows.length === 0 && (
                  <span className="ms-2 text-xs font-normal text-[var(--color-error)]">
                    {isAr ? "مفيش منطقة — العملاء مش هيقدروا يطلبوا منها" : "No area — customers can't order here"}
                  </span>
                )}
              </h2>
              <ul className="divide-y divide-[var(--color-border)]">
                {rows.map((z) => (
                  <li key={z.id} className="py-2">
                    <form action={updateShippingZone} className="flex flex-wrap items-center gap-3">
                      <input type="hidden" name="id" value={z.id} />
                      <span className={cn("min-w-48 flex-1 text-sm", !z.is_active && "text-[var(--color-text-secondary)] line-through")}>
                        {isAr ? z.name_ar : z.name_en}
                        {z.needs_review && (
                          <span className="ms-2 rounded-full bg-[var(--color-warning)]/15 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-warning)]">
                            {isAr ? "راجع السعر" : "Check price"}
                          </span>
                        )}
                      </span>
                      <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                        {isAr ? "السعر" : "Price"}
                        <input
                          name="fee"
                          type="number"
                          min={0}
                          max={5000}
                          step={1}
                          inputMode="numeric"
                          defaultValue={Number(z.fee)}
                          aria-label={isAr ? `سعر الشحن لـ ${z.name_ar}` : `Shipping price for ${z.name_en}`}
                          className={cn(inputCls, "w-24 font-mono")}
                        />
                      </label>
                      <label className="flex min-h-11 items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                        <input name="active" type="checkbox" defaultChecked={z.is_active} className="h-4 w-4" />
                        {isAr ? "شغّالة" : "Active"}
                      </label>
                      <button
                        type="submit"
                        className="min-h-11 rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white"
                      >
                        {isAr ? "حفظ" : "Save"}
                      </button>
                      <span className="w-full text-[11px] text-[var(--color-text-secondary)] sm:w-auto">
                        {isAr ? "الحالي: " : "Now: "}
                        {formatPriceEGP(Number(z.fee))}
                      </span>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <form
        action={addShippingZone}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          {isAr ? "إضافة منطقة" : "Add an area"}
        </p>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_120px_auto]">
          <select name="governorate" required defaultValue="" className={inputCls} aria-label={isAr ? "المحافظة" : "Governorate"}>
            <option value="" disabled>
              {isAr ? "المحافظة" : "Governorate"}
            </option>
            {EG_GOVERNORATES.map((g) => (
              <option key={g.code} value={g.code}>
                {isAr ? g.name_ar : g.name_en}
              </option>
            ))}
          </select>
          <input name="nameAr" required minLength={2} placeholder={isAr ? "اسم المنطقة بالعربي" : "Area name (Arabic)"} className={inputCls} />
          <input name="nameEn" placeholder={isAr ? "الاسم بالإنجليزي (اختياري)" : "Area name (English, optional)"} className={inputCls} />
          <input name="fee" required type="number" min={0} max={5000} step={1} inputMode="numeric" placeholder={isAr ? "السعر" : "Price"} className={cn(inputCls, "font-mono")} />
          <button type="submit" className="min-h-11 rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white">
            {isAr ? "إضافة" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
