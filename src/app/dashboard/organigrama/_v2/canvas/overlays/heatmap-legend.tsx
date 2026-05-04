/**
 * Heatmap Legend — leyenda compacta de los 4 tonos del Compliance Heatmap.
 *
 * Se ancla en la esquina superior izquierda y muestra cuántas unidades hay
 * en cada banda. Cumple doble función: educa al usuario sobre el sistema
 * de colores y le da un resumen agregado de su organización.
 */
'use client'

import {
  TONE_COLOR_HEX,
  TONE_LABEL,
  type CoverageReport,
  type UnitCoverage,
} from '@/lib/orgchart/coverage-aggregator'

const TONES: UnitCoverage['tone'][] = ['success', 'warning', 'danger', 'critical']

export interface HeatmapLegendProps {
  coverage: CoverageReport | null
}

export function HeatmapLegend({ coverage }: HeatmapLegendProps) {
  if (!coverage) return null

  return (
    <div className="absolute left-4 top-4 z-10 rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur">
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
    </div>
  )
}

function severityFromGlobal(score: number): UnitCoverage['tone'] {
  if (score >= 85) return 'success'
  if (score >= 65) return 'warning'
  if (score >= 40) return 'danger'
  return 'critical'
}
