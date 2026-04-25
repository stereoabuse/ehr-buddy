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
