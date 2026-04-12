'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const variants = {
  primary: 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20',
  secondary: 'border border-white/10 border-white/10 text-gray-300 hover:bg-white/[0.02] hover:bg-white/[0.04]',
  ghost: 'text-gray-600 hover:bg-white/[0.04] hover:bg-white/[0.04]',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  gold: 'bg-gold hover:bg-gold-dark text-white',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
  icon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
