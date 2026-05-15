-- Migration 005: clinician signature image.
-- Stored as base64-encoded TEXT directly on the clinician singleton row.
-- Used by PDF exports (progress notes, future signed documents).
ALTER TABLE clinician ADD COLUMN signature_image_base64 TEXT;
