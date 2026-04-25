import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { RosterRow } from '@shared/types'

type SortKey = 'name' | 'last_session' | 'balance' | 'unsigned'
type FilterKey = 'all' | 'unpaid' | 'unsigned' | 'behind'

export default function Roster() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['clients', 'roster'],
    queryFn: () => window.api.clients.roster()
  })

  const [sort, setSort] = useState<SortKey>('balance')
  const [filter, setFilter] = useState<FilterKey>('all')

  const rows = useMemo(() => {
    const base = data ?? []
    const filtered = base.filter((r) => {
      if (filter === 'all') return true
      if (filter === 'unpaid') return r.unpaid_count > 0
      if (filter === 'unsigned') return r.unsigned_count > 0
      if (filter === 'behind') return r.unpaid_count > 0 || r.unsigned_count > 0
      return true
    })
    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'name') return cmpName(a, b)
      if (sort === 'last_session') return cmpLastSession(a, b)
      if (sort === 'balance') {
        const d = b.unpaid_cents - a.unpaid_cents
        return d !== 0 ? d : cmpName(a, b)
      }
      if (sort === 'unsigned') {
        const d = b.unsigned_count - a.unsigned_count
        return d !== 0 ? d : cmpName(a, b)
      }
      return 0
    })
    return sorted
  }, [data, sort, filter])

  const totals = useMemo(() => {
    const source = data ?? []
    return {
      clients: source.length,
      unpaidCents: source.reduce((s, r) => s + r.unpaid_cents, 0),
      unpaidClients: source.filter((r) => r.unpaid_count > 0).length,
      unsigned: source.reduce((s, r) => s + r.unsigned_count, 0),
      unsignedClients: source.filter((r) => r.unsigned_count > 0).length
    }
  }, [data])

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold">Roster</h2>
        <p className="text-sm text-slate-500">
          {totals.clients} active client{totals.clients !== 1 ? 's' : ''}
        </p>
      </div>

      {isLoading && <p className="mt-6 text-slate-500">Loading…</p>}
      {error && <p className="mt-6 text-red-600">Error: {String(error)}</p>}

      {data && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryTile
            label="Outstanding"
            value={`$${(totals.unpaidCents / 100).toFixed(2)}`}
            sub={`${totals.unpaidClients} client${totals.unpaidClients !== 1 ? 's' : ''} with a balance`}
            tone={totals.unpaidCents > 0 ? 'warn' : 'ok'}
          />
          <SummaryTile
            label="Unsigned notes"
            value={String(totals.unsigned)}
            sub={`${totals.unsignedClients} client${totals.unsignedClients !== 1 ? 's' : ''} with open notes`}
            tone={totals.unsigned > 0 ? 'warn' : 'ok'}
          />
          <SummaryTile
            label="Caught up"
            value={
              totals.unpaidCents === 0 && totals.unsigned === 0 ? 'Yes' : 'Not yet'
            }
            sub={
              totals.unpaidCents === 0 && totals.unsigned === 0
                ? 'Nothing outstanding'
                : 'See rows below'
            }
            tone={totals.unpaidCents === 0 && totals.unsigned === 0 ? 'ok' : 'warn'}
          />
        </div>
      )}

      {data && data.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'behind', label: 'Behind' },
              { value: 'unpaid', label: 'Unpaid' },
              { value: 'unsigned', label: 'Unsigned' }
            ]}
          />
          <label className="ml-auto text-sm text-slate-600">
            Sort by{' '}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="ml-1 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="balance">Outstanding balance</option>
              <option value="unsigned">Unsigned notes</option>
              <option value="last_session">Last session</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
      )}

      {data && data.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-500">No active clients yet.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-sm text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Last session</th>
                <th className="px-4 py-3 font-medium text-right">30d</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Balance</th>
                <th className="px-4 py-3 font-medium text-right">Unsigned</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((r) => (
                <RosterTableRow key={r.id} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.length > 0 && rows.length === 0 && (
        <p className="mt-4 text-slate-500">No clients match this filter.</p>
      )}
    </div>
  )
}

function RosterTableRow({ row }: { row: RosterRow }) {
  const caughtUp = row.unpaid_count === 0 && row.unsigned_count === 0
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <Link
          to={`/clients/${row.id}`}
          className="font-medium text-blue-700 hover:underline"
        >
          {row.last_name}, {row.first_name}
        </Link>
      </td>
      <td className="px-4 py-3 text-slate-700">{row.last_session_date ?? '—'}</td>
      <td className="px-4 py-3 text-right text-slate-700">{row.sessions_30d}</td>
      <td className="px-4 py-3 text-right text-slate-700">{row.sessions_total}</td>
      <td className={`px-4 py-3 text-right ${row.unpaid_cents > 0 ? 'font-semibold text-red-700' : 'text-slate-500'}`}>
        {row.unpaid_cents > 0
          ? `$${(row.unpaid_cents / 100).toFixed(2)} (${row.unpaid_count})`
          : '—'}
      </td>
      <td className={`px-4 py-3 text-right ${row.unsigned_count > 0 ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>
        {row.unsigned_count > 0 ? row.unsigned_count : '—'}
      </td>
      <td className="px-4 py-3">
        {caughtUp ? (
          <StatusPill tone="ok">Caught up</StatusPill>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.unpaid_count > 0 && <StatusPill tone="danger">Unpaid</StatusPill>}
            {row.unsigned_count > 0 && <StatusPill tone="warn">Unsigned</StatusPill>}
          </div>
        )}
      </td>
    </tr>
  )
}

type Tone = 'ok' | 'warn' | 'danger'

function SummaryTile({
  label,
  value,
  sub,
  tone
}: {
  label: string
  value: string
  sub: string
  tone: Tone
}) {
  const toneClass =
    tone === 'ok'
      ? 'border-green-200 bg-green-50'
      : tone === 'danger'
        ? 'border-red-200 bg-red-50'
        : 'border-amber-200 bg-amber-50'
  const valueClass =
    tone === 'ok' ? 'text-green-800' : tone === 'danger' ? 'text-red-800' : 'text-amber-800'
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</div>
      <div className="text-xs text-slate-600">{sub}</div>
    </div>
  )
}

function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const cls =
    tone === 'ok'
      ? 'bg-green-100 text-green-800'
      : tone === 'danger'
        ? 'bg-red-100 text-red-800'
        : 'bg-amber-100 text-amber-800'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  )
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1 text-sm transition ${
            value === o.value
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function cmpName(a: RosterRow, b: RosterRow): number {
  const ln = a.last_name.localeCompare(b.last_name, undefined, { sensitivity: 'base' })
  if (ln !== 0) return ln
  return a.first_name.localeCompare(b.first_name, undefined, { sensitivity: 'base' })
}

function cmpLastSession(a: RosterRow, b: RosterRow): number {
  // Null (never seen) sorts last.
  if (a.last_session_date === b.last_session_date) return cmpName(a, b)
  if (a.last_session_date === null) return 1
  if (b.last_session_date === null) return -1
  return b.last_session_date.localeCompare(a.last_session_date)
}
