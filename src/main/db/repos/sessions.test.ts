import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb, insertClient, insertSession } from '../../../test/db-helpers'

let db: Database.Database

vi.mock('../connection', () => ({
  getDb: () => db
}))

import * as sessionsRepo from './sessions'

beforeEach(() => {
  db = createTestDb()
  insertClient(db, { id: 'c1', first_name: 'Ada', last_name: 'Lovelace' })
  insertClient(db, { id: 'c2', first_name: 'Charles', last_name: 'Babbage' })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('sessions.upsert', () => {
  it('inserts with a UUID and applies defaults', () => {
    const session = sessionsRepo.upsert({
      client_id: 'c1',
      session_date: '2026-04-22',
      start_time: '09:00',
      end_time: '09:45',
      cpt_code: '90834',
      fee_cents: 15000
    })

    expect(session.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(session.paid).toBe(0)
    expect(session.note_format).toBe('DAP')
    expect(session.icd10_codes).toBeNull()
    expect(session.note_body).toBeNull()
  })

  it('honors explicit values for optional fields', () => {
    const session = sessionsRepo.upsert({
      client_id: 'c1',
      session_date: '2026-04-22',
      start_time: '09:00',
      end_time: '09:45',
      cpt_code: '90834',
      fee_cents: 15000,
      paid: 1,
      note_format: 'FREE',
      icd10_codes: 'F41.1',
      note_body: 'note'
    })

    expect(session.paid).toBe(1)
    expect(session.note_format).toBe('FREE')
    expect(session.icd10_codes).toBe('F41.1')
    expect(session.note_body).toBe('note')
  })

  it('updates an existing session without creating a duplicate row', () => {
    const created = sessionsRepo.upsert({
      client_id: 'c1',
      session_date: '2026-04-22',
      start_time: '09:00',
      end_time: '09:45',
      cpt_code: '90834',
      fee_cents: 15000
    })

    const updated = sessionsRepo.upsert({
      id: created.id,
      client_id: 'c1',
      session_date: '2026-04-22',
      start_time: '09:00',
      end_time: '09:45',
      cpt_code: '90834',
      fee_cents: 20000,
      paid: 1
    })

    expect(updated.id).toBe(created.id)
    expect(updated.fee_cents).toBe(20000)
    expect(updated.paid).toBe(1)
    const count = db.prepare('SELECT COUNT(*) as n FROM sessions').get() as { n: number }
    expect(count.n).toBe(1)
  })
})

describe('sessions.listByClient', () => {
  it('returns sessions for the given client, ordered date DESC, start_time DESC', () => {
    insertSession(db, { id: 's1', client_id: 'c1', session_date: '2026-04-20', start_time: '09:00' })
    insertSession(db, { id: 's2', client_id: 'c1', session_date: '2026-04-22', start_time: '09:00' })
    insertSession(db, { id: 's3', client_id: 'c1', session_date: '2026-04-22', start_time: '14:00' })
    insertSession(db, { id: 's4', client_id: 'c2', session_date: '2026-04-22', start_time: '09:00' })

    const rows = sessionsRepo.listByClient('c1')

    expect(rows.map((r) => r.id)).toEqual(['s3', 's2', 's1'])
  })
})

describe('sessions.today', () => {
  it('returns only sessions on the current date and only for active clients', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-22T12:00:00Z'))

    insertSession(db, { id: 's1', client_id: 'c1', session_date: '2026-04-22', start_time: '14:00' })
    insertSession(db, { id: 's2', client_id: 'c1', session_date: '2026-04-22', start_time: '09:00' })
    insertSession(db, { id: 's3', client_id: 'c1', session_date: '2026-04-21', start_time: '09:00' })
    // Inactive client
    db.prepare('UPDATE clients SET active = 0 WHERE id = ?').run('c2')
    insertSession(db, { id: 's4', client_id: 'c2', session_date: '2026-04-22', start_time: '09:00' })

    const rows = sessionsRepo.today()

    expect(rows.map((r) => r.id)).toEqual(['s2', 's1'])
    expect(rows[0].client_first_name).toBe('Ada')
  })
})

describe('sessions.allInRange', () => {
  it('applies inclusive date bounds and excludes inactive clients', () => {
    insertSession(db, { id: 's1', client_id: 'c1', session_date: '2026-04-10' })
    insertSession(db, { id: 's2', client_id: 'c1', session_date: '2026-04-15' })
    insertSession(db, { id: 's3', client_id: 'c1', session_date: '2026-04-20' })
    insertSession(db, { id: 's4', client_id: 'c1', session_date: '2026-04-25' })
    db.prepare('UPDATE clients SET active = 0 WHERE id = ?').run('c2')
    insertSession(db, { id: 's5', client_id: 'c2', session_date: '2026-04-15' })

    const rows = sessionsRepo.allInRange('2026-04-10', '2026-04-20')

    expect(rows.map((r) => r.id)).toEqual(['s1', 's2', 's3'])
  })
})

describe('sessions.allUnpaid', () => {
  it('returns only paid=0 sessions for active clients, newest first', () => {
    insertSession(db, { id: 's1', client_id: 'c1', session_date: '2026-04-10', paid: 0 })
    insertSession(db, { id: 's2', client_id: 'c1', session_date: '2026-04-20', paid: 1 })
    insertSession(db, { id: 's3', client_id: 'c1', session_date: '2026-04-15', paid: 0 })
    db.prepare('UPDATE clients SET active = 0 WHERE id = ?').run('c2')
    insertSession(db, { id: 's4', client_id: 'c2', session_date: '2026-04-30', paid: 0 })

    const rows = sessionsRepo.allUnpaid()

    expect(rows.map((r) => r.id)).toEqual(['s3', 's1'])
  })
})

describe('sessions google id fields', () => {
  it('round-trips google_event_id via setters and getters', () => {
    insertSession(db, { id: 's1', client_id: 'c1' })

    expect(sessionsRepo.getGoogleEventId('s1')).toBeNull()
    sessionsRepo.setGoogleEventId('s1', 'evt-123')
    expect(sessionsRepo.getGoogleEventId('s1')).toBe('evt-123')
    sessionsRepo.setGoogleEventId('s1', null)
    expect(sessionsRepo.getGoogleEventId('s1')).toBeNull()
  })

  it('round-trips google_doc_id via setters and getters', () => {
    insertSession(db, { id: 's1', client_id: 'c1' })

    expect(sessionsRepo.getGoogleDocId('s1')).toBeNull()
    sessionsRepo.setGoogleDocId('s1', 'doc-abc')
    expect(sessionsRepo.getGoogleDocId('s1')).toBe('doc-abc')
  })

  it('returns null for an unknown session id', () => {
    expect(sessionsRepo.getGoogleEventId('missing')).toBeNull()
    expect(sessionsRepo.getGoogleDocId('missing')).toBeNull()
  })
})

describe('sessions.del', () => {
  it('removes the session', () => {
    insertSession(db, { id: 's1', client_id: 'c1' })
    sessionsRepo.del('s1')
    expect(sessionsRepo.get('s1')).toBeUndefined()
  })
})
