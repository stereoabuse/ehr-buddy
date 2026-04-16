/**
 * Google Sheets auto-sync.
 *
 * Strategy: append-only log. Every session save appends a new row.
 * Edits append a new row with "(updated)" note. Deletes append a "(deleted)" row.
 *
 * The sheet is created on first use: "EHR Buddy — Billing Log"
 * The spreadsheetId is stored in the app_meta table.
 */

import { google } from 'googleapis'
import { getAuthClient, isConnected } from './auth'
import { getDb } from '../db/connection'

const SHEET_TITLE = 'EHR Buddy — Billing Log'

const HEADERS = [
  'Timestamp', 'Action', 'Session Date', 'Client', 'CPT Code',
  'Description', 'ICD-10', 'Fee', 'Paid', 'Session ID'
]

/**
 * Get or create the billing log spreadsheet. Returns the spreadsheetId.
 */
async function ensureSheet(auth: InstanceType<typeof google.auth.OAuth2>): Promise<string> {
  const db = getDb()

  // Check if we already have one
  const row = db.prepare("SELECT value FROM app_meta WHERE key = 'google_billing_sheet_id'").get() as
    | { value: string }
    | undefined

  if (row?.value) {
    // Verify it still exists
    const sheets = google.sheets({ version: 'v4', auth })
    try {
      await sheets.spreadsheets.get({ spreadsheetId: row.value })
      return row.value
    } catch {
      // Sheet was deleted — recreate
      db.prepare("DELETE FROM app_meta WHERE key = 'google_billing_sheet_id'").run()
    }
  }

  // Create a new spreadsheet
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: SHEET_TITLE },
      sheets: [{
        properties: { title: 'Billing Log' },
        data: [{
          startRow: 0,
          startColumn: 0,
          rowData: [{
            values: HEADERS.map((h) => ({ userEnteredValue: { stringValue: h } }))
          }]
        }]
      }]
    }
  })

  const spreadsheetId = res.data.spreadsheetId!

  // Store it
  db.prepare(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('google_billing_sheet_id', ?)"
  ).run(spreadsheetId)

  return spreadsheetId
}

/**
 * Append a row to the billing log.
 */
export async function appendSessionRow(opts: {
  action: 'created' | 'updated' | 'deleted'
  sessionDate: string
  clientName: string
  cptCode: string
  cptDescription: string
  icd10Codes: string
  feeDollars: string
  paid: boolean
  sessionId: string
}): Promise<void> {
  if (!isConnected()) return

  try {
    const auth = getAuthClient()
    const spreadsheetId = await ensureSheet(auth)
    const sheets = google.sheets({ version: 'v4', auth })

    const timestamp = new Date().toISOString()
    const row = [
      timestamp,
      opts.action,
      opts.sessionDate,
      opts.clientName,
      opts.cptCode,
      opts.cptDescription,
      opts.icd10Codes,
      opts.feeDollars,
      opts.paid ? 'Yes' : 'No',
      opts.sessionId
    ]

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Billing Log!A:J',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    })
  } catch (err) {
    // Don't let Sheets errors break session saving
    console.error('[google/sheets] append failed:', err)
  }
}
