-- Migration 002: Add Google integration fields to sessions
ALTER TABLE sessions ADD COLUMN google_event_id TEXT;
ALTER TABLE sessions ADD COLUMN google_doc_id TEXT;
