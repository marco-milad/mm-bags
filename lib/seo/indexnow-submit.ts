import "server-only";

import { after } from "next/server";
import { SITE_URL } from "@/lib/seo/site";
import { INDEXNOW_ENDPOINT, indexNowPayload } from "@/lib/seo/indexnow";

/**
 * Fire-and-forget IndexNow ping, sent after the response so an admin save is
 * never slowed down, and only from the production deployment (previews and
 * local runs must not announce URLs). Never throws.
 */
export function notifyIndexNow(paths: ReadonlyArray<string>): void {
  if (process.env.VERCEL_ENV !== "production" || paths.length === 0) return;
  const payload = indexNowPayload(SITE_URL, paths);
  if (payload.urlList.length === 0) return;
  const send = async () => {
    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
      // 200/202 = accepted. Anything else is logged, never surfaced.
      if (!res.ok) console.warn(`[indexnow] ${res.status} for ${payload.urlList.length} url(s)`);
    } catch (e) {
      console.warn("[indexnow] ping failed", (e as Error).message);
    }
  };
  try {
    after(send);
  } catch {
    // Outside a request scope (scripts, tests): send inline, still non-blocking.
    void send();
  }
}
