'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react'
import { BRAND } from '@/lib/brand'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log del error — lo levantará Sentry cuando esté configurado
    console.error('[error boundary]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fafafa] to-white flex flex-col">
      <header className="px-4 sm:px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-900 font-semibold">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
            C
          </span>
          <span>
            {BRAND.name.slice(0, 6)}
            <span className="text-emerald-600">{BRAND.name.slice(6)}</span>
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-[var(--elevation-4)] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 ring-1 ring-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Algo salió mal
                </h1>
                <p className="text-sm text-slate-500">
                  No pudimos cargar esta página
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Un error inesperado interrumpió la carga. Generalmente es un hipo temporal — probá
              refrescar. Si el problema persiste, contanos qué estabas haciendo y lo revisamos.
            </p>

            {error.digest && (
              <div className="rounded-lg bg-slate-50 ring-1 ring-slate-200 p-3 mb-4 font-mono text-xs text-slate-600">
                <span className="text-slate-400">Código de error:</span>{' '}
                <span className="font-semibold text-slate-700">{error.digest}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                <RefreshCw className="w-4 h-4" />
                Intentar de nuevo
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white ring-1 ring-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-4 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                <Home className="w-4 h-4" />
                Volver al inicio
              </Link>
              <a
                href={`mailto:${BRAND.supportEmail}?subject=Error%20en%20Comply360${
                  error.digest ? `%20(${error.digest})` : ''
                }&body=Estaba%20en%20${encodeURIComponent(
                  typeof window !== 'undefined' ? window.location.pathname : '',
                )}%20cuando%20ocurrió.`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white ring-1 ring-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-4 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                <Mail className="w-4 h-4" />
                Reportar
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-4 sm:px-6 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {BRAND.name} · comply360.pe
      </footer>
    </div>
  )
}
