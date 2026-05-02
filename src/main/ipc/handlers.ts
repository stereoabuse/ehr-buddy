import { ipcMain, app, dialog, shell } from 'electron'
import { copyFileSync, mkdirSync, statSync, unlinkSync } from 'fs'
import { extname, join } from 'path'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { IPC } from '../../shared/ipc-channels'
import * as clientsRepo from '../db/repos/clients'
import * as clinicianRepo from '../db/repos/clinician'
import * as sessionsRepo from '../db/repos/sessions'
import * as documentsRepo from '../db/repos/documents'
import { generateSuperbill } from '../pdf/superbill'
import { generateTaxReport } from '../pdf/tax-report'
import { generateCsvExport } from '../reports/csv-export'
import { runBackup, runFullArchive } from '../backup'
import { audit, exportAuditCsv, listAudit } from '../audit'

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
  note_format: z.enum(['DAP', 'FREE', 'STRUCTURED']).optional(),
  note_body: z.string().nullable().optional()
})

const setPaidSchema = z.object({
  id: z.string().min(1),
  paid: z.number().int().min(0).max(1)
})

const permanentDeleteClientSchema = z.object({
  id: z.string().min(1),
  confirmation: z.string().min(1)
})

const signSchema = z.object({
  id: z.string().min(1),
  body: z.string().trim().min(1, 'Cannot sign an empty note'),
  note_format: z.enum(['DAP', 'FREE', 'STRUCTURED'])
})

const addAmendmentSchema = z.object({
  session_id: z.string().min(1),
  body: z.string().trim().min(1, 'Amendment cannot be empty')
})

const superbillSchema = z.object({
  clientId: z.string().min(1),
  fromDate: z.string().min(1),
  toDate: z.string().min(1)
})

const auditFilterSchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  entity_type: z
    .enum(['', 'app', 'client', 'session', 'clinician', 'superbill', 'report', 'backup', 'document'])
    .optional(),
  limit: z.number().int().min(1).max(100000).optional()
})

const documentUploadSchema = z.object({
  clientId: z.string().min(1),
  doc_type: z.enum(['consent', 'roi', 'intake', 'other']),
  label: z.string().trim().min(1, 'Label is required').max(200),
  notes: z.string().nullable().optional()
})

// Allowed upload extensions / mime types. Mirrors the dialog filter; we still
// re-check on the server side so a malicious renderer can't slip past.
const ALLOWED_EXTS = ['.pdf', '.png', '.jpg', '.jpeg', '.heic', '.heif']
const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.heic': 'image/heic',
  '.heif': 'image/heif'
}

function documentsDir(): string {
  return join(app.getPath('userData'), 'documents')
}

function documentPath(storedFilename: string): string {
  return join(documentsDir(), storedFilename)
}

// Local date (YYYY-MM-DD) so "today" matches the clinician's wall clock.
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function clinicianSigner(): { name: string; credentials: string | null } {
  const c = clinicianRepo.get()
  if (!c) throw new Error('Set up your clinician profile before signing notes.')
  return { name: c.full_name, credentials: c.credentials }
}

function clientFullName(client: { first_name: string; last_name: string }): string {
  return `${client.first_name} ${client.last_name}`.replace(/\s+/g, ' ').trim()
}

// Fields whose change is rejected once a session is signed. paid + fee_cents
// are intentionally NOT in this list — billing corrections post-sign are
// routine and don't falsify the clinical record.
const LOCKED_FIELDS: (keyof ReturnType<typeof sessionUpsertSchema.parse>)[] = [
  'note_body',
  'note_format',
  'cpt_code',
  'icd10_codes',
  'session_date',
  'start_time',
  'end_time'
]

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.PING, () => {
    return { ok: true, message: 'pong from main', ts: new Date().toISOString() }
  })

  // ── clients ─────────────────────────────────────────────────
  ipcMain.handle(IPC.CLIENTS_LIST, () => clientsRepo.list())

  ipcMain.handle(IPC.CLIENTS_ROSTER, () => {
    const rows = clientsRepo.roster(localDateStr(new Date()))
    audit('roster_view', 'client', null, { count: rows.length })
    return rows
  })

  ipcMain.handle(IPC.CLIENTS_GET, (_e, id: string) => {
    const row = clientsRepo.get(id) ?? null
    if (row) audit('client_view', 'client', id)
    return row
  })

  ipcMain.handle(IPC.CLIENTS_UPSERT, (_e, input: unknown) => {
    const parsed = clientUpsertSchema.parse(input)
    const isUpdate = !!parsed.id && !!clientsRepo.get(parsed.id)
    const client = clientsRepo.upsert(parsed)
    audit(isUpdate ? 'client_update' : 'client_create', 'client', client.id)
    return client
  })

  ipcMain.handle(IPC.CLIENTS_DELETE, (_e, id: string) => {
    clientsRepo.softDelete(id)
    audit('client_delete', 'client', id)
    return { ok: true }
  })

  ipcMain.handle(IPC.CLIENTS_PERMANENT_DELETE, (_e, input: unknown) => {
    const args = permanentDeleteClientSchema.parse(input)
    const client = clientsRepo.get(args.id)
    if (!client) return { ok: true }

    const fullName = clientFullName(client)
    if (args.confirmation !== fullName) {
      throw new Error(`Confirmation must exactly match "${fullName}".`)
    }

    const docs = documentsRepo.list(args.id)
    for (const doc of docs) {
      try {
        unlinkSync(documentPath(doc.stored_filename))
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw new Error(`Could not remove document file "${doc.original_filename ?? doc.stored_filename}".`)
        }
      }
    }

    const summary = clientsRepo.permanentDelete(args.id)
    audit('client_permanent_delete', 'client', args.id, {
      name: fullName,
      sessions: summary.sessions,
      amendments: summary.amendments,
      documents: summary.documents,
      treatment_plans: summary.treatmentPlans
    })
    return { ok: true }
  })

  // ── clinician ───────────────────────────────────────────────
  ipcMain.handle(IPC.CLINICIAN_GET, () => clinicianRepo.get() ?? null)

  ipcMain.handle(IPC.CLINICIAN_UPSERT, (_e, input: unknown) => {
    const c = clinicianRepo.upsert(clinicianUpsertSchema.parse(input))
    audit('clinician_update', 'clinician', null)
    return c
  })

  // ── sessions ────────────────────────────────────────────────
  ipcMain.handle(IPC.SESSIONS_TODAY, () => sessionsRepo.today())
  ipcMain.handle(IPC.SESSIONS_UNPAID, () => sessionsRepo.allUnpaid())
  ipcMain.handle(IPC.SESSIONS_LIST_BY_CLIENT, (_e, clientId: string) =>
    sessionsRepo.listByClient(clientId)
  )

  ipcMain.handle(IPC.SESSIONS_GET, (_e, id: string) => {
    const row = sessionsRepo.get(id) ?? null
    if (row) audit('session_view', 'session', id, { client_id: row.client_id })
    return row
  })

  ipcMain.handle(IPC.SESSIONS_UPSERT, (_e, input: unknown) => {
    const parsed = sessionUpsertSchema.parse(input)
    const existing = parsed.id ? sessionsRepo.get(parsed.id) : undefined

    if (existing && existing.signed_at) {
      // Locked fields cannot change after signing.
      const conflicts = LOCKED_FIELDS.filter((f) => {
        const incoming = (parsed as Record<string, unknown>)[f]
        const current = (existing as unknown as Record<string, unknown>)[f]
        return incoming !== undefined && incoming !== current
      })
      if (conflicts.length > 0) {
        throw new Error(
          `This note is signed. To change ${conflicts.join(', ')}, add an amendment instead.`
        )
      }
      // Only billing fields (paid, fee_cents) may flow through.
      const session = sessionsRepo.updateBilling(
        existing.id,
        (parsed.paid ?? existing.paid) as 0 | 1,
        parsed.fee_cents
      )
      audit('session_update', 'session', session.id, {
        client_id: session.client_id,
        billing_only: true,
        fee_cents: session.fee_cents,
        paid: session.paid
      })
      return session
    }

    const isUpdate = !!parsed.id && sessionsRepo.exists(parsed.id)
    const session = sessionsRepo.upsert(parsed)
    audit(isUpdate ? 'session_update' : 'session_create', 'session', session.id, {
      client_id: session.client_id,
      session_date: session.session_date,
      cpt_code: session.cpt_code,
      fee_cents: session.fee_cents,
      paid: session.paid
    })
    return session
  })

  ipcMain.handle(IPC.SESSIONS_DELETE, (_e, id: string) => {
    const session = sessionsRepo.get(id)
    if (session?.signed_at) {
      throw new Error(
        'This note is signed and cannot be deleted. Add a corrective amendment instead.'
      )
    }
    sessionsRepo.del(id)
    audit('session_delete', 'session', id, session ? { client_id: session.client_id } : undefined)
    return { ok: true }
  })

  ipcMain.handle(IPC.SESSIONS_SET_PAID, (_e, input: unknown) => {
    const args = setPaidSchema.parse(input)
    const before = sessionsRepo.get(args.id)
    if (!before) throw new Error('Session not found')
    const session = sessionsRepo.setPaid(args.id, args.paid as 0 | 1)
    audit('session_set_paid', 'session', session.id, {
      client_id: session.client_id,
      paid: session.paid,
      previous_paid: before.paid
    })
    return session
  })

  ipcMain.handle(IPC.SESSIONS_SIGN, (_e, input: unknown) => {
    const args = signSchema.parse(input)
    const existing = sessionsRepo.get(args.id)
    if (!existing) throw new Error('Session not found')
    if (existing.signed_at) throw new Error('This note is already signed.')
    const signer = clinicianSigner()
    const signedAt = new Date().toISOString()
    const session = sessionsRepo.sign(
      args.id,
      args.body,
      args.note_format,
      signedAt,
      signer.name,
      signer.credentials
    )
    audit('session_sign', 'session', session.id, {
      client_id: session.client_id,
      signed_by_name: signer.name,
      signed_at: signedAt
    })
    return session
  })

  ipcMain.handle(IPC.SESSIONS_ADD_AMENDMENT, (_e, input: unknown) => {
    const args = addAmendmentSchema.parse(input)
    const session = sessionsRepo.get(args.session_id)
    if (!session) throw new Error('Session not found')
    if (!session.signed_at) {
      throw new Error('Sign the original note before adding an amendment.')
    }
    const signer = clinicianSigner()
    const signedAt = new Date().toISOString()
    const amendment = sessionsRepo.addAmendment({
      session_id: args.session_id,
      body: args.body,
      signedAt,
      signerName: signer.name,
      signerCredentials: signer.credentials
    })
    audit('session_amend', 'session', session.id, {
      amendment_id: amendment.id,
      client_id: session.client_id,
      signed_by_name: signer.name
    })
    return amendment
  })

  ipcMain.handle(IPC.SESSIONS_LIST_AMENDMENTS, (_e, sessionId: string) => {
    return sessionsRepo.listAmendments(sessionId)
  })

  // ── superbill ───────────────────────────────────────────────
  ipcMain.handle(IPC.SUPERBILL_GENERATE, async (_e, input: unknown) => {
    const args = superbillSchema.parse(input)
    const path = await generateSuperbill(args)
    if (path) {
      audit('superbill_generate', 'superbill', args.clientId, {
        fromDate: args.fromDate,
        toDate: args.toDate,
        path
      })
    }
    return path ? { path } : null
  })

  // ── reports ─────────────────────────────────────────────────
  const reportArgsSchema = z.object({ fromDate: z.string().min(1), toDate: z.string().min(1) })

  ipcMain.handle(IPC.REPORT_INCOME_PDF, async (_e, input: unknown) => {
    const args = reportArgsSchema.parse(input)
    const path = await generateTaxReport(args)
    if (path) audit('report_pdf', 'report', null, { ...args, path })
    return path ? { path } : null
  })

  ipcMain.handle(IPC.REPORT_CSV, async (_e, input: unknown) => {
    const args = reportArgsSchema.parse(input)
    const path = await generateCsvExport(args)
    if (path) audit('report_csv', 'report', null, { ...args, path })
    return path ? { path } : null
  })

  // ── backup ──────────────────────────────────────────────────
  ipcMain.handle(IPC.BACKUP_RUN, async () => {
    const path = await runBackup()
    if (path) audit('backup_run', 'backup', null, { path })
    return path ? { path } : null
  })

  ipcMain.handle(IPC.BACKUP_FULL_ARCHIVE, async () => {
    const path = await runFullArchive()
    if (path) audit('archive_export', 'backup', null, { path })
    return path ? { path } : null
  })

  // ── audit log ───────────────────────────────────────────────
  // Reads of the audit log itself are intentionally not audited (would be
  // either noise or an infinite loop).
  ipcMain.handle(IPC.AUDIT_LIST, (_e, input: unknown) => {
    return listAudit(auditFilterSchema.parse(input ?? {}))
  })

  ipcMain.handle(IPC.AUDIT_CSV, async (_e, input: unknown) => {
    const path = await exportAuditCsv(auditFilterSchema.parse(input ?? {}))
    return path ? { path } : null
  })

  // ── documents ───────────────────────────────────────────────
  ipcMain.handle(IPC.DOCUMENTS_LIST, (_e, clientId: string) => {
    const docs = documentsRepo.list(clientId)
    audit('document_view', 'document', null, {
      client_id: clientId,
      metadata_only: true,
      count: docs.length
    })
    return docs
  })

  ipcMain.handle(IPC.DOCUMENTS_UPLOAD, async (_e, input: unknown) => {
    const args = documentUploadSchema.parse(input)
    if (!clientsRepo.get(args.clientId)) throw new Error('Client not found')

    const result = await dialog.showOpenDialog({
      title: 'Choose a document to upload',
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'heic', 'heif'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const sourcePath = result.filePaths[0]
    const ext = extname(sourcePath).toLowerCase()
    if (!ALLOWED_EXTS.includes(ext)) {
      throw new Error(`Unsupported file type: ${ext || '(none)'}`)
    }

    const id = randomUUID()
    const stored = `${id}${ext}`
    mkdirSync(documentsDir(), { recursive: true })
    copyFileSync(sourcePath, documentPath(stored))
    const stat = statSync(documentPath(stored))

    const doc = documentsRepo.insert({
      id,
      client_id: args.clientId,
      doc_type: args.doc_type,
      label: args.label,
      stored_filename: stored,
      original_filename: sourcePath.split(/[\\/]/).pop() ?? null,
      mime_type: MIME_BY_EXT[ext] ?? null,
      size_bytes: stat.size,
      notes: args.notes ?? null
    })

    audit('document_upload', 'document', doc.id, {
      client_id: doc.client_id,
      doc_type: doc.doc_type,
      label: doc.label,
      original_filename: doc.original_filename,
      size_bytes: doc.size_bytes
    })
    return doc
  })

  ipcMain.handle(IPC.DOCUMENTS_OPEN, async (_e, id: string) => {
    const doc = documentsRepo.get(id)
    if (!doc) return { ok: false, error: 'Document not found' }
    const err = await shell.openPath(documentPath(doc.stored_filename))
    if (err) return { ok: false, error: err }
    audit('document_view', 'document', doc.id, { client_id: doc.client_id })
    return { ok: true }
  })

  ipcMain.handle(IPC.DOCUMENTS_DOWNLOAD, async (_e, id: string) => {
    const doc = documentsRepo.get(id)
    if (!doc) return null

    const result = await dialog.showSaveDialog({
      title: 'Save Document',
      defaultPath: join(app.getPath('documents'), doc.original_filename ?? doc.stored_filename)
    })
    if (result.canceled || !result.filePath) return null

    copyFileSync(documentPath(doc.stored_filename), result.filePath)
    audit('document_download', 'document', doc.id, {
      client_id: doc.client_id,
      path: result.filePath
    })
    return { path: result.filePath }
  })

  ipcMain.handle(IPC.DOCUMENTS_DELETE, (_e, id: string) => {
    const doc = documentsRepo.get(id)
    if (!doc) return { ok: true }

    try {
      unlinkSync(documentPath(doc.stored_filename))
    } catch (err: unknown) {
      // ENOENT is fine — file already gone. Anything else, log and continue
      // so the row still gets removed (avoids a stranded DB row pointing at
      // a missing file).
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('[documents] unlink failed:', err)
      }
    }

    documentsRepo.del(id)
    audit('document_delete', 'document', id, {
      client_id: doc.client_id,
      label: doc.label
    })
    return { ok: true }
  })
}
