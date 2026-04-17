import type Database from 'better-sqlite3'
import m001 from './001_init.sql?raw'
import m003 from './003_audit_log.sql?raw'
import m004 from './004_notes_billing_consents.sql?raw'

interface Migration {
  version: number
  name: string
  sql: string
}

// Note: version 2 (002_google_fields) is intentionally skipped. The Google
// integration was removed in v0.2; existing databases that already ran 002
// keep the unused google_event_id / google_doc_id columns on `sessions`,
// which is harmless. Fresh installs never see them.
const migrations: Migration[] = [
  { version: 1, name: '001_init', sql: m001 },
  { version: 3, name: '003_audit_log', sql: m003 },
  { version: 4, name: '004_notes_billing_consents', sql: m004 }
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
