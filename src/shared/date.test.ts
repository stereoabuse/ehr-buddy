import { describe, expect, it } from 'vitest'
import {
  PRACTICE_TIME_ZONE,
  practiceDateString,
  practiceDayBoundaryIso,
  practiceMonthStartString,
  practiceUsDateString,
  practiceYearStartString
} from '@shared/date'

describe('PRACTICE_TIME_ZONE', () => {
  it('is America/New_York', () => {
    expect(PRACTICE_TIME_ZONE).toBe('America/New_York')
  })
})

describe('practiceDateString', () => {
  it('returns YYYY-MM-DD in NY time for a mid-day UTC instant (same calendar day)', () => {
    // 2026-01-15T18:30:00Z is 13:30 EST on 2026-01-15 in NY
    expect(practiceDateString(new Date('2026-01-15T18:30:00Z'))).toBe('2026-01-15')
  })

  it('rolls back to the previous calendar day when UTC is ahead of NY', () => {
    // 2026-01-15T02:00:00Z is 21:00 EST on 2026-01-14 in NY
    expect(practiceDateString(new Date('2026-01-15T02:00:00Z'))).toBe('2026-01-14')
  })

  it('handles a summer (EDT) instant that is a different day in UTC vs NY', () => {
    // 2026-07-04T03:30:00Z is 23:30 EDT on 2026-07-03 in NY
    expect(practiceDateString(new Date('2026-07-04T03:30:00Z'))).toBe('2026-07-03')
  })

  it('returns the same day at NY midnight boundary (winter)', () => {
    // 2026-01-15T05:00:00Z == 00:00 EST on 2026-01-15
    expect(practiceDateString(new Date('2026-01-15T05:00:00Z'))).toBe('2026-01-15')
    // one ms earlier is still 2026-01-14 in NY
    expect(practiceDateString(new Date('2026-01-15T04:59:59.999Z'))).toBe('2026-01-14')
  })
})

describe('practiceMonthStartString', () => {
  it('returns the first of the month in NY time', () => {
    expect(practiceMonthStartString(new Date('2026-01-15T18:30:00Z'))).toBe('2026-01-01')
  })

  it('uses NY calendar month when UTC has already rolled into the next day/month', () => {
    // 2026-02-01T02:00:00Z is still 2026-01-31 in NY -> January
    expect(practiceMonthStartString(new Date('2026-02-01T02:00:00Z'))).toBe('2026-01-01')
  })

  it('handles a summer instant', () => {
    expect(practiceMonthStartString(new Date('2026-07-04T03:30:00Z'))).toBe('2026-07-01')
  })
})

describe('practiceYearStartString', () => {
  it('returns Jan 1 of the NY year', () => {
    expect(practiceYearStartString(new Date('2026-06-15T12:00:00Z'))).toBe('2026-01-01')
  })

  it('uses NY calendar year when UTC has rolled into the next year', () => {
    // 2027-01-01T02:00:00Z is still 2026-12-31 in NY -> 2026
    expect(practiceYearStartString(new Date('2027-01-01T02:00:00Z'))).toBe('2026-01-01')
  })
})

describe('practiceUsDateString', () => {
  it('formats as M/D/YYYY in NY time', () => {
    // 2026-01-15T18:30:00Z -> Jan 15 2026 in NY
    expect(practiceUsDateString(new Date('2026-01-15T18:30:00Z'))).toBe('1/15/2026')
  })

  it('reflects the NY calendar day, not the UTC day', () => {
    // 2026-01-15T02:00:00Z is 2026-01-14 in NY
    expect(practiceUsDateString(new Date('2026-01-15T02:00:00Z'))).toBe('1/14/2026')
  })
})

describe('practiceDayBoundaryIso', () => {
  it('maps start to NY 00:00:00.000 in winter (EST, -05:00 => 05:00Z)', () => {
    expect(practiceDayBoundaryIso('2026-01-15', 'start')).toBe('2026-01-15T05:00:00.000Z')
  })

  it('maps end to NY 23:59:59.999 in winter (EST, -05:00 => next day 04:59:59.999Z)', () => {
    expect(practiceDayBoundaryIso('2026-01-15', 'end')).toBe('2026-01-16T04:59:59.999Z')
  })

  it('maps start to NY 00:00:00.000 in summer (EDT, -04:00 => 04:00Z)', () => {
    expect(practiceDayBoundaryIso('2026-07-04', 'start')).toBe('2026-07-04T04:00:00.000Z')
  })

  it('maps end to NY 23:59:59.999 in summer (EDT, -04:00 => next day 03:59:59.999Z)', () => {
    expect(practiceDayBoundaryIso('2026-07-04', 'end')).toBe('2026-07-05T03:59:59.999Z')
  })

  it('returns an ISO instant whose NY-local time is exactly midnight for start', () => {
    const iso = practiceDayBoundaryIso('2026-03-20', 'start')
    const nyTime = new Intl.DateTimeFormat('en-US', {
      timeZone: PRACTICE_TIME_ZONE,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(iso))
    expect(nyTime).toBe('00:00:00')
  })

  it('returns an ISO instant whose NY-local time is 23:59:59 for end', () => {
    const iso = practiceDayBoundaryIso('2026-08-10', 'end')
    const nyTime = new Intl.DateTimeFormat('en-US', {
      timeZone: PRACTICE_TIME_ZONE,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(iso))
    expect(nyTime).toBe('23:59:59')
  })

  it('returns the raw input unchanged for a non-date string', () => {
    expect(practiceDayBoundaryIso('not-a-date', 'start')).toBe('not-a-date')
  })

  it('returns the raw input unchanged for a partial date missing the day', () => {
    // '2026-13' -> [2026, 13, NaN]; !NaN is true -> raw input returned
    expect(practiceDayBoundaryIso('2026-13', 'start')).toBe('2026-13')
  })

  it('returns the raw input unchanged for an empty string', () => {
    expect(practiceDayBoundaryIso('', 'end')).toBe('')
  })

  it('treats a leading-zero year/month/day of 00 as invalid and returns raw input', () => {
    // day 00 -> !0 is true -> raw input returned (guard rejects zero components)
    expect(practiceDayBoundaryIso('2026-01-00', 'start')).toBe('2026-01-00')
  })

  it('BUG: does not validate month/day ranges; out-of-range month overflows silently', () => {
    // '2026-13-05' parses to year=2026, month=13, day=5 (all truthy) so the
    // guard passes and Date.UTC rolls the month over into the next year.
    // Asserting the CURRENT (buggy) behavior: it produces a January 2027 instant
    // rather than returning the raw input or throwing.
    const result = practiceDayBoundaryIso('2026-13-05', 'start')
    expect(result).not.toBe('2026-13-05')
    expect(result).toBe('2027-01-05T05:00:00.000Z')
  })
})
