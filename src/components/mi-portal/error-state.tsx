/**
 * ErrorState — panel de error con retry. Patrón consistente para fetch failures.
 */

'use client'

import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void | Promise<void>
}

export function ErrorState({
  title = 'No se pudo cargar',
  message,
  onRetry,
}: ErrorStateProps) {
  const [retrying, setRetrying] = useState(false)

  async function handleRetry() {
    if (!onRetry) return
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
        <AlertTriangle className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-red-900 text-sm">{title}</p>
        {message && <p className="mt-1 text-sm text-red-800/80">{message}</p>}
        {onRetry && (
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-900 min-h-[44px] px-3 -mx-3 rounded disabled:opacity-50"
          >
            {retrying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Reintentar
          </button>
        )}
      </div>
    </div>
  )
}
