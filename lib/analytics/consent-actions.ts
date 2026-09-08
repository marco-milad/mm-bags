"use server";

import { cookies } from "next/headers";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  COOKIE_OPTS,
  SESSION_COOKIE,
  VISITOR_COOKIE,
  type ConsentState,
} from "@/lib/analytics/identity";

/**
 * Record the visitor's analytics decision.
 *
 * A Server Action rather than a client-side `document.cookie` write, for one
 * reason that matters: the decision has to be readable by proxy.ts on the very
 * next request. A cookie set from JavaScript after paint would leave a window
 * where the proxy still sees "unknown" — harmless for a rejection, but it would
 * make an acceptance appear not to work until a second navigation.
 *
 * The consent cookie is deliberately NOT HttpOnly: it holds one word, carries
 * no identity, and the banner needs to read it to know whether to render. That
 * is the whole reason it can be a plain readable cookie while mm_vid cannot.
 */
export async function setConsent(decision: ConsentState): Promise<void> {
  if (decision !== "accepted" && decision !== "rejected") return;

  const jar = await cookies();
  jar.set(CONSENT_COOKIE, decision, {
    ...COOKIE_OPTS,
    httpOnly: false,
    maxAge: CONSENT_MAX_AGE,
  });

  // Declining is not just "stop from here": anything already minted goes too,
  // so a visitor who says no ends up in the same state as one who never
  // answered. The proxy will not mint again while the decision stands.
  if (decision === "rejected") {
    jar.set(VISITOR_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
    jar.set(SESSION_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
  }
}
