-- Migration 004: note sign-off, amendments, and client documents.

-- Sign-off snapshot on the session itself. Signer name + credentials are
-- captured at sign time so future profile edits don't retroactively rewrite
-- the historical signature.
ALTER TABLE sessions ADD COLUMN signed_at TEXT;
ALTER TABLE sessions ADD COLUMN signed_by_name TEXT;
ALTER TABLE sessions ADD COLUMN signed_by_credentials TEXT;

-- Amendments to a signed note. New entries only — never edited in place.
CREATE TABLE session_amendments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  signed_at TEXT NOT NULL,
  signed_by_name TEXT NOT NULL,
  signed_by_credentials TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_amendments_session ON session_amendments(session_id, created_at);

-- Block UPDATE so a signed amendment cannot be silently rewritten.
-- DELETE is intentionally permitted so ON DELETE CASCADE from sessions works.
CREATE TRIGGER session_amendments_no_update BEFORE UPDATE ON session_amendments
BEGIN
  SELECT RAISE(ABORT, 'session_amendments is append-only');
END;

-- Client documents — uploaded PDFs / images (consents, ROIs, intake, etc.).
-- The bytes live on disk under userData/documents/<stored_filename>;
-- this table only holds metadata and the indirection.
CREATE TABLE client_documents (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  label TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  uploaded_at TEXT NOT NULL,
  notes TEXT
);

CREATE INDEX idx_documents_client ON client_documents(client_id, uploaded_at);
