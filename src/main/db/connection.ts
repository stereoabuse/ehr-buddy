import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, chmodSync, existsSync } from 'fs'
import { runMigrations } from './migrations'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const userData = app.getPath('userData')
  // Restrict the PHI data directory to the owner (POSIX only).
  mkdirSync(userData, { recursive: true, mode: 0o700 })
  const dbPath = join(userData, 'ehrbuddy.db')

  console.log(`[db] opening ${dbPath}`)
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Restrict the DB and its WAL sidecars to the owner (POSIX only).
  if (process.platform !== 'win32') {
    for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
      try {
        if (existsSync(file)) chmodSync(file, 0o600)
      } catch (err) {
        console.error(`[db] chmod failed for ${file}:`, err)
      }
    }
  }

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
