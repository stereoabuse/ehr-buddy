import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC } from '../../shared/ipc-channels'
import * as clientsRepo from '../db/repos/clients'
import * as clinicianRepo from '../db/repos/clinician'
import * as sessionsRepo from '../db/repos/sessions'
import { generateSuperbill } from '../pdf/superbill'
import { runBackup } from '../backup'

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
  note_body: z.string().nullable().optional()
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
  ipcMain.handle(IPC.SESSIONS_UPSERT, (_e, input: unknown) => {
    return sessionsRepo.upsert(sessionUpsertSchema.parse(input))
  })
  ipcMain.handle(IPC.SESSIONS_DELETE, (_e, id: string) => {
    sessionsRepo.del(id)
    return { ok: true }
  })

  // superbill
  ipcMain.handle(IPC.SUPERBILL_GENERATE, async (_e, input: unknown) => {
    const args = superbillSchema.parse(input)
    const path = await generateSuperbill(args)
    return path ? { path } : null
  })

  // backup
  ipcMain.handle(IPC.BACKUP_RUN, async () => {
    const path = await runBackup()
    return path ? { path } : null
  })
}
