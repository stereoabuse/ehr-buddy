import { describe, expect, it } from 'vitest'
import { CPT_CODES } from './cpt-codes'

describe('CPT_CODES', () => {
  it('has no duplicate codes', () => {
    const codes = CPT_CODES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('every entry has a non-empty description and a positive defaultMinutes', () => {
    for (const entry of CPT_CODES) {
      expect(entry.description.length).toBeGreaterThan(0)
      expect(entry.defaultMinutes).toBeGreaterThan(0)
    }
  })

  it('contains the core individual-psychotherapy codes', () => {
    const codes = new Set(CPT_CODES.map((c) => c.code))
    for (const expected of ['90791', '90834', '90837']) {
      expect(codes.has(expected)).toBe(true)
    }
  })
})
