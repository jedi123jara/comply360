/**
 * Heatmap Legend — leyenda compacta de los 4 tonos del Compliance Heatmap.
 *
 * Se ancla en la esquina superior izquierda y muestra cuántas unidades hay
 * en cada banda. Cumple doble función: educa al usuario sobre el sistema
 * de colores y le da un resumen agregado de su organización.
 *
 * Si recibe `onOpenAlerts`, el widget se vuelve un botón que abre el drawer
 * unificado de hallazgos — el único punto de entrada al detalle por hallazgo,
 * ahora que las tarjetas flotantes ya no saturan el canvas.
 */
'use client'

import { ChevronRight } from 'lucide-react'

import {
  TONE_COLOR_HEX,
  TONE_LABEL,
  type CoverageReport,
  type UnitCoverage,
} from '@/lib/orgchart/coverage-aggregator'

const TONES: UnitCoverage['tone'][] = ['success', 'warning', 'danger', 'critical']

export interface HeatmapLegendProps {
  coverage: CoverageReport | null
  /** Si está presente, el widget se vuelve clickeable y dispara este callback. */
  onOpenAlerts?: () => void
}

export function HeatmapLegend({ coverage, onOpenAlerts }: HeatmapLegendProps) {
  if (!coverage) return null

  const content = (
    <>
      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
        <span>Salud del organigrama</span>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
          style={{
            backgroundColor: `${TONE_COLOR_HEX[severityFromGlobal(coverage.globalScore)]}1a`,
            color: TONE_COLOR_HEX[severityFromGlobal(coverage.globalScore)],
          }}
        >
          {coverage.globalScore}
        </span>
        {onOpenAlerts && (
          <ChevronRight className="ml-auto h-3 w-3 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {TONES.map((tone) => (
          <div key={tone} className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: TONE_COLOR_HEX[tone] }}
            />
            <span>{TONE_LABEL[tone]}</span>
            <span className="ml-auto font-semibold tabular-nums text-slate-900">
              {coverage.histogram[tone]}
            </span>
          </div>
        ))}
      </div>
      {onOpenAlerts && (
        <div className="mt-2 border-t border-slate-100 pt-1.5 text-[10px] text-slate-500">
          Ver hallazgos
        </div>
      )}
    </>
  )

  const baseClass =
    'absolute left-4 top-4 z-10 w-48 rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 text-left shadow-sm backdrop-blur'

  if (onOpenAlerts) {
    return (
      <button
        type="button"
        onClick={onOpenAlerts}
        className={`group ${baseClass} transition hover:border-emerald-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400`}
        aria-label="Abrir lista de hallazgos del organigrama"
      >
        {content}
      </button>
    )
  }

  return <div className={baseClass}>{content}</div>
}

function severityFromGlobal(score: number): UnitCoverage['tone'] {
  if (score >= 85) return 'success'
  if (score >= 65) return 'warning'
  if (score >= 40) return 'danger'
  return 'critical'
}
