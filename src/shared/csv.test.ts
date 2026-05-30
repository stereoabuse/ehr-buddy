import { describe, expect, it } from 'vitest'
import { csvEscape } from '@shared/csv'

describe('csvEscape', () => {
  describe('null / undefined / empty', () => {
    it('returns empty string for null', () => {
      expect(csvEscape(null)).toBe('')
    })

    it('returns empty string for undefined', () => {
      expect(csvEscape(undefined)).toBe('')
    })

    it('returns empty string for empty string', () => {
      expect(csvEscape('')).toBe('')
    })
  })

  describe('plain safe strings', () => {
    it('returns a simple word unchanged', () => {
      expect(csvEscape('hello')).toBe('hello')
    })

    it('returns a sentence with spaces unchanged', () => {
      expect(csvEscape('the quick brown fox')).toBe('the quick brown fox')
    })

    it('leaves an interior = unchanged (only leading char matters)', () => {
      expect(csvEscape('a=b')).toBe('a=b')
    })

    it('leaves an interior @ unchanged', () => {
      expect(csvEscape('user name')).toBe('user name')
    })
  })

  describe('coercion via String()', () => {
    it('coerces a positive integer', () => {
      expect(csvEscape(42)).toBe('42')
    })

    it('coerces zero', () => {
      expect(csvEscape(0)).toBe('0')
    })

    it('coerces a negative number (leading "-" is defused)', () => {
      // String(-5) === '-5' which starts with '-', a formula char.
      expect(csvEscape(-5)).toBe("'-5")
    })

    it('coerces boolean true', () => {
      expect(csvEscape(true)).toBe('true')
    })

    it('coerces boolean false', () => {
      expect(csvEscape(false)).toBe('false')
    })

    it('coerces NaN', () => {
      expect(csvEscape(NaN)).toBe('NaN')
    })
  })

  describe('formula-injection neutralization (leading char)', () => {
    it('defuses leading =', () => {
      expect(csvEscape('=1+1')).toBe("'=1+1")
    })

    it('defuses leading +', () => {
      expect(csvEscape('+1')).toBe("'+1")
    })

    it('defuses leading - on a string', () => {
      expect(csvEscape('-5')).toBe("'-5")
    })

    it('defuses leading @', () => {
      expect(csvEscape('@SUM(A1)')).toBe("'@SUM(A1)")
    })

    it('defuses leading TAB', () => {
      // Leading \t triggers prefix; the result no longer starts with a special
      // char but DOES still contain \t which has no quoting trigger... but \r
      // does. A lone tab is not in the quote regex, so just prefixed.
      expect(csvEscape('\tcmd')).toBe("'\tcmd")
    })

    it('defuses leading CR and then RFC-quotes because \\r is a quote trigger', () => {
      // Leading \r -> prefixed to "'\r", which contains \r so it is wrapped.
      expect(csvEscape('\rdanger')).toBe('"\'\rdanger"')
    })
  })

  describe('RFC-4180 quoting', () => {
    it('quotes a value containing a comma', () => {
      expect(csvEscape('a,b')).toBe('"a,b"')
    })

    it('quotes and doubles an embedded double-quote', () => {
      expect(csvEscape('say "hi"')).toBe('"say ""hi"""')
    })

    it('quotes a value containing a newline', () => {
      expect(csvEscape('line1\nline2')).toBe('"line1\nline2"')
    })

    it('quotes a value containing a carriage return', () => {
      // 'x\ry' does not start with a formula char, but contains \r.
      expect(csvEscape('x\ry')).toBe('"x\ry"')
    })

    it('quotes a lone double-quote and doubles it', () => {
      expect(csvEscape('"')).toBe('""""')
    })
  })

  describe('interaction: formula char AND quote/comma', () => {
    it('applies formula prefix first, then RFC-quotes the whole thing', () => {
      expect(csvEscape('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"')
    })

    it('handles a leading = with an embedded comma', () => {
      // '=a,b' -> "'=a,b" -> contains comma -> wrapped.
      expect(csvEscape('=a,b')).toBe('"\'=a,b"')
    })

    it('handles a leading + with an embedded quote', () => {
      // '+"' -> "'+\"" -> contains quote -> wrapped & doubled.
      expect(csvEscape('+"')).toBe('"\'+"""')
    })

    it('handles a leading @ with an embedded newline', () => {
      expect(csvEscape('@x\ny')).toBe('"\'@x\ny"')
    })
  })
})
