import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC } from '../../shared/ipc-channels'
import * as clientsRepo from '../db/repos/clients'
import * as clinicianRepo from '../db/repos/clinician'
import * as sessionsRepo from '../db/repos/sessions'
import { generateSuperbill } from '../pdf/superbill'
import { generateTaxReport } from '../pdf/tax-report'
import { generateCsvExport } from '../reports/csv-export'
import { runBackup } from '../backup'

import { startAuthFlow, getAuthStatus, disconnect } from '../google/auth'
import { listEvents, createSessionEvent, deleteSessionEvent } from '../google/calendar'
import { appendSessionRow } from '../google/sheets'
import { exportNoteToDoc } from '../google/drive'
import { CPT_CODES } from '../../shared/cpt-codes'

const clientUpsertSchema = z.object({
  id: z.string().optional(),
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  dob: z.string().nullable().optional(),
  address_line1: z.string().nullable().optional(),
  address_line2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  emergency_name: z.string().nullable().optional(),
  emergency_phone: z.string().nullable().optional(),
  emergency_relationship: z.string().nullable().optional(),
  insurance_carrier: z.string().nullable().optional(),
  insurance_member_id: z.string().nullable().optional(),
  insurance_group_id: z.string().nullable().optional(),
  insurance_plan_holder_name: z.string().nullable().optional(),
  insurance_plan_holder_dob: z.string().nullable().optional(),
  active: z.number().optional()
})

const clinicianUpsertSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required'),
  credentials: z.string().nullable().optional(),
  npi: z.string().nullable().optional(),
  license_number: z.string().nullable().optional(),
  tax_id: z.string().nullable().optional(),
  practice_name: z.string().nullable().optional(),
  address_line1: z.string().nullable().optional(),
  address_line2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  default_fees: z.record(z.string(), z.number().int().min(0)).nullable().optional()
})

const sessionUpsertSchema = z.object({
  id: z.string().optional(),
  client_id: z.string().min(1),
  session_date: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  cpt_code: z.string().min(1),
  icd10_codes: z.string().nullable().optional(),
  fee_cents: z.number().int().min(0),
  paid: z.number().int().min(0).max(1).optional(),
  note_format: z.enum(['DAP', 'FREE']).optional(),
  note_body: z.string().nullable().optional(),
  addToCalendar: z.boolean().optional()
})

const superbillSchema = z.object({
  clientId: z.string().min(1),
  fromDate: z.string().min(1),
  toDate: z.string().min(1)
})

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.PING, () => {
    return { ok: true, message: 'pong from main', ts: new Date().toISOString() }
  })

  // clients
  ipcMain.handle(IPC.CLIENTS_LIST, () => clientsRepo.list())
  ipcMain.handle(IPC.CLIENTS_GET, (_e, id: string) => clientsRepo.get(id) ?? null)
  ipcMain.handle(IPC.CLIENTS_UPSERT, (_e, input: unknown) => {
    return clientsRepo.upsert(clientUpsertSchema.parse(input))
  })
  ipcMain.handle(IPC.CLIENTS_DELETE, (_e, id: string) => {
    clientsRepo.softDelete(id)
    return { ok: true }
  })

  // clinician
  ipcMain.handle(IPC.CLINICIAN_GET, () => clinicianRepo.get() ?? null)
  ipcMain.handle(IPC.CLINICIAN_UPSERT, (_e, input: unknown) => {
    return clinicianRepo.upsert(clinicianUpsertSchema.parse(input))
  })

  // sessions
  ipcMain.handle(IPC.SESSIONS_TODAY, () => sessionsRepo.today())
  ipcMain.handle(IPC.SESSIONS_UNPAID, () => sessionsRepo.allUnpaid())
  ipcMain.handle(IPC.SESSIONS_LIST_BY_CLIENT, (_e, clientId: string) =>
    sessionsRepo.listByClient(clientId)
  )
  ipcMain.handle(IPC.SESSIONS_GET, (_e, id: string) => sessionsRepo.get(id) ?? null)

  ipcMain.handle(IPC.SESSIONS_UPSERT, async (_e, input: unknown) => {
    const parsed = sessionUpsertSchema.parse(input)
    const { addToCalendar, ...sessionInput } = parsed
    const isUpdate = !!sessionInput.id && !!sessionsRepo.get(sessionInput.id)
    const session = sessionsRepo.upsert(sessionInput)

    // Google side-effects (fire-and-forget)
    const client = clientsRepo.get(session.client_id)
    const clientName = client ? `${client.first_name} ${client.last_name}` : 'Unknown'
    const cpt = CPT_CODES.find((c) => c.code === session.cpt_code)

    // Calendar: create event if requested and this is a new session
    if (addToCalendar && !isUpdate) {
      createSessionEvent({
        clientFirstName: client?.first_name ?? 'Client',
        sessionDate: session.session_date,
        startTime: session.start_time,
        endTime: session.end_time,
        cptCode: session.cpt_code
      })
        .then((eventId) => {
          if (eventId) sessionsRepo.setGoogleEventId(session.id, eventId)
        })
        .catch((err) => console.error('[google/calendar] create failed:', err))
    }

    // Sheets: append a row
    appendSessionRow({
      action: isUpdate ? 'updated' : 'created',
      sessionDate: session.session_date,
      clientName,
      cptCode: session.cpt_code,
      cptDescription: cpt?.description ?? '',
      icd10Codes: session.icd10_codes ?? '',
      feeDollars: (session.fee_cents / 100).toFixed(2),
      paid: session.paid === 1,
      sessionId: session.id
    }).catch((err) => console.error('[google/sheets] append failed:', err))

    return session
  })

  ipcMain.handle(IPC.SESSIONS_DELETE, async (_e, id: string) => {
    const session = sessionsRepo.get(id)

    if (session) {
      // Delete calendar event if one exists
      const eventId = sessionsRepo.getGoogleEventId(id)
      if (eventId) {
        deleteSessionEvent(eventId).catch((err) =>
          console.error('[google/calendar] delete failed:', err)
        )
      }

      // Append deleted row to Sheets
      const client = clientsRepo.get(session.client_id)
      const clientName = client ? `${client.first_name} ${client.last_name}` : 'Unknown'
      const cpt = CPT_CODES.find((c) => c.code === session.cpt_code)

      appendSessionRow({
        action: 'deleted',
        sessionDate: session.session_date,
        clientName,
        cptCode: session.cpt_code,
        cptDescription: cpt?.description ?? '',
        icd10Codes: session.icd10_codes ?? '',
        feeDollars: (session.fee_cents / 100).toFixed(2),
        paid: session.paid === 1,
        sessionId: session.id
      }).catch((err) => console.error('[google/sheets] append failed:', err))
    }

    sessionsRepo.del(id)
    return { ok: true }
  })

  // superbill
  ipcMain.handle(IPC.SUPERBILL_GENERATE, async (_e, input: unknown) => {
    const args = superbillSchema.parse(input)
    const path = await generateSuperbill(args)
    return path ? { path } : null
  })

  // reports
  const reportArgsSchema = z.object({ fromDate: z.string().min(1), toDate: z.string().min(1) })

  ipcMain.handle(IPC.REPORT_INCOME_PDF, async (_e, input: unknown) => {
    const args = reportArgsSchema.parse(input)
    const path = await generateTaxReport(args)
    return path ? { path } : null
  })

  ipcMain.handle(IPC.REPORT_CSV, async (_e, input: unknown) => {
    const args = reportArgsSchema.parse(input)
    const path = await generateCsvExport(args)
    return path ? { path } : null
  })

  // backup
  ipcMain.handle(IPC.BACKUP_RUN, async () => {
    const path = await runBackup()
    return path ? { path } : null
  })

  // ── Google integration ──────────────────────────────────────────

  ipcMain.handle(IPC.GOOGLE_AUTH_START, async () => {
    return startAuthFlow()
  })

  ipcMain.handle(IPC.GOOGLE_AUTH_STATUS, () => {
    return getAuthStatus()
  })

  ipcMain.handle(IPC.GOOGLE_AUTH_DISCONNECT, () => {
    disconnect()
  })

  ipcMain.handle(IPC.GOOGLE_CALENDAR_EVENTS, async (_e, fromDate: string, toDate: string) => {
    return listEvents(fromDate, toDate)
  })

  ipcMain.handle(IPC.GOOGLE_DRIVE_EXPORT, async (_e, sessionId: string) => {
    const session = sessionsRepo.get(sessionId)
    if (!session) return null

    // Check if already exported
    const existingDocId = sessionsRepo.getGoogleDocId(sessionId)
    if (existingDocId) return { docId: existingDocId }

    const client = clientsRepo.get(session.client_id)
    const clinician = clinicianRepo.get()
    if (!client || !clinician) return null

    const docId = await exportNoteToDoc({
      clinicianName: clinician.full_name,
      clinicianCredentials: clinician.credentials,
      clientName: `${client.first_name} ${client.last_name}`,
      clientDob: client.dob,
      sessionDate: session.session_date,
      startTime: session.start_time,
      endTime: session.end_time,
      cptCode: session.cpt_code,
      icd10Codes: session.icd10_codes,
      feeCents: session.fee_cents,
      noteFormat: session.note_format,
      noteBody: session.note_body
    })

    if (docId) {
      sessionsRepo.setGoogleDocId(sessionId, docId)
      return { docId }
    }

    return null
  })
}
