/**
 * Magic-byte image sniffer.
 *
 * Used by every upload route (admin product uploads, customer review
 * photo uploads) to validate that submitted bytes are ACTUALLY an
 * image and not something forging the Content-Type header. Trusting
 * the multipart `file.type` is unsafe — an attacker writes
 * `Content-Type: image/jpeg` on any payload and the browser passes
 * it through verbatim.
 *
 * Detects JPEG / PNG / WebP — the formats both upload surfaces accept.
 * Returns null when the bytes don't match a permitted image format.
 */
export function sniffImageMime(
  buf: Buffer,
): "image/jpeg" | "image/png" | "image/webp" | null {
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

/** Map sniffed MIME → bucket-friendly file extension. */
export function extForSniffedMime(
  mime: "image/jpeg" | "image/png" | "image/webp",
): "jpg" | "png" | "webp" {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}
