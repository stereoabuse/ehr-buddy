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
}

export type NoteFormat = 'DAP' | 'FREE'

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
  /** If true, create a Google Calendar event on save (when connected) */
  addToCalendar?: boolean
}

/** Google Calendar event (simplified for dashboard agenda) */
export interface GoogleCalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  allDay: boolean
}

/** Google auth connection status */
export interface GoogleAuthStatus {
  connected: boolean
  email: string | null
}
