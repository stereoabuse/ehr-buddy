/**
 * Content-based file-type detection via leading "magic bytes". Used by the
 * main process to verify that uploaded documents and clinician-signature
 * images really are the type their extension/declaration claims — defense
 * against a renamed executable or a malformed blob reaching pdfkit.
 *
 * Pure and environment-neutral (operates on byte arrays); the file/base64
 * decoding lives at the call sites.
 */

const MAX_SIGNATURE_IMAGE_BYTES = 2_000_000

/**
 * Leading magic bytes per upload extension. HEIC/HEIF use a variable-offset
 * `ftyp` box that can't be cheaply asserted from a fixed prefix, so they are
 * intentionally absent — callers fall back to extension + size checks for those.
 */
export const UPLOAD_MAGIC_BYTES: Record<string, number[][]> = {
  '.pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  '.png': [[0x89, 0x50, 0x4e, 0x47]], // \x89PNG
  '.jpg': [[0xff, 0xd8, 0xff]],
  '.jpeg': [[0xff, 0xd8, 0xff]]
}

/**
 * Does the leading byte window match one of the known signatures for `ext`?
 * Returns `true` for extensions we don't byte-check (e.g. heic/heif), matching
 * the "extension + size only" fallback. `head` should already be sliced to the
 * number of bytes actually read.
 */
export function headMatchesExtension(head: Uint8Array, ext: string): boolean {
  const expected = UPLOAD_MAGIC_BYTES[ext]
  if (!expected) return true
  return expected.some((sig) => sig.every((b, i) => i < head.length && head[i] === b))
}

/** Identify a decoded image buffer as PNG or JPEG by its magic bytes. */
export function detectImageKind(buf: Uint8Array): 'png' | 'jpeg' | null {
  const isPng =
    buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  if (isPng) return 'png'
  const isJpeg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  if (isJpeg) return 'jpeg'
  return null
}

/**
 * Validate a (possibly data-URL-prefixed) base64 signature image: it must
 * decode to a real PNG or JPEG no larger than ~2 MB. Guards against a string
 * that merely satisfies the length cap but isn't an image.
 */
export function isValidSignatureImageBase64(value: string): boolean {
  const raw = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value
  const buf = Buffer.from(raw, 'base64')
  if (buf.length === 0 || buf.length > MAX_SIGNATURE_IMAGE_BYTES) return false
  return detectImageKind(buf) !== null
}
