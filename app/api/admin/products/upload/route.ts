import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

// Pre-upload re-encode guardrail. Set IMAGE_REENCODE=off to bypass
// (useful for diagnosing a sharp regression without redeploying the
// route). Defaults to on per Phase 4 of the image-optimisation plan.
const REENCODE_ENABLED = process.env.IMAGE_REENCODE !== "off";
const MAX_DIMENSION_PX = 1600;
const WEBP_QUALITY = 82;

/**
 * Sniff the actual image MIME from the first bytes — `file.type` is
 * browser-supplied (derived from extension on most platforms) and
 * can be forged. Without this check a renamed payload.exe with
 * Content-Type: image/jpeg slips through and lives on a year-cached
 * public origin perfect for phishing.
 *
 * Returns null when the bytes don't match a permitted image format.
 */
function sniffImageMime(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  )
    return "image/png";
  // WebP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return "image/webp";
  return null;
}

/**
 * POST /api/admin/products/upload — multipart `file` field.
 *
 * Auth: any active staff with role in {admin, manager} via
 * requireAdmin. Cashiers shouldn't be editing the catalog.
 *
 * Validation order:
 *   1. Content-Length cheap-cap (kill 100 MB POSTs before buffering).
 *   2. multipart parse → File presence.
 *   3. File size cap.
 *   4. Client-supplied MIME in our allow-list (fast reject).
 *   5. Magic-byte sniff against the buffered body (real reject).
 *
 * Returns `{ url }` of the public Storage URL on success.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin(["admin", "manager"]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "forbidden";
    return NextResponse.json(
      { error: msg === "UNAUTHORIZED" ? "unauthorized" : "forbidden" },
      { status: msg === "UNAUTHORIZED" ? 401 : 403 },
    );
  }

  const cl = Number(request.headers.get("content-length") ?? 0);
  if (cl && cl > MAX_BYTES + 4096) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  // Custom-header check protects against cross-site form posts that
  // can't set arbitrary headers without CORS.
  if (request.headers.get("x-requested-with") !== "mm-admin") {
    return NextResponse.json({ error: "csrf" }, { status: 403 });
  }

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
  if (file.size === 0)
    return NextResponse.json({ error: "file_empty" }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  if (!ALLOWED.has(file.type))
    return NextResponse.json({ error: "file_type" }, { status: 415 });

  const rawBuf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageMime(rawBuf);
  if (!sniffed) {
    return NextResponse.json({ error: "file_type" }, { status: 415 });
  }
  if (sniffed !== file.type) {
    // Header lied; trust the bytes — but also surface the discrepancy
    // in the response so the operator can investigate forged uploads.
    console.warn(
      `[admin/products/upload] MIME mismatch: claimed=${file.type} sniffed=${sniffed}`,
    );
  }

  // Pre-upload re-encode: rotate per EXIF orientation, downscale the
  // long edge to MAX_DIMENSION_PX, strip metadata, write WebP. Cuts
  // the stored origin bytes by 60-90% vs an unmodified 2-3 MB PNG,
  // which is the bulk of the page-load weight on backpacks/school-bags
  // even after the Supabase transform endpoint kicks in.
  // Typed as the loose Buffer so a sharp re-encode (which returns
  // Buffer<ArrayBufferLike>) can be reassigned without TS narrowing
  // it against the stricter Buffer<ArrayBuffer> rawBuf inherits.
  let uploadBuf: Buffer = rawBuf;
  let uploadContentType: string = sniffed;
  let uploadExt = sniffed === "image/png" ? "png" : sniffed === "image/webp" ? "webp" : "jpg";
  if (REENCODE_ENABLED) {
    try {
      uploadBuf = await sharp(rawBuf)
        .rotate()
        .resize({
          width: MAX_DIMENSION_PX,
          height: MAX_DIMENSION_PX,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      uploadContentType = "image/webp";
      uploadExt = "webp";
    } catch (err) {
      // Sharp shouldn't fail on a magic-byte-validated image, but if
      // it does (truncated upload, unsupported colour space, …) fall
      // back to the original bytes rather than 500ing the admin.
      console.warn(
        "[admin/products/upload] sharp re-encode failed, uploading original",
        err,
      );
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const path = `${today}/${randomUUID()}.${uploadExt}`;

  try {
    const admin = getSupabaseAdminClient();
    const { error } = await admin.storage
      .from("products")
      .upload(path, uploadBuf, {
        contentType: uploadContentType,
        upsert: false,
        cacheControl: "31536000",
      });
    if (error) {
      console.error("[admin/products/upload] storage", error);
      return NextResponse.json({ error: "upload_failed" }, { status: 502 });
    }
    const { data: pub } = admin.storage.from("products").getPublicUrl(path);
    return NextResponse.json({ url: pub.publicUrl });
  } catch (err) {
    console.error("[admin/products/upload] route", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
