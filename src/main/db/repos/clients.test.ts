import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb, insertSession } from '../../../test/db-helpers'

let db: Database.Database

vi.mock('../connection', () => ({
  getDb: () => db
}))

// Imported after mock so the repo binds to our in-memory DB
import * as clientsRepo from './clients'

beforeEach(() => {
  db = createTestDb()
})

describe('clients.upsert', () => {
  it('inserts a new client and generates a UUID when id is absent', () => {
    const client = clientsRepo.upsert({ first_name: 'Ada', last_name: 'Lovelace' })

    expect(client.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(client.first_name).toBe('Ada')
    expect(client.active).toBe(1)
    expect(client.created_at).toBe(client.updated_at)
  })

  it('normalizes empty strings to null on nullable fields', () => {
    const client = clientsRepo.upsert({
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: '',
      phone: '',
      dob: '',
      insurance_carrier: '   ' // non-empty whitespace is preserved (only "" maps to null)
    })

    expect(client.email).toBeNull()
    expect(client.phone).toBeNull()
    expect(client.dob).toBeNull()
    expect(client.insurance_carrier).toBe('   ')
  })

  it('preserves provided values for nullable fields', () => {
    const client = clientsRepo.upsert({
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      dob: '1815-12-10'
    })

    expect(client.email).toBe('ada@example.com')
    expect(client.dob).toBe('1815-12-10')
  })

  it('updates an existing client in place when id is provided', async () => {
    const created = clientsRepo.upsert({ first_name: 'Ada', last_name: 'Lovelace' })
    await new Promise((r) => setTimeout(r, 5)) // ensure updated_at tick
    const updated = clientsRepo.upsert({
      id: created.id,
      first_name: 'Augusta',
      last_name: 'King'
    })

    expect(updated.id).toBe(created.id)
    expect(updated.first_name).toBe('Augusta')
    expect(updated.created_at).toBe(created.created_at)
    expect(updated.updated_at).not.toBe(created.updated_at)

    const rowCount = db.prepare('SELECT COUNT(*) as n FROM clients').get() as { n: number }
    expect(rowCount.n).toBe(1)
  })

  it('treats a non-existent id as an insert', () => {
    const client = clientsRepo.upsert({
      id: 'does-not-exist',
      first_name: 'Ada',
      last_name: 'Lovelace'
    })

    expect(client.id).toBe('does-not-exist')
    const rowCount = db.prepare('SELECT COUNT(*) as n FROM clients').get() as { n: number }
    expect(rowCount.n).toBe(1)
  })
})

describe('clients.list', () => {
  it('returns only active clients ordered by last_name then first_name, case-insensitive', () => {
    clientsRepo.upsert({ first_name: 'Ada', last_name: 'lovelace' })
    clientsRepo.upsert({ first_name: 'Charles', last_name: 'Babbage' })
    const deleted = clientsRepo.upsert({ first_name: 'George', last_name: 'Boole' })
    clientsRepo.softDelete(deleted.id)

    const rows = clientsRepo.list()

    expect(rows.map((c) => c.last_name)).toEqual(['Babbage', 'lovelace'])
  })

  it('includes last_session_date computed from sessions', () => {
    const ada = clientsRepo.upsert({ first_name: 'Ada', last_name: 'Lovelace' })
    insertSession(db, { id: 's1', client_id: ada.id, session_date: '2026-01-10' })
    insertSession(db, { id: 's2', client_id: ada.id, session_date: '2026-03-15' })

    const [row] = clientsRepo.list()
    expect(row.last_session_date).toBe('2026-03-15')
  })

  it('returns null last_session_date when no sessions exist', () => {
    clientsRepo.upsert({ first_name: 'Ada', last_name: 'Lovelace' })
    const [row] = clientsRepo.list()
    expect(row.last_session_date).toBeNull()
  })
})

describe('clients.get', () => {
  it('returns undefined for unknown id', () => {
    expect(clientsRepo.get('nope')).toBeUndefined()
  })

  it('returns soft-deleted clients (get does not filter by active)', () => {
    const created = clientsRepo.upsert({ first_name: 'Ada', last_name: 'Lovelace' })
    clientsRepo.softDelete(created.id)
    const row = clientsRepo.get(created.id)
    expect(row?.active).toBe(0)
  })
})

describe('clients.softDelete', () => {
  it('sets active=0 and excludes the client from list()', () => {
    const created = clientsRepo.upsert({ first_name: 'Ada', last_name: 'Lovelace' })
    clientsRepo.softDelete(created.id)

    expect(clientsRepo.list()).toHaveLength(0)
    expect(clientsRepo.get(created.id)?.active).toBe(0)
  })
})
