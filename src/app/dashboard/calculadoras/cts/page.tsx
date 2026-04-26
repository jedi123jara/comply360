'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { CTSCalculadora } from '@/components/calculadoras/cts-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'
import { User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

// BulkCTSCalculadora carga `xlsx` (~150KB gz). Solo se usa en modo "masivo",
// que es <5% del tráfico — lazy-load para reducir initial bundle de la
// página individual.
const BulkCTSCalculadora = dynamic(
  () => import('@/components/calculadoras/cts-bulk').then(m => ({ default: m.BulkCTSCalculadora })),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)]"
        style={{ height: 400, animation: 'pulse 1.5s ease-in-out infinite' }}
      />
    ),
  }
)

type Mode = 'individual' | 'masivo'

export default function CTSPage() {
  const [mode, setMode] = useState<Mode>('individual')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <span>Calculadoras</span>
            <span>/</span>
            <span className="text-primary font-medium">CTS</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Calculadora de CTS
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Compensación por Tiempo de Servicios semestral según el D.S. 001-97-TR.
            Incluye asignación familiar y 1/6 de gratificación.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-[color:var(--neutral-100)] bg-white rounded-xl p-1 border border-white/[0.08] self-start">
          <button
            onClick={() => setMode('individual')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
              mode === 'individual'
                ? 'bg-white bg-[color:var(--neutral-100)] text-white shadow-sm'
                : 'text-gray-400 hover:text-slate-200',
            )}
          >
            <User className="w-4 h-4" />
            Individual
          </button>
          <button
            onClick={() => setMode('masivo')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
              mode === 'masivo'
                ? 'bg-white bg-[color:var(--neutral-100)] text-white shadow-sm'
                : 'text-gray-400 hover:text-slate-200',
            )}
          >
            <Users className="w-4 h-4" />
            Masivo
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
              Todos
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      {mode === 'individual' ? (
        <>
          <CTSCalculadora />
          <CalculationHistory type="CTS" />
        </>
      ) : (
        <BulkCTSCalculadora />
      )}
    </div>
  )
}
