import { app, dialog } from 'electron'
import { copyFileSync } from 'fs'
import { join } from 'path'
import { getDb, dbPath } from './db/connection'

export async function runBackup(): Promise<string | null> {
  const db = getDb()
  db.pragma('wal_checkpoint(TRUNCATE)')

  const defaultName = `ehrbuddy-backup-${new Date().toISOString().slice(0, 10)}.db`

  const result = await dialog.showSaveDialog({
    title: 'Save Database Backup',
    defaultPath: join(app.getPath('documents'), defaultName),
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  })

  if (result.canceled || !result.filePath) return null

  copyFileSync(dbPath(), result.filePath)
  console.log(`[backup] saved to ${result.filePath}`)
  return result.filePath
}
