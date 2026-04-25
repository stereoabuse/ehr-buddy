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

  function commit(e: React.MouseEvent) {
    e.stopPropagation()
    onToggle()
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        className={[
          'inline-flex h-5 min-w-[4.5rem] items-center justify-center gap-1 whitespace-nowrap rounded-full px-2 text-[11px] font-semibold tracking-[0.1px] transition-colors',
          isPaid
            ? 'bg-success-soft text-success hover:brightness-95'
            : 'bg-danger-soft text-danger hover:brightness-95',
          'disabled:opacity-50'
        ].join(' ')}
      >
        {isPaid ? 'Paid' : 'Unpaid'}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-1 min-w-[9rem] overflow-hidden rounded-md bg-surface"
          style={{
            border: '0.5px solid var(--color-hairline)',
            boxShadow: 'var(--shadow-pop)'
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={commit}
            className="block w-full px-3 py-2 text-left text-base text-body hover:bg-canvas-2"
          >
            Mark {isPaid ? 'unpaid' : 'paid'}
          </button>
        </div>
      )}
    </div>
  )
}
