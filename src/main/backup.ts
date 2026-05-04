import { app, dialog } from 'electron'
import { copyFileSync, createWriteStream, existsSync } from 'fs'
import { join } from 'path'
import archiver from 'archiver'
import { getDb, dbPath } from './db/connection'
import { practiceDateString } from '../shared/date'

export async function runBackup(): Promise<string | null> {
  const db = getDb()
  db.pragma('wal_checkpoint(TRUNCATE)')

  const defaultName = `ehrbuddy-backup-${practiceDateString()}.db`

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

export async function runFullArchive(): Promise<string | null> {
  const db = getDb()
  db.pragma('wal_checkpoint(TRUNCATE)')

  const defaultName = `ehrbuddy-archive-${practiceDateString()}.zip`
  const result = await dialog.showSaveDialog({
    title: 'Save Full Data Archive',
    defaultPath: join(app.getPath('documents'), defaultName),
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
  })

  if (result.canceled || !result.filePath) return null

  const archive = archiver('zip', { zlib: { level: 9 } })
  const output = createWriteStream(result.filePath)
  const completed = new Promise<void>((resolve, reject) => {
    output.on('close', resolve)
    output.on('error', reject)
    archive.on('error', reject)
  })

  archive.pipe(output)
  archive.file(dbPath(), { name: 'ehrbuddy.db' })

  const documentsPath = join(app.getPath('userData'), 'documents')
  if (existsSync(documentsPath)) {
    archive.directory(documentsPath, 'documents')
  }

  const manifest = buildManifest()
  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })

  for (const file of buildCsvExports()) {
    archive.append(file.content, { name: `exports/${file.name}` })
  }

  await archive.finalize()
  await completed

  console.log(`[archive] saved to ${result.filePath}`)
  return result.filePath
}

function buildManifest(): Record<string, unknown> {
  const db = getDb()
  const documentCount = (
    db.prepare('SELECT COUNT(*) AS count FROM client_documents').get() as { count: number }
  ).count
  const clientCount = (db.prepare('SELECT COUNT(*) AS count FROM clients').get() as { count: number }).count
  const sessionCount = (
    db.prepare('SELECT COUNT(*) AS count FROM sessions').get() as { count: number }
  ).count

  return {
    app: 'EHR Buddy',
    app_version: app.getVersion(),
    exported_at: new Date().toISOString(),
    platform: process.platform,
    database: 'ehrbuddy.db',
    documents_folder: 'documents/',
    csv_folder: 'exports/',
    counts: {
      clients: clientCount,
      sessions: sessionCount,
      documents: documentCount
    },
    warning: 'This archive contains PHI. Store it only in encrypted storage.'
  }
}

function buildCsvExports(): Array<{ name: string; content: string }> {
  const db = getDb()
  return [
    {
      name: 'clinician.csv',
      content: toCsv(
        ['id', 'full_name', 'credentials', 'npi', 'license_number', 'tax_id', 'practice_name', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'phone', 'email', 'default_fees_json', 'updated_at'],
        db.prepare('SELECT * FROM clinician').all() as Record<string, unknown>[]
      )
    },
    {
      name: 'clients.csv',
      content: toCsv(
        ['id', 'first_name', 'last_name', 'dob', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'phone', 'email', 'emergency_name', 'emergency_phone', 'emergency_relationship', 'insurance_carrier', 'insurance_member_id', 'insurance_group_id', 'insurance_plan_holder_name', 'insurance_plan_holder_dob', 'active', 'created_at', 'updated_at'],
        db.prepare('SELECT * FROM clients ORDER BY active DESC, last_name COLLATE NOCASE, first_name COLLATE NOCASE').all() as Record<string, unknown>[]
      )
    },
    {
      name: 'treatment-plans.csv',
      content: toCsv(
        ['id', 'client_id', 'client_name', 'presenting_problem', 'history', 'goals', 'interventions', 'diagnosis_codes', 'created_at', 'updated_at'],
        db.prepare(
          `SELECT
             t.id,
             t.client_id,
             c.first_name || ' ' || c.last_name AS client_name,
             t.presenting_problem,
             t.history,
             t.goals,
             t.interventions,
             t.diagnosis_codes,
             t.created_at,
             t.updated_at
           FROM treatment_plans t
           JOIN clients c ON c.id = t.client_id
           ORDER BY c.last_name COLLATE NOCASE, c.first_name COLLATE NOCASE`
        ).all() as Record<string, unknown>[]
      )
    },
    {
      name: 'sessions.csv',
      content: toCsv(
        ['id', 'client_id', 'client_name', 'session_date', 'start_time', 'end_time', 'cpt_code', 'icd10_codes', 'fee', 'paid', 'note_format', 'signed_at', 'signed_by_name', 'signed_by_credentials', 'created_at', 'updated_at'],
        (db.prepare(
          `SELECT
             s.id,
             s.client_id,
             c.first_name || ' ' || c.last_name AS client_name,
             s.session_date,
             s.start_time,
             s.end_time,
             s.cpt_code,
             s.icd10_codes,
             printf('%.2f', s.fee_cents / 100.0) AS fee,
             CASE WHEN s.paid = 1 THEN 'Y' ELSE 'N' END AS paid,
             s.note_format,
             s.signed_at,
             s.signed_by_name,
             s.signed_by_credentials,
             s.created_at,
             s.updated_at
           FROM sessions s
           JOIN clients c ON c.id = s.client_id
           ORDER BY s.session_date, s.start_time`
        ).all() as Record<string, unknown>[])
      )
    },
    {
      name: 'notes.csv',
      content: toCsv(
        ['session_id', 'client_id', 'client_name', 'session_date', 'note_format', 'note_body', 'signed_at', 'signed_by_name', 'signed_by_credentials'],
        db.prepare(
          `SELECT
             s.id AS session_id,
             s.client_id,
             c.first_name || ' ' || c.last_name AS client_name,
             s.session_date,
             s.note_format,
             s.note_body,
             s.signed_at,
             s.signed_by_name,
             s.signed_by_credentials
           FROM sessions s
           JOIN clients c ON c.id = s.client_id
           WHERE s.note_body IS NOT NULL AND s.note_body != ''
           ORDER BY s.session_date, s.start_time`
        ).all() as Record<string, unknown>[]
      )
    },
    {
      name: 'amendments.csv',
      content: toCsv(
        ['id', 'session_id', 'client_id', 'client_name', 'session_date', 'body', 'signed_at', 'signed_by_name', 'signed_by_credentials', 'created_at'],
        db.prepare(
          `SELECT
             a.id,
             a.session_id,
             s.client_id,
             c.first_name || ' ' || c.last_name AS client_name,
             s.session_date,
             a.body,
             a.signed_at,
             a.signed_by_name,
             a.signed_by_credentials,
             a.created_at
           FROM session_amendments a
           JOIN sessions s ON s.id = a.session_id
           JOIN clients c ON c.id = s.client_id
           ORDER BY a.created_at`
        ).all() as Record<string, unknown>[]
      )
    },
    {
      name: 'documents.csv',
      content: toCsv(
        ['id', 'client_id', 'client_name', 'doc_type', 'label', 'archive_path', 'stored_filename', 'original_filename', 'mime_type', 'size_bytes', 'uploaded_at', 'notes'],
        (db.prepare(
          `SELECT
             d.id,
             d.client_id,
             c.first_name || ' ' || c.last_name AS client_name,
             d.doc_type,
             d.label,
             'documents/' || d.stored_filename AS archive_path,
             d.stored_filename,
             d.original_filename,
             d.mime_type,
             d.size_bytes,
             d.uploaded_at,
             d.notes
           FROM client_documents d
           JOIN clients c ON c.id = d.client_id
           ORDER BY d.uploaded_at`
        ).all() as Record<string, unknown>[])
      )
    },
    {
      name: 'audit-log.csv',
      content: toCsv(
        ['ts', 'os_user', 'action', 'entity_type', 'entity_id', 'details'],
        db.prepare('SELECT ts, os_user, action, entity_type, entity_id, details FROM audit_log ORDER BY ts').all() as Record<string, unknown>[]
      )
    },
    {
      name: 'app-meta.csv',
      content: toCsv(
        ['key', 'value'],
        db.prepare('SELECT key, value FROM app_meta ORDER BY key').all() as Record<string, unknown>[]
      )
    }
  ]
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))
  ].join('\n')
}

function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value)
  if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}
