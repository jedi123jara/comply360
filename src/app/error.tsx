'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">Algo salio mal</h1>
        <p className="mt-2 text-sm text-gray-500">
          Ocurrio un error inesperado. Nuestro equipo ha sido notificado.
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-gray-400">Codigo: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Intentar de nuevo
        </button>
      </div>
    </div>
  )
}
