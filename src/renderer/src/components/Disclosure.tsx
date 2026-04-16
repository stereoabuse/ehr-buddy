import { useState } from 'react'

interface DisclosureProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function Disclosure({ title, defaultOpen = false, children }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4"
      >
        <legend className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          {title}
        </legend>
        <span className="text-slate-400">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </fieldset>
  )
}
