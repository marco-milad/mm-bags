import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  listAdminOrders,
  type ListOrderFilters,
} from "@/lib/queries/admin-orders";
import { toCsv } from "@/lib/queries/admin-reports";
import type { OrderStatus, PaymentMethod } from "@/lib/supabase/types";

export const runtime = "nodejs";

/**
 * GET /admin/orders/export?status=&method=&from=&to=&q=
 *
 * Streams the filtered order list as CSV with a downloadable
 * Content-Disposition. Admin-gated via the shared helper so
 * user_metadata.role is NOT trusted (the staff table is the only
 * source of truth — see lib/admin/auth.ts).
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(["admin", "manager"]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "forbidden";
    return new NextResponse(msg.toLowerCase(), {
      status: msg === "UNAUTHORIZED" ? 401 : 403,
    });
  }

  const sp = new URL(request.url).searchParams;
  const filters: ListOrderFilters = {
    status: (sp.get("status") || undefined) as OrderStatus | undefined,
    paymentMethod: (sp.get("paymentMethod") || sp.get("method") || undefined) as
      | PaymentMethod
      | undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    q: sp.get("q") || undefined,
  };
  const rows = await listAdminOrders(filters);

  const csv = toCsv(
    [
      "order_number",
      "customer_name",
      "customer_phone",
      "items",
      "total_egp",
      "payment_method",
      "payment_status",
      "status",
      "created_at",
    ],
    rows.map((r) => [
      r.order_number,
      r.customer_name,
      r.customer_phone,
      r.item_count,
      r.total,
      r.payment_method,
      r.payment_status ?? "",
      r.status,
      r.created_at,
    ]),
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders.csv"`,
    },
  });
}
