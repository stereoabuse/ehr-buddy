import { useEffect, useMemo, useRef, useState } from 'react'
import { ICD10_CODES, type Icd10Code } from '@shared/icd10-codes'

interface Icd10PickerProps {
  label: string
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  max?: number
  error?: string
}

const MAX_RESULTS = 50

export function Icd10Picker({
  label,
  value,
  onChange,
  disabled = false,
  max = 4,
  error
}: Icd10PickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const atMax = value.length >= max

  const results = useMemo(() => {
    if (atMax) return []
    const q = query.trim().toUpperCase()
    if (!q) {
      // No query: surface the chapter heads so the user sees the picker is alive.
      return ICD10_CODES.filter((c) => !value.includes(c.code)).slice(0, MAX_RESULTS)
    }
    const selected = new Set(value)
    const codeStarts: Icd10Code[] = []
    const codeContains: Icd10Code[] = []
    const descMatches: Icd10Code[] = []
    const qLower = query.trim().toLowerCase()
    for (const c of ICD10_CODES) {
      if (selected.has(c.code)) continue
      const code = c.code.toUpperCase()
      if (code.startsWith(q)) codeStarts.push(c)
      else if (code.includes(q)) codeContains.push(c)
      else if (c.description.toLowerCase().includes(qLower)) descMatches.push(c)
      if (codeStarts.length >= MAX_RESULTS) break
    }
    return [...codeStarts, ...codeContains, ...descMatches].slice(0, MAX_RESULTS)
  }, [query, value, atMax])

  useEffect(() => {
    setHighlight(0)
  }, [query, open])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function add(code: string) {
    if (value.includes(code) || value.length >= max) return
    onChange([...value, code])
    setQuery('')
    setOpen(true)
    inputRef.current?.focus()
  }

  function remove(code: string) {
    onChange(value.filter((c) => c !== code))
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && results[highlight]) {
        e.preventDefault()
        add(results[highlight].code)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Backspace' && query === '' && value.length > 0) {
      e.preventDefault()
      remove(value[value.length - 1])
    } else if (e.key === ',' || e.key === ' ') {
      // Quick-add when the user types an exact code and a separator.
      const typed = query.trim().toUpperCase()
      const exact = ICD10_CODES.find((c) => c.code.toUpperCase() === typed)
      if (exact) {
        e.preventDefault()
        add(exact.code)
      }
    }
  }

  const descriptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of ICD10_CODES) map.set(c.code, c.description)
    return map
  }, [])

  return (
    <div className="block">
      <span className="mb-1 block text-[11.5px] font-semibold text-muted">{label}</span>
      <div
        ref={wrapRef}
        className={`relative rounded-md ${disabled ? 'bg-canvas-2' : 'bg-surface'}`}
        style={{ border: '0.5px solid var(--color-hairline)' }}
      >
        <div
          className="flex min-h-8 flex-wrap items-center gap-1 px-2 py-1"
          onClick={() => !disabled && inputRef.current?.focus()}
        >
          {value.map((code) => (
            <Chip
              key={code}
              code={code}
              description={descriptions.get(code)}
              disabled={disabled}
              onRemove={() => remove(code)}
            />
          ))}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            disabled={disabled || atMax}
            placeholder={
              atMax
                ? `Max ${max} codes`
                : value.length === 0
                  ? 'Search code or description (e.g. F32 or "depression")'
                  : ''
            }
            className="min-w-[120px] flex-1 border-0 bg-transparent text-base text-ink outline-none placeholder:text-faint disabled:cursor-not-allowed"
          />
        </div>
        {open && !disabled && results.length > 0 && (
          <ul
            className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-auto rounded-md bg-surface py-1 shadow-lg"
            style={{ border: '0.5px solid var(--color-hairline)' }}
          >
            {results.map((c, i) => (
              <li
                key={c.code}
                onMouseDown={(e) => {
                  e.preventDefault()
                  add(c.code)
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`cursor-pointer px-3 py-1.5 text-base ${i === highlight ? 'bg-canvas-2' : ''}`}
              >
                <span className="font-medium text-ink">{c.code}</span>
                <span className="ml-2 text-muted">{c.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
    </div>
  )
}

function Chip({
  code,
  description,
  disabled,
  onRemove
}: {
  code: string
  description?: string
  disabled?: boolean
  onRemove: () => void
}) {
  return (
    <span
      title={description}
      className="inline-flex h-6 items-center gap-1 rounded px-1.5 text-[12px] text-body"
      style={{ background: 'var(--color-canvas-2)', border: '0.5px solid var(--color-hairline)' }}
    >
      <span className="font-medium">{code}</span>
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${code}`}
          className="text-muted hover:text-body"
        >
          ×
        </button>
      )}
    </span>
  )
}

export function parseIcd10String(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function serializeIcd10List(value: string[]): string | null {
  if (value.length === 0) return null
  return value.join(', ')
}
