import { useState } from 'react'

interface DisclosureProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function Disclosure({ title, defaultOpen = false, children }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <fieldset
      className="rounded-lg bg-surface"
      style={{ border: '0.5px solid var(--color-hairline)' }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-3.5"
      >
        <legend className="text-sm font-semibold uppercase tracking-[0.4px] text-muted">
          {title}
        </legend>
        <span className="text-faint">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </fieldset>
  )
}
