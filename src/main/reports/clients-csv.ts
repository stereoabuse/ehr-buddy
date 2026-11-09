import { dialog, app } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { csvEscape } from '../../shared/csv'
import { practiceDateString } from '../../shared/date'
import * as clientsRepo from '../db/repos/clients'
import { recordSessionOutput } from '../session-outputs'

/** Writes the full client roster (active and archived) to a user-chosen CSV. */
export async function generateClientsCsv(): Promise<{ path: string; count: number } | null> {
  const today = practiceDateString()
  const rows = clientsRepo.roster(today)
  if (rows.length === 0) throw new Error('There are no clients to export')

  const result = await dialog.showSaveDialog({
    title: 'Save Client List CSV',
    defaultPath: join(app.getPath('documents'), `clients-${today}.csv`),
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  })
  if (result.canceled || !result.filePath) return null

  const headers = [
    'Last Name',
    'First Name',
    'DOB',
    'Phone',
    'Status',
    'Last Session',
    'Total Sessions',
    'Sessions (30 days)',
    'Unpaid Sessions',
    'Unpaid Amount',
    'Unsigned Notes',
    'Last Diagnosis'
  ]

  const lines = rows.map((r) => [
    r.last_name,
    r.first_name,
    r.dob ?? '',
    r.phone ?? '',
    r.active === 1 ? 'Active' : 'Archived',
    r.last_session_date ?? '',
    r.sessions_total,
    r.sessions_30d,
    r.unpaid_count,
    (r.unpaid_cents / 100).toFixed(2),
    r.unsigned_count,
    r.last_dx ?? ''
  ])

  const csv = [headers, ...lines].map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\n')
  writeFileSync(result.filePath, csv, 'utf-8')
  console.log(`[clients-csv] saved to ${result.filePath}`)
  recordSessionOutput(result.filePath)
  return { path: result.filePath, count: rows.length }
}
