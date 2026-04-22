import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join } from 'path'

const MIGRATIONS_DIR = join(__dirname, '../main/db/migrations')

export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  for (const file of ['001_init.sql', '002_google_fields.sql']) {
    db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf-8'))
  }
  return db
}

export function insertClient(
  db: Database.Database,
  overrides: Partial<{
    id: string
    first_name: string
    last_name: string
    active: number
    created_at: string
    updated_at: string
  }> = {}
): string {
  const now = '2026-01-01T00:00:00.000Z'
  const row = {
    id: 'client-1',
    first_name: 'Ada',
    last_name: 'Lovelace',
    active: 1,
    created_at: now,
    updated_at: now,
    ...overrides
  }
  db.prepare(
    `INSERT INTO clients (id, first_name, last_name, active, created_at, updated_at)
     VALUES (@id, @first_name, @last_name, @active, @created_at, @updated_at)`
  ).run(row)
  return row.id
}

export function insertSession(
  db: Database.Database,
  overrides: Partial<{
    id: string
    client_id: string
    session_date: string
    start_time: string
    end_time: string
    cpt_code: string
    icd10_codes: string | null
    fee_cents: number
    paid: number
    note_format: string
    note_body: string | null
    created_at: string
    updated_at: string
  }> = {}
): string {
  const now = '2026-01-01T00:00:00.000Z'
  const row = {
    id: 'session-1',
    client_id: 'client-1',
    session_date: '2026-04-22',
    start_time: '09:00',
    end_time: '09:45',
    cpt_code: '90834',
    icd10_codes: null,
    fee_cents: 15000,
    paid: 0,
    note_format: 'DAP',
    note_body: null,
    created_at: now,
    updated_at: now,
    ...overrides
  }
  db.prepare(
    `INSERT INTO sessions (
      id, client_id, session_date, start_time, end_time,
      cpt_code, icd10_codes, fee_cents, paid, note_format, note_body,
      created_at, updated_at
    ) VALUES (
      @id, @client_id, @session_date, @start_time, @end_time,
      @cpt_code, @icd10_codes, @fee_cents, @paid, @note_format, @note_body,
      @created_at, @updated_at
    )`
  ).run(row)
  return row.id
}
