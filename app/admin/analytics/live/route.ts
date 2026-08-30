import { NextResponse } from "next/server";
import { getLive } from "@/lib/admin/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Polling endpoint for the Live panel.
 *
 * Lives under /admin so it inherits the admin area's boundary, and getLive()
 * calls requireAdmin() before it constructs the service-role client — the
 * route being under /admin is convention, that call is the actual gate.
 */
export async function GET() {
  try {
    return NextResponse.json(await getLive());
  } catch {
    // requireAdmin throws for a signed-out caller; do not leak which.
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
