import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { CalendarSession } from '@shared/types'
import { practiceDateString } from '@shared/date'
import { addMonths, monthGridDays } from '@shared/date-ranges'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
import { Icon } from '../components/Icon'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

function currentYearMonth(): { year: number; month: number } {
  const [year, month] = practiceDateString().split('-').map(Number)
  return { year, month }
}

/** Read-only month view of logged sessions. There is no scheduling here. */
export default function Calendar() {
  const navigate = useNavigate()
  const [{ year, month }, setYearMonth] = useState(currentYearMonth)
  const today = practiceDateString()

  const days = useMemo(() => monthGridDays(year, month), [year, month])
  const fromDate = days[0]
  const toDate = days[days.length - 1]
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`

  const sessionsQuery = useQuery({
    queryKey: ['sessions', 'range', fromDate, toDate],
    queryFn: () => window.api.sessions.inRange({ fromDate, toDate })
  })

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarSession[]>()
    for (const s of sessionsQuery.data ?? []) {
      const list = map.get(s.session_date) ?? []
      list.push(s)
      map.set(s.session_date, list)
    }
    return map
  }, [sessionsQuery.data])

  const monthCount = (sessionsQuery.data ?? []).filter((s) => s.session_date.startsWith(monthPrefix)).length

  function step(delta: number) {
    setYearMonth((ym) => addMonths(ym.year, ym.month, delta))
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-5 flex items-center gap-3">
        <h2
          className="m-0 text-2xl font-semibold text-ink"
          style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.4px' }}
        >
          {MONTH_FORMAT.format(new Date(Date.UTC(year, month - 1, 1)))}
        </h2>
        <span className="text-sm text-muted">
          {sessionsQuery.isSuccess ? `${monthCount} session${monthCount === 1 ? '' : 's'} logged` : ''}
        </span>
        <div className="flex-1" />
        <Btn variant="secondary" size="sm" onClick={() => step(-1)} aria-label="Previous month">
          <Icon name="chevL" size={14} />
        </Btn>
        <Btn variant="secondary" size="sm" onClick={() => setYearMonth(currentYearMonth())}>
          Today
        </Btn>
        <Btn variant="secondary" size="sm" onClick={() => step(1)} aria-label="Next month">
          <Icon name="chevR" size={14} />
        </Btn>
      </div>

      {sessionsQuery.isError && (
        <p className="mb-3 text-sm text-danger">Couldn't load sessions: {String(sessionsQuery.error)}</p>
      )}

      <Card padding={0}>
        <div className="grid grid-cols-7" style={{ borderBottom: '0.5px solid var(--color-hairline)' }}>
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.4px] text-muted"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((iso, i) => {
            const inMonth = iso.startsWith(monthPrefix)
            const isToday = iso === today
            const sessions = byDay.get(iso) ?? []
            return (
              <div
                key={iso}
                className={`min-h-[104px] px-1.5 py-1.5 ${inMonth ? 'bg-surface' : 'bg-canvas-2'}`}
                style={{
                  borderRight: (i + 1) % 7 !== 0 ? '0.5px solid var(--color-divider)' : 'none',
                  borderTop: i >= 7 ? '0.5px solid var(--color-divider)' : 'none'
                }}
              >
                <div className="mb-1 flex justify-end px-1">
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-sm ${
                      isToday
                        ? 'bg-primary font-semibold text-white'
                        : inMonth
                          ? 'text-body'
                          : 'text-faint'
                    }`}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {Number(iso.slice(8))}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => navigate(`/clients/${s.client_id}/sessions/${s.id}`)}
                      title={`${s.start_time}–${s.end_time} · ${s.client_first_name} ${s.client_last_name}${s.signed_at ? '' : ' · unsigned'}`}
                      className={`flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[12px] hover:bg-canvas-2 ${
                        s.client_active === 0 ? 'text-faint' : 'text-ink'
                      }`}
                    >
                      <span className="shrink-0 text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {s.start_time}
                      </span>
                      <span className="truncate">{s.client_last_name}</span>
                      {!s.signed_at && (
                        <span
                          className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: 'var(--color-warn)' }}
                          aria-label="Unsigned note"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <p className="mt-3 text-sm text-muted">
        Sessions appear here once they're logged. An amber dot marks a note that hasn't been signed; archived
        clients are shown dimmed.
      </p>
    </div>
  )
}
