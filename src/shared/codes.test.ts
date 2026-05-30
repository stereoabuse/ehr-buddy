import { describe, it, expect } from 'vitest'
import { CPT_CODES, type CptCode } from '@shared/cpt-codes'
import { ICD10_CODES, type Icd10Code } from '@shared/icd10-codes'

describe('CPT_CODES data integrity', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(CPT_CODES)).toBe(true)
    expect(CPT_CODES.length).toBeGreaterThan(0)
  })

  it('every entry has a non-empty string code', () => {
    for (const entry of CPT_CODES) {
      expect(typeof entry.code).toBe('string')
      expect(entry.code.trim().length).toBeGreaterThan(0)
    }
  })

  it('every entry has a non-empty string description', () => {
    for (const entry of CPT_CODES) {
      expect(typeof entry.description).toBe('string')
      expect(entry.description.trim().length).toBeGreaterThan(0)
    }
  })

  it('every entry has a positive numeric defaultMinutes', () => {
    for (const entry of CPT_CODES) {
      expect(typeof entry.defaultMinutes).toBe('number')
      expect(Number.isFinite(entry.defaultMinutes)).toBe(true)
      expect(entry.defaultMinutes).toBeGreaterThan(0)
      expect(Number.isInteger(entry.defaultMinutes)).toBe(true)
    }
  })

  it('every code is exactly 5 numeric digits', () => {
    for (const entry of CPT_CODES) {
      expect(entry.code).toMatch(/^\d{5}$/)
    }
  })

  it('has no duplicate codes', () => {
    const codes = CPT_CODES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('has no duplicate descriptions', () => {
    const descriptions = CPT_CODES.map((c) => c.description)
    expect(new Set(descriptions).size).toBe(descriptions.length)
  })

  it('entries have only the expected keys', () => {
    const expected = ['code', 'description', 'defaultMinutes'].sort()
    for (const entry of CPT_CODES) {
      expect(Object.keys(entry).sort()).toEqual(expected)
    }
  })

  it('contains the known psychiatric diagnostic evaluation code 90791', () => {
    const match: CptCode | undefined = CPT_CODES.find((c) => c.code === '90791')
    expect(match).toBeDefined()
    expect(match?.description).toContain('Psychiatric diagnostic evaluation')
    expect(match?.defaultMinutes).toBe(60)
  })
})

describe('ICD10_CODES data integrity', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(ICD10_CODES)).toBe(true)
    expect(ICD10_CODES.length).toBeGreaterThan(0)
  })

  it('every entry has a non-empty string code', () => {
    for (const entry of ICD10_CODES) {
      expect(typeof entry.code).toBe('string')
      expect(entry.code.trim().length).toBeGreaterThan(0)
    }
  })

  it('every entry has a non-empty string description', () => {
    for (const entry of ICD10_CODES) {
      expect(typeof entry.description).toBe('string')
      expect(entry.description.trim().length).toBeGreaterThan(0)
    }
  })

  it('every code matches ICD-10-CM format (letter + 2 alphanumerics + optional dotted subcategory)', () => {
    // ICD-10-CM: category = letter followed by two alphanumeric chars,
    // optional subcategory after a dot (1-4 alphanumeric chars, e.g. F01.A11).
    const icd10 = /^[A-Z][0-9A-Z]{2}(\.[0-9A-Z]{1,4})?$/
    for (const entry of ICD10_CODES) {
      expect(entry.code).toMatch(icd10)
    }
  })

  it('every code starts with an uppercase letter', () => {
    for (const entry of ICD10_CODES) {
      expect(entry.code[0]).toMatch(/^[A-Z]$/)
    }
  })

  it('only contains chapter F and chapter Z codes (documented scope)', () => {
    for (const entry of ICD10_CODES) {
      expect(['F', 'Z']).toContain(entry.code[0])
    }
  })

  it('has no duplicate codes', () => {
    const codes = ICD10_CODES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('entries have only the expected keys', () => {
    const expected = ['code', 'description'].sort()
    for (const entry of ICD10_CODES) {
      expect(Object.keys(entry).sort()).toEqual(expected)
    }
  })

  it('contains a known chapter F code (F20.9 Schizophrenia, unspecified)', () => {
    const match: Icd10Code | undefined = ICD10_CODES.find((c) => c.code === 'F20.9')
    expect(match).toBeDefined()
    expect(match?.description).toBe('Schizophrenia, unspecified')
  })

  it('contains both F and Z chapter codes', () => {
    const firstChars = new Set(ICD10_CODES.map((c) => c.code[0]))
    expect(firstChars.has('F')).toBe(true)
    expect(firstChars.has('Z')).toBe(true)
  })

  it('codes with a dot have exactly one dot', () => {
    for (const entry of ICD10_CODES) {
      const dotCount = (entry.code.match(/\./g) ?? []).length
      expect(dotCount).toBeLessThanOrEqual(1)
    }
  })

  it('no code contains leading or trailing whitespace', () => {
    for (const entry of ICD10_CODES) {
      expect(entry.code).toBe(entry.code.trim())
    }
  })
})
