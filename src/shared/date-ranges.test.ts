import { describe, expect, it } from 'vitest'
import { DATE_RANGE_PRESETS, addMonths, monthGridDays, monthRange, presetDateRange } from '@shared/date-ranges'

const NY = 'America/New_York'

describe('presetDateRange: time zone', () => {
  it('uses the given zone to decide which month "today" is in', () => {
    // 2026-03-01T06:00:00Z is 01:00 EST on Mar 1 but 22:00 PST on Feb 28
    const instant = new Date('2026-03-01T06:00:00Z')
    expect(presetDateRange('this-month', instant, NY)).toEqual({ start: '2026-03-01', end: '2026-03-01' })
    expect(presetDateRange('this-month', instant, 'America/Los_Angeles')).toEqual({
      start: '2026-02-01',
      end: '2026-02-28'
    })
  })
})

describe('DATE_RANGE_PRESETS', () => {
  it('lists the five presets in display order with the expected labels', () => {
    expect(DATE_RANGE_PRESETS.map((p) => p.label)).toEqual([
      'This month',
      'Last month',
      'This quarter',
      'This year',
      'Last year'
    ])
  })

  it('has a unique id for every preset', () => {
    const ids = DATE_RANGE_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('presetDateRange: this-month', () => {
  it('starts on the 1st of the current month and ends today', () => {
    // 2026-02-15T18:30:00Z is 13:30 EST on 2026-02-15 in NY
    expect(presetDateRange('this-month', new Date('2026-02-15T18:30:00Z'), NY)).toEqual({
      start: '2026-02-01',
      end: '2026-02-15'
    })
  })

  it('handles the first day of the month (start === end)', () => {
    expect(presetDateRange('this-month', new Date('2026-03-01T18:30:00Z'), NY)).toEqual({
      start: '2026-03-01',
      end: '2026-03-01'
    })
  })
})

describe('presetDateRange: last-month', () => {
  it('covers the full previous month in a non-leap February', () => {
    // 2026 is not a leap year
    expect(presetDateRange('last-month', new Date('2026-03-10T18:30:00Z'), NY)).toEqual({
      start: '2026-02-01',
      end: '2026-02-28'
    })
  })

  it('covers the full previous month through Feb 29 in a leap year', () => {
    // 2028 is a leap year
    expect(presetDateRange('last-month', new Date('2028-03-10T18:30:00Z'), NY)).toEqual({
      start: '2028-02-01',
      end: '2028-02-29'
    })
  })

  it('rolls back across a year boundary (January -> previous December)', () => {
    expect(presetDateRange('last-month', new Date('2026-01-15T18:30:00Z'), NY)).toEqual({
      start: '2025-12-01',
      end: '2025-12-31'
    })
  })
})

describe('presetDateRange: this-quarter', () => {
  it('starts at the beginning of Q2 and ends today (May is in Q2)', () => {
    expect(presetDateRange('this-quarter', new Date('2026-05-20T18:30:00Z'), NY)).toEqual({
      start: '2026-04-01',
      end: '2026-05-20'
    })
  })

  it('treats January as the start of Q1', () => {
    expect(presetDateRange('this-quarter', new Date('2026-01-15T18:30:00Z'), NY)).toEqual({
      start: '2026-01-01',
      end: '2026-01-15'
    })
  })

  it('treats March as still within Q1', () => {
    expect(presetDateRange('this-quarter', new Date('2026-03-31T18:30:00Z'), NY)).toEqual({
      start: '2026-01-01',
      end: '2026-03-31'
    })
  })

  it('treats July as the start of Q3', () => {
    expect(presetDateRange('this-quarter', new Date('2026-07-04T18:30:00Z'), NY)).toEqual({
      start: '2026-07-01',
      end: '2026-07-04'
    })
  })

  it('treats December as within Q4, starting in October', () => {
    expect(presetDateRange('this-quarter', new Date('2026-12-25T18:30:00Z'), NY)).toEqual({
      start: '2026-10-01',
      end: '2026-12-25'
    })
  })
})

describe('presetDateRange: this-year', () => {
  it('starts Jan 1 of the current year and ends today', () => {
    expect(presetDateRange('this-year', new Date('2026-07-04T18:30:00Z'), NY)).toEqual({
      start: '2026-01-01',
      end: '2026-07-04'
    })
  })
})

describe('presetDateRange: last-year', () => {
  it('covers the full previous calendar year', () => {
    expect(presetDateRange('last-year', new Date('2026-03-01T18:30:00Z'), NY)).toEqual({
      start: '2025-01-01',
      end: '2025-12-31'
    })
  })
})

describe('presetDateRange: NY-time boundary', () => {
  it('uses the NY calendar day, not the UTC day, near midnight', () => {
    // 2026-02-01T02:00:00Z is 21:00 EST on 2026-01-31 in NY -> still January
    expect(presetDateRange('this-month', new Date('2026-02-01T02:00:00Z'), NY)).toEqual({
      start: '2026-01-01',
      end: '2026-01-31'
    })
  })
})

describe('monthRange', () => {
  it('spans the whole month', () => {
    expect(monthRange(2026, 11)).toEqual({ start: '2026-11-01', end: '2026-11-30' })
  })

  it('handles February in leap and non-leap years', () => {
    expect(monthRange(2028, 2).end).toBe('2028-02-29')
    expect(monthRange(2026, 2).end).toBe('2026-02-28')
  })
})

describe('monthGridDays', () => {
  it('starts on the Sunday on or before the 1st and covers whole weeks', () => {
    // November 2026 starts on a Sunday and has 30 days -> 5 weeks.
    const nov = monthGridDays(2026, 11)
    expect(nov[0]).toBe('2026-11-01')
    expect(nov.length).toBe(35)
    expect(nov[nov.length - 1]).toBe('2026-12-05')
  })

  it('pads with the previous month when the 1st is mid-week', () => {
    // January 2026 starts on a Thursday.
    const jan = monthGridDays(2026, 1)
    expect(jan.slice(0, 5)).toEqual(['2025-12-28', '2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01'])
    expect(jan.length % 7).toBe(0)
    expect(jan).toContain('2026-01-31')
  })
})

describe('addMonths', () => {
  it('rolls across year boundaries in both directions', () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
    expect(addMonths(2026, 6, 0)).toEqual({ year: 2026, month: 6 })
  })
})
