import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface BtnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant
  size?: Size
  icon?: IconName
  children?: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-primary text-white border-primary hover:bg-primary-dark',
  secondary: 'bg-surface text-ink border-hairline hover:bg-canvas-2',
  ghost: 'bg-transparent text-body border-transparent hover:bg-canvas-2',
  danger: 'bg-surface text-danger border-danger-soft hover:bg-danger-soft'
}

// Subtle inset highlight on primary; matches the prototype's button feel
const VARIANT_SHADOW: Record<Variant, string> = {
  primary: 'inset 0 1px 0 rgba(255,255,255,0.18)',
  secondary: 'none',
  ghost: 'none',
  danger: 'none'
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-sm',
  md: 'h-[34px] px-3.5 text-base',
  lg: 'h-10 px-[18px] text-md'
}

const ICON_SIZE: Record<Size, number> = {
  sm: 13,
  md: 15,
  lg: 16
}

export function Btn({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  style,
  ...rest
}: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={[
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className
      ].join(' ')}
      style={{
        border: '0.5px solid',
        boxShadow: VARIANT_SHADOW[variant],
        ...style
      }}
    >
      {icon && <Icon name={icon} size={ICON_SIZE[size]} />}
      {children}
    </button>
  )
}
