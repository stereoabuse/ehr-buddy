import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const styles: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  secondary: 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700'
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`h-12 px-5 rounded-md font-medium text-base transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${styles[variant]} ${className}`}
    />
  )
}
