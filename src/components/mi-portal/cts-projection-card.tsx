'use client'

import { useCallback, useEffect, useState } from 'react'
import { PiggyBank, Calendar, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { MoneyDisplay } from './money-display'
import { formatLongDate } from '@/lib/format/peruvian'

interface CTSData {
  ok: boolean
  reason?: string
  detail?: string
  nextCut?: string
  ctsTotal?: number
  remuneracionComputable?: number
  mesesComputables?: number
  diasComputables?: number
  formula?: string
  baseLegal?: string
}

/**
 * Card con la proyección de CTS del trabajador al próximo corte legal.
 * El cálculo viene del legal-engine — no es estimación.
 */
export function CTSProjectionCard() {
  const [data, setData] = useState<CTSData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/mi-portal/cts-projection', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      setData(body)
    } catch {
      setData({ ok: false, reason: 'fetch_error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 animate-pulse">
        <div className="h-3 w-24 bg-emerald-200 rounded mb-3" />
        <div className="h-8 w-40 bg-emerald-200 rounded" />
      </div>
    )
  }

  if (!data) return null

  if (!data.ok) {
    // No mostrar card si no hay CTS disponible (régimen distinto, terminado)
    return null
  }

  return (
    <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100 rounded-full opacity-40 -mr-8 -mt-8" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <PiggyBank className="w-5 h-5 text-emerald-700" />
          <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">
            Tu CTS proyectada
          </span>
        </div>

        <div className="mt-2">
          <MoneyDisplay value={data.ctsTotal ?? 0} size="xl" tone="good" emphasis />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>Próximo depósito: <strong>{formatLongDate(data.nextCut ?? null)}</strong></span>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 min-h-[44px] -my-2"
        >
          <Info className="w-3.5 h-3.5" />
          {expanded ? 'Ocultar detalle' : 'Cómo se calcula'}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {expanded && (
          <div className="mt-2 space-y-2 border-t border-emerald-200 pt-3">
            <div className="flex justify-between text-xs text-slate-700">
              <span>Remuneración computable</span>
              <MoneyDisplay value={data.remuneracionComputable ?? 0} size="xs" />
            </div>
            <div className="flex justify-between text-xs text-slate-700">
              <span>Meses computables</span>
              <span className="tabular-nums font-medium">{data.mesesComputables}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-700">
              <span>Días adicionales</span>
              <span className="tabular-nums font-medium">{data.diasComputables}</span>
            </div>
            {data.formula && (
              <p className="text-[11px] text-slate-500 bg-white rounded p-2 leading-relaxed mt-2">
                {data.formula}
              </p>
            )}
            {data.baseLegal && (
              <p className="text-[10px] text-emerald-700 italic">
                Base legal: {data.baseLegal}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
