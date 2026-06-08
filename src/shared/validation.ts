/**
 * Reusable Zod validation primitives for the IPC trust boundary. Kept free of
 * Electron/Node imports so they can be unit-tested in isolation. Composed into
 * the larger object schemas in the main-process IPC handlers.
 */
import { z } from 'zod'
import { CPT_CODES } from './cpt-codes'
import { ICD10_CODES } from './icd10-codes'
import { isValidSignatureImageBase64 } from './file-magic'

/** Raw IPC id args arrive untyped; parse instead of casting. */
export const idSchema = z.string().min(1)

/** Anchored, ReDoS-safe shapes for the otherwise-permissive string fields. */
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date as YYYY-MM-DD')
export const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Expected time as HH:MM')

// CPT/ICD-10 allowlists derived from the shared code tables.
const CPT_CODE_SET = new Set(CPT_CODES.map((c) => c.code))
const ICD10_CODE_SET = new Set(ICD10_CODES.map((c) => c.code))

export const cptCodeSchema = z
  .string()
  .min(1)
  .refine((code) => CPT_CODE_SET.has(code), 'Unknown CPT code')

/**
 * `icd10_codes` is a comma-separated list of ICD-10 codes (see Icd10Picker).
 * Validate each entry against the allowlist; null/undefined are allowed.
 */
export const icd10CodesSchema = z
  .string()
  .nullable()
  .optional()
  .refine(
    (value) =>
      value == null ||
      value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .every((code) => ICD10_CODE_SET.has(code)),
    'Contains an unknown ICD-10 code'
  )

/**
 * A base64 signature image: bounded length and verified to decode to a real
 * PNG/JPEG, not just any string under the size cap.
 */
export const signatureImageSchema = z
  .string()
  .max(2_000_000, 'Signature image is too large (max ~1.5MB)')
  .refine(isValidSignatureImageBase64, 'Signature must be a PNG or JPEG image no larger than 2MB')
