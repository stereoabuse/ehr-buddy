import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { SessionListItem } from '@shared/types'
import { CPT_CODES } from '@shared/cpt-codes'
import { Avatar } from '../components/Avatar'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import { avatarColorFor } from '../lib/avatar'
import { fmtMoney, initialsOf } from '../lib/format'
import { invalidateSessionDerivedQueries } from '../lib/query'

interface ClientBalance {
  clientId: string
  firstName: string
  lastName: string
  total: number
  sessions: SessionListItem[]
}

function groupByClient(unpaid: SessionListItem[]): ClientBalance[] {
  const byClient = new Map<string, ClientBalance>()
  for (const s of unpaid) {
    const entry = byClient.get(s.client_id) ?? {
      clientId: s.client_id,
      firstName: s.client_first_name,
      lastName: s.client_last_name,
      total: 0,
      sessions: []
    }
    entry.total += s.fee_cents
    entry.sessions.push(s)
    byClient.set(s.client_id, entry)
  }
  for (const entry of byClient.values()) {
    entry.sessions.sort((a, b) => a.session_date.localeCompare(b.session_date))
  }
  return [...byClient.values()].sort((a, b) => b.total - a.total)
}

export default function Billing() {
  const qc = useQueryClient()
  const toast = useToast()
  const unpaidQuery = useQuery({
    queryKey: ['sessions', 'unpaid'],
    queryFn: () => window.api.sessions.unpaid()
  })

  const unpaid = unpaidQuery.data ?? []
  const groups = useMemo(() => groupByClient(unpaidQuery.data ?? []), [unpaidQuery.data])
  const total = unpaid.reduce((sum, s) => sum + s.fee_cents, 0)

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [confirmClient, setConfirmClient] = useState<ClientBalance | null>(null)

  function setPending(ids: string[], pending: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (pending) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const markPaid = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => window.api.sessions.setPaid(id, 1)))
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${failed} of ${results.length} sessions could not be updated.`)
    },
    onMutate: (ids) => setPending(ids, true),
    onError: (err) => toast.showError(`Mark paid failed: ${String(err)}`),
    onSettled: (_data, _err, ids) => {
      setPending(ids, false)
      invalidateSessionDerivedQueries(qc)
    }
  })

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-5">
        <h2
          className="m-0 text-2xl font-semibold text-ink"
          style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.4px' }}
        >
          Billing
        </h2>
        <p className="mt-1 text-base text-muted">
          Unpaid sessions across all active clients. Superbills are generated from each client's Billing tab.
        </p>
      </div>

      <Card>
        <h4 className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.5px] text-muted">
          Outstanding balance
        </h4>
        {unpaidQuery.isPending ? (
          <div className="mt-2 h-9 w-32 animate-pulse rounded bg-canvas-2" />
        ) : unpaidQuery.isError ? (
          <p className="m-0 text-base text-danger">Couldn't load unpaid sessions: {String(unpaidQuery.error)}</p>
        ) : (
          <>
            <div
              className={`text-[36px] font-semibold ${total > 0 ? 'text-danger' : 'text-success'}`}
              style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.6px' }}
            >
              {fmtMoney(total)}
            </div>
            <div className="mt-1 text-base text-muted">
              {total > 0
                ? `${unpaid.length} unpaid session${unpaid.length === 1 ? '' : 's'} across ${groups.length} client${groups.length === 1 ? '' : 's'}`
                : 'All caught up'}
            </div>
          </>
        )}
      </Card>

      <div className="mt-4 flex flex-col gap-4">
        {groups.map((g) => (
          <Card key={g.clientId} padding={0}>
            <div
              className="flex items-center gap-3 px-[18px] py-3.5"
              style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
            >
              <Avatar
                initials={initialsOf(g.firstName, g.lastName)}
                color={avatarColorFor(g.clientId)}
                size={30}
              />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/clients/${g.clientId}?tab=billing`}
                  className="text-base font-semibold text-ink hover:text-primary"
                >
                  {g.lastName}, {g.firstName}
                </Link>
                <div className="text-sm text-muted">
                  {g.sessions.length} unpaid session{g.sessions.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className="text-lg font-semibold text-danger" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {fmtMoney(g.total)}
              </div>
              <Btn
                size="sm"
                variant="secondary"
                disabled={g.sessions.some((s) => pendingIds.has(s.id))}
                onClick={() => setConfirmClient(g)}
              >
                Mark all paid
              </Btn>
            </div>
            <table className="w-full border-collapse text-base">
              <tbody>
                {g.sessions.map((s, i) => {
                  const cpt = CPT_CODES.find((c) => c.code === s.cpt_code)
                  return (
                    <tr
                      key={s.id}
                      style={{ borderBottom: i < g.sessions.length - 1 ? '0.5px solid var(--color-divider)' : 'none' }}
                    >
                      <td className="w-[120px] px-[18px] py-2.5">
                        <Link
                          to={`/clients/${g.clientId}/sessions/${s.id}`}
                          className="font-semibold text-primary hover:text-primary-dark"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {s.session_date}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-body">
                        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12 }}>
                          {s.cpt_code}
                        </span>
                        {cpt && <span className="ml-1.5 text-sm text-muted">{cpt.description}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-body" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {fmtMoney(s.fee_cents)}
                      </td>
                      <td className="px-[18px] py-2.5 text-right">
                        <Btn
                          size="sm"
                          variant="secondary"
                          disabled={pendingIds.has(s.id)}
                          onClick={() => markPaid.mutate([s.id])}
                        >
                          Mark paid
                        </Btn>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        ))}
      </div>

      {confirmClient && (
        <ConfirmDialog
          title="Mark all paid?"
          message={`Mark all ${confirmClient.sessions.length} unpaid session${confirmClient.sessions.length === 1 ? '' : 's'} for ${confirmClient.firstName} ${confirmClient.lastName} (${fmtMoney(confirmClient.total)}) as paid?`}
          confirmLabel="Mark all paid"
          onConfirm={() => {
            const ids = confirmClient.sessions.map((s) => s.id)
            setConfirmClient(null)
            markPaid.mutate(ids)
          }}
          onCancel={() => setConfirmClient(null)}
        />
      )}
    </div>
  )
}
