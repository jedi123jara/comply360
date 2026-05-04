/**
 * Wrapper client-side que permite alternar entre el "Modo Inspector SUNAFIL"
 * (tour guiado) y la vista clásica del árbol completo.
 *
 * Cuando el modo es "guided", monta `<GuidedTourClient />`. Cuando es
 * "classic", muestra el contenido pasado como `children` (el árbol completo).
 *
 * El toggle persiste en URL (`?view=classic` o `?view=guided`) para que el
 * usuario pueda compartir un link directo al modo que prefiera.
 */
'use client'

import type { ReactNode } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Sparkles, ListTree } from 'lucide-react'

import type { GuidedTour } from '@/lib/orgchart/public-link/guided-tour'
import type { PublicOrgChartPayload } from '@/lib/orgchart/types'
import type { COMPLIANCE_ROLES } from '@/lib/orgchart/compliance-rules'
import { GuidedTourClient } from './guided-tour'

interface FetchResponse extends PublicOrgChartPayload {
  roleCatalog: typeof COMPLIANCE_ROLES
  guidedTour: GuidedTour | null
}

interface AuditorViewSwitcherProps {
  view: 'guided' | 'classic'
  token: string
  data: FetchResponse
  /** Estructuras pre-computadas del servidor (no usadas en este wrapper, pero
   *  reservadas para una versión futura que comparta árbol entre modos). */
  tree?: unknown
  children: ReactNode
}

export function AuditorViewSwitcher({
  view,
  token,
  data,
  children,
}: AuditorViewSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const switchTo = (next: 'guided' | 'classic') => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (next === 'guided' && data.guidedTour) {
      params.delete('view')
    } else {
      params.set('view', next)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="relative">
      {/* Toggle flotante arriba a la derecha */}
      {data.guidedTour && (
        <div className="fixed right-4 top-4 z-50 inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white/95 p-1 text-xs shadow-md backdrop-blur">
          <button
            type="button"
            onClick={() => switchTo('guided')}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium transition ${
              view === 'guided'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
            title="Tour guiado paso a paso para inspectores"
          >
            <Sparkles className="h-3 w-3" />
            <span className="hidden md:inline">Modo Inspector</span>
          </button>
          <button
            type="button"
            onClick={() => switchTo('classic')}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium transition ${
              view === 'classic'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
            title="Vista clásica con árbol completo"
          >
            <ListTree className="h-3 w-3" />
            <span className="hidden md:inline">Vista clásica</span>
          </button>
        </div>
      )}

      {view === 'guided' && data.guidedTour ? (
        <GuidedTourClient
          tour={data.guidedTour}
          org={data.org}
          hashShort={data.hashShort}
          takenAt={data.takenAt}
          token={token}
        />
      ) : (
        children
      )}
    </div>
  )
}
