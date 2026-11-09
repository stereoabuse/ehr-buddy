import type { ReactNode } from 'react'
import type { ClientDocument } from '@shared/types'
import { DOC_TYPE_LABELS } from '@shared/documents'
import { Btn } from './Btn'
import { Icon } from './Icon'
import { Pill } from './Pill'

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** One uploaded document with Open / Download / Delete actions. */
export function DocumentRow({
  doc,
  isLast,
  context,
  onOpen,
  onDownload,
  onDelete
}: {
  doc: ClientDocument
  isLast: boolean
  /** Optional extra line above the label, e.g. a link to the owning client. */
  context?: ReactNode
  onOpen: () => void
  onDownload: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="flex items-center gap-3.5 px-[18px] py-3.5"
      style={{ borderBottom: isLast ? 'none' : '0.5px solid var(--color-divider)' }}
    >
      <div
        className="flex h-11 w-9 shrink-0 items-center justify-center rounded bg-canvas-2"
        style={{ border: '0.5px solid var(--color-hairline)' }}
      >
        <Icon name="pdf" size={18} className="text-muted" />
      </div>
      <div className="min-w-0 flex-1">
        {context && <div className="mb-0.5 text-sm">{context}</div>}
        <div className="text-base font-semibold text-ink">{doc.label}</div>
        <div className="mt-0.5 text-sm text-muted">
          {doc.original_filename ?? doc.stored_filename}
          {doc.size_bytes != null && <> · {formatBytes(doc.size_bytes)}</>}
          <> · Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</>
        </div>
        {doc.notes && <div className="mt-0.5 text-sm text-muted">{doc.notes}</div>}
      </div>
      <Pill tone="primary">{DOC_TYPE_LABELS[doc.doc_type]}</Pill>
      <div className="flex items-center gap-1">
        <Btn size="sm" variant="ghost" onClick={onOpen}>
          Open
        </Btn>
        <Btn size="sm" variant="ghost" icon="download" onClick={onDownload}>
          Download
        </Btn>
        <Btn size="sm" variant="ghost" onClick={onDelete}>
          Delete
        </Btn>
      </div>
    </div>
  )
}
