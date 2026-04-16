import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { CPT_CODES } from '@shared/cpt-codes'

function weekRange(): { from: string; to: string } {
  const now = new Date()
  const day = now.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day // Monday as start
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10)
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const clients = useQuery({ queryKey: ['clients'], queryFn: () => window.api.clients.list() })
  const clinician = useQuery({ queryKey: ['clinician'], queryFn: () => window.api.clinician.get() })
  const todaySessions = useQuery({ queryKey: ['sessions', 'today'], queryFn: () => window.api.sessions.today() })
  const unpaidSessions = useQuery({ queryKey: ['sessions', 'unpaid'], queryFn: () => window.api.sessions.unpaid() })

  const googleStatus = useQuery({ queryKey: ['google', 'status'], queryFn: () => window.api.google.authStatus() })
  const week = weekRange()
  const calendarEvents = useQuery({
    queryKey: ['google', 'calendar', week.from, week.to],
    queryFn: () => window.api.google.calendarEvents(week.from, week.to),
    enabled: googleStatus.data?.connected === true
  })

  const [quickClient, setQuickClient] = useState('')
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [backingUp, setBackingUp] = useState(false)

  function handleQuickNote() {
    if (quickClient) navigate(`/clients/${quickClient}/sessions/new`)
  }

  async function handleBackup() {
    setBackingUp(true)
    setBackupStatus(null)
    try {
      const result = await window.api.backup.run()
      setBackupStatus(result ? `Backed up to ${result.path}` : 'Cancelled')
    } catch (e) {
      setBackupStatus(`Error: ${String(e)}`)
    } finally {
      setBackingUp(false)
    }
  }

  const unpaidTotal = (unpaidSessions.data ?? []).reduce((sum, s) => sum + s.fee_cents, 0)

  // per-client balance from unpaid sessions
  const balanceByClient = new Map<string, { name: string; clientId: string; total: number; count: number }>()
  for (const s of unpaidSessions.data ?? []) {
    const existing = balanceByClient.get(s.client_id)
    if (existing) {
      existing.total += s.fee_cents
      existing.count += 1
    } else {
      balanceByClient.set(s.client_id, {
        name: `${s.client_first_name} ${s.client_last_name}`,
        clientId: s.client_id,
        total: s.fee_cents,
        count: 1
      })
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h2 className="text-3xl font-semibold">Dashboard</h2>
        <p className="mt-1 text-slate-500">
          {clinician.data?.full_name ? `Welcome, ${clinician.data.full_name}` : 'EHR Buddy'}
        </p>
      </div>

      {/* ── Quick Note ────────────────────────────── */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 className="text-lg font-semibold text-blue-900">Quick Session Note</h3>
        <p className="mt-1 text-sm text-blue-700">Pick a client and start writing</p>
        <div className="mt-3 flex items-end gap-3">
          <label className="block flex-1">
            <span className="text-sm font-medium text-blue-800">Client</span>
            <select
              value={quickClient}
              onChange={(e) => setQuickClient(e.target.value)}
              className="mt-1 block w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select…</option>
              {(clients.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.last_name}, {c.first_name}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={handleQuickNote} disabled={!quickClient}>
            New Session →
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Today's Sessions ────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Today</h3>
          {todaySessions.data && todaySessions.data.length === 0 && (
            <p className="mt-3 text-slate-400">No sessions logged today.</p>
          )}
          {todaySessions.data && todaySessions.data.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-100">
              {todaySessions.data.map((s) => {
                const cpt = CPT_CODES.find((c) => c.code === s.cpt_code)
                return (
                  <li key={s.id} className="flex items-center justify-between py-2">
                    <Link
                      to={`/clients/${s.client_id}/sessions/${s.id}`}
                      className="text-blue-700 hover:underline"
                    >
                      {s.client_first_name} {s.client_last_name}
                    </Link>
                    <span className="text-sm text-slate-500">
                      {s.start_time}–{s.end_time}
                      {cpt && ` · ${cpt.code}`}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ── Unpaid Sessions ─────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Unpaid
          </h3>
          {(unpaidSessions.data ?? []).length === 0 ? (
            <p className="mt-3 text-green-600">All caught up!</p>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold text-red-700">
                ${(unpaidTotal / 100).toFixed(2)}
              </p>
              <p className="text-sm text-slate-500">
                across {unpaidSessions.data!.length} session{unpaidSessions.data!.length !== 1 ? 's' : ''}
              </p>
              <ul className="mt-3 space-y-1">
                {[...balanceByClient.values()].map((b) => (
                  <li key={b.clientId} className="flex items-center justify-between text-sm">
                    <Link to={`/clients/${b.clientId}`} className="text-blue-700 hover:underline">
                      {b.name}
                    </Link>
                    <span className="font-medium text-slate-700">
                      ${(b.total / 100).toFixed(2)} ({b.count})
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* ── This Week (Google Calendar) ────────────── */}
      {googleStatus.data?.connected && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            This Week <span className="ml-1 font-normal normal-case text-slate-400">{week.from} – {week.to}</span>
          </h3>
          {calendarEvents.isLoading && <p className="mt-3 text-slate-400">Loading calendar…</p>}
          {calendarEvents.data && calendarEvents.data.length === 0 && (
            <p className="mt-3 text-slate-400">No events this week.</p>
          )}
          {calendarEvents.data && calendarEvents.data.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-100">
              {calendarEvents.data.map((ev) => {
                const start = ev.allDay ? ev.start : ev.start.slice(0, 16).replace('T', ' ')
                return (
                  <li key={ev.id} className="flex items-center justify-between py-2">
                    <span className="text-slate-800">{ev.summary}</span>
                    <span className="text-sm text-slate-500">{start}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* ── Secondary tiles ───────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link
          to="/clients"
          className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-blue-500 hover:shadow"
        >
          <div className="text-2xl font-bold">{clients.data?.length ?? '…'}</div>
          <div className="text-sm text-slate-500">Clients</div>
        </Link>
        <Link
          to="/profile"
          className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-blue-500 hover:shadow"
        >
          <div className="text-lg font-semibold">Profile</div>
          <div className="truncate text-sm text-slate-500">
            {clinician.data?.full_name ?? 'Set up'}
          </div>
        </Link>
        <button
          type="button"
          onClick={handleBackup}
          disabled={backingUp}
          className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-blue-500 hover:shadow disabled:opacity-50"
        >
          <div className="text-lg font-semibold">Backup</div>
          <div className="text-sm text-slate-500">{backingUp ? 'Saving…' : 'Back up now'}</div>
        </button>
        <Link
          to="/clients/new"
          className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-blue-500 hover:shadow"
        >
          <div className="text-lg font-semibold">+ Client</div>
          <div className="text-sm text-slate-500">Add new</div>
        </Link>
      </div>

      {backupStatus && (
        <p className={`text-sm ${backupStatus.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
          {backupStatus}
        </p>
      )}
    </div>
  )
}
