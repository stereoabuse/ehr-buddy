CREATE TABLE clinician (
  id TEXT PRIMARY KEY CHECK (id = 'singleton'),
  full_name TEXT NOT NULL,
  credentials TEXT,
  npi TEXT,
  license_number TEXT,
  tax_id TEXT,
  practice_name TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  default_fees_json TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  emergency_name TEXT,
  emergency_phone TEXT,
  emergency_relationship TEXT,
  insurance_carrier TEXT,
  insurance_member_id TEXT,
  insurance_group_id TEXT,
  insurance_plan_holder_name TEXT,
  insurance_plan_holder_dob TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE treatment_plans (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  presenting_problem TEXT,
  history TEXT,
  goals TEXT,
  interventions TEXT,
  diagnosis_codes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  session_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  cpt_code TEXT NOT NULL,
  icd10_codes TEXT,
  fee_cents INTEGER NOT NULL DEFAULT 0,
  paid INTEGER NOT NULL DEFAULT 0,
  note_format TEXT NOT NULL DEFAULT 'DAP',
  note_body TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_client_date ON sessions(client_id, session_date);

CREATE TABLE app_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
