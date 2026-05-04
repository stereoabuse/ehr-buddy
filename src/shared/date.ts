export const PRACTICE_TIME_ZONE = 'America/New_York'

export function practiceDateString(date = new Date()): string {
  const parts = datePartsInPracticeTime(date)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function practiceMonthStartString(date = new Date()): string {
  const parts = datePartsInPracticeTime(date)
  return `${parts.year}-${parts.month}-01`
}

export function practiceYearStartString(date = new Date()): string {
  const parts = datePartsInPracticeTime(date)
  return `${parts.year}-01-01`
}

export function practiceUsDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PRACTICE_TIME_ZONE
  }).format(date)
}

export function practiceDayBoundaryIso(
  dateStr: string,
  boundary: 'start' | 'end'
): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return dateStr

  const utcMs = zonedTimeToUtcMs({
    year,
    month,
    day,
    hour: boundary === 'start' ? 0 : 23,
    minute: boundary === 'start' ? 0 : 59,
    second: boundary === 'start' ? 0 : 59,
    millisecond: boundary === 'start' ? 0 : 999
  })

  return new Date(utcMs).toISOString()
}

function datePartsInPracticeTime(date: Date): {
  year: string
  month: string
  day: string
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PRACTICE_TIME_ZONE,
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

function zonedTimeToUtcMs(input: {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  millisecond: number
}): number {
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
    utcMs = localAsUtc - practiceOffsetMsAt(utcMs)
  }

  return utcMs
}

function practiceOffsetMsAt(utcMs: number): number {
  const date = new Date(utcMs)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PRACTICE_TIME_ZONE,
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
