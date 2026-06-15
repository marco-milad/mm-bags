import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  listNewsletterSubscribers,
  type NewsletterFilters,
} from "@/lib/queries/admin-newsletter";
import { toCsv } from "@/lib/queries/admin-reports";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "forbidden";
    return new NextResponse(msg, {
      status: msg === "UNAUTHORIZED" ? 401 : 403,
    });
  }

  const sp = new URL(request.url).searchParams;
  const filters: NewsletterFilters = {
    q: sp.get("q") ?? undefined,
    status:
      sp.get("status") === "active" || sp.get("status") === "inactive"
        ? (sp.get("status") as "active" | "inactive")
        : undefined,
    locale:
      sp.get("locale") === "ar" || sp.get("locale") === "en"
        ? (sp.get("locale") as "ar" | "en")
        : undefined,
  };
  const rows = await listNewsletterSubscribers(filters);

  const csv = toCsv(
    ["email", "locale", "subscribed_at", "is_active"],
    rows.map((r) => [
      r.email,
      r.locale,
      r.subscribed_at,
      r.is_active ? "true" : "false",
    ]),
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-subscribers.csv"`,
    },
  });
}
