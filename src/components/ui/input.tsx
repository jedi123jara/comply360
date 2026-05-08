'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, icon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-gray-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-xl border border-white/10 bg-surface/50 backdrop-blur-sm px-4 py-2.5 text-sm text-text-primary',
              'transition-[border-color,box-shadow,background-color] duration-[var(--motion-micro)] ease-[var(--ease-standard)]',
              'focus:ring-2 focus:ring-gold/20 focus:border-gold/40 outline-none',
              'placeholder:text-text-tertiary',
              icon && 'pl-10',
              error && 'border-red-300 focus:ring-red-200 focus:border-red-400 c360-shake',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {helperText && !error && <p className="text-xs text-gray-400">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
