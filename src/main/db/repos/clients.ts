import { randomUUID } from 'crypto'
import { getDb } from '../connection'
import type { Client, ClientInput, ClientListItem, RosterRow } from '../../../shared/types'

const NULLABLE_FIELDS = [
  'dob',
  'address_line1', 'address_line2', 'city', 'state', 'postal_code',
  'phone', 'email',
  'emergency_name', 'emergency_phone', 'emergency_relationship',
  'insurance_carrier', 'insurance_member_id', 'insurance_group_id',
  'insurance_plan_holder_name', 'insurance_plan_holder_dob'
] as const

function normalize(input: ClientInput): Record<string, unknown> {
  const out: Record<string, unknown> = { ...input }
  for (const f of NULLABLE_FIELDS) {
    const v = out[f]
    out[f] = v == null || v === '' ? null : v
  }
  return out
}

export function list(): ClientListItem[] {
  return getDb()
    .prepare(
      `SELECT c.*,
        (SELECT MAX(s.session_date) FROM sessions s WHERE s.client_id = c.id) AS last_session_date
       FROM clients c
       WHERE c.active = 1
       ORDER BY c.last_name COLLATE NOCASE, c.first_name COLLATE NOCASE`
    )
    .all() as ClientListItem[]
}

export function get(id: string): Client | undefined {
  return getDb().prepare('SELECT * FROM clients WHERE id = ?').get(id) as Client | undefined
}

export function upsert(input: ClientInput): Client {
  const now = new Date().toISOString()
  const existing = input.id ? get(input.id) : undefined
  const id = input.id ?? randomUUID()
  const normalized = normalize(input)
  const active = input.active ?? 1

  if (existing) {
    getDb().prepare(`
      UPDATE clients SET
        first_name = @first_name, last_name = @last_name,
        dob = @dob,
        address_line1 = @address_line1, address_line2 = @address_line2,
        city = @city, state = @state, postal_code = @postal_code,
        phone = @phone, email = @email,
        emergency_name = @emergency_name, emergency_phone = @emergency_phone,
        emergency_relationship = @emergency_relationship,
        insurance_carrier = @insurance_carrier, insurance_member_id = @insurance_member_id,
        insurance_group_id = @insurance_group_id,
        insurance_plan_holder_name = @insurance_plan_holder_name,
        insurance_plan_holder_dob = @insurance_plan_holder_dob,
        active = @active,
        updated_at = @updated_at
      WHERE id = @id
    `).run({ ...normalized, id, active, updated_at: now })
  } else {
    getDb().prepare(`
      INSERT INTO clients (
        id, first_name, last_name, dob,
        address_line1, address_line2, city, state, postal_code,
        phone, email,
        emergency_name, emergency_phone, emergency_relationship,
        insurance_carrier, insurance_member_id, insurance_group_id,
        insurance_plan_holder_name, insurance_plan_holder_dob,
        active, created_at, updated_at
      ) VALUES (
        @id, @first_name, @last_name, @dob,
        @address_line1, @address_line2, @city, @state, @postal_code,
        @phone, @email,
        @emergency_name, @emergency_phone, @emergency_relationship,
        @insurance_carrier, @insurance_member_id, @insurance_group_id,
        @insurance_plan_holder_name, @insurance_plan_holder_dob,
        @active, @created_at, @updated_at
      )
    `).run({ ...normalized, id, active, created_at: now, updated_at: now })
  }

  return get(id)!
}

export function roster(today: string): RosterRow[] {
  return getDb()
    .prepare(
      `SELECT
         c.id,
         c.first_name,
         c.last_name,
         (SELECT MAX(s.session_date) FROM sessions s WHERE s.client_id = c.id) AS last_session_date,
         (SELECT COUNT(*) FROM sessions s WHERE s.client_id = c.id) AS sessions_total,
         (SELECT COUNT(*) FROM sessions s
            WHERE s.client_id = c.id
              AND s.session_date >= date(?, '-30 days')
              AND s.session_date <= ?) AS sessions_30d,
         (SELECT COUNT(*) FROM sessions s
            WHERE s.client_id = c.id AND s.paid = 0) AS unpaid_count,
         (SELECT COALESCE(SUM(s.fee_cents), 0) FROM sessions s
            WHERE s.client_id = c.id AND s.paid = 0) AS unpaid_cents,
         (SELECT COUNT(*) FROM sessions s
            WHERE s.client_id = c.id AND s.signed_at IS NULL AND s.session_date <= ?) AS unsigned_count
       FROM clients c
       WHERE c.active = 1
       ORDER BY c.last_name COLLATE NOCASE, c.first_name COLLATE NOCASE`
    )
    .all(today, today, today) as RosterRow[]
}

export function softDelete(id: string): void {
  getDb()
    .prepare('UPDATE clients SET active = 0, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), id)
}
