import { PRACTICE_TIME_ZONE } from './date'

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
 * deterministic. Calendar math uses the practice's local time zone
 * (`PRACTICE_TIME_ZONE`), matching the rest of src/shared/date.ts.
 */
export function presetDateRange(preset: DateRangePreset, today: Date = new Date()): DateRange {
  const { year, month, day } = practiceDateParts(today)
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

function practiceDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PRACTICE_TIME_ZONE,
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

function daysInMonth(year: number, month: number): number {
  // Day 0 of the following month (0-based) is the last day of `month`.
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function isoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
