import type {
  AuditEntry,
  AuditFilter,
  CalendarSession,
  Client,
  ClientDocument,
  ClientDocumentWithClient,
  ClientInput,
  Clinician,
  ClinicianInput,
  DocumentUploadInput,
  NoteFormat,
  RosterRow,
  Session,
  SessionAmendment,
  SessionInput,
  SessionListItem
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

export interface NoteExportArgs {
  sessionId: string
}

export interface ReportArgs {
  fromDate: string
  toDate: string
  includeArchived?: boolean
}

export interface DateRangeArgs {
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

export interface PermanentDeleteClientArgs {
  id: string
  confirmation: string
}

export interface PermanentDeleteClientResult {
  ok: boolean
  /** Stored filenames whose document file could not be removed from disk. */
  files_not_removed?: string[]
  documents_dir?: string
}

export interface Api {
  ping: () => Promise<PingResult>
  app: {
    version: () => Promise<string>
    dataDir: () => Promise<string>
    setUnsavedChanges: (dirty: boolean) => void
  }
  clients: {
    roster: () => Promise<RosterRow[]>
    get: (id: string) => Promise<Client | null>
    upsert: (input: ClientInput) => Promise<Client>
    delete: (id: string) => Promise<{ ok: boolean }>
    permanentDelete: (args: PermanentDeleteClientArgs) => Promise<PermanentDeleteClientResult>
    exportCsv: () => Promise<{ path: string } | null>
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
    today: () => Promise<SessionListItem[]>
    unpaid: () => Promise<SessionListItem[]>
    inRange: (args: DateRangeArgs) => Promise<CalendarSession[]>
    setPaid: (id: string, paid: 0 | 1) => Promise<Session>
    sign: (args: SignSessionArgs) => Promise<Session>
    addAmendment: (args: AddAmendmentArgs) => Promise<SessionAmendment>
    listAmendments: (sessionId: string) => Promise<SessionAmendment[]>
  }
  superbill: {
    generate: (args: SuperbillArgs) => Promise<{ path: string } | null>
  }
  notes: {
    exportPdf: (args: NoteExportArgs) => Promise<{ path: string } | null>
  }
  reports: {
    incomePdf: (args: ReportArgs) => Promise<{ path: string } | null>
    csv: (args: ReportArgs) => Promise<{ path: string } | null>
  }
  backup: {
    run: () => Promise<{ path: string } | null>
    fullArchive: () => Promise<{ path: string } | null>
    lastRun: () => Promise<string | null>
  }
  audit: {
    list: (filter: AuditFilter) => Promise<AuditEntry[]>
    csv: (filter: AuditFilter) => Promise<{ path: string } | null>
  }
  documents: {
    list: (clientId: string) => Promise<ClientDocument[]>
    listAll: () => Promise<ClientDocumentWithClient[]>
    upload: (input: DocumentUploadInput) => Promise<ClientDocument | null>
    open: (id: string) => Promise<{ ok: boolean; error?: string }>
    download: (id: string) => Promise<{ path: string } | null>
    delete: (id: string) => Promise<{ ok: boolean }>
  }
  shell: {
    showItemInFolder: (path: string) => Promise<{ ok: boolean }>
  }
}
