import { matchPath, useLocation } from 'react-router-dom'
import { Icon } from './Icon'

interface PageMeta {
  title: string
  breadcrumbs?: string[]
}

// Pattern → meta. First match wins, so list specific patterns before generic ones.
const ROUTE_META: Array<{ pattern: string; meta: PageMeta }> = [
  { pattern: '/clients/:clientId/sessions/new', meta: { title: 'New session', breadcrumbs: ['Clients', 'Session'] } },
  { pattern: '/clients/:clientId/sessions/:sessionId', meta: { title: 'Session note', breadcrumbs: ['Clients', 'Session'] } },
  { pattern: '/clients/new', meta: { title: 'New client', breadcrumbs: ['Clients', 'New'] } },
  { pattern: '/clients/:id', meta: { title: 'Client chart', breadcrumbs: ['Clients', 'Chart'] } },
  { pattern: '/clients', meta: { title: 'Clients', breadcrumbs: ['Clients'] } },
  { pattern: '/reports', meta: { title: 'Reports', breadcrumbs: ['Reports'] } },
  { pattern: '/profile', meta: { title: 'Profile', breadcrumbs: ['Profile'] } },
  { pattern: '/activity', meta: { title: 'Activity', breadcrumbs: ['Activity'] } },
  { pattern: '/settings', meta: { title: 'Settings', breadcrumbs: ['Settings'] } },
  { pattern: '/', meta: { title: 'Dashboard', breadcrumbs: ['Dashboard'] } }
]

function metaFor(pathname: string): PageMeta {
  for (const { pattern, meta } of ROUTE_META) {
    if (matchPath({ path: pattern, end: true }, pathname)) return meta
  }
  return { title: '' }
}

export function TopBar() {
  const { pathname } = useLocation()
  const { title, breadcrumbs } = metaFor(pathname)

  return (
    <div
      className="flex h-14 shrink-0 items-center gap-4 bg-surface px-6"
      style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
    >
      <div className="flex min-w-0 flex-col">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-px flex items-center gap-1.5 text-xs text-muted">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <Icon name="chevR" size={11} className="text-faint" />}
                <span className={i === breadcrumbs.length - 1 ? 'text-body' : 'text-muted'}>
                  {b}
                </span>
              </span>
            ))}
          </div>
        )}
        <h1
          className="m-0 text-xl font-semibold text-ink"
          style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.2px' }}
        >
          {title}
        </h1>
      </div>

      <div className="flex-1" />

      {/* Global search — visual only for Phase 1 */}
      <div
        className="flex h-[34px] w-[280px] items-center gap-2 rounded-md bg-canvas-2 px-2.5"
        style={{ border: '0.5px solid var(--color-hairline)' }}
      >
        <Icon name="search" size={15} className="text-muted" />
        <input
          placeholder="Search clients, notes, files…"
          className="flex-1 border-0 bg-transparent text-base text-ink outline-none placeholder:text-faint"
        />
        <kbd
          className="rounded bg-surface px-1.5 text-[10.5px] text-muted"
          style={{ border: '0.5px solid var(--color-hairline)', paddingTop: 1, paddingBottom: 1 }}
        >
          ⌘K
        </kbd>
      </div>

    </div>
  )
}
