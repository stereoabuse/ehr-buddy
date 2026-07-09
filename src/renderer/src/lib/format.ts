export function fmtMoney(cents: number): string {
  const dollars = cents / 100
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: dollars % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })
}

export function greetingFor(date: Date = new Date()): string {
  const h = date.getHours()
  if (h < 5) return 'Hello'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function fullDateLabel(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export function firstNameOf(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const trimmed = fullName.trim()
  // Strip leading honorific (Dr., Mr., Ms., Mrs.)
  const stripped = trimmed.replace(/^(Dr|Mr|Ms|Mrs|Mx)\.?\s+/i, '')
  return stripped.split(/\s+/)[0] ?? ''
}

export function initialsOf(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export function initialsOfFullName(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const stripped = fullName.trim().replace(/^(Dr|Mr|Ms|Mrs|Mx)\.?\s+/i, '')
  const parts = stripped.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
}

/** Whole days elapsed between an ISO timestamp and `now`, floored (partial days count as 0). */
export function daysSince(iso: string, now: Date = new Date()): number {
  const ms = now.getTime() - new Date(iso).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

/** Renders a last-backup timestamp as "never", "today", or "N day(s) ago". */
export function backupRecencyLabel(lastRun: string | null, now: Date = new Date()): string {
  if (!lastRun) return 'never'
  const days = daysSince(lastRun, now)
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

/** True when there is no backup on record, or the last one is older than `thresholdDays` (default 7). */
export function isBackupOverdue(
  lastRun: string | null,
  now: Date = new Date(),
  thresholdDays = 7
): boolean {
  if (!lastRun) return true
  return daysSince(lastRun, now) > thresholdDays
}
