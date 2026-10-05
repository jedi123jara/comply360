'use client'

import { useEffect, useState } from 'react'
import { Clock, TrendingUp } from 'lucide-react'
import { formatSoles } from '@/lib/format/peruvian'

interface HistoryEntry {
  id: string
  type: string
  totalAmount: number | null
  createdAt: string
}

const TYPE_LABELS: Record<string, string> = {
  LIQUIDACION: 'Liquidación',
  CTS: 'CTS',
  GRATIFICACION: 'Gratificación',
  INDEMNIZACION: 'Indemnización',
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
    <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm p-5">
      <h3 className="text-sm font-bold text-[color:var(--text-primary)] mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        Cálculos recientes
      </h3>
      <div className="space-y-2">
        {history.map(entry => (
          <div
            key={entry.id}
            className="flex items-center justify-between py-2 px-3 bg-[color:var(--bg-inset)] rounded-xl"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-[color:var(--text-tertiary)] flex-shrink-0" />
              <span className="text-xs font-medium text-[color:var(--text-secondary)]">
                {TYPE_LABELS[entry.type] ?? entry.type}
              </span>
            </div>
            <div className="text-right">
              {entry.totalAmount != null && (
                <span className="text-xs font-bold text-[color:var(--text-primary)]">
                  {formatSoles(entry.totalAmount)}
                </span>
              )}
              <p className="text-[10px] text-[color:var(--text-tertiary)]">
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
