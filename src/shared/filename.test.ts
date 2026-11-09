import { describe, expect, it } from 'vitest'
import { safeFilenamePart } from '@shared/filename'

describe('safeFilenamePart', () => {
  it('leaves an ordinary name alone', () => {
    expect(safeFilenamePart("O'Brien")).toBe("O'Brien")
  })

  it('replaces path separators so the name cannot change directories', () => {
    expect(safeFilenamePart('Smith/Jones')).toBe('Smith-Jones')
    expect(safeFilenamePart('Smith\\Jones')).toBe('Smith-Jones')
    expect(safeFilenamePart('../../etc')).not.toContain('/')
  })

  it('replaces Windows-reserved characters and control characters', () => {
    expect(safeFilenamePart('a:b*c?d"e<f>g|h')).toBe('a-b-c-d-e-f-g-h')
    expect(safeFilenamePart('tab\there\u0000')).toBe('tab-here-')
  })

  it('strips leading dots so the file is not hidden', () => {
    expect(safeFilenamePart('..hidden')).toBe('hidden')
  })

  it('collapses whitespace and caps the length', () => {
    expect(safeFilenamePart('  van   der   Berg  ')).toBe('van der Berg')
    expect(safeFilenamePart('x'.repeat(200)).length).toBe(60)
  })

  it('falls back to a placeholder when nothing usable remains', () => {
    expect(safeFilenamePart('')).toBe('client')
    expect(safeFilenamePart('...')).toBe('client')
  })
})
