import { randomUUID } from 'crypto'
import { getDb } from '../connection'
import type {
  Session,
  SessionAmendment,
  SessionInput,
  SessionWithClient
} from '../../../shared/types'

export function listByClient(clientId: string): Session[] {
  return getDb()
    .prepare(
      'SELECT * FROM sessions WHERE client_id = ? ORDER BY session_date DESC, start_time DESC'
    )
    .all(clientId) as Session[]
}

export function get(id: string): Session | undefined {
  return getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined
}

export function exists(id: string): boolean {
  return !!getDb().prepare('SELECT 1 FROM sessions WHERE id = ?').get(id)
}

export function upsert(input: SessionInput): Session {
  const now = new Date().toISOString()
  const existing = input.id ? get(input.id) : undefined
  const id = input.id ?? randomUUID()

  const row = {
    id,
    client_id: input.client_id,
    session_date: input.session_date,
    start_time: input.start_time,
    end_time: input.end_time,
    cpt_code: input.cpt_code,
    icd10_codes: input.icd10_codes ?? null,
    fee_cents: input.fee_cents,
    paid: input.paid ?? 0,
    note_format: input.note_format ?? 'DAP',
    note_body: input.note_body ?? null,
    updated_at: now
  }

  if (existing) {
    getDb()
      .prepare(
        `UPDATE sessions SET
          client_id = @client_id,
          session_date = @session_date,
          start_time = @start_time,
          end_time = @end_time,
          cpt_code = @cpt_code,
          icd10_codes = @icd10_codes,
          fee_cents = @fee_cents,
          paid = @paid,
          note_format = @note_format,
          note_body = @note_body,
          updated_at = @updated_at
        WHERE id = @id`
      )
      .run(row)
  } else {
    getDb()
      .prepare(
        `INSERT INTO sessions (
          id, client_id, session_date, start_time, end_time,
          cpt_code, icd10_codes, fee_cents, paid,
          note_format, note_body,
          created_at, updated_at
        ) VALUES (
          @id, @client_id, @session_date, @start_time, @end_time,
          @cpt_code, @icd10_codes, @fee_cents, @paid,
          @note_format, @note_body,
          @created_at, @updated_at
        )`
      )
      .run({ ...row, created_at: now })
  }

  return get(id)!
}

export function del(id: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

/** Update only paid/fee_cents on a signed session — used by sign-lock path. */
export function updateBilling(id: string, paid: 0 | 1, fee_cents: number): Session {
  const now = new Date().toISOString()
  getDb()
    .prepare('UPDATE sessions SET paid = ?, fee_cents = ?, updated_at = ? WHERE id = ?')
    .run(paid, fee_cents, now, id)
  return get(id)!
}

/** Toggle paid only. Used by inline mark-paid action. */
export function setPaid(id: string, paid: 0 | 1): Session {
  const now = new Date().toISOString()
  getDb()
    .prepare('UPDATE sessions SET paid = ?, updated_at = ? WHERE id = ?')
    .run(paid, now, id)
  return get(id)!
}

/** Sign off on a session (writes the latest body+format then snapshots the signer). */
export function sign(
  id: string,
  body: string,
  note_format: 'DAP' | 'FREE',
  signedAt: string,
  signerName: string,
  signerCredentials: string | null
): Session {
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `UPDATE sessions SET
         note_body = ?,
         note_format = ?,
         signed_at = ?,
         signed_by_name = ?,
         signed_by_credentials = ?,
         updated_at = ?
       WHERE id = ?`
    )
    .run(body, note_format, signedAt, signerName, signerCredentials, now, id)
  return get(id)!
}

export function addAmendment(input: {
  session_id: string
  body: string
  signedAt: string
  signerName: string
  signerCredentials: string | null
}): SessionAmendment {
  const id = randomUUID()
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO session_amendments (
         id, session_id, body,
         signed_at, signed_by_name, signed_by_credentials,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.session_id,
      input.body,
      input.signedAt,
      input.signerName,
      input.signerCredentials,
      now
    )
  return getDb()
    .prepare('SELECT * FROM session_amendments WHERE id = ?')
    .get(id) as SessionAmendment
}

export function listAmendments(sessionId: string): SessionAmendment[] {
  return getDb()
    .prepare(
      'SELECT * FROM session_amendments WHERE session_id = ? ORDER BY created_at ASC'
    )
    .all(sessionId) as SessionAmendment[]
}

export function today(): SessionWithClient[] {
  const todayStr = localDateStr(new Date())
  return getDb()
    .prepare(
      `SELECT s.*, c.first_name AS client_first_name, c.last_name AS client_last_name
       FROM sessions s JOIN clients c ON s.client_id = c.id
       WHERE s.session_date = ? AND c.active = 1
       ORDER BY s.start_time`
    )
    .all(todayStr) as SessionWithClient[]
}

export function allInRange(fromDate: string, toDate: string): SessionWithClient[] {
  return getDb()
    .prepare(
      `SELECT s.*, c.first_name AS client_first_name, c.last_name AS client_last_name
       FROM sessions s JOIN clients c ON s.client_id = c.id
       WHERE s.session_date >= ? AND s.session_date <= ? AND c.active = 1
       ORDER BY s.session_date, s.start_time`
    )
    .all(fromDate, toDate) as SessionWithClient[]
}

export function allUnpaid(): SessionWithClient[] {
  return getDb()
    .prepare(
      `SELECT s.*, c.first_name AS client_first_name, c.last_name AS client_last_name
       FROM sessions s JOIN clients c ON s.client_id = c.id
       WHERE s.paid = 0 AND c.active = 1
       ORDER BY s.session_date DESC`
    )
    .all() as SessionWithClient[]
}

// Local date (YYYY-MM-DD) so "today" matches the clinician's wall clock,
// not UTC. Avoids the late-evening Pacific bug where today rolls forward.
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
