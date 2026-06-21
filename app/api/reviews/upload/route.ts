import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sniffImageMime, extForSniffedMime } from "@/lib/uploads/sniff";
import { clientIpFromHeaders, rateLimit } from "@/lib/uploads/rate-limit";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // matches the bucket's file_size_limit
// Rate limit: 5 uploads per 10 minutes per IP (or per user id when
// signed in). Tight enough to stop a script-driven dump of the public
// bucket; loose enough that a real customer attaching 5 photos to a
// review in one session never hits it.
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
// Custom header the client must attach. multipart/form-data is a
// CORS-simple content type, so a malicious cross-site form can POST
// to this endpoint with a logged-in visitor's cookies — requiring a
// non-simple header that the browser will preflight blocks that
// vector. Must stay in lockstep with components/reviews/ReviewForm.tsx.
const CSRF_HEADER = "x-requested-with";
const CSRF_VALUE = "mm-reviews";

/**
 * POST /api/reviews/upload
 *
 * Multipart form with a single `file` field. Streams the file into
 * the public `review-photos` bucket via the service-role client so
 * we don't need permissive RLS on a public bucket.
 *
 * Defenses (audited under Sprint 1):
 *   1. Custom-header CSRF gate — blocks cross-site multipart POSTs.
 *   2. Content-Length precheck — rejects oversize bodies before
 *      formData() materialises them in memory.
 *   3. Rate limit — bounded attempts per IP / signed-in user id.
 *   4. Magic-byte MIME sniff — the multipart `file.type` is forgeable;
 *      we validate the actual bytes against JPEG/PNG/WebP signatures.
 *   5. crypto.randomUUID for path — replaces Math.random's weak entropy.
 *   6. Soft session stamp — when a session cookie is present, prefix
 *      the storage path with the user id so abuse is attributable.
 *
 * The route is deliberately stateless: it does NOT bind the upload
 * to a specific review row, because the row doesn't exist until the
 * user clicks Submit. Orphaned blobs are acceptable until a cleanup
 * job lands.
 */
export async function POST(request: Request) {
  // ── 1. CSRF gate ──────────────────────────────────────────────────
  if (request.headers.get(CSRF_HEADER) !== CSRF_VALUE) {
    return NextResponse.json({ error: "csrf" }, { status: 403 });
  }

  // ── 2. Content-Length precheck ────────────────────────────────────
  // formData() awaits the whole body before any size check, so a
  // multi-GB POST would buffer GB of memory before the per-file cap
  // rejected it. Bail early when the declared size is already
  // over-cap (allow a small slop for multipart envelope overhead).
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize && declaredSize > MAX_BYTES + 4096) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  // ── 3. Soft session identity (for rate-limit key + path stamp) ────
  let userId: string | null = null;
  try {
    const sb = await createSupabaseServerClient();
    const { data } = await sb.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    // No session is fine — anonymous review uploads are still
    // supported. Fall through with userId=null.
  }

  // ── 4. Rate limit ────────────────────────────────────────────────
  const rateKey = userId
    ? `user:${userId}`
    : `ip:${clientIpFromHeaders(request.headers)}`;
  const rl = rateLimit(rateKey, RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  // ── 5. Parse + size + presence ────────────────────────────────────
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_missing" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "file_empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  // ── 6. Magic-byte MIME sniff ──────────────────────────────────────
  // file.type comes from the browser's Content-Type and is forgeable;
  // we re-derive it from the actual bytes and reject the upload if
  // they aren't a permitted image format.
  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageMime(buf);
  if (!sniffed) {
    return NextResponse.json({ error: "file_type" }, { status: 415 });
  }

  // ── 7. Path ───────────────────────────────────────────────────────
  // Today's date prefix for browseability; user-id prefix (when
  // available) for abuse attribution; UUID for collision-free random.
  const today = new Date().toISOString().slice(0, 10);
  const idStamp = userId ? userId.slice(0, 8) : "anon";
  const path = `${today}/${idStamp}-${randomUUID()}.${extForSniffedMime(sniffed)}`;

  // ── 8. Upload + return public URL ─────────────────────────────────
  try {
    const supabase = getSupabaseAdminClient();
    const { error: uploadError } = await supabase.storage
      .from("review-photos")
      .upload(path, buf, {
        contentType: sniffed,
        upsert: false,
        cacheControl: "31536000", // year — uploaded files never mutate
      });
    if (uploadError) {
      console.error("[reviews/upload] storage", uploadError);
      return NextResponse.json({ error: "upload_failed" }, { status: 502 });
    }

    const { data: pub } = supabase.storage
      .from("review-photos")
      .getPublicUrl(path);
    return NextResponse.json({ url: pub.publicUrl });
  } catch (err) {
    console.error("[reviews/upload] route", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
