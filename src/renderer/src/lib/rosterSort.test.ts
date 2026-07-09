import { describe, it, expect } from 'vitest'
import type { RosterRow } from '@shared/types'
import { sortRoster } from './rosterSort'

function row(overrides: Partial<RosterRow>): RosterRow {
  return {
    id: 'x',
    first_name: 'First',
    last_name: 'Last',
    dob: null,
    phone: null,
    active: 1,
    last_session_date: null,
    sessions_total: 0,
    sessions_30d: 0,
    unpaid_count: 0,
    unpaid_cents: 0,
    unsigned_count: 0,
    last_dx: null,
    ...overrides
  }
}

describe('sortRoster: name', () => {
  const rows = [
    row({ id: '1', first_name: 'Zoe', last_name: 'Adams' }),
    row({ id: '2', first_name: 'Amy', last_name: 'Baker' }),
    row({ id: '3', first_name: 'Bob', last_name: 'Adams' })
  ]

  it('sorts by "Last, First" ascending', () => {
    // Adams, Bob < Adams, Zoe < Baker, Amy
    const sorted = sortRoster(rows, 'name', 'asc')
    expect(sorted.map((r) => r.id)).toEqual(['3', '1', '2'])
  })

  it('sorts by "Last, First" descending', () => {
    const sorted = sortRoster(rows, 'name', 'desc')
    expect(sorted.map((r) => r.id)).toEqual(['2', '1', '3'])
  })

  it('does not mutate the input array', () => {
    const original = [...rows]
    sortRoster(rows, 'name', 'asc')
    expect(rows).toEqual(original)
  })
})

describe('sortRoster: lastSession', () => {
  const rows = [
    row({ id: '1', last_session_date: '2026-05-01' }),
    row({ id: '2', last_session_date: null }),
    row({ id: '3', last_session_date: '2026-06-15' }),
    row({ id: '4', last_session_date: null })
  ]

  it('sorts ascending with nulls last', () => {
    const sorted = sortRoster(rows, 'lastSession', 'asc')
    expect(sorted.map((r) => r.id)).toEqual(['1', '3', '2', '4'])
  })

  it('sorts descending with nulls still last', () => {
    const sorted = sortRoster(rows, 'lastSession', 'desc')
    expect(sorted.map((r) => r.id)).toEqual(['3', '1', '2', '4'])
  })
})

describe('sortRoster: balance', () => {
  const rows = [
    row({ id: '1', unpaid_cents: 5000 }),
    row({ id: '2', unpaid_cents: 0 }),
    row({ id: '3', unpaid_cents: 12000 })
  ]

  it('sorts ascending by unpaid_cents', () => {
    const sorted = sortRoster(rows, 'balance', 'asc')
    expect(sorted.map((r) => r.id)).toEqual(['2', '1', '3'])
  })

  it('sorts descending by unpaid_cents', () => {
    const sorted = sortRoster(rows, 'balance', 'desc')
    expect(sorted.map((r) => r.id)).toEqual(['3', '1', '2'])
  })
})
