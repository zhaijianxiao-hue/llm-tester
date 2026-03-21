import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  children: ReactNode
  loading?: boolean
  glow?: boolean
}

export function Button({
  variant = 'primary',
  children,
  loading,
  glow,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative'
  
  const variants = {
    primary: `
      bg-gradient-to-r from-neon-cyan to-neon-blue 
      text-cyber-dark font-semibold
      hover:shadow-neon-cyan hover:-translate-y-0.5
      active:translate-y-0
    `,
    secondary: `
      cyber-button
      text-neon-cyan
      hover:shadow-neon-cyan/30
    `,
    danger: `
      cyber-button-danger
      text-red-400
      hover:shadow-red-500/30
    `,
    ghost: `
      bg-transparent
      text-gray-400
      hover:text-neon-cyan hover:bg-neon-cyan/10
      border border-transparent hover:border-neon-cyan/30
    `,
  }

  const glowEffect = glow ? 'animate-glow' : ''

  return (
    <button
      type="button"
      className={cn(baseStyles, variants[variant], glowEffect, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}