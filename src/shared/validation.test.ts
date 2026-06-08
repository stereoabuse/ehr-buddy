import { describe, it, expect } from 'vitest'
import {
  idSchema,
  dateSchema,
  timeSchema,
  cptCodeSchema,
  icd10CodesSchema,
  signatureImageSchema
} from '@shared/validation'

/**
 * Helpers to build deterministic base64 image fixtures from raw magic bytes.
 * PNG magic: 0x89 0x50 0x4E 0x47 ; JPEG magic: 0xFF 0xD8 0xFF.
 */
function toBase64(bytes: number[]): string {
  return Buffer.from(Uint8Array.from(bytes)).toString('base64')
}

const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]
const JPEG_BYTES = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]

const PNG_BASE64 = toBase64(PNG_BYTES)
const JPEG_BASE64 = toBase64(JPEG_BYTES)

describe('idSchema', () => {
  it('accepts a non-empty string', () => {
    expect(idSchema.safeParse('abc-123').success).toBe(true)
  })

  it('accepts a single character', () => {
    expect(idSchema.safeParse('x').success).toBe(true)
  })

  it('rejects an empty string', () => {
    expect(idSchema.safeParse('').success).toBe(false)
  })

  it('rejects non-string inputs (number, null, undefined)', () => {
    expect(idSchema.safeParse(123).success).toBe(false)
    expect(idSchema.safeParse(null).success).toBe(false)
    expect(idSchema.safeParse(undefined).success).toBe(false)
  })
})

describe('dateSchema', () => {
  it('accepts a well-formed YYYY-MM-DD date', () => {
    expect(dateSchema.safeParse('2026-05-30').success).toBe(true)
  })

  it('accepts boundary-padded values matching the digit shape', () => {
    expect(dateSchema.safeParse('0001-01-01').success).toBe(true)
  })

  it('accepts a semantically-invalid but regex-matching date (regex-only check)', () => {
    // The schema is a pure regex shape check, not a calendar check, so
    // impossible dates whose digits match \d{4}-\d{2}-\d{2} still pass.
    expect(dateSchema.safeParse('2026-13-45').success).toBe(true)
  })

  it('rejects wrong separators', () => {
    expect(dateSchema.safeParse('2026/05/30').success).toBe(false)
  })

  it('rejects wrong digit counts', () => {
    expect(dateSchema.safeParse('2026-5-30').success).toBe(false)
    expect(dateSchema.safeParse('26-05-30').success).toBe(false)
  })

  it('rejects non-date strings and trailing content', () => {
    expect(dateSchema.safeParse('not-a-date').success).toBe(false)
    expect(dateSchema.safeParse('2026-05-30T00:00').success).toBe(false)
    expect(dateSchema.safeParse('').success).toBe(false)
  })

  it('rejects non-string inputs', () => {
    expect(dateSchema.safeParse(20260530).success).toBe(false)
    expect(dateSchema.safeParse(null).success).toBe(false)
  })
})

describe('timeSchema', () => {
  it('accepts a well-formed HH:MM time', () => {
    expect(timeSchema.safeParse('09:30').success).toBe(true)
    expect(timeSchema.safeParse('23:59').success).toBe(true)
  })

  it('accepts a regex-matching but out-of-range time (regex-only check)', () => {
    // Like dateSchema, this is a shape check; "99:99" matches \d{2}:\d{2}.
    expect(timeSchema.safeParse('99:99').success).toBe(true)
  })

  it('rejects single-digit hour or minute', () => {
    expect(timeSchema.safeParse('9:30').success).toBe(false)
    expect(timeSchema.safeParse('09:5').success).toBe(false)
  })

  it('rejects wrong separators and seconds suffix', () => {
    expect(timeSchema.safeParse('09-30').success).toBe(false)
    expect(timeSchema.safeParse('09:30:00').success).toBe(false)
  })

  it('rejects empty and non-string inputs', () => {
    expect(timeSchema.safeParse('').success).toBe(false)
    expect(timeSchema.safeParse(930).success).toBe(false)
  })
})

describe('cptCodeSchema', () => {
  it('accepts a real CPT code from the allowlist', () => {
    expect(cptCodeSchema.safeParse('90791').success).toBe(true)
    expect(cptCodeSchema.safeParse('90834').success).toBe(true)
  })

  it('rejects a bogus / unknown CPT code', () => {
    expect(cptCodeSchema.safeParse('00000').success).toBe(false)
    expect(cptCodeSchema.safeParse('99999').success).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(cptCodeSchema.safeParse('').success).toBe(false)
  })

  it('rejects surrounding whitespace (no trimming for CPT)', () => {
    expect(cptCodeSchema.safeParse(' 90791 ').success).toBe(false)
  })

  it('rejects non-string inputs', () => {
    expect(cptCodeSchema.safeParse(90791).success).toBe(false)
    expect(cptCodeSchema.safeParse(null).success).toBe(false)
  })
})

describe('icd10CodesSchema', () => {
  it('accepts a single valid ICD-10 code', () => {
    expect(icd10CodesSchema.safeParse('F20.0').success).toBe(true)
  })

  it('accepts a comma-separated list of valid codes', () => {
    expect(icd10CodesSchema.safeParse('F20.0,F25.0,F01.50').success).toBe(true)
  })

  it('tolerates surrounding whitespace per the trim logic', () => {
    expect(icd10CodesSchema.safeParse(' F20.0 , F25.0 ').success).toBe(true)
  })

  it('accepts null and undefined', () => {
    expect(icd10CodesSchema.safeParse(null).success).toBe(true)
    expect(icd10CodesSchema.safeParse(undefined).success).toBe(true)
  })

  it('accepts an empty string (no non-empty entries after filtering)', () => {
    // split/filter(Boolean) yields an empty list, and [].every() is true.
    expect(icd10CodesSchema.safeParse('').success).toBe(true)
  })

  it('accepts a list of only separators/whitespace (all filtered out)', () => {
    expect(icd10CodesSchema.safeParse(' , , ').success).toBe(true)
  })

  it('rejects a list containing one unknown code', () => {
    expect(icd10CodesSchema.safeParse('F20.0,ZZ9.99').success).toBe(false)
  })

  it('rejects a single unknown code', () => {
    expect(icd10CodesSchema.safeParse('NOPE').success).toBe(false)
  })
})

describe('signatureImageSchema', () => {
  it('accepts a valid small PNG base64', () => {
    expect(signatureImageSchema.safeParse(PNG_BASE64).success).toBe(true)
  })

  it('accepts a valid small JPEG base64', () => {
    expect(signatureImageSchema.safeParse(JPEG_BASE64).success).toBe(true)
  })

  it('accepts a data-URL-prefixed PNG (prefix is stripped before decode)', () => {
    expect(signatureImageSchema.safeParse(`data:image/png;base64,${PNG_BASE64}`).success).toBe(true)
  })

  it('rejects a non-image base64 string of valid length', () => {
    const notAnImage = Buffer.from('hello world this is not an image').toString('base64')
    expect(signatureImageSchema.safeParse(notAnImage).success).toBe(false)
  })

  it('rejects an empty string (decodes to zero bytes)', () => {
    expect(signatureImageSchema.safeParse('').success).toBe(false)
  })

  it('rejects an over-length string past the 2,000,000 char cap', () => {
    // Length cap is enforced on the raw string before refine runs.
    const overLength = 'A'.repeat(2_000_001)
    expect(signatureImageSchema.safeParse(overLength).success).toBe(false)
  })

  it('rejects non-string inputs', () => {
    expect(signatureImageSchema.safeParse(null).success).toBe(false)
    expect(signatureImageSchema.safeParse(undefined).success).toBe(false)
  })
})
