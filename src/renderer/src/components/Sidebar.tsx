import { useQuery } from '@tanstack/react-query'
import { NavLink, useNavigate } from 'react-router-dom'
import { Icon, type IconName } from './Icon'
import { initialsOfFullName } from '../lib/format'

interface NavItem {
  id: string
  label: string
  icon: IconName
  to?: string // omitted = placeholder, no route yet
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', to: '/', end: true },
  { id: 'clients', label: 'Clients', icon: 'users', to: '/clients' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'billing', label: 'Billing', icon: 'dollar' },
  { id: 'reports', label: 'Reports', icon: 'chart', to: '/reports' },
  { id: 'documents', label: 'Documents', icon: 'inbox' },
  { id: 'activity', label: 'Activity', icon: 'shield', to: '/activity' },
  { id: 'settings', label: 'Settings', icon: 'settings', to: '/settings' }
]

export function Sidebar() {
  const navigate = useNavigate()
  const clinician = useQuery({ queryKey: ['clinician'], queryFn: () => window.api.clinician.get() })

  const fullName = clinician.data?.full_name?.trim() || ''
  const initials = initialsOfFullName(fullName)
  const credLine = formatCredLine(clinician.data?.credentials, clinician.data?.npi)

  return (
    <aside
      className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-ink"
      style={{ borderRight: '0.5px solid rgba(0,0,0,0.2)' }}
    >
      {/* Brand */}
      <div
        className="flex h-16 items-center px-[18px]"
        style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex flex-col leading-tight">
          <span className="text-md font-semibold">EHR Buddy</span>
          <span className="text-xs text-sidebar-muted">Solo practice</span>
        </div>
      </div>

      {/* Create button — TODO Phase 6: replace with menu (New session / New client / New note) */}
      <div className="px-3.5 py-3.5">
        <button
          onClick={() => navigate('/clients/new')}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-base font-semibold text-white transition-colors hover:bg-primary-dark"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.2)' }}
        >
          <Icon name="plus" size={16} />
          <span>Create</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-px px-2">
        {NAV_ITEMS.map((item) => {
          if (!item.to) return <PlaceholderItem key={item.id} item={item} />
          return <NavItemLink key={item.id} item={item} />
        })}
      </nav>

      {/* User card — clickable, routes to clinician profile */}
      <button
        onClick={() => navigate('/profile')}
        className="flex items-center gap-2.5 px-3.5 py-3.5 text-left transition-colors hover:bg-sidebar-hover"
        style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}
      >
        <div
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-sm font-semibold text-ink"
          style={{ background: '#9CA4B8', boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.08)' }}
        >
          {initials || '?'}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          {fullName ? (
            <>
              <div className="truncate text-base font-semibold text-white">{fullName}</div>
              {credLine && <div className="truncate text-xs text-sidebar-muted">{credLine}</div>}
            </>
          ) : (
            <>
              <div className="truncate text-base font-semibold text-white">Set up profile</div>
              <div className="truncate text-xs text-sidebar-muted">Add your name and credentials</div>
            </>
          )}
        </div>
      </button>
    </aside>
  )
}

function formatCredLine(credentials: string | null | undefined, npi: string | null | undefined): string {
  const parts: string[] = []
  if (credentials?.trim()) parts.push(credentials.trim())
  if (npi?.trim()) parts.push(`NPI ${npi.trim()}`)
  return parts.join(' · ')
}

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to!}
      end={item.end}
      title={item.label}
      className={({ isActive }) =>
        [
          'relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-base transition-colors',
          isActive
            ? 'bg-white/10 font-semibold text-white'
            : 'font-medium text-sidebar-ink hover:bg-white/5'
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className="absolute left-0 w-[3px] rounded bg-accent"
              style={{ top: 7, bottom: 7 }}
            />
          )}
          <Icon
            name={item.icon}
            size={18}
            className={isActive ? 'text-white' : 'text-sidebar-muted'}
          />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

function PlaceholderItem({ item }: { item: NavItem }) {
  return (
    <button
      type="button"
      disabled
      title={`${item.label} — coming soon`}
      className="relative flex h-9 cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 text-base font-medium text-sidebar-muted opacity-60"
    >
      <Icon name={item.icon} size={18} className="text-sidebar-muted" />
      <span>{item.label}</span>
    </button>
  )
}
