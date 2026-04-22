import { describe, expect, it } from 'vitest'
import {
  clientUpsertSchema,
  clinicianUpsertSchema,
  reportArgsSchema,
  sessionUpsertSchema,
  superbillSchema
} from './schemas'

describe('clientUpsertSchema', () => {
  it('accepts a minimal valid client', () => {
    expect(clientUpsertSchema.parse({ first_name: 'Ada', last_name: 'Lovelace' })).toMatchObject({
      first_name: 'Ada',
      last_name: 'Lovelace'
    })
  })

  it('rejects empty and whitespace-only first_name', () => {
    expect(clientUpsertSchema.safeParse({ first_name: '', last_name: 'L' }).success).toBe(false)
    expect(clientUpsertSchema.safeParse({ first_name: '   ', last_name: 'L' }).success).toBe(false)
  })

  it('rejects missing last_name', () => {
    expect(clientUpsertSchema.safeParse({ first_name: 'Ada' }).success).toBe(false)
  })

  it('accepts null for nullable optional fields', () => {
    const parsed = clientUpsertSchema.parse({
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: null,
      dob: null
    })
    expect(parsed.email).toBeNull()
    expect(parsed.dob).toBeNull()
  })
})

describe('clinicianUpsertSchema', () => {
  it('accepts a minimal valid clinician', () => {
    expect(clinicianUpsertSchema.parse({ full_name: 'Dr X' })).toMatchObject({ full_name: 'Dr X' })
  })

  it('requires non-empty full_name', () => {
    expect(clinicianUpsertSchema.safeParse({ full_name: '' }).success).toBe(false)
    expect(clinicianUpsertSchema.safeParse({ full_name: '   ' }).success).toBe(false)
  })

  it('requires non-negative integer cents for default_fees entries', () => {
    expect(
      clinicianUpsertSchema.safeParse({ full_name: 'Dr X', default_fees: { '90834': 15000 } })
        .success
    ).toBe(true)

    expect(
      clinicianUpsertSchema.safeParse({ full_name: 'Dr X', default_fees: { '90834': -1 } }).success
    ).toBe(false)

    expect(
      clinicianUpsertSchema.safeParse({ full_name: 'Dr X', default_fees: { '90834': 150.5 } })
        .success
    ).toBe(false)
  })
})

describe('sessionUpsertSchema', () => {
  const base = {
    client_id: 'c1',
    session_date: '2026-04-22',
    start_time: '09:00',
    end_time: '09:45',
    cpt_code: '90834',
    fee_cents: 15000
  }

  it('accepts a minimal valid session', () => {
    expect(sessionUpsertSchema.parse(base)).toMatchObject(base)
  })

  it('rejects a negative or non-integer fee_cents', () => {
    expect(sessionUpsertSchema.safeParse({ ...base, fee_cents: -1 }).success).toBe(false)
    expect(sessionUpsertSchema.safeParse({ ...base, fee_cents: 1.5 }).success).toBe(false)
  })

  it('rejects a paid value outside 0..1', () => {
    expect(sessionUpsertSchema.safeParse({ ...base, paid: 2 }).success).toBe(false)
    expect(sessionUpsertSchema.safeParse({ ...base, paid: -1 }).success).toBe(false)
  })

  it('rejects an unknown note_format', () => {
    expect(sessionUpsertSchema.safeParse({ ...base, note_format: 'SOAP' }).success).toBe(false)
  })

  it('accepts DAP and FREE note_format', () => {
    expect(sessionUpsertSchema.parse({ ...base, note_format: 'DAP' }).note_format).toBe('DAP')
    expect(sessionUpsertSchema.parse({ ...base, note_format: 'FREE' }).note_format).toBe('FREE')
  })

  it('rejects missing required fields', () => {
    for (const field of [
      'client_id',
      'session_date',
      'start_time',
      'end_time',
      'cpt_code',
      'fee_cents'
    ] as const) {
      const { [field]: _omit, ...rest } = base
      expect(sessionUpsertSchema.safeParse(rest).success).toBe(false)
    }
  })
})

describe('superbillSchema and reportArgsSchema', () => {
  it('superbillSchema requires clientId and both dates', () => {
    expect(
      superbillSchema.parse({ clientId: 'c1', fromDate: '2026-01-01', toDate: '2026-12-31' })
    ).toBeDefined()
    expect(superbillSchema.safeParse({ clientId: '', fromDate: 'a', toDate: 'b' }).success).toBe(
      false
    )
  })

  it('reportArgsSchema requires both dates', () => {
    expect(reportArgsSchema.parse({ fromDate: '2026-01-01', toDate: '2026-12-31' })).toBeDefined()
    expect(reportArgsSchema.safeParse({ fromDate: '', toDate: 'x' }).success).toBe(false)
  })
})
