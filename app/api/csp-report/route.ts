export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Receives Content-Security-Policy violation reports (report-uri) and logs
 * a compact line to the server logs (Vercel → Logs, search "[csp]"). A
 * report means either an attack was blocked or a legitimate host is missing
 * from lib/security/csp.ts. Nothing is stored; no body is returned.
 */
const MAX_BODY = 8_000;

function clip(v: unknown, n = 200): string {
  return typeof v === "string" ? v.slice(0, n) : "";
}

/** Path only — never log query strings (they can carry personal data). */
function pathOf(u: unknown): string {
  try {
    const url = new URL(String(u));
    return `${url.origin}${url.pathname}`;
  } catch {
    return clip(u, 120);
  }
}

export async function POST(request: Request) {
  try {
    const text = (await request.text()).slice(0, MAX_BODY);
    const body = JSON.parse(text) as unknown;
    // Legacy report-uri: { "csp-report": {...} }; Reporting API: [{ body: {...} }].
    const reports = Array.isArray(body)
      ? body.map((r) => (r as { body?: Record<string, unknown> }).body ?? {})
      : [((body as Record<string, unknown>)["csp-report"] ?? {}) as Record<string, unknown>];
    for (const r of reports.slice(0, 5)) {
      const directive = clip(r["effective-directive"] ?? r["violated-directive"] ?? r.effectiveDirective, 60);
      const blocked = pathOf(r["blocked-uri"] ?? r.blockedURL);
      const page = pathOf(r["document-uri"] ?? r.documentURL);
      console.warn(`[csp] blocked ${directive} → ${blocked} on ${page}`);
    }
  } catch {
    /* malformed report: ignore */
  }
  return new Response(null, { status: 204 });
}
