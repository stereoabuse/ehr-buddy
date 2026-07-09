import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { RosterRow } from '@shared/types'
import { Card } from '../components/Card'
import { Pill } from '../components/Pill'
import { Avatar } from '../components/Avatar'
import { Btn } from '../components/Btn'
import { Icon } from '../components/Icon'
import { fmtMoney, initialsOf } from '../lib/format'
import { avatarColorFor } from '../lib/avatar'

type Filter = 'all' | 'active' | 'inactive' | 'has-balance' | 'unsigned'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'has-balance', label: 'Has balance' },
  { id: 'unsigned', label: 'Unsigned notes' }
]

export default function ClientList() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useQuery({
    queryKey: ['clients', 'roster'],
    queryFn: () => window.api.clients.roster()
  })

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const rows = useMemo(() => {
    const base = data ?? []
    return base.filter((r) => {
      if (filter === 'active' && r.active !== 1) return false
      if (filter === 'inactive' && r.active !== 0) return false
      if (filter === 'has-balance' && r.unpaid_count === 0) return false
      if (filter === 'unsigned' && r.unsigned_count === 0) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const name = `${r.first_name} ${r.last_name}`.toLowerCase()
        const nameRev = `${r.last_name}, ${r.first_name}`.toLowerCase()
        if (!name.includes(q) && !nameRev.includes(q)) return false
      }
      return true
    })
  }, [data, filter, search])

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-5 flex items-center gap-3">
        <h2
          className="m-0 text-2xl font-semibold text-ink"
          style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.4px' }}
        >
          Clients
        </h2>
        <Pill tone="neutral">{rows.length}</Pill>
        <div className="flex-1" />
        <Btn
          variant="secondary"
          icon="download"
          disabled
          title="Coming soon"
        >
          Export CSV
        </Btn>
        <Btn icon="plus" onClick={() => navigate('/clients/new')}>
          Add Client
        </Btn>
      </div>

      <Card padding={0}>
        {/* Filters bar */}
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
              placeholder="Search by name…"
              className="flex-1 border-0 bg-transparent text-base text-ink outline-none placeholder:text-faint"
            />
          </div>
          <div
            className="flex rounded-md bg-canvas-2 p-0.5"
            style={{ border: '0.5px solid var(--color-hairline)' }}
          >
            {FILTERS.map((f) => {
              const active = filter === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={[
                    'h-[26px] rounded-[5px] px-3 text-sm font-semibold transition-colors',
                    active ? 'bg-surface text-ink' : 'bg-transparent text-muted hover:text-body'
                  ].join(' ')}
                  style={active ? { boxShadow: '0 1px 2px rgba(0,0,0,0.06)' } : undefined}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* States */}
        {isLoading && <EmptyState>Loading…</EmptyState>}
        {error && <EmptyState tone="danger">Error: {String(error)}</EmptyState>}
        {!isLoading && !error && rows.length === 0 && (
          <EmptyState>
            {data && data.length === 0
              ? 'No clients yet.'
              : `No clients match the current filter${search.trim() ? ` and "${search}"` : ''}.`}
          </EmptyState>
        )}

        {/* Table */}
        {rows.length > 0 && (
          <table className="w-full border-collapse text-base">
            <thead>
              <tr className="bg-canvas-2">
                {['Client', 'Diagnosis', 'Phone', 'Last session', 'Balance', 'Status'].map((h) => (
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
              {rows.map((r, i) => (
                <ClientRow
                  key={r.id}
                  row={r}
                  isLast={i === rows.length - 1}
                  onOpen={() => navigate(`/clients/${r.id}`)}
                />
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

function ClientRow({ row, isLast, onOpen }: { row: RosterRow; isLast: boolean; onOpen: () => void }) {
  const isActive = row.active === 1
  const dx = (row.last_dx ?? '').split(',')[0]?.trim() ?? ''

  return (
    <tr
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      tabIndex={0}
      role="link"
      aria-label={`Open client ${row.last_name}, ${row.first_name}`}
      className="cursor-pointer bg-surface hover:bg-canvas-2 focus-visible:bg-canvas-2"
      style={{
        borderBottom: isLast ? 'none' : '0.5px solid var(--color-divider)',
        outlineColor: 'var(--color-primary)'
      }}
    >
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar
            initials={initialsOf(row.first_name, row.last_name)}
            color={avatarColorFor(row.id)}
            size={30}
          />
          <div>
            <div className="font-semibold text-ink">
              {row.last_name}, {row.first_name}
            </div>
            {row.dob && (
              <div className="mt-px text-sm text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                DOB {row.dob}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-body">{dx || <span className="text-faint">—</span>}</td>
      <td className="px-3 py-2.5 text-body" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {row.phone || <span className="text-faint">—</span>}
      </td>
      <td className="px-3 py-2.5 text-body" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {row.last_session_date || <span className="text-faint">—</span>}
      </td>
      <td className="px-3 py-2.5">
        {row.unpaid_cents > 0 ? (
          <div>
            <span className="font-semibold text-danger" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {fmtMoney(row.unpaid_cents)}
            </span>
            <div className="text-sm text-muted">
              {row.unpaid_count} session{row.unpaid_count === 1 ? '' : 's'}
            </div>
          </div>
        ) : (
          <span className="text-faint">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-col items-start gap-1">
          <Pill tone={isActive ? 'success' : 'neutral'}>
            <span
              className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: isActive ? 'var(--color-success)' : 'var(--color-faint)' }}
            />
            {isActive ? 'Active' : 'Inactive'}
          </Pill>
          {row.unsigned_count > 0 && (
            <Pill tone="warn">
              {row.unsigned_count} unsigned
            </Pill>
          )}
        </div>
      </td>
    </tr>
  )
}

function EmptyState({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'danger' }) {
  return (
    <div className={`px-5 py-10 text-center text-base ${tone === 'danger' ? 'text-danger' : 'text-muted'}`}>
      {children}
    </div>
  )
}
