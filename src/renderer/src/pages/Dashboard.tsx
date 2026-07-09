import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { CPT_CODES } from '@shared/cpt-codes'
import { Card } from '../components/Card'
import { Pill } from '../components/Pill'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { fmtMoney, initialsOf, backupRecencyLabel, isBackupOverdue } from '../lib/format'
import { avatarColorFor } from '../lib/avatar'

export default function Dashboard() {
  const navigate = useNavigate()
  const clients = useQuery({ queryKey: ['clients'], queryFn: () => window.api.clients.list() })
  const todaySessions = useQuery({ queryKey: ['sessions', 'today'], queryFn: () => window.api.sessions.today() })
  const unpaidSessions = useQuery({ queryKey: ['sessions', 'unpaid'], queryFn: () => window.api.sessions.unpaid() })
  const roster = useQuery({ queryKey: ['clients', 'roster'], queryFn: () => window.api.clients.roster() })
  const backupLastRun = useQuery({ queryKey: ['backup', 'lastRun'], queryFn: () => window.api.backup.lastRun() })

  const today = todaySessions.data ?? []
  const unpaid = unpaidSessions.data ?? []
  const allClients = clients.data ?? []
  const rosterRows = roster.data ?? []

  const activeCount = allClients.filter((c) => c.active === 1).length
  const unpaidTotal = unpaid.reduce((s, x) => s + x.fee_cents, 0)
  const unpaidClientIds = new Set(unpaid.map((x) => x.client_id))
  const unsignedTotal = rosterRows.reduce((s, r) => s + r.unsigned_count, 0)

  const queryErrors: { label: string; error: unknown }[] = []
  if (clients.isError) queryErrors.push({ label: 'clients', error: clients.error })
  if (todaySessions.isError) queryErrors.push({ label: "today's sessions", error: todaySessions.error })
  if (unpaidSessions.isError) queryErrors.push({ label: 'unpaid sessions', error: unpaidSessions.error })
  if (roster.isError) queryErrors.push({ label: 'client roster', error: roster.error })

  const scheduleUnavailable = todaySessions.isPending || todaySessions.isError
  const todoUnavailable = todaySessions.isPending || todaySessions.isError || unpaidSessions.isPending || unpaidSessions.isError

  // Per-client outstanding balances
  const balanceByClient = new Map<string, { name: string; clientId: string; total: number; count: number }>()
  for (const s of unpaid) {
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
  const outstandingClients = [...balanceByClient.values()].sort((a, b) => b.total - a.total)

  // To-do list: derived from real signals (unsigned today + unpaid aggregate)
  const todayUnsigned = today.filter((s) => !s.signed_at)
  const todos: Array<{ id: string; label: string; tone: 'danger' | 'warn' | 'neutral'; badge: string; onClick: () => void }> = []
  for (const s of todayUnsigned) {
    todos.push({
      id: `sign-${s.id}`,
      label: `Sign progress note: ${s.client_first_name} ${s.client_last_name}`,
      tone: 'warn',
      badge: 'Today',
      onClick: () => navigate(`/clients/${s.client_id}/sessions/${s.id}`)
    })
  }
  if (unpaid.length > 0) {
    todos.push({
      id: 'unpaid-aggregate',
      label: `Follow up on ${unpaid.length} unpaid session${unpaid.length === 1 ? '' : 's'} across ${unpaidClientIds.size} client${unpaidClientIds.size === 1 ? '' : 's'}`,
      tone: 'danger',
      badge: 'Overdue',
      onClick: () => navigate('/reports')
    })
  }
  // Only add the backup nudge once the query has actually resolved — never
  // show "never backed up" while it's still pending or failed.
  if (backupLastRun.isSuccess && isBackupOverdue(backupLastRun.data)) {
    todos.push({
      id: 'backup-nudge',
      label: `Back up your data — last backup ${backupRecencyLabel(backupLastRun.data)}`,
      tone: 'warn',
      badge: 'Backup',
      onClick: () => navigate('/settings')
    })
  }
  const overdueCount = todos.filter((t) => t.tone === 'danger').length

  return (
    <div className="mx-auto max-w-[1180px]">
      {queryErrors.length > 0 && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-lg bg-surface px-4 py-3"
          style={{ border: '0.5px solid var(--color-danger)' }}
        >
          <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-danger" />
          <p className="m-0 text-base text-danger">
            Couldn't load {queryErrors.map((q) => q.label).join(', ')}: {queryErrors.map((q) => String(q.error)).join('; ')}
          </p>
        </div>
      )}

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-4 gap-3.5">
        <KpiCard
          label="Today's sessions"
          value={String(today.length)}
          sub={today.length === 0 ? 'Nothing scheduled' : describeScheduleSummary(today.length, todayUnsigned.length)}
          tone="primary"
          isPending={todaySessions.isPending}
          isError={todaySessions.isError}
        />
        <KpiCard
          label="Active clients"
          value={String(activeCount)}
          sub={`${allClients.length} total`}
          tone="ink"
          isPending={clients.isPending}
          isError={clients.isError}
        />
        <KpiCard
          label="Outstanding"
          value={fmtMoney(unpaidTotal)}
          sub={unpaidClientIds.size === 0 ? 'All paid up' : `${unpaidClientIds.size} client${unpaidClientIds.size === 1 ? '' : 's'}`}
          tone="danger"
          isPending={unpaidSessions.isPending}
          isError={unpaidSessions.isError}
          to="/clients?filter=has-balance"
        />
        <KpiCard
          label="Unsigned notes"
          value={String(unsignedTotal)}
          sub={unsignedTotal === 0 ? 'Nothing pending' : 'Past sessions'}
          tone="warn"
          isPending={roster.isPending}
          isError={roster.isError}
          to="/clients?filter=unsigned"
        />
      </div>

      {/* Two-col: schedule + to-do */}
      <div className="mb-4 grid gap-4" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <Card padding={0}>
          <SectionHeader title="Today's schedule">
            <Link
              to="/clients"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark"
            >
              View clients <Icon name="chevR" size={12} />
            </Link>
          </SectionHeader>
          {scheduleUnavailable ? (
            todaySessions.isError ? (
              <EmptyRow tone="danger">Couldn't load today's schedule.</EmptyRow>
            ) : (
              <SkeletonRows count={3} />
            )
          ) : today.length === 0 ? (
            <EmptyRow>No sessions logged today.</EmptyRow>
          ) : (
            <div>
              {today.map((s, i) => {
                const cpt = CPT_CODES.find((c) => c.code === s.cpt_code)
                const fullName = `${s.client_first_name} ${s.client_last_name}`
                const color = avatarColorFor(s.client_id)
                return (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/clients/${s.client_id}/sessions/${s.id}`)}
                    className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-canvas-2"
                    style={{
                      borderBottom: i < today.length - 1 ? '0.5px solid var(--color-divider)' : 'none'
                    }}
                  >
                    <div className="w-[60px] text-sm font-semibold text-body" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {s.start_time}
                      <div className="text-[10.5px] font-normal text-muted">{s.end_time}</div>
                    </div>
                    <div className="w-[3px] self-stretch rounded" style={{ background: color }} />
                    <Avatar
                      initials={initialsOf(s.client_first_name, s.client_last_name)}
                      color={color}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold text-ink">{fullName}</div>
                      <div className="mt-px text-sm text-muted">
                        {cpt ? cpt.description : s.cpt_code}
                        {s.icd10_codes ? ` · ${s.icd10_codes.split(',')[0]?.trim()}` : ''}
                      </div>
                    </div>
                    {!s.signed_at && <Pill tone="warn">Unsigned</Pill>}
                    <Icon name="chevR" size={16} className="text-faint" />
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <Card padding={0}>
          <SectionHeader title="To-do">
            {overdueCount > 0 && <Pill tone="danger">{overdueCount} overdue</Pill>}
          </SectionHeader>
          {todoUnavailable ? (
            todaySessions.isError || unpaidSessions.isError ? (
              <EmptyRow tone="danger">Couldn't load to-do items.</EmptyRow>
            ) : (
              <SkeletonRows count={2} />
            )
          ) : todos.length === 0 ? (
            <EmptyRow>All caught up — nothing on your list.</EmptyRow>
          ) : (
            <div>
              {todos.map((t, i) => (
                <button
                  key={t.id}
                  onClick={t.onClick}
                  className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-canvas-2"
                  style={{ borderBottom: i < todos.length - 1 ? '0.5px solid var(--color-divider)' : 'none' }}
                >
                  <div
                    className="mt-0.5 h-4 w-4 shrink-0 rounded"
                    style={{ border: '1.5px solid var(--color-hairline)' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-base leading-snug text-ink">{t.label}</div>
                    <div className="mt-1">
                      <Pill tone={t.tone}>{t.badge}</Pill>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Outstanding balances */}
      {unpaidSessions.isPending ? (
        <Card padding={0}>
          <SectionHeader title="Outstanding balances">
            <div className="h-5 w-16 animate-pulse rounded bg-canvas-2" />
          </SectionHeader>
          <div className="grid grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 px-5 py-3.5"
                style={{
                  borderRight: (i + 1) % 4 !== 0 ? '0.5px solid var(--color-divider)' : 'none'
                }}
              >
                <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-canvas-2" />
                <div className="min-w-0 flex-1">
                  <div className="h-3.5 w-2/3 animate-pulse rounded bg-canvas-2" />
                  <div className="mt-1.5 h-3 w-1/3 animate-pulse rounded bg-canvas-2" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        !unpaidSessions.isError &&
        outstandingClients.length > 0 && (
          <Card padding={0}>
            <SectionHeader title="Outstanding balances">
              <span
                className="text-xl font-semibold text-danger"
                style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.3px' }}
              >
                {fmtMoney(unpaidTotal)}
              </span>
            </SectionHeader>
            <div className="grid grid-cols-4">
              {outstandingClients.slice(0, 8).map((c, i) => (
                <Link
                  key={c.clientId}
                  to={`/clients/${c.clientId}`}
                  className="flex items-center gap-2.5 px-5 py-3.5 transition-colors hover:bg-canvas-2"
                  style={{
                    borderRight: (i + 1) % 4 !== 0 ? '0.5px solid var(--color-divider)' : 'none',
                    borderTop: i >= 4 ? '0.5px solid var(--color-divider)' : 'none'
                  }}
                >
                  <Avatar
                    initials={initialsOf(c.name.split(' ')[0] ?? '', c.name.split(' ').slice(-1)[0] ?? '')}
                    color={avatarColorFor(c.clientId)}
                    size={28}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-ink">{c.name}</div>
                    <div className="text-sm font-semibold text-danger">{fmtMoney(c.total)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )
      )}
    </div>
  )
}

function describeScheduleSummary(total: number, unsigned: number): string {
  if (unsigned === 0) return `${total} signed`
  if (unsigned === total) return `${total} pending notes`
  return `${total - unsigned} signed · ${unsigned} pending`
}

function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div
      className="flex items-center px-5 py-4"
      style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
    >
      <h3 className="m-0 text-lg font-semibold text-ink" style={{ fontFamily: 'var(--font-head)' }}>
        {title}
      </h3>
      <div className="flex-1" />
      {children}
    </div>
  )
}

function EmptyRow({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'danger' }) {
  return <div className={`px-5 py-6 text-base ${tone === 'danger' ? 'text-danger' : 'text-muted'}`}>{children}</div>
}

/** Pulsing placeholder rows used while a list-backed section's query is still loading. */
function SkeletonRows({ count }: { count: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3.5 px-5 py-3.5"
          style={{ borderBottom: i < count - 1 ? '0.5px solid var(--color-divider)' : 'none' }}
        >
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-canvas-2" />
          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-canvas-2" />
            <div className="mt-1.5 h-3 w-1/4 animate-pulse rounded bg-canvas-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  tone,
  to,
  isPending,
  isError
}: {
  label: string
  value: string
  sub: string
  tone: 'primary' | 'ink' | 'danger' | 'warn'
  /** When set, the whole card becomes a keyboard-accessible link. */
  to?: string
  isPending?: boolean
  isError?: boolean
}) {
  const valueClass = {
    primary: 'text-primary',
    ink: 'text-ink',
    danger: 'text-danger',
    warn: 'text-warn'
  }[tone]

  const body = isPending ? (
    <>
      <div className="text-[11.5px] font-semibold uppercase tracking-[0.4px] text-muted">{label}</div>
      <div className="mt-2 h-7 w-16 animate-pulse rounded bg-canvas-2" />
      <div className="mt-2.5 h-3.5 w-24 animate-pulse rounded bg-canvas-2" />
    </>
  ) : isError ? (
    <>
      <div className="text-[11.5px] font-semibold uppercase tracking-[0.4px] text-muted">{label}</div>
      <div
        className="mt-1.5 text-3xl font-semibold text-danger"
        style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.5px' }}
      >
        —
      </div>
      <div className="mt-0.5 text-sm text-danger">Couldn't load</div>
    </>
  ) : (
    <>
      <div className="text-[11.5px] font-semibold uppercase tracking-[0.4px] text-muted">{label}</div>
      <div
        className={`mt-1.5 text-3xl font-semibold ${valueClass}`}
        style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.5px' }}
      >
        {value}
      </div>
      <div className="mt-0.5 text-sm text-muted">{sub}</div>
    </>
  )

  if (to) {
    return (
      <Card padding={18} to={to}>
        {body}
      </Card>
    )
  }

  return <Card padding={18}>{body}</Card>
}
