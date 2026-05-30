import { describe, it, expect } from 'vitest'
import {
  detectImageKind,
  headMatchesExtension,
  UPLOAD_MAGIC_BYTES,
  isValidSignatureImageBase64
} from '@shared/file-magic'

// Magic-byte constants reused across fixtures.
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47]
const JPEG_MAGIC = [0xff, 0xd8, 0xff]
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]

function pngBuffer(extra = 0): Buffer {
  return Buffer.from([...PNG_MAGIC, ...new Array(extra).fill(0x00)])
}

function jpegBuffer(extra = 0): Buffer {
  return Buffer.from([...JPEG_MAGIC, ...new Array(extra).fill(0x00)])
}

describe('detectImageKind', () => {
  it('detects PNG from its 4-byte magic prefix', () => {
    expect(detectImageKind(pngBuffer())).toBe('png')
  })

  it('detects PNG even with trailing payload bytes', () => {
    expect(detectImageKind(pngBuffer(20))).toBe('png')
  })

  it('detects JPEG from its 3-byte magic prefix', () => {
    expect(detectImageKind(jpegBuffer())).toBe('jpeg')
  })

  it('detects JPEG even with trailing payload bytes', () => {
    expect(detectImageKind(jpegBuffer(20))).toBe('jpeg')
  })

  it('returns null for bytes matching neither signature', () => {
    expect(detectImageKind(Uint8Array.from([0x00, 0x01, 0x02, 0x03]))).toBeNull()
  })

  it('returns null for an empty buffer', () => {
    expect(detectImageKind(Uint8Array.from([]))).toBeNull()
  })

  it('returns null for a buffer too short to be PNG (3 of 4 PNG bytes)', () => {
    expect(detectImageKind(Uint8Array.from(PNG_MAGIC.slice(0, 3)))).toBeNull()
  })

  it('returns null for a buffer too short to be JPEG (2 of 3 JPEG bytes)', () => {
    expect(detectImageKind(Uint8Array.from(JPEG_MAGIC.slice(0, 2)))).toBeNull()
  })

  it('returns null when the first byte differs from both signatures', () => {
    // PNG-like length but wrong leading byte.
    expect(detectImageKind(Uint8Array.from([0x88, 0x50, 0x4e, 0x47]))).toBeNull()
  })
})

describe('headMatchesExtension', () => {
  it('matches a PDF head with %PDF magic', () => {
    expect(headMatchesExtension(Uint8Array.from(PDF_MAGIC), '.pdf')).toBe(true)
  })

  it('matches a PNG head', () => {
    expect(headMatchesExtension(Uint8Array.from(PNG_MAGIC), '.png')).toBe(true)
  })

  it('matches a JPG head', () => {
    expect(headMatchesExtension(Uint8Array.from(JPEG_MAGIC), '.jpg')).toBe(true)
  })

  it('matches a JPEG head', () => {
    expect(headMatchesExtension(Uint8Array.from(JPEG_MAGIC), '.jpeg')).toBe(true)
  })

  it('rejects a PNG head presented as PDF', () => {
    expect(headMatchesExtension(Uint8Array.from(PNG_MAGIC), '.pdf')).toBe(false)
  })

  it('rejects a PDF head presented as PNG', () => {
    expect(headMatchesExtension(Uint8Array.from(PDF_MAGIC), '.png')).toBe(false)
  })

  it('rejects a JPEG head presented as PNG', () => {
    expect(headMatchesExtension(Uint8Array.from(JPEG_MAGIC), '.png')).toBe(false)
  })

  it('returns true (passthrough) for unchecked .heic extension', () => {
    expect(headMatchesExtension(Uint8Array.from([0x00, 0x01]), '.heic')).toBe(true)
  })

  it('returns true (passthrough) for unchecked .heif extension', () => {
    expect(headMatchesExtension(Uint8Array.from([0x00, 0x01]), '.heif')).toBe(true)
  })

  it('returns true (passthrough) for a wholly unknown extension', () => {
    expect(headMatchesExtension(Uint8Array.from([0xde, 0xad]), '.bin')).toBe(true)
  })

  it('does not match when the head is shorter than the signature', () => {
    // First 2 bytes correct for PNG but head too short to satisfy all 4.
    expect(headMatchesExtension(Uint8Array.from(PNG_MAGIC.slice(0, 2)), '.png')).toBe(false)
  })

  it('does not match an empty head against a checked extension', () => {
    expect(headMatchesExtension(Uint8Array.from([]), '.png')).toBe(false)
  })
})

describe('UPLOAD_MAGIC_BYTES', () => {
  it('exposes the expected checked extensions', () => {
    expect(Object.keys(UPLOAD_MAGIC_BYTES).sort()).toEqual(
      ['.jpeg', '.jpg', '.pdf', '.png'].sort()
    )
  })

  it('maps each extension to an array of byte-array signatures', () => {
    expect(UPLOAD_MAGIC_BYTES['.pdf']).toEqual([PDF_MAGIC])
    expect(UPLOAD_MAGIC_BYTES['.png']).toEqual([PNG_MAGIC])
    expect(UPLOAD_MAGIC_BYTES['.jpg']).toEqual([JPEG_MAGIC])
    expect(UPLOAD_MAGIC_BYTES['.jpeg']).toEqual([JPEG_MAGIC])
  })

  it('does not include heic/heif (intentionally absent)', () => {
    expect(UPLOAD_MAGIC_BYTES['.heic']).toBeUndefined()
    expect(UPLOAD_MAGIC_BYTES['.heif']).toBeUndefined()
  })
})

describe('isValidSignatureImageBase64', () => {
  it('accepts a valid base64-encoded PNG', () => {
    const b64 = pngBuffer(10).toString('base64')
    expect(isValidSignatureImageBase64(b64)).toBe(true)
  })

  it('accepts a valid base64-encoded JPEG', () => {
    const b64 = jpegBuffer(10).toString('base64')
    expect(isValidSignatureImageBase64(b64)).toBe(true)
  })

  it('accepts a data-URL-prefixed PNG value', () => {
    const b64 = pngBuffer(10).toString('base64')
    expect(isValidSignatureImageBase64(`data:image/png;base64,${b64}`)).toBe(true)
  })

  it('accepts a data-URL-prefixed JPEG value', () => {
    const b64 = jpegBuffer(10).toString('base64')
    expect(isValidSignatureImageBase64(`data:image/jpeg;base64,${b64}`)).toBe(true)
  })

  it('rejects an empty string', () => {
    expect(isValidSignatureImageBase64('')).toBe(false)
  })

  it('rejects valid base64 that is not a PNG or JPEG', () => {
    const b64 = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]).toString('base64')
    expect(isValidSignatureImageBase64(b64)).toBe(false)
  })

  it('rejects a decoded payload larger than the 2,000,000-byte cap', () => {
    // 2,000,001 bytes: PNG magic followed by padding, exceeding MAX by one byte.
    const oversized = Buffer.concat([
      Buffer.from(PNG_MAGIC),
      Buffer.alloc(2_000_001 - PNG_MAGIC.length, 0x00)
    ])
    expect(oversized.length).toBe(2_000_001)
    expect(isValidSignatureImageBase64(oversized.toString('base64'))).toBe(false)
  })

  it('accepts a PNG exactly at the 2,000,000-byte boundary', () => {
    const atCap = Buffer.concat([
      Buffer.from(PNG_MAGIC),
      Buffer.alloc(2_000_000 - PNG_MAGIC.length, 0x00)
    ])
    expect(atCap.length).toBe(2_000_000)
    expect(isValidSignatureImageBase64(atCap.toString('base64'))).toBe(true)
  })

  it('rejects a data-URL prefix with an empty base64 body', () => {
    expect(isValidSignatureImageBase64('data:image/png;base64,')).toBe(false)
  })
})
