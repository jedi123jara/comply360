/**
 * Banner suave en v1 que invita al usuario a probar v2.
 *
 * Renderiza arriba del v1 cuando el usuario está viendo la versión vieja.
 * Click en "Probar nueva versión" agrega `?v=2` a la URL y la página
 * decide servir v2 (modo opt-in, sin tocar env vars del backend).
 */
'use client'

import { useState } from 'react'
import { Sparkles, X, ArrowRight } from 'lucide-react'

const STORAGE_KEY = 'orgchart-v1-banner-dismissed'

export function V1DeprecationBanner() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      /* sin localStorage, dismiss solo en memoria */
    }
  }

  const handleTry = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('v', '2')
    window.location.href = url.toString()
  }

  return (
    <div className="border-b border-emerald-200 bg-gradient-to-r from-emerald-50 via-emerald-50 to-white px-6 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-emerald-900">
            Tenemos una nueva versión del Organigrama con IA
          </span>
          <span className="ml-1.5 hidden text-xs text-emerald-700 md:inline">
            · Compliance Heatmap, Copiloto IA, Time Machine y más
          </span>
        </div>
        <button
          type="button"
          onClick={handleTry}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
        >
          Probar nueva versión
          <ArrowRight className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Ocultar"
          className="flex-shrink-0 rounded p-1 text-emerald-700/60 transition hover:bg-emerald-100 hover:text-emerald-900"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
