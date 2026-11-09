import { getDb } from '../connection'
import type { ClientDocument, ClientDocumentWithClient, DocType } from '../../../shared/types'

export interface InsertInput {
  id: string
  client_id: string
  doc_type: DocType
  label: string
  stored_filename: string
  original_filename: string | null
  mime_type: string | null
  size_bytes: number | null
  notes: string | null
}

export function list(clientId: string): ClientDocument[] {
  return getDb()
    .prepare(
      'SELECT * FROM client_documents WHERE client_id = ? ORDER BY uploaded_at DESC'
    )
    .all(clientId) as ClientDocument[]
}

export function listAll(): ClientDocumentWithClient[] {
  return getDb()
    .prepare(
      `SELECT d.*,
         c.first_name AS client_first_name,
         c.last_name AS client_last_name,
         c.active AS client_active
       FROM client_documents d
       JOIN clients c ON c.id = d.client_id
       ORDER BY d.uploaded_at DESC`
    )
    .all() as ClientDocumentWithClient[]
}

export function get(id: string): ClientDocument | undefined {
  return getDb()
    .prepare('SELECT * FROM client_documents WHERE id = ?')
    .get(id) as ClientDocument | undefined
}

export function insert(input: InsertInput): ClientDocument {
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO client_documents (
         id, client_id, doc_type, label,
         stored_filename, original_filename, mime_type, size_bytes,
         uploaded_at, notes
       ) VALUES (
         @id, @client_id, @doc_type, @label,
         @stored_filename, @original_filename, @mime_type, @size_bytes,
         @uploaded_at, @notes
       )`
    )
    .run({ ...input, uploaded_at: now })
  return get(input.id)!
}

export function del(id: string): void {
  getDb().prepare('DELETE FROM client_documents WHERE id = ?').run(id)
}
