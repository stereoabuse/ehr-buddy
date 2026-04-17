-- Migration 003: Audit log for HIPAA §164.312(b) audit controls
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  os_user TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT
);

CREATE INDEX idx_audit_log_ts ON audit_log(ts);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- Append-only: prevent updates and deletes via triggers.
-- SQLite has no role system, so this is the strongest enforcement available
-- without a separate process. The triggers raise on any UPDATE/DELETE.
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;
