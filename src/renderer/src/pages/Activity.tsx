import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { AuditEntity } from '@shared/types'
import { practiceDateString, practiceYearStartString } from '@shared/date'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
import { Field } from '../components/Field'

const ENTITY_TYPES: (AuditEntity | '')[] = [
  '', 'app', 'client', 'session', 'clinician', 'superbill', 'report', 'backup'
]

export default function Activity() {
  const [fromDate, setFromDate] = useState(practiceYearStartString)
  const [toDate, setToDate] = useState(practiceDateString)
  const [entity, setEntity] = useState<AuditEntity | ''>('')
  const [status, setStatus] = useState<string | null>(null)

  const filter = {
    fromDate,
    toDate,
    entity_type: entity || undefined
  }

  const entries = useQuery({
    queryKey: ['audit', fromDate, toDate, entity],
    queryFn: () => window.api.audit.list(filter)
  })

  const csvMut = useMutation({
    mutationFn: () => window.api.audit.csv(filter),
    onSuccess: (r) => setStatus(r ? `CSV saved to ${r.path}` : 'Cancelled'),
    onError: (e) => setStatus(`Error: ${String(e)}`)
  })

  const isError = status?.startsWith('Error') ?? false

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-5">
        <h2
          className="m-0 text-2xl font-semibold text-ink"
          style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.4px' }}
        >
          Activity log
        </h2>
        <p className="mt-1 text-base text-muted">
          Tracks every read, edit, and export of patient data. Required by HIPAA §164.312(b).
          The log is append-only — entries cannot be modified or deleted.
        </p>
      </div>

      <Card padding={0}>
        <div
          className="px-[18px] py-3.5"
          style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
        >
          <h3 className="m-0 text-md font-semibold text-ink" style={{ fontFamily: 'var(--font-head)' }}>
            Filter
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-4 px-[18px] py-4">
          <Field label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Field label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <label className="block">
            <span className="text-base font-medium text-body">Entity type</span>
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value as AuditEntity | '')}
              className="mt-1 block h-9 w-full rounded-md px-3 text-base text-ink outline-none"
              style={{ border: '0.5px solid var(--color-hairline)', background: 'var(--color-surface)' }}
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{t === '' ? 'All' : t}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <div className="mt-4 flex items-center gap-3">
        <Btn
          icon="download"
          variant="secondary"
          onClick={() => { setStatus(null); csvMut.mutate() }}
          disabled={csvMut.isPending}
        >
          {csvMut.isPending ? 'Exporting…' : 'Export CSV'}
        </Btn>
        <span className="text-sm text-muted">
          {entries.data
            ? `Showing ${entries.data.length} most recent entr${entries.data.length === 1 ? 'y' : 'ies'} (capped at 500 — export CSV for full history)`
            : 'Loading…'}
        </span>
      </div>

      {status && <p className={`mt-3 text-sm ${isError ? 'text-danger' : 'text-success'}`}>{status}</p>}

      <div className="mt-4">
        <Card padding={0}>
          {entries.data && entries.data.length === 0 && (
            <div className="px-5 py-10 text-center text-base text-muted">
              No activity in this range.
            </div>
          )}
          {entries.data && entries.data.length > 0 && (
            <table className="w-full border-collapse text-base">
              <thead>
                <tr className="bg-canvas-2">
                  {['When', 'User', 'Action', 'Entity', 'Details'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.4px] text-muted"
                      style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.data.map((e, i, arr) => (
                  <tr
                    key={e.id}
                    style={{ borderBottom: i < arr.length - 1 ? '0.5px solid var(--color-divider)' : 'none' }}
                  >
                    <td
                      className="whitespace-nowrap px-3 py-2 text-sm text-body"
                      style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                    >
                      {new Date(e.ts).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm text-body">{e.os_user ?? '—'}</td>
                    <td className="px-3 py-2 text-sm text-body">{e.action}</td>
                    <td className="px-3 py-2 text-sm text-body">
                      {e.entity_type}
                      {e.entity_id && (
                        <span
                          className="ml-1 text-sm text-faint"
                          style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                          title={e.entity_id}
                        >
                          · {e.entity_id.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td
                      className="px-3 py-2 text-sm text-muted"
                      style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                    >
                      {e.details ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}
