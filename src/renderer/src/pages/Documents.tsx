import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { ClientDocumentWithClient, DocType } from '@shared/types'
import { DOC_TYPE_LABELS } from '@shared/documents'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DocumentRow } from '../components/DocumentRow'
import { Icon } from '../components/Icon'
import { Pill } from '../components/Pill'
import { showInFinderAction, useToast } from '../components/Toast'

export default function Documents() {
  const qc = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [docType, setDocType] = useState<DocType | ''>('')
  const [confirmDelete, setConfirmDelete] = useState<ClientDocumentWithClient | null>(null)

  const docsQuery = useQuery({
    queryKey: ['documents', 'all'],
    queryFn: () => window.api.documents.listAll()
  })

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (docsQuery.data ?? []).filter((d) => {
      if (docType && d.doc_type !== docType) return false
      if (!q) return true
      const name = `${d.client_first_name} ${d.client_last_name}`.toLowerCase()
      const nameRev = `${d.client_last_name}, ${d.client_first_name}`.toLowerCase()
      return name.includes(q) || nameRev.includes(q) || d.label.toLowerCase().includes(q)
    })
  }, [docsQuery.data, search, docType])

  const open = useMutation({
    mutationFn: (id: string) => window.api.documents.open(id),
    onSuccess: (r) => {
      if (!r.ok) toast.showError(`Open failed: ${r.error ?? 'unknown error'}`)
    },
    onError: (e) => toast.showError(`Open failed: ${String(e)}`)
  })

  const download = useMutation({
    mutationFn: (id: string) => window.api.documents.download(id),
    onSuccess: (r) => {
      if (r) toast.showSuccess(`Saved to ${r.path}`, showInFinderAction(r.path))
    },
    onError: (e) => toast.showError(`Download failed: ${String(e)}`)
  })

  const del = useMutation({
    mutationFn: (id: string) => window.api.documents.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
    onError: (e) => toast.showError(`Delete failed: ${String(e)}`)
  })

  const total = docsQuery.data?.length ?? 0

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-5 flex items-center gap-3">
        <h2
          className="m-0 text-2xl font-semibold text-ink"
          style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.4px' }}
        >
          Documents
        </h2>
        <Pill tone="neutral">{rows.length}</Pill>
      </div>

      <Card padding={0}>
        <div
          className="flex items-center gap-3 px-[18px] py-3.5"
          style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
        >
          <div
            className="flex h-[34px] max-w-[360px] flex-1 items-center gap-2 rounded-md bg-canvas-2 px-2.5"
            style={{ border: '0.5px solid var(--color-hairline)' }}
          >
            <Icon name="search" size={14} className="text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client or label…"
              aria-label="Search documents"
              className="flex-1 border-0 bg-transparent text-base text-ink outline-none placeholder:text-faint"
            />
          </div>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocType | '')}
            aria-label="Document type"
            className="h-[34px] rounded-md bg-surface px-3 text-base text-ink outline-none"
            style={{ border: '0.5px solid var(--color-hairline)' }}
          >
            <option value="">All types</option>
            {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((t) => (
              <option key={t} value={t}>
                {DOC_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {docsQuery.isPending && <div className="px-5 py-10 text-center text-base text-muted">Loading…</div>}
        {docsQuery.isError && (
          <div className="px-5 py-10 text-center text-base text-danger">
            Couldn't load documents: {String(docsQuery.error)}
          </div>
        )}
        {docsQuery.isSuccess && rows.length === 0 && (
          <div className="px-5 py-10 text-center text-base text-muted">
            {total === 0
              ? "No documents yet. Upload them from a client's Documents tab."
              : 'No documents match the current filter.'}
          </div>
        )}

        {rows.map((d, i) => (
          <DocumentRow
            key={d.id}
            doc={d}
            isLast={i === rows.length - 1}
            context={
              <Link
                to={`/clients/${d.client_id}?tab=documents`}
                className="font-semibold text-primary hover:text-primary-dark"
              >
                {d.client_last_name}, {d.client_first_name}
                {d.client_active === 0 && <span className="ml-1 font-normal text-muted">(archived)</span>}
              </Link>
            }
            onOpen={() => open.mutate(d.id)}
            onDownload={() => download.mutate(d.id)}
            onDelete={() => setConfirmDelete(d)}
          />
        ))}
      </Card>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete document?"
          message={`Delete "${confirmDelete.label}" for ${confirmDelete.client_first_name} ${confirmDelete.client_last_name}? The file will be removed from disk. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            del.mutate(confirmDelete.id)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
