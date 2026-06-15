import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
 * Content-Disposition. Admin-gated against the same checks as the
 * other report exports.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  const adminEmail = process.env.ADMIN_EMAIL;
  const role = (user.user_metadata as { role?: string } | null)?.role;
  const isAdmin = role === "admin" || (adminEmail && user.email === adminEmail);
  if (!isAdmin) return new NextResponse("forbidden", { status: 403 });

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
