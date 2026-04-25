interface TabSpec {
  id: string
  label: string
  count?: number
  disabled?: boolean
}

interface TabsProps {
  tabs: TabSpec[]
  active: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-1" style={{ marginBottom: -1 }}>
      {tabs.map((t) => {
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            type="button"
            disabled={t.disabled}
            onClick={() => onChange(t.id)}
            className={[
              'inline-flex items-center gap-1.5 px-3.5 pb-3 pt-2.5 text-base font-semibold transition-colors',
              isActive
                ? 'text-ink'
                : t.disabled
                ? 'cursor-not-allowed text-faint'
                : 'text-muted hover:text-body'
            ].join(' ')}
            style={{
              borderBottom: `2px solid ${isActive ? 'var(--color-primary)' : 'transparent'}`,
              fontFamily: 'inherit'
            }}
          >
            {t.label}
            {t.count != null && (
              <span
                className="rounded-full bg-canvas-2 px-1.5 text-xs font-medium text-muted"
                style={{
                  border: '0.5px solid var(--color-hairline)',
                  paddingTop: 1,
                  paddingBottom: 1
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
