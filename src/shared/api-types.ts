import type {
  AuditEntry,
  AuditFilter,
  Client,
  ClientDocument,
  ClientInput,
  ClientListItem,
  Clinician,
  ClinicianInput,
  DocumentUploadInput,
  NoteFormat,
  RosterRow,
  Session,
  SessionAmendment,
  SessionInput,
  SessionWithClient
} from './types'

export interface PingResult {
  ok: boolean
  message: string
  ts: string
}

export interface SuperbillArgs {
  clientId: string
  fromDate: string
  toDate: string
}

export interface ReportArgs {
  fromDate: string
  toDate: string
}

export interface SignSessionArgs {
  id: string
  body: string
  note_format: NoteFormat
}

export interface AddAmendmentArgs {
  session_id: string
  body: string
}

export interface Api {
  ping: () => Promise<PingResult>
  clients: {
    list: () => Promise<ClientListItem[]>
    roster: () => Promise<RosterRow[]>
    get: (id: string) => Promise<Client | null>
    upsert: (input: ClientInput) => Promise<Client>
    delete: (id: string) => Promise<{ ok: boolean }>
  }
  clinician: {
    get: () => Promise<Clinician | null>
    upsert: (input: ClinicianInput) => Promise<Clinician>
  }
  sessions: {
    listByClient: (clientId: string) => Promise<Session[]>
    get: (id: string) => Promise<Session | null>
    upsert: (input: SessionInput) => Promise<Session>
    delete: (id: string) => Promise<{ ok: boolean }>
    today: () => Promise<SessionWithClient[]>
    unpaid: () => Promise<SessionWithClient[]>
    setPaid: (id: string, paid: 0 | 1) => Promise<Session>
    sign: (args: SignSessionArgs) => Promise<Session>
    addAmendment: (args: AddAmendmentArgs) => Promise<SessionAmendment>
    listAmendments: (sessionId: string) => Promise<SessionAmendment[]>
  }
  superbill: {
    generate: (args: SuperbillArgs) => Promise<{ path: string } | null>
  }
  reports: {
    incomePdf: (args: ReportArgs) => Promise<{ path: string } | null>
    csv: (args: ReportArgs) => Promise<{ path: string } | null>
  }
  backup: {
    run: () => Promise<{ path: string } | null>
  }
  audit: {
    list: (filter: AuditFilter) => Promise<AuditEntry[]>
    csv: (filter: AuditFilter) => Promise<{ path: string } | null>
  }
  documents: {
    list: (clientId: string) => Promise<ClientDocument[]>
    upload: (input: DocumentUploadInput) => Promise<ClientDocument | null>
    open: (id: string) => Promise<{ ok: boolean; error?: string }>
    download: (id: string) => Promise<{ path: string } | null>
    delete: (id: string) => Promise<{ ok: boolean }>
  }
}
