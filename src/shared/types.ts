export interface Client {
  id: string
  first_name: string
  last_name: string
  dob: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  phone: string | null
  email: string | null
  emergency_name: string | null
  emergency_phone: string | null
  emergency_relationship: string | null
  insurance_carrier: string | null
  insurance_member_id: string | null
  insurance_group_id: string | null
  insurance_plan_holder_name: string | null
  insurance_plan_holder_dob: string | null
  active: number
  created_at: string
  updated_at: string
}

/** Extended with computed field from list query */
export interface ClientListItem extends Client {
  last_session_date: string | null
}

/** One row per client for the Clients list. Includes computed aggregates. */
export interface RosterRow {
  id: string
  first_name: string
  last_name: string
  dob: string | null
  phone: string | null
  active: number
  last_session_date: string | null
  sessions_total: number
  sessions_30d: number
  unpaid_count: number
  unpaid_cents: number
  /** Past sessions whose note has not been signed yet. */
  unsigned_count: number
  /** First ICD-10 from the most recent session, if any. */
  last_dx: string | null
}

export interface ClientInput {
  id?: string
  first_name: string
  last_name: string
  dob?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  phone?: string | null
  email?: string | null
  emergency_name?: string | null
  emergency_phone?: string | null
  emergency_relationship?: string | null
  insurance_carrier?: string | null
  insurance_member_id?: string | null
  insurance_group_id?: string | null
  insurance_plan_holder_name?: string | null
  insurance_plan_holder_dob?: string | null
  active?: number
}

export interface Clinician {
  id: 'singleton'
  full_name: string
  credentials: string | null
  npi: string | null
  license_number: string | null
  tax_id: string | null
  practice_name: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  phone: string | null
  email: string | null
  default_fees_json: string | null
  /** Base64-encoded signature image (PNG or JPEG). Embedded into signed PDF exports. */
  signature_image_base64: string | null
  updated_at: string
}

export interface ClinicianInput {
  full_name: string
  credentials?: string | null
  npi?: string | null
  license_number?: string | null
  tax_id?: string | null
  practice_name?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  phone?: string | null
  email?: string | null
  /** CPT code -> fee in cents */
  default_fees?: Record<string, number> | null
  /** Base64-encoded signature image (PNG or JPEG), no data URL prefix. Pass null to clear. */
  signature_image_base64?: string | null
}

export type NoteFormat = 'DAP' | 'FREE' | 'STRUCTURED'

export interface Session {
  id: string
  client_id: string
  /** YYYY-MM-DD */
  session_date: string
  /** HH:MM (24h) */
  start_time: string
  /** HH:MM (24h) */
  end_time: string
  cpt_code: string
  /** comma-separated, e.g. "F41.1, F32.1" */
  icd10_codes: string | null
  fee_cents: number
  paid: number
  note_format: NoteFormat
  note_body: string | null
  /** ISO timestamp when the note was signed; null if unsigned (still a draft) */
  signed_at: string | null
  signed_by_name: string | null
  signed_by_credentials: string | null
  created_at: string
  updated_at: string
}

/** Session joined with client name for dashboard queries */
export interface SessionWithClient extends Session {
  client_first_name: string
  client_last_name: string
}

export interface SessionInput {
  id?: string
  client_id: string
  session_date: string
  start_time: string
  end_time: string
  cpt_code: string
  icd10_codes?: string | null
  fee_cents: number
  paid?: number
  note_format?: NoteFormat
  note_body?: string | null
}

export interface SessionAmendment {
  id: string
  session_id: string
  body: string
  signed_at: string
  signed_by_name: string
  signed_by_credentials: string | null
  created_at: string
}

export type DocType = 'consent' | 'roi' | 'intake' | 'other'

export interface ClientDocument {
  id: string
  client_id: string
  doc_type: DocType
  label: string
  stored_filename: string
  original_filename: string | null
  mime_type: string | null
  size_bytes: number | null
  uploaded_at: string
  notes: string | null
}

export interface DocumentUploadInput {
  clientId: string
  doc_type: DocType
  label: string
  notes?: string | null
}

export type AuditAction =
  | 'app_start'
  | 'client_view'
  | 'client_create'
  | 'client_update'
  | 'client_delete'
  | 'client_permanent_delete'
  | 'roster_view'
  | 'session_view'
  | 'session_create'
  | 'session_update'
  | 'session_delete'
  | 'session_sign'
  | 'session_amend'
  | 'session_set_paid'
  | 'clinician_update'
  | 'superbill_generate'
  | 'note_export_pdf'
  | 'report_pdf'
  | 'report_csv'
  | 'backup_run'
  | 'archive_export'
  | 'document_upload'
  | 'document_view'
  | 'document_download'
  | 'document_delete'

export type AuditEntity =
  | 'app'
  | 'client'
  | 'session'
  | 'clinician'
  | 'superbill'
  | 'report'
  | 'backup'
  | 'document'

export interface AuditEntry {
  id: number
  ts: string
  os_user: string | null
  action: AuditAction
  entity_type: AuditEntity
  entity_id: string | null
  details: string | null
}

export interface AuditFilter {
  fromDate?: string
  toDate?: string
  entity_type?: AuditEntity | ''
  limit?: number
}
