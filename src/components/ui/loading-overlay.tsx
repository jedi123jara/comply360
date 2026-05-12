'use client'

import { cn } from '@/lib/utils'

interface LoadingOverlayProps {
  className?: string
}

export function LoadingOverlay({ className }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-[color:var(--bg-canvas)]/88 backdrop-blur-sm',
        className
      )}
    >
      {/* Logo */}
      <div className="animate-[pulseLogo_2s_ease-in-out_infinite] select-none">
        <span className="text-4xl font-extrabold tracking-tight text-primary">
          LEGALIA
        </span>
        <span className="text-4xl font-extrabold tracking-tight text-gold">
          PRO
        </span>
      </div>

      {/* Spinner */}
      <div className="mt-8">
        <svg
          className="h-8 w-8 animate-spin text-primary/60"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>

      {/* Subtle label */}
      <p className="mt-4 text-sm text-gray-400 tracking-wide">Cargando...</p>
    </div>
  )
}
