import { useEffect, useRef, useState } from 'react'

interface PaidToggleProps {
  paid: number
  onToggle: () => void
  pending?: boolean
}

export function PaidToggle({ paid, onToggle, pending }: PaidToggleProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onDocKey(e: KeyboardEvent) {
      // Fallback for the rare case focus has moved outside the component
      // (e.g. tabbed away) while the menu is still open.
      if (e.key === 'Escape' && !rootRef.current?.contains(document.activeElement)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onDocKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onDocKey)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    // Move focus onto the first menu item when the menu opens, as with any
    // standard menu button pattern.
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')
    items?.[0]?.focus()
  }, [open])

  const isPaid = paid === 1

  function closeMenu() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function commit(e: React.MouseEvent) {
    e.stopPropagation()
    onToggle()
    closeMenu()
  }

  function onRootKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!open) return

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      closeMenu()
      return
    }

    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    if (items.length === 0) return
    const currentIndex = items.indexOf(document.activeElement as HTMLElement)

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        items[(currentIndex + 1 + items.length) % items.length]?.focus()
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        items[(currentIndex - 1 + items.length) % items.length]?.focus()
        break
      }
      case 'Home': {
        e.preventDefault()
        items[0]?.focus()
        break
      }
      case 'End': {
        e.preventDefault()
        items[items.length - 1]?.focus()
        break
      }
      default:
        break
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block" onKeyDown={onRootKeyDown}>
      <button
        ref={triggerRef}
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
          ref={menuRef}
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
