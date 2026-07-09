import os from 'os'
import { app, dialog } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { getDb } from './db/connection'
import { csvEscape } from '../shared/csv'
import { practiceDateString, practiceDayBoundaryIso } from '../shared/date'
import type { AuditAction, AuditEntity, AuditEntry, AuditFilter } from '../shared/types'
import { recordSessionOutput } from './session-outputs'

export type { AuditAction, AuditEntity, AuditEntry, AuditFilter } from '../shared/types'

let cachedUser: string | null = null
function osUser(): string {
  if (cachedUser) return cachedUser
  try {
    cachedUser = os.userInfo().username
  } catch {
    cachedUser = 'unknown'
  }
  return cachedUser
}

export function audit(
  action: AuditAction,
  entity_type: AuditEntity,
  entity_id: string | null,
  details?: Record<string, unknown>
): void {
  try {
    getDb()
      .prepare(
        'INSERT INTO audit_log (ts, os_user, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        new Date().toISOString(),
        osUser(),
        action,
        entity_type,
        entity_id,
        details ? JSON.stringify(details) : null
      )
  } catch (err) {
    // Never let an audit failure break a user action — but make noise.
    console.error('[audit] write failed:', err)
  }
}

export function listAudit(filter: AuditFilter = {}): AuditEntry[] {
  const where: string[] = []
  const params: (string | number)[] = []

  if (filter.fromDate) {
    where.push('ts >= ?')
    params.push(practiceDayBoundaryIso(filter.fromDate, 'start'))
  }
  if (filter.toDate) {
    where.push('ts <= ?')
    params.push(practiceDayBoundaryIso(filter.toDate, 'end'))
  }
  if (filter.entity_type) {
    where.push('entity_type = ?')
    params.push(filter.entity_type)
  }

  const sql = `SELECT * FROM audit_log ${
    where.length ? 'WHERE ' + where.join(' AND ') : ''
  } ORDER BY ts DESC LIMIT ?`
  params.push(filter.limit ?? 500)

  return getDb().prepare(sql).all(...params) as AuditEntry[]
}

/**
 * Timestamp of the most recent backup-entity audit entry (covers both a
 * one-click backup and a full archive export), or null if none has run yet.
 * Intentionally narrow: no filter/entity params, unlike listAudit — this does
 * not expose general audit querying to the renderer.
 */
export function lastBackupTimestamp(): string | null {
  const row = getDb()
    .prepare("SELECT ts FROM audit_log WHERE entity_type = 'backup' ORDER BY ts DESC LIMIT 1")
    .get() as { ts: string } | undefined
  return row?.ts ?? null
}

export async function exportAuditCsv(filter: AuditFilter = {}): Promise<string | null> {
  const rows = listAudit({ ...filter, limit: 100000 })
  const defaultName = `audit-log-${practiceDateString()}.csv`

  const result = await dialog.showSaveDialog({
    title: 'Save Audit Log CSV',
    defaultPath: join(app.getPath('documents'), defaultName),
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  })
  if (result.canceled || !result.filePath) return null

  const headers = ['Timestamp', 'OS User', 'Action', 'Entity Type', 'Entity ID', 'Details']
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [r.ts, r.os_user ?? '', r.action, r.entity_type, r.entity_id ?? '', r.details ?? '']
        .map(csvEscape)
        .join(',')
    )
  ]
  writeFileSync(result.filePath, lines.join('\n'), 'utf-8')
  console.log(`[audit] CSV saved to ${result.filePath}`)
  recordSessionOutput(result.filePath)
  return result.filePath
}

