import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Icon } from './Icon'

type ToastVariant = 'success' | 'error'

export interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastItem {
  id: number
  variant: ToastVariant
  message: string
  action?: ToastAction
}

interface ToastContextValue {
  showSuccess: (message: string, action?: ToastAction) => void
  showError: (message: string, action?: ToastAction) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const AUTO_DISMISS_MS = 6000

/**
 * Bottom-right toast stack. Mount <ToastProvider> once near the root
 * (see App.tsx) and call useToast() from anywhere below it.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const show = useCallback(
    (variant: ToastVariant, message: string, action?: ToastAction) => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, variant, message, action }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
      )
    },
    [dismiss]
  )

  const value: ToastContextValue = {
    showSuccess: (message, action) => show('success', message, action),
    showError: (message, action) => show('error', message, action)
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2"
        style={{ width: 360 }}
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const isSuccess = toast.variant === 'success'
  return (
    <div
      role={isSuccess ? 'status' : 'alert'}
      className="flex items-start gap-2.5 rounded-lg bg-surface px-4 py-3"
      style={{
        boxShadow: 'var(--shadow-pop)',
        border: `0.5px solid ${isSuccess ? 'var(--color-success)' : 'var(--color-danger)'}`
      }}
    >
      <Icon
        name={isSuccess ? 'check' : 'alert'}
        size={16}
        className={`mt-0.5 shrink-0 ${isSuccess ? 'text-success' : 'text-danger'}`}
      />
      <div className="min-w-0 flex-1">
        <p className="m-0 break-words text-base leading-[1.4] text-ink">{toast.message}</p>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action!.onClick()
              onDismiss()
            }}
            className="mt-1.5 border-0 bg-transparent p-0 text-sm font-semibold text-primary hover:text-primary-dark"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="border-0 bg-transparent p-0 text-faint hover:text-muted"
      >
        <Icon name="x" size={14} />
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

/** Shared "Show in Finder" action for export-success toasts. */
export function showInFinderAction(path: string): ToastAction {
  return {
    label: 'Show in Finder',
    onClick: () => {
      window.api.shell.showItemInFolder(path).catch((err) => {
        console.error('[toast] show in finder failed:', err)
      })
    }
  }
}
