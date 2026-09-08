import { NextResponse, type NextRequest } from "next/server";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  COOKIE_OPTS,
  OPTOUT_COOKIE,
  OPTOUT_MAX_AGE,
  SESSION_COOKIE,
  VISITOR_COOKIE,
} from "@/lib/analytics/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Analytics opt-out.
 *
 * Sets mm_optout and clears the visitor and session cookies. Once the opt-out
 * cookie is present, proxy.ts stops minting identity and stops touching the
 * visitor row, so nothing further is written about this browser at all — not
 * even an anonymous one.
 *
 * The privacy notice must link here, and the link has to keep working: this is
 * the mechanism the notice promises.
 */
function optOut(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  const redirectTo = new URL(`/${locale}/privacy-policy?analytics=off`, request.url);

  const response = NextResponse.redirect(redirectTo);
  response.cookies.set(OPTOUT_COOKIE, "1", {
    ...COOKIE_OPTS,
    maxAge: OPTOUT_MAX_AGE,
  });
  // Also record the decision so the consent banner does not reopen and ask a
  // question this visitor has just answered by withdrawing. Not HttpOnly, for
  // the same reason as everywhere else: the banner has to be able to read it.
  response.cookies.set(CONSENT_COOKIE, "rejected", {
    ...COOKIE_OPTS,
    httpOnly: false,
    maxAge: CONSENT_MAX_AGE,
  });
  // maxAge 0 expires them immediately; the path must match how they were set.
  response.cookies.set(VISITOR_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
  response.cookies.set(SESSION_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
  return response;
}

export function GET(request: NextRequest) {
  return optOut(request);
}
