import { randomUUID } from 'crypto'
import { getDb } from '../connection'
import type { Session, SessionInput, SessionWithClient } from '../../../shared/types'

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

export function today(): SessionWithClient[] {
  const todayStr = new Date().toISOString().slice(0, 10)
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

/** Set the Google Calendar event ID on a session */
export function setGoogleEventId(sessionId: string, eventId: string | null): void {
  getDb()
    .prepare('UPDATE sessions SET google_event_id = ? WHERE id = ?')
    .run(eventId, sessionId)
}

/** Set the Google Doc ID on a session */
export function setGoogleDocId(sessionId: string, docId: string | null): void {
  getDb()
    .prepare('UPDATE sessions SET google_doc_id = ? WHERE id = ?')
    .run(docId, sessionId)
}

/** Get google_event_id for a session */
export function getGoogleEventId(sessionId: string): string | null {
  const row = getDb()
    .prepare('SELECT google_event_id FROM sessions WHERE id = ?')
    .get(sessionId) as { google_event_id: string | null } | undefined
  return row?.google_event_id ?? null
}

/** Get google_doc_id for a session */
export function getGoogleDocId(sessionId: string): string | null {
  const row = getDb()
    .prepare('SELECT google_doc_id FROM sessions WHERE id = ?')
    .get(sessionId) as { google_doc_id: string | null } | undefined
  return row?.google_doc_id ?? null
}
