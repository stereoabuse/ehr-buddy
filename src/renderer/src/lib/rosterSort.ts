import type { RosterRow } from '@shared/types'

export type SortKey = 'name' | 'lastSession' | 'balance'
export type SortDirection = 'asc' | 'desc'

/**
 * Compares two possibly-null values, always sorting nulls last regardless of
 * direction. Direction only flips the ordering of two non-null values.
 */
function compareNullable<T>(
  a: T | null,
  b: T | null,
  compare: (a: T, b: T) => number,
  direction: SortDirection
): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  const result = compare(a, b)
  return direction === 'asc' ? result : -result
}

function nameKey(row: RosterRow): string {
  return `${row.last_name}, ${row.first_name}`.toLowerCase()
}

export function sortRoster(rows: RosterRow[], key: SortKey, direction: SortDirection): RosterRow[] {
  return [...rows].sort((a, b) => {
    switch (key) {
      case 'name':
        return compareNullable(nameKey(a), nameKey(b), (x, y) => x.localeCompare(y), direction)
      case 'lastSession':
        return compareNullable(
          a.last_session_date,
          b.last_session_date,
          (x, y) => x.localeCompare(y),
          direction
        )
      case 'balance':
        return compareNullable(a.unpaid_cents, b.unpaid_cents, (x, y) => x - y, direction)
    }
  })
}
