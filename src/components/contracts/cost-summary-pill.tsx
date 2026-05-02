'use client'

/* -------------------------------------------------------------------------- */
/*  CostSummaryPill — widget en vivo del costo total empleador                */
/* -------------------------------------------------------------------------- */

import { useState } from 'react'
import { Calculator, ChevronDown, ChevronUp, Info } from 'lucide-react'
import type { CostoEmpleadorResult } from '@/lib/legal-engine/calculators/costo-empleador'

interface CostSummaryPillProps {
  result: CostoEmpleadorResult | null
  /** className extra para el contenedor (ej. para sticky positioning) */
  className?: string
}

/**
 * Formatea numero como moneda peruana (S/ X.XX).
 */
function formatPEN(n: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(n)
}

export function CostSummaryPill({ result, className = '' }: CostSummaryPillProps) {
  const [expanded, setExpanded] = useState(false)

  if (!result) {
    return (
      <div
        className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${className}`}
        aria-label="Costo total empleador"
      >
        <div className="flex items-center gap-2 text-slate-500">
          <Calculator className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs">Ingresa sueldo y régimen para calcular el costo total</span>
        </div>
      </div>
    )
  }

  const breakdown = [
    { label: 'EsSalud (9%)', value: result.essalud },
    { label: 'CTS (provisión)', value: result.provisionCTS },
    { label: 'Gratificación (provisión)', value: result.provisionGratificacion },
    { label: 'Vacaciones (provisión)', value: result.provisionVacaciones },
    { label: 'Bonif. extraord. (9% sobre grati)', value: result.provisionBonifExtraordinaria },
    ...(result.sctr > 0 ? [{ label: 'SCTR (~1.53%)', value: result.sctr }] : []),
    ...(result.seguroVida > 0 ? [{ label: 'Seguro Vida Ley', value: result.seguroVida }] : []),
  ].filter(b => b.value > 0)

  return (
    <div
      className={`rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 ${className}`}
      aria-label="Costo total empleador estimado"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Calculator className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
              Costo mensual empleador
            </p>
            <p className="text-xl font-bold text-emerald-900 truncate">
              {formatPEN(result.costoMensualEmpleador)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Ocultar desglose' : 'Ver desglose'}
          className="flex-shrink-0 rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-slate-500">Anual</p>
          <p className="font-semibold text-slate-900">{formatPEN(result.costoAnualEmpleador)}</p>
        </div>
        <div>
          <p className="text-slate-500">Sobre bruto</p>
          <p className="font-semibold text-slate-900">+{result.porcentajeSobreSueldo.toFixed(1)}%</p>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-emerald-200 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 mb-1">
            Desglose
          </p>
          {breakdown.map(b => (
            <div key={b.label} className="flex justify-between text-xs">
              <span className="text-slate-700">{b.label}</span>
              <span className="font-medium text-slate-900">{formatPEN(b.value)}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-emerald-100 mt-2">
            <p className="text-[10px] text-slate-600 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>
                Estimado básico. Para cálculo exacto con todos los descuentos (renta 5ta,
                AFP/ONP detallados), usa la{' '}
                <a
                  href="/dashboard/calculadoras/costo-empleador"
                  className="underline hover:text-emerald-700"
                >
                  calculadora completa
                </a>
                .
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
