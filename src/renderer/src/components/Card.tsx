import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface CardProps {
  children: ReactNode
  /** Internal padding in px. Use 0 for sectioned cards (header strip + body). */
  padding?: number
  className?: string
  style?: CSSProperties
  /** When set, renders the card as a keyboard-accessible link instead of a plain div. */
  to?: string
}

export function Card({ children, padding = 20, className = '', style, to }: CardProps) {
  const sharedStyle: CSSProperties = {
    border: '0.5px solid var(--color-hairline)',
    boxShadow: '0 1px 2px rgba(40,30,20,0.04)',
    padding,
    ...style
  }

  if (to) {
    return (
      <Link
        to={to}
        className={`block bg-surface rounded-lg transition-colors hover:bg-canvas-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
        style={{ ...sharedStyle, outlineColor: 'var(--color-primary)' }}
      >
        {children}
      </Link>
    )
  }

  return (
    <div className={`bg-surface rounded-lg ${className}`} style={sharedStyle}>
      {children}
    </div>
  )
}
