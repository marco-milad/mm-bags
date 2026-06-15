import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // matches the bucket's file_size_limit
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * POST /api/reviews/upload
 *
 * Multipart form with a single `file` field. Streams the file straight
 * into the `review-photos` bucket via the service-role client (no anon
 * upload because we'd otherwise need RLS policies on a public bucket).
 * Returns `{ url }` — the caller pastes this into the review's `images`
 * array before submitting the review server action.
 *
 * The route is deliberately stateless: it does NOT bind the upload to a
 * specific review row, because the row doesn't exist until the user
 * clicks Submit. Orphaned blobs are acceptable until a cleanup job
 * lands; they're public, small, and the bucket has its own size cap.
 */
export async function POST(request: Request) {
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
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "file_type" }, { status: 415 });
  }

  // Filename: namespace by today's date so the bucket index stays
  // browseable, and include enough randomness to dodge collisions
  // without a UUID dep. The extension comes from the MIME type because
  // we can't trust the user-supplied filename.
  const ext = file.type === "image/png"
    ? "png"
    : file.type === "image/webp"
      ? "webp"
      : "jpg";
  const today = new Date().toISOString().slice(0, 10);
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${today}/${rand}.${ext}`;

  try {
    const supabase = getSupabaseAdminClient();
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("review-photos")
      .upload(path, buf, {
        contentType: file.type,
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
