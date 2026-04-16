interface TabsProps {
  tabs: { id: string; label: string; disabled?: boolean }[]
  active: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="border-b border-slate-200">
      <nav className="flex gap-6">
        {tabs.map((t) => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              type="button"
              disabled={t.disabled}
              onClick={() => onChange(t.id)}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
                isActive
                  ? 'border-blue-600 text-blue-700'
                  : t.disabled
                  ? 'border-transparent text-slate-300 cursor-not-allowed'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
