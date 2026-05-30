import { dialog, app } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import * as sessionsRepo from '../db/repos/sessions'

const CPT_LABELS: Record<string, string> = {
  '90791': 'Psychiatric Diagnostic Evaluation',
  '90832': 'Individual Psychotherapy (30 min)',
  '90834': 'Individual Psychotherapy (45 min)',
  '90837': 'Individual Psychotherapy (60 min)',
  '90846': 'Family Therapy without Patient (50 min)',
  '90847': 'Family Therapy with Patient (50 min)',
  '90853': 'Group Psychotherapy'
}

interface CsvArgs {
  fromDate: string
  toDate: string
}

export async function generateCsvExport(args: CsvArgs): Promise<string | null> {
  const sessions = sessionsRepo.allInRange(args.fromDate, args.toDate)
  if (sessions.length === 0) throw new Error('No sessions in the selected date range')

  const defaultName = `session-detail-${args.fromDate}-to-${args.toDate}.csv`
  const result = await dialog.showSaveDialog({
    title: 'Save Session Detail CSV',
    defaultPath: join(app.getPath('documents'), defaultName),
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  })
  if (result.canceled || !result.filePath) return null

  const headers = [
    'Date',
    'Client Name',
    'CPT Code',
    'Service Description',
    'ICD-10',
    'Fee',
    'Paid',
    'Payment Amount'
  ]

  const rows = sessions.map((s) => [
    s.session_date,
    `${s.client_first_name} ${s.client_last_name}`,
    s.cpt_code,
    CPT_LABELS[s.cpt_code] ?? s.cpt_code,
    s.icd10_codes ?? '',
    (s.fee_cents / 100).toFixed(2),
    s.paid === 1 ? 'Y' : 'N',
    s.paid === 1 ? (s.fee_cents / 100).toFixed(2) : '0.00'
  ])

  // totals row
  const totalFee = sessions.reduce((sum, s) => sum + s.fee_cents, 0)
  const totalPaid = sessions.filter((s) => s.paid === 1).reduce((sum, s) => sum + s.fee_cents, 0)
  rows.push([
    '',
    'TOTAL',
    '',
    '',
    '',
    (totalFee / 100).toFixed(2),
    '',
    (totalPaid / 100).toFixed(2)
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => csvEscape(cell)).join(','))
    .join('\n')

  writeFileSync(result.filePath, csv, 'utf-8')
  console.log(`[csv-export] saved to ${result.filePath}`)
  return result.filePath
}

function csvEscape(value: string): string {
  let text = value == null ? '' : String(value)
  // Neutralize spreadsheet formula injection before quoting.
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}
