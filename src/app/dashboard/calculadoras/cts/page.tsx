'use client'

import { use, useState } from 'react'
import dynamic from 'next/dynamic'
import { CTSCalculadora } from '@/components/calculadoras/cts-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'
import { EncabezadoCalculadora } from '@/components/calculadoras/shared/encabezado'
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

/**
 * Acepta `?dni=` (enlace desde la ficha del trabajador) para precargar sus
 * datos, incluido su régimen laboral.
 */
export default function CTSPage({
  searchParams,
}: {
  searchParams: Promise<{ dni?: string | string[] }>
}) {
  const { dni } = use(searchParams)
  const [mode, setMode] = useState<Mode>('individual')

  return (
    <div className="space-y-6">
      <EncabezadoCalculadora calc="cts">
        {/* Individual / masivo */}
        <div
          role="tablist"
          aria-label="Modo de cálculo"
          className="flex gap-1 bg-[color:var(--neutral-100)] rounded-xl p-1 border border-[color:var(--border-default)] self-start"
        >
          {([
            { value: 'individual', label: 'Un trabajador', icon: User },
            { value: 'masivo', label: 'Todos', icon: Users },
          ] as const).map(opt => {
            const Icon = opt.icon
            const active = mode === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(opt.value)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                  active
                    ? 'bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] shadow-sm'
                    : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]',
                )}
              >
                <Icon className="w-4 h-4" />
                {opt.label}
              </button>
            )
          })}
        </div>
      </EncabezadoCalculadora>

      {mode === 'individual' ? (
        <>
          <CTSCalculadora prefillDni={typeof dni === 'string' ? dni : undefined} />
          <CalculationHistory type="CTS" />
        </>
      ) : (
        <BulkCTSCalculadora />
      )}
    </div>
  )
}
