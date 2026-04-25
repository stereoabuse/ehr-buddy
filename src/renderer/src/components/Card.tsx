import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  /** Internal padding in px. Use 0 for sectioned cards (header strip + body). */
  padding?: number
  className?: string
  style?: CSSProperties
}

export function Card({ children, padding = 20, className = '', style }: CardProps) {
  return (
    <div
      className={`bg-surface rounded-lg ${className}`}
      style={{
        border: '0.5px solid var(--color-hairline)',
        boxShadow: '0 1px 2px rgba(40,30,20,0.04)',
        padding,
        ...style
      }}
    >
      {children}
    </div>
  )
}
