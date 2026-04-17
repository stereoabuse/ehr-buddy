import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { AuditEntity } from '@shared/types'
import { Button } from '../components/Button'
import { Field } from '../components/Field'

const ENTITY_TYPES: (AuditEntity | '')[] = [
  '', 'app', 'client', 'session', 'clinician', 'superbill', 'report', 'backup'
]

function janFirst(): string {
  return `${new Date().getFullYear()}-01-01`
}

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function Activity() {
  const [fromDate, setFromDate] = useState(janFirst)
  const [toDate, setToDate] = useState(todayStr)
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Activity Log</h2>
        <p className="mt-1 text-slate-500">
          Tracks every read, edit, and export of patient data. Required by HIPAA §164.312(b).
          The log is append-only — entries cannot be modified or deleted.
        </p>
      </div>

      <fieldset className="rounded-lg border border-slate-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Filter</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Field label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Entity type</span>
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value as AuditEntity | '')}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{t === '' ? 'All' : t}</option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button onClick={() => { setStatus(null); csvMut.mutate() }} disabled={csvMut.isPending}>
          {csvMut.isPending ? 'Exporting…' : 'Export CSV'}
        </Button>
        <span className="text-sm text-slate-500">
          {entries.data
            ? `Showing ${entries.data.length} most recent entr${entries.data.length === 1 ? 'y' : 'ies'} (capped at 500 — export CSV for full history)`
            : 'Loading…'}
        </span>
      </div>

      {status && <p className={`text-sm ${status.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{status}</p>}

      {entries.data && entries.data.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-500">No activity in this range.</p>
        </div>
      )}

      {entries.data && entries.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-sm text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {entries.data.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-slate-700">
                    {new Date(e.ts).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-700">{e.os_user ?? '—'}</td>
                  <td className="px-4 py-2 text-sm text-slate-700">{e.action}</td>
                  <td className="px-4 py-2 text-sm text-slate-700">
                    {e.entity_type}
                    {e.entity_id && (
                      <span className="ml-1 font-mono text-xs text-slate-400" title={e.entity_id}>
                        · {e.entity_id.slice(0, 8)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">{e.details ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
