import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface ModalProps {
  onClose: () => void
  labelledBy?: string
  width?: number
  closeDisabled?: boolean
  children: React.ReactNode
}

/**
 * Overlay + dialog shell with Escape-to-close, focus trap, and focus restore.
 * Callers render their own header/body/footer inside.
 */
export function Modal({ onClose, labelledBy, width = 460, closeDisabled, children }: ModalProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null
    const first = boxRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? boxRef.current)?.focus()
    return () => restoreRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      if (!closeDisabled) onClose()
      return
    }
    if (e.key !== 'Tab' || !boxRef.current) return
    const items = Array.from(boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(31,58,54,0.32)' }}
      onClick={closeDisabled ? undefined : onClose}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="overflow-hidden rounded-xl bg-surface outline-none"
        style={{ width, boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }}
      >
        {children}
      </div>
    </div>
  )
}
