import { describe, expect, it } from 'vitest'
import {
  practiceTimeZone,
  practiceDateString,
  practiceDayBoundaryIso,
  practiceMonthStartString,
  practiceUsDateString,
  practiceYearStartString
} from '@shared/date'

// Existing expectations were written against New York; pin it explicitly so
// the suite doesn't depend on the zone of the machine running it.
const NY = 'America/New_York'
const LA = 'America/Los_Angeles'

describe('practiceTimeZone', () => {
  it('returns the machine zone as a usable IANA name', () => {
    const tz = practiceTimeZone()
    expect(tz.length).toBeGreaterThan(0)
    expect(() => new Intl.DateTimeFormat('en-US', { timeZone: tz })).not.toThrow()
  })

  it('is the default zone for the date helpers', () => {
    const instant = new Date('2026-01-15T04:30:00Z')
    expect(practiceDateString(instant)).toBe(practiceDateString(instant, practiceTimeZone()))
  })
})

describe('non-Eastern zones', () => {
  it('puts a late-evening Pacific session on the Pacific calendar day', () => {
    // 2026-01-15T06:30:00Z is 01:30 EST on the 15th but 22:30 PST on the 14th
    expect(practiceDateString(new Date('2026-01-15T06:30:00Z'), NY)).toBe('2026-01-15')
    expect(practiceDateString(new Date('2026-01-15T06:30:00Z'), LA)).toBe('2026-01-14')
  })

  it('shifts day boundaries to Pacific midnight', () => {
    expect(practiceDayBoundaryIso('2026-01-15', 'start', LA)).toBe('2026-01-15T08:00:00.000Z')
    expect(practiceDayBoundaryIso('2026-07-04', 'end', LA)).toBe('2026-07-05T06:59:59.999Z')
  })
})

describe('practiceDateString', () => {
  it('returns YYYY-MM-DD in NY time for a mid-day UTC instant (same calendar day)', () => {
    // 2026-01-15T18:30:00Z is 13:30 EST on 2026-01-15 in NY
    expect(practiceDateString(new Date('2026-01-15T18:30:00Z'), NY)).toBe('2026-01-15')
  })

  it('rolls back to the previous calendar day when UTC is ahead of NY', () => {
    // 2026-01-15T02:00:00Z is 21:00 EST on 2026-01-14 in NY
    expect(practiceDateString(new Date('2026-01-15T02:00:00Z'), NY)).toBe('2026-01-14')
  })

  it('handles a summer (EDT) instant that is a different day in UTC vs NY', () => {
    // 2026-07-04T03:30:00Z is 23:30 EDT on 2026-07-03 in NY
    expect(practiceDateString(new Date('2026-07-04T03:30:00Z'), NY)).toBe('2026-07-03')
  })

  it('returns the same day at NY midnight boundary (winter)', () => {
    // 2026-01-15T05:00:00Z == 00:00 EST on 2026-01-15
    expect(practiceDateString(new Date('2026-01-15T05:00:00Z'), NY)).toBe('2026-01-15')
    // one ms earlier is still 2026-01-14 in NY
    expect(practiceDateString(new Date('2026-01-15T04:59:59.999Z'), NY)).toBe('2026-01-14')
  })
})

describe('practiceMonthStartString', () => {
  it('returns the first of the month in NY time', () => {
    expect(practiceMonthStartString(new Date('2026-01-15T18:30:00Z'), NY)).toBe('2026-01-01')
  })

  it('uses NY calendar month when UTC has already rolled into the next day/month', () => {
    // 2026-02-01T02:00:00Z is still 2026-01-31 in NY -> January
    expect(practiceMonthStartString(new Date('2026-02-01T02:00:00Z'), NY)).toBe('2026-01-01')
  })

  it('handles a summer instant', () => {
    expect(practiceMonthStartString(new Date('2026-07-04T03:30:00Z'), NY)).toBe('2026-07-01')
  })
})

describe('practiceYearStartString', () => {
  it('returns Jan 1 of the NY year', () => {
    expect(practiceYearStartString(new Date('2026-06-15T12:00:00Z'), NY)).toBe('2026-01-01')
  })

  it('uses NY calendar year when UTC has rolled into the next year', () => {
    // 2027-01-01T02:00:00Z is still 2026-12-31 in NY -> 2026
    expect(practiceYearStartString(new Date('2027-01-01T02:00:00Z'), NY)).toBe('2026-01-01')
  })
})

describe('practiceUsDateString', () => {
  it('formats as M/D/YYYY in NY time', () => {
    // 2026-01-15T18:30:00Z -> Jan 15 2026 in NY
    expect(practiceUsDateString(new Date('2026-01-15T18:30:00Z'), NY)).toBe('1/15/2026')
  })

  it('reflects the NY calendar day, not the UTC day', () => {
    // 2026-01-15T02:00:00Z is 2026-01-14 in NY
    expect(practiceUsDateString(new Date('2026-01-15T02:00:00Z'), NY)).toBe('1/14/2026')
  })
})

describe('practiceDayBoundaryIso', () => {
  it('maps start to NY 00:00:00.000 in winter (EST, -05:00 => 05:00Z)', () => {
    expect(practiceDayBoundaryIso('2026-01-15', 'start', NY)).toBe('2026-01-15T05:00:00.000Z')
  })

  it('maps end to NY 23:59:59.999 in winter (EST, -05:00 => next day 04:59:59.999Z)', () => {
    expect(practiceDayBoundaryIso('2026-01-15', 'end', NY)).toBe('2026-01-16T04:59:59.999Z')
  })

  it('maps start to NY 00:00:00.000 in summer (EDT, -04:00 => 04:00Z)', () => {
    expect(practiceDayBoundaryIso('2026-07-04', 'start', NY)).toBe('2026-07-04T04:00:00.000Z')
  })

  it('maps end to NY 23:59:59.999 in summer (EDT, -04:00 => next day 03:59:59.999Z)', () => {
    expect(practiceDayBoundaryIso('2026-07-04', 'end', NY)).toBe('2026-07-05T03:59:59.999Z')
  })

  it('returns an ISO instant whose NY-local time is exactly midnight for start', () => {
    const iso = practiceDayBoundaryIso('2026-03-20', 'start', NY)
    const nyTime = new Intl.DateTimeFormat('en-US', {
      timeZone: NY,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(iso))
    expect(nyTime).toBe('00:00:00')
  })

  it('returns an ISO instant whose NY-local time is 23:59:59 for end', () => {
    const iso = practiceDayBoundaryIso('2026-08-10', 'end', NY)
    const nyTime = new Intl.DateTimeFormat('en-US', {
      timeZone: NY,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(iso))
    expect(nyTime).toBe('23:59:59')
  })

  it('returns the raw input unchanged for a non-date string', () => {
    expect(practiceDayBoundaryIso('not-a-date', 'start', NY)).toBe('not-a-date')
  })

  it('returns the raw input unchanged for a partial date missing the day', () => {
    // '2026-13' -> [2026, 13, NaN]; !NaN is true -> raw input returned
    expect(practiceDayBoundaryIso('2026-13', 'start', NY)).toBe('2026-13')
  })

  it('returns the raw input unchanged for an empty string', () => {
    expect(practiceDayBoundaryIso('', 'end', NY)).toBe('')
  })

  it('treats a leading-zero year/month/day of 00 as invalid and returns raw input', () => {
    // day 00 -> !0 is true -> raw input returned (guard rejects zero components)
    expect(practiceDayBoundaryIso('2026-01-00', 'start', NY)).toBe('2026-01-00')
  })

  it('returns the raw input for an out-of-range month instead of overflowing', () => {
    // '2026-13-05' (month 13) must not silently roll over into the next year.
    expect(practiceDayBoundaryIso('2026-13-05', 'start', NY)).toBe('2026-13-05')
  })

  it('returns the raw input for an out-of-range day', () => {
    expect(practiceDayBoundaryIso('2026-01-40', 'start', NY)).toBe('2026-01-40')
  })

  it('returns the raw input for a day out of range for its specific month', () => {
    // Day is within 1..31 but invalid for the month, so it must not silently
    // roll over (Feb 31 -> Mar 3, Apr 31 -> May 1).
    expect(practiceDayBoundaryIso('2026-02-31', 'start', NY)).toBe('2026-02-31')
    expect(practiceDayBoundaryIso('2026-04-31', 'start', NY)).toBe('2026-04-31')
    expect(practiceDayBoundaryIso('2026-06-31', 'end', NY)).toBe('2026-06-31')
  })

  it('rejects Feb 29 in a non-leap year but accepts it in a leap year', () => {
    // 2026 is not a leap year; 2028 is.
    expect(practiceDayBoundaryIso('2026-02-29', 'start', NY)).toBe('2026-02-29')
    expect(practiceDayBoundaryIso('2028-02-29', 'start', NY)).toBe('2028-02-29T05:00:00.000Z')
  })
})
