import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getPurchaseOrderDetail } from "@/lib/queries/suppliers-admin";
import { getAdminLocale } from "@/lib/admin/locale";
import { renderPurchaseOrderPdf } from "@/lib/admin/reports/pdf";
import type { PurchaseOrderStatus } from "@/lib/supabase/types";

export const runtime = "nodejs";

const STATUS_AR: Record<PurchaseOrderStatus, string> = {
  pending: "في الانتظار",
  received: "تم الاستلام",
  partial: "مدفوع جزئيًا",
  paid: "مدفوع",
};
const STATUS_EN: Record<PurchaseOrderStatus, string> = {
  pending: "Pending",
  received: "Received",
  partial: "Partial paid",
  paid: "Paid",
};

/**
 * GET /admin/purchase-orders/[id]/pdf — branded printable PO.
 *
 * Mirrors the auth approach used by /admin/reports/export-pdf: pull
 * the current user from the cookie-bound supabase client, gate on
 * admin email / staff role. The renderer itself runs headless Chrome
 * via @sparticuz/chromium — same infra the report exports use, so
 * Arabic shaping comes out correct on the supplier's WhatsApp PDF
 * preview.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Admin auth via shared helper (no user_metadata.role trust).
  try {
    await requireAdmin(["admin", "manager"]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "forbidden";
    return new NextResponse(msg.toLowerCase(), {
      status: msg === "UNAUTHORIZED" ? 401 : 403,
    });
  }

  const { id } = await params;
  const po = await getPurchaseOrderDetail(id);
  if (!po) return new NextResponse("not found", { status: 404 });

  // Non-authoritative read for the "rendered by" PDF footer string.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = await getAdminLocale();
  const isAr = locale === "ar";
  const meta = user?.user_metadata as { full_name?: string; name?: string } | null;
  const adminName =
    meta?.full_name ?? meta?.name ?? user?.email?.split("@")[0] ?? "admin";

  const statusKey = (po.status ?? "pending") as PurchaseOrderStatus;
  const statusLabel = isAr ? STATUS_AR[statusKey] : STATUS_EN[statusKey];

  const pdf = await renderPurchaseOrderPdf({
    // Short id keeps the PDF filename readable; the full UUID lives
    // on the URL the operator already has.
    poNumber: po.id.slice(0, 8).toUpperCase(),
    createdAt: po.created_at,
    supplier: {
      name: po.supplier_name ?? (isAr ? "(بدون مورد)" : "(no supplier)"),
      phone: po.supplier_phone,
      address: po.supplier_address,
    },
    status: statusLabel,
    rows: po.items.map((it) => ({
      productName: it.product_name ?? (isAr ? "(محذوف)" : "(deleted)"),
      variantLabel: it.variant_label,
      qty: it.qty,
      unitCost: Number(it.unit_cost ?? 0),
      totalCost: Number(it.total_cost ?? 0),
    })),
    totalCost: Number(po.total_cost ?? 0),
    amountPaid: Number(po.amount_paid ?? 0),
    amountOwed: Number(po.amount_owed ?? 0),
    notes: po.notes,
    adminName,
    locale,
  });

  const filename = `po-${po.id.slice(0, 8)}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
