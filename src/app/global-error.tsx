'use client'

import { useEffect } from 'react'
import { captureError } from '@/lib/sentry'

/**
 * Next.js global error boundary — catches unhandled errors across the entire
 * application and reports them to Sentry. This file wraps <html> so it must
 * provide its own document structure.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report to Sentry with digest for server-side correlation
    captureError(error, {
      digest: error.digest,
      boundary: 'global-error',
    })
  }, [error])

  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 transition-colors">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm border-white/[0.08] bg-[#141824]">
            {/* Error icon */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-7 w-7 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>

            <h1 className="mt-4 text-xl font-bold text-gray-900">
              Ha ocurrido un error inesperado
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Nuestro equipo ha sido notificado y estamos trabajando para resolverlo.
              Por favor, intenta de nuevo.
            </p>

            {error.digest && (
              <p className="mt-2 text-xs text-gray-400">
                Referencia: {error.digest}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                  />
                </svg>
                Intentar de nuevo
              </button>

              <a
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
              >
                Ir al inicio
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
