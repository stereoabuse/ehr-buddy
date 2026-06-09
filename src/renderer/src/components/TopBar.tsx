import { useEffect, useMemo, useRef, useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { RosterRow } from '@shared/types'
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
  const navigate = useNavigate()
  const { title, breadcrumbs } = metaFor(pathname)

  return (
    <div
      className="flex h-14 shrink-0 items-center gap-4 bg-surface px-6"
      style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
    >
      {pathname !== '/' && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-canvas-2 hover:text-ink"
        >
          <Icon name="chevL" size={18} />
        </button>
      )}

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

      <GlobalSearch />

    </div>
  )
}

function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const rosterQuery = useQuery({
    queryKey: ['clients', 'roster'],
    queryFn: () => window.api.clients.roster(),
    enabled: open
  })

  const matches = useMemo<RosterRow[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return (rosterQuery.data ?? [])
      .filter((r) => {
        const name = `${r.first_name} ${r.last_name}`.toLowerCase()
        const nameRev = `${r.last_name}, ${r.first_name}`.toLowerCase()
        return name.includes(q) || nameRev.includes(q)
      })
      .slice(0, 8)
  }, [query, rosterQuery.data])

  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onGlobalKeyDown)
    return () => window.removeEventListener('keydown', onGlobalKeyDown)
  }, [])

  function choose(id: string) {
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
    navigate(`/clients/${id}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, Math.max(matches.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && matches[highlight]) {
      choose(matches[highlight].id)
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const showList = open && query.trim().length > 0

  return (
    <div className="relative">
      <div
        className="flex h-[34px] w-[280px] items-center gap-2 rounded-md bg-canvas-2 px-2.5"
        style={{ border: '0.5px solid var(--color-hairline)' }}
      >
        <Icon name="search" size={15} className="text-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlight(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder="Search clients…"
          role="combobox"
          aria-expanded={showList}
          aria-controls="global-search-listbox"
          aria-label="Search clients"
          className="flex-1 border-0 bg-transparent text-base text-ink outline-none placeholder:text-faint"
        />
        <kbd
          className="rounded bg-surface px-1.5 text-[10.5px] text-muted"
          style={{ border: '0.5px solid var(--color-hairline)', paddingTop: 1, paddingBottom: 1 }}
        >
          ⌘K
        </kbd>
      </div>
      {showList && (
        <ul
          id="global-search-listbox"
          role="listbox"
          className="absolute right-0 top-[38px] z-40 m-0 w-[320px] list-none overflow-hidden rounded-md bg-surface p-0"
          style={{ border: '0.5px solid var(--color-hairline)', boxShadow: '0 12px 32px rgba(0,0,0,0.14)' }}
        >
          {matches.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-muted">
              {rosterQuery.isLoading ? 'Loading…' : 'No matching clients.'}
            </li>
          )}
          {matches.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(r.id)
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-center gap-2 border-0 px-3 py-2.5 text-left text-base text-ink ${
                  i === highlight ? 'bg-canvas-2' : 'bg-transparent'
                }`}
              >
                <span className="font-semibold">
                  {r.last_name}, {r.first_name}
                </span>
                {r.active === 0 && <span className="text-sm text-muted">(inactive)</span>}
                {r.dob && <span className="ml-auto text-sm text-muted">DOB {r.dob}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
