import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { runMigrations } from './migrations'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const userData = app.getPath('userData')
  mkdirSync(userData, { recursive: true })
  const dbPath = join(userData, 'ehrbuddy.db')

  console.log(`[db] opening ${dbPath}`)
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)

  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function dbPath(): string {
  return join(app.getPath('userData'), 'ehrbuddy.db')
}
