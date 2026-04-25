import type { ReactNode } from 'react'

export type PillTone = 'neutral' | 'primary' | 'success' | 'warn' | 'danger' | 'accent'

const TONE_CLASSES: Record<PillTone, string> = {
  neutral: 'bg-divider text-body',
  primary: 'bg-primary-soft text-primary-dark',
  success: 'bg-success-soft text-success',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  accent: 'bg-[#E5DEEC] text-[#5C4D75]'
}

interface PillProps {
  tone?: PillTone
  children: ReactNode
}

export function Pill({ tone = 'neutral', children }: PillProps) {
  return (
    <span
      className={`inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11px] font-semibold tracking-[0.1px] ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  )
}
