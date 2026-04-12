'use client'

import { useEffect, useState } from 'react'
import { Clock, TrendingUp } from 'lucide-react'

interface HistoryEntry {
  id: string
  type: string
  totalAmount: number | null
  createdAt: string
}

const TYPE_LABELS: Record<string, string> = {
  LIQUIDACION: 'Liquidacion',
  CTS: 'CTS',
  GRATIFICACION: 'Gratificacion',
  INDEMNIZACION: 'Indemnizacion',
  HORAS_EXTRAS: 'Horas Extras',
  VACACIONES: 'Vacaciones',
  MULTA_SUNAFIL: 'Multa SUNAFIL',
  INTERESES_LEGALES: 'Intereses Legales',
  APORTES_PREVISIONALES: 'Aportes Previsionales',
  UTILIDADES: 'Utilidades',
}

interface CalculationHistoryProps {
  type: string
}

export function CalculationHistory({ type }: CalculationHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/calculations?type=${type}&limit=5`)
      .then(r => r.json())
      .then(json => {
        if (json.data) setHistory(json.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [type])

  if (loading) return null
  if (history.length === 0) return null

  return (
    <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-5">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        Calculos recientes
      </h3>
      <div className="space-y-2">
        {history.map(entry => (
          <div
            key={entry.id}
            className="flex items-center justify-between py-2 px-3 bg-white/[0.02] bg-white/[0.04] rounded-xl"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-300">
                {TYPE_LABELS[entry.type] ?? entry.type}
              </span>
            </div>
            <div className="text-right">
              {entry.totalAmount != null && (
                <span className="text-xs font-bold text-white">
                  S/ {entry.totalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              )}
              <p className="text-[10px] text-gray-400">
                {new Date(entry.createdAt).toLocaleDateString('es-PE', {
                  day: '2-digit',
                  month: 'short',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
