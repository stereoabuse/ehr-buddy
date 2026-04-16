import type Database from 'better-sqlite3'
import m001 from './001_init.sql?raw'

interface Migration {
  version: number
  name: string
  sql: string
}

const migrations: Migration[] = [
  { version: 1, name: '001_init', sql: m001 }
]

export function runMigrations(db: Database.Database): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number
  const pending = migrations.filter((m) => m.version > currentVersion)
  if (pending.length === 0) return

  for (const m of pending) {
    console.log(`[migrations] applying ${m.name}...`)
    const tx = db.transaction(() => {
      db.exec(m.sql)
      db.pragma(`user_version = ${m.version}`)
    })
    tx()
    console.log(`[migrations] ${m.name} applied.`)
  }
}
