import type { InputHTMLAttributes } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Field({ label, error, className = '', disabled, ...props }: FieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className="text-base font-medium text-body">{label}</span>
      <input
        {...props}
        disabled={disabled}
        className="mt-1 block h-9 w-full rounded-md px-3 text-base text-ink outline-none placeholder:text-faint disabled:cursor-not-allowed disabled:opacity-70"
        style={{
          border: '0.5px solid var(--color-hairline)',
          background: disabled ? 'var(--color-canvas-2)' : 'var(--color-surface)'
        }}
      />
      {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
    </label>
  )
}
