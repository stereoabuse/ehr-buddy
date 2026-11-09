/**
 * The zone that defines the practice's calendar day: the machine's own zone,
 * resolved on each call so a laptop that changes zones follows along. Every
 * helper below takes an explicit `timeZone` override, which tests use to pin
 * results independently of the machine running them.
 */
export function practiceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function practiceDateString(date = new Date(), timeZone = practiceTimeZone()): string {
  const parts = datePartsInPracticeTime(date, timeZone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function practiceMonthStartString(date = new Date(), timeZone = practiceTimeZone()): string {
  const parts = datePartsInPracticeTime(date, timeZone)
  return `${parts.year}-${parts.month}-01`
}

export function practiceYearStartString(date = new Date(), timeZone = practiceTimeZone()): string {
  const parts = datePartsInPracticeTime(date, timeZone)
  return `${parts.year}-01-01`
}

export function practiceUsDateString(date = new Date(), timeZone = practiceTimeZone()): string {
  return new Intl.DateTimeFormat('en-US', { timeZone }).format(date)
}

export function practiceDayBoundaryIso(
  dateStr: string,
  boundary: 'start' | 'end',
  timeZone = practiceTimeZone()
): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  // Reject falsy/zero/NaN and out-of-range components so an invalid string like
  // '2026-13-05' returns unchanged instead of silently overflowing via Date.UTC.
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) return dateStr
  // The 1..31 bound above still admits calendar-invalid days like Feb 31 or
  // Apr 31, which Date.UTC would silently roll into the next month. Round-trip
  // through UTC and reject anything whose components don't survive intact.
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return dateStr
  }

  const utcMs = zonedTimeToUtcMs(
    {
      year,
      month,
      day,
      hour: boundary === 'start' ? 0 : 23,
      minute: boundary === 'start' ? 0 : 59,
      second: boundary === 'start' ? 0 : 59,
      millisecond: boundary === 'start' ? 0 : 999
    },
    timeZone
  )

  return new Date(utcMs).toISOString()
}

function datePartsInPracticeTime(
  date: Date,
  timeZone: string
): {
  year: string
  month: string
  day: string
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)

  return {
    year: partValue(parts, 'year'),
    month: partValue(parts, 'month'),
    day: partValue(parts, 'day')
  }
}

function zonedTimeToUtcMs(
  input: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    second: number
    millisecond: number
  },
  timeZone: string
): number {
  const localAsUtc = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour,
    input.minute,
    input.second,
    input.millisecond
  )
  let utcMs = localAsUtc

  for (let i = 0; i < 2; i += 1) {
    utcMs = localAsUtc - practiceOffsetMsAt(utcMs, timeZone)
  }

  return utcMs
}

function practiceOffsetMsAt(utcMs: number, timeZone: string): number {
  const date = new Date(utcMs)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(date)

  const zonedAsUtc = Date.UTC(
    Number(partValue(parts, 'year')),
    Number(partValue(parts, 'month')) - 1,
    Number(partValue(parts, 'day')),
    Number(partValue(parts, 'hour')),
    Number(partValue(parts, 'minute')),
    Number(partValue(parts, 'second')),
    date.getUTCMilliseconds()
  )

  return zonedAsUtc - utcMs
}

function partValue(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((part) => part.type === type)?.value ?? ''
}
