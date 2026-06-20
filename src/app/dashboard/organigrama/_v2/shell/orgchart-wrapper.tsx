/**
 * Wrapper client-side que monta el Shell del organigrama y sus providers.
 *
 * El dashboard layout NO monta un `QueryClientProvider` global, así que lo
 * agregamos aquí localmente — solo se inicializa cuando el organigrama se
 * carga, no afecta al resto del proyecto.
 */
'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

import { QueryProvider } from '@/providers/query-provider'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { OrganigramaShellV2 } from './organigrama-shell-v2'

export function OrganigramaWrapper() {
  return (
    <QueryProvider>
      <ErrorBoundary
        fallback={({ reset }) => (
          <div className="flex h-[calc(100vh-160px)] flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100">
              <AlertTriangle className="h-7 w-7 text-rose-600" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold text-slate-900">
                No pudimos dibujar el organigrama
              </h3>
              <p className="max-w-md text-sm text-slate-600">
                Ocurrió un error al renderizar el lienzo. Inténtalo de nuevo; si el
                problema persiste, recarga la página.
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        )}
      >
        <OrganigramaShellV2 />
      </ErrorBoundary>
    </QueryProvider>
  )
}
