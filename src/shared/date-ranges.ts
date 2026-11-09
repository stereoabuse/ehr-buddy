import { practiceTimeZone } from './date'

export type DateRangePreset = 'this-month' | 'last-month' | 'this-quarter' | 'this-year' | 'last-year'

export interface DateRange {
  start: string
  end: string
}

export const DATE_RANGE_PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'this-quarter', label: 'This quarter' },
  { id: 'this-year', label: 'This year' },
  { id: 'last-year', label: 'Last year' }
]

/**
 * Computes an ISO (YYYY-MM-DD) start/end pair for a named preset, anchored to
 * `today`. `today` is a required-in-spirit parameter (defaulted to `new
 * Date()` for caller convenience) so tests can pin the reference instant —
 * this function never reads the clock itself, keeping it pure and
 * deterministic. Calendar math uses `timeZone` (the machine's zone by
 * default, see `practiceTimeZone`), matching the rest of src/shared/date.ts.
 */
export function presetDateRange(
  preset: DateRangePreset,
  today: Date = new Date(),
  timeZone: string = practiceTimeZone()
): DateRange {
  const { year, month, day } = practiceDateParts(today, timeZone)
  const todayIso = isoDate(year, month, day)

  switch (preset) {
    case 'this-month':
      return { start: isoDate(year, month, 1), end: todayIso }
    case 'last-month': {
      const { year: py, month: pm } = shiftMonth(year, month, -1)
      return { start: isoDate(py, pm, 1), end: isoDate(py, pm, daysInMonth(py, pm)) }
    }
    case 'this-quarter':
      return { start: isoDate(year, quarterStartMonth(month), 1), end: todayIso }
    case 'this-year':
      return { start: isoDate(year, 1, 1), end: todayIso }
    case 'last-year':
      return { start: isoDate(year - 1, 1, 1), end: isoDate(year - 1, 12, 31) }
  }
}

function practiceDateParts(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(date)

  return {
    year: Number(partValue(parts, 'year')),
    month: Number(partValue(parts, 'month')),
    day: Number(partValue(parts, 'day'))
  }
}

function partValue(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((part) => part.type === type)?.value ?? ''
}

function shiftMonth(year: number, month: number, delta: -1): { year: number; month: number } {
  if (month + delta < 1) return { year: year - 1, month: 12 }
  return { year, month: month + delta }
}

function quarterStartMonth(month: number): number {
  return Math.floor((month - 1) / 3) * 3 + 1
}

/** First and last ISO day of a calendar month (`month` is 1-12). */
export function monthRange(year: number, month: number): DateRange {
  return { start: isoDate(year, month, 1), end: isoDate(year, month, daysInMonth(year, month)) }
}

/**
 * ISO dates for a Sunday-first month grid: whole weeks covering the month,
 * padded with the trailing days of the previous month and leading days of
 * the next. Length is always a multiple of 7.
 */
export function monthGridDays(year: number, month: number): string[] {
  const leading = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const cellCount = Math.ceil((leading + daysInMonth(year, month)) / 7) * 7
  const days: string[] = []
  for (let i = 0; i < cellCount; i += 1) {
    const d = new Date(Date.UTC(year, month - 1, 1 - leading + i))
    days.push(isoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()))
  }
  return days
}

/** Step a {year, month} pair by `delta` months (`month` is 1-12). */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

function daysInMonth(year: number, month: number): number {
  // Day 0 of the following month (0-based) is the last day of `month`.
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function isoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
