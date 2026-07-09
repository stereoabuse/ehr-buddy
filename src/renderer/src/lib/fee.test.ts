import { describe, it, expect } from 'vitest'
import { parseFeeDollars } from './fee'

describe('parseFeeDollars', () => {
  it('treats an empty string as zero cents', () => {
    expect(parseFeeDollars('')).toBe(0)
  })

  it('treats a whitespace-only string as zero cents', () => {
    expect(parseFeeDollars('   ')).toBe(0)
  })

  it('parses a whole-dollar amount to cents', () => {
    expect(parseFeeDollars('100')).toBe(10000)
  })

  it('parses a decimal amount to cents', () => {
    expect(parseFeeDollars('12.34')).toBe(1234)
  })

  it('parses zero to zero cents', () => {
    expect(parseFeeDollars('0')).toBe(0)
  })

  it('rounds fractional cents to the nearest cent', () => {
    expect(parseFeeDollars('19.999')).toBe(2000)
  })

  it('tolerates surrounding whitespace', () => {
    expect(parseFeeDollars('  45.5  ')).toBe(4550)
  })

  it('rejects a negative amount', () => {
    expect(parseFeeDollars('-5')).toBeNull()
  })

  it('rejects non-numeric garbage', () => {
    expect(parseFeeDollars('abc')).toBeNull()
  })

  it('rejects a number with trailing garbage', () => {
    expect(parseFeeDollars('12abc')).toBeNull()
  })

  it('rejects Infinity', () => {
    expect(parseFeeDollars('Infinity')).toBeNull()
  })

  it('rejects NaN literal text', () => {
    expect(parseFeeDollars('NaN')).toBeNull()
  })
})
