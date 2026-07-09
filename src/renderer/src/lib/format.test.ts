import { describe, it, expect } from 'vitest'
import {
  fmtMoney,
  greetingFor,
  fullDateLabel,
  firstNameOf,
  initialsOf,
  initialsOfFullName,
  daysSince,
  backupRecencyLabel,
  isBackupOverdue
} from './format'

describe('fmtMoney', () => {
  it('formats zero as "$0" with no decimals', () => {
    expect(fmtMoney(0)).toBe('$0')
  })

  it('formats a value with cents to two decimal places', () => {
    expect(fmtMoney(12345)).toBe('$123.45')
  })

  it('formats whole dollars with no decimals', () => {
    expect(fmtMoney(10000)).toBe('$100')
  })

  it('formats a single cent', () => {
    expect(fmtMoney(1)).toBe('$0.01')
  })

  it('formats negative whole dollars', () => {
    expect(fmtMoney(-10000)).toBe('-$100')
  })

  it('formats negative values with cents', () => {
    expect(fmtMoney(-12345)).toBe('-$123.45')
  })

  it('adds thousands separators', () => {
    expect(fmtMoney(123456789)).toBe('$1,234,567.89')
  })
})

describe('greetingFor', () => {
  it('returns "Hello" before 5am (hour 3)', () => {
    expect(greetingFor(new Date(2026, 0, 1, 3, 0, 0))).toBe('Hello')
  })

  it('returns "Good morning" in the morning (hour 9)', () => {
    expect(greetingFor(new Date(2026, 0, 1, 9, 0, 0))).toBe('Good morning')
  })

  it('returns "Good afternoon" in the afternoon (hour 14)', () => {
    expect(greetingFor(new Date(2026, 0, 1, 14, 0, 0))).toBe('Good afternoon')
  })

  it('returns "Good evening" in the evening (hour 20)', () => {
    expect(greetingFor(new Date(2026, 0, 1, 20, 0, 0))).toBe('Good evening')
  })

  it('boundary: hour 5 is "Good morning" (h < 5 is false)', () => {
    expect(greetingFor(new Date(2026, 0, 1, 5, 0, 0))).toBe('Good morning')
  })

  it('boundary: hour 12 is "Good afternoon" (h < 12 is false)', () => {
    expect(greetingFor(new Date(2026, 0, 1, 12, 0, 0))).toBe('Good afternoon')
  })

  it('boundary: hour 18 is "Good evening" (h < 18 is false)', () => {
    expect(greetingFor(new Date(2026, 0, 1, 18, 0, 0))).toBe('Good evening')
  })

  it('boundary: hour 0 (midnight) is "Hello"', () => {
    expect(greetingFor(new Date(2026, 0, 1, 0, 0, 0))).toBe('Hello')
  })

  it('boundary: hour 4 is still "Hello"', () => {
    expect(greetingFor(new Date(2026, 0, 1, 4, 59, 59))).toBe('Hello')
  })
})

describe('fullDateLabel', () => {
  it('formats a date with weekday, month, day, and year', () => {
    // 2026-01-01 is a Thursday (using local-time constructor)
    expect(fullDateLabel(new Date(2026, 0, 1, 12, 0, 0))).toBe('Thursday, January 1, 2026')
  })

  it('formats a mid-year date correctly', () => {
    // 2026-07-04 is a Saturday
    expect(fullDateLabel(new Date(2026, 6, 4, 12, 0, 0))).toBe('Saturday, July 4, 2026')
  })
})

describe('firstNameOf', () => {
  it('returns "" for null', () => {
    expect(firstNameOf(null)).toBe('')
  })

  it('returns "" for undefined', () => {
    expect(firstNameOf(undefined)).toBe('')
  })

  it('returns "" for empty string', () => {
    expect(firstNameOf('')).toBe('')
  })

  it('returns the first token for a plain full name', () => {
    expect(firstNameOf('John Smith')).toBe('John')
  })

  it('strips "Dr." honorific with period', () => {
    expect(firstNameOf('Dr. Jane Doe')).toBe('Jane')
  })

  it('strips "Dr" honorific without period', () => {
    expect(firstNameOf('Dr Jane Doe')).toBe('Jane')
  })

  it('strips "Mr." honorific', () => {
    expect(firstNameOf('Mr. Alan Turing')).toBe('Alan')
  })

  it('strips "Ms." honorific', () => {
    expect(firstNameOf('Ms. Grace Hopper')).toBe('Grace')
  })

  it('strips "Mrs." honorific', () => {
    expect(firstNameOf('Mrs. Ada Lovelace')).toBe('Ada')
  })

  it('strips "Mx" honorific (case-insensitive)', () => {
    expect(firstNameOf('mx. Sam Jones')).toBe('Sam')
  })

  it('trims surrounding whitespace', () => {
    expect(firstNameOf('  Pat Kim  ')).toBe('Pat')
  })

  it('returns the single token when only one name given', () => {
    expect(firstNameOf('Madonna')).toBe('Madonna')
  })

  it('does not strip an honorific-like token without trailing space', () => {
    // "Drake" should not be stripped to nothing; regex requires \s+ after honorific
    expect(firstNameOf('Drake Bell')).toBe('Drake')
  })
})

describe('initialsOf', () => {
  it('uppercases both initials', () => {
    expect(initialsOf('john', 'smith')).toBe('JS')
  })

  it('handles already-uppercase input', () => {
    expect(initialsOf('Jane', 'Doe')).toBe('JD')
  })

  it('returns "" when both names empty', () => {
    expect(initialsOf('', '')).toBe('')
  })

  it('returns single initial when last name empty', () => {
    expect(initialsOf('Alan', '')).toBe('A')
  })

  it('returns single initial when first name empty', () => {
    expect(initialsOf('', 'Turing')).toBe('T')
  })
})

describe('initialsOfFullName', () => {
  it('returns "" for null', () => {
    expect(initialsOfFullName(null)).toBe('')
  })

  it('returns "" for undefined', () => {
    expect(initialsOfFullName(undefined)).toBe('')
  })

  it('returns "" for empty string', () => {
    expect(initialsOfFullName('')).toBe('')
  })

  it('returns "" for whitespace-only string', () => {
    expect(initialsOfFullName('   ')).toBe('')
  })

  it('returns a single initial for a single name', () => {
    expect(initialsOfFullName('madonna')).toBe('M')
  })

  it('returns first and last initials for two names', () => {
    expect(initialsOfFullName('john smith')).toBe('JS')
  })

  it('returns first and last initials for three+ names (skips middle)', () => {
    expect(initialsOfFullName('John Quincy Adams')).toBe('JA')
  })

  it('strips honorific then uses remaining names', () => {
    expect(initialsOfFullName('Dr. Jane Doe')).toBe('JD')
  })

  it('strips honorific leaving a single name -> single initial', () => {
    expect(initialsOfFullName('Dr. House')).toBe('H')
  })
})

describe('daysSince', () => {
  const now = new Date('2026-07-09T12:00:00.000Z')

  it('returns 0 for a timestamp earlier the same day', () => {
    expect(daysSince('2026-07-09T01:00:00.000Z', now)).toBe(0)
  })

  it('returns 0 for the exact same instant', () => {
    expect(daysSince('2026-07-09T12:00:00.000Z', now)).toBe(0)
  })

  it('returns 1 for exactly 24 hours earlier', () => {
    expect(daysSince('2026-07-08T12:00:00.000Z', now)).toBe(1)
  })

  it('floors partial days', () => {
    expect(daysSince('2026-07-08T13:00:00.000Z', now)).toBe(0)
  })

  it('returns 7 for exactly 7 days earlier', () => {
    expect(daysSince('2026-07-02T12:00:00.000Z', now)).toBe(7)
  })

  it('returns a large count for a timestamp far in the past', () => {
    expect(daysSince('2026-01-01T12:00:00.000Z', now)).toBe(189)
  })
})

describe('backupRecencyLabel', () => {
  const now = new Date('2026-07-09T12:00:00.000Z')

  it('returns "never" for null', () => {
    expect(backupRecencyLabel(null, now)).toBe('never')
  })

  it('returns "today" for a timestamp earlier today', () => {
    expect(backupRecencyLabel('2026-07-09T01:00:00.000Z', now)).toBe('today')
  })

  it('returns singular "1 day ago"', () => {
    expect(backupRecencyLabel('2026-07-08T12:00:00.000Z', now)).toBe('1 day ago')
  })

  it('returns plural "N days ago"', () => {
    expect(backupRecencyLabel('2026-07-02T12:00:00.000Z', now)).toBe('7 days ago')
  })
})

describe('isBackupOverdue', () => {
  const now = new Date('2026-07-09T12:00:00.000Z')

  it('is overdue when there is no backup on record', () => {
    expect(isBackupOverdue(null, now)).toBe(true)
  })

  it('is not overdue exactly 7 days out', () => {
    expect(isBackupOverdue('2026-07-02T12:00:00.000Z', now)).toBe(false)
  })

  it('is overdue at 8 whole days out', () => {
    expect(isBackupOverdue('2026-07-01T12:00:00.000Z', now)).toBe(true)
  })

  it('is not overdue for a recent backup', () => {
    expect(isBackupOverdue('2026-07-09T01:00:00.000Z', now)).toBe(false)
  })

  it('respects a custom threshold', () => {
    expect(isBackupOverdue('2026-07-05T12:00:00.000Z', now, 3)).toBe(true)
    expect(isBackupOverdue('2026-07-08T12:00:00.000Z', now, 3)).toBe(false)
  })
})
