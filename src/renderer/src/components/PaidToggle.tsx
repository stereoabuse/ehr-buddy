import { useEffect, useRef, useState } from 'react'

interface PaidToggleProps {
  paid: number
  onToggle: () => void
  pending?: boolean
}

export function PaidToggle({ paid, onToggle, pending }: PaidToggleProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const isPaid = paid === 1

  function commit() {
    onToggle()
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex min-w-[4.5rem] justify-center rounded-full px-3 py-1 text-xs font-medium transition ${
          isPaid
            ? 'bg-green-100 text-green-800 hover:bg-green-200'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        } disabled:opacity-50`}
      >
        {isPaid ? 'Paid' : 'Unpaid'}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-1 min-w-[9rem] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={commit}
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
          >
            Mark {isPaid ? 'unpaid' : 'paid'}
          </button>
        </div>
      )}
    </div>
  )
}
