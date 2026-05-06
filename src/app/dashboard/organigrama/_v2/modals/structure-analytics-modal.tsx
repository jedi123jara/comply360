/**
 * Modal — Analítica estructural del organigrama.
 *
 * Score global, KPIs, top riesgos, span de control por jefe, y score por área.
 * Construye el summary localmente con `buildStructureAnalytics(tree)` — no
 * requiere fetch adicional, reutiliza el tree ya cargado.
 */
'use client'

import { useMemo } from 'react'
import { Activity, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { useTreeQuery } from '../data/queries/use-tree'
import {
  buildStructureAnalytics,
  type SpanSeverity,
  type StructureHealth,
  type SpanControlRecord,
  type UnitStructureScore,
} from '@/lib/orgchart/structure-analytics'

const HEALTH_TONE: Record<StructureHealth, { bg: string; text: string; label: string }> = {
  excellent: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Excelente' },
  stable: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Estable' },
  attention: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'En atención' },
  critical: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', label: 'Crítico' },
}

const SEVERITY_TONE: Record<SpanSeverity, string> = {
  healthy: 'bg-emerald-100 text-emerald-700',
  watch: 'bg-yellow-100 text-yellow-700',
  high: 'bg-amber-100 text-amber-800',
  critical: 'bg-rose-100 text-rose-800',
}

const SEVERITY_LABEL: Record<SpanSeverity, string> = {
  healthy: 'Sano',
  watch: 'Vigilar',
  high: 'Alto',
  critical: 'Crítico',
}

export function StructureAnalyticsModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'structure-analytics'

  const treeQuery = useTreeQuery(null)
  const analytics = useMemo(() => {
    if (!treeQuery.data) return null
    return buildStructureAnalytics(treeQuery.data)
  }, [treeQuery.data])

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="Analítica estructural"
      subtitle="Score, span de control y salud por área"
      icon={<Activity className="h-4 w-4" />}
      width="xl"
      footer={
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      }
    >
      {!analytics ? (
        <p className="py-8 text-center text-sm text-slate-500">Calculando analítica…</p>
      ) : (
        <div className="space-y-5">
          {/* Score global */}
          <div className={`rounded-xl border p-4 ${HEALTH_TONE[analytics.health].bg}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Score del organigrama
                </div>
                <div className={`mt-0.5 text-3xl font-bold tabular-nums ${HEALTH_TONE[analytics.health].text}`}>
                  {analytics.score}
                  <span className="text-sm font-normal text-slate-500"> / 100</span>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${HEALTH_TONE[analytics.health].text}`}
                style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
              >
                {HEALTH_TONE[analytics.health].label}
              </span>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Kpi label="Cargos" value={analytics.totals.positions} />
            <Kpi
              label="Vacantes"
              value={analytics.totals.vacancies}
              sub={`${(analytics.totals.vacancyRate * 100).toFixed(0)}%`}
              tone={analytics.totals.vacancyRate > 0.2 ? 'amber' : 'slate'}
            />
            <Kpi
              label="MOF pendientes"
              value={analytics.totals.missingMof}
              sub={`${(analytics.totals.missingMofRate * 100).toFixed(0)}%`}
              tone={analytics.totals.missingMofRate > 0.3 ? 'amber' : 'slate'}
            />
            <Kpi
              label="Span alto"
              value={analytics.totals.overloadedManagers}
              sub={`${analytics.totals.criticalManagers} crítico${analytics.totals.criticalManagers === 1 ? '' : 's'}`}
              tone={analytics.totals.overloadedManagers > 0 ? 'amber' : 'slate'}
            />
            <Kpi label="Profundidad max" value={analytics.totals.maxDepth} />
            <Kpi label="Span promedio" value={analytics.totals.averageSpan} />
            <Kpi label="Cargos sensibles SST" value={analytics.totals.sstSensitive} />
            <Kpi label="Jefaturas" value={analytics.totals.managers} />
          </div>

          {/* Top riesgos */}
          {analytics.topRisks.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <AlertTriangle className="h-3.5 w-3.5" />
                Riesgos prioritarios
              </h3>
              <ul className="space-y-1.5">
                {analytics.topRisks.slice(0, 6).map((risk) => (
                  <li
                    key={risk.id}
                    className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs"
                  >
                    <span
                      className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${SEVERITY_TONE[risk.severity]}`}
                    >
                      {SEVERITY_LABEL[risk.severity]}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{risk.title}</p>
                      <p className="mt-0.5 text-slate-600">{risk.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Span de control */}
          {analytics.spanRecords.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <TrendingUp className="h-3.5 w-3.5" />
                Span de control · top 8 jefaturas
              </h3>
              <ul className="space-y-1">
                {analytics.spanRecords.slice(0, 8).map((record) => (
                  <SpanRow key={record.positionId} record={record} />
                ))}
              </ul>
            </section>
          )}

          {/* Score por área */}
          {analytics.unitScores.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <TrendingDown className="h-3.5 w-3.5" />
                Score por área (peores primero)
              </h3>
              <ul className="space-y-1">
                {analytics.unitScores.slice(0, 10).map((unit) => (
                  <UnitRow key={unit.unitId} unit={unit} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </ModalShell>
  )
}

function Kpi({
  label,
  value,
  sub,
  tone = 'slate',
}: {
  label: string
  value: number
  sub?: string
  tone?: 'slate' | 'amber'
}) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
  }
  return (
    <div className={`rounded-lg border px-3 py-2 ${tones[tone]}`}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  )
}

function SpanRow({ record }: { record: SpanControlRecord }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs">
      <span
        className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${SEVERITY_TONE[record.severity]}`}
      >
        {SEVERITY_LABEL[record.severity]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">{record.title}</p>
        <p className="truncate text-[10px] text-slate-500">
          {record.unitName} · {record.occupantNames.join(', ') || 'vacante'}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2 text-[10px] text-slate-500">
        <span>
          <strong className="font-bold tabular-nums text-slate-700">{record.directReports}</strong>{' '}
          directos
        </span>
        <span>
          <strong className="font-bold tabular-nums text-slate-700">{record.totalSubtree}</strong>{' '}
          en subárbol
        </span>
      </div>
    </li>
  )
}

function UnitRow({ unit }: { unit: UnitStructureScore }) {
  const tone = HEALTH_TONE[unit.health]
  return (
    <li className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${tone.bg}`}>
      <span className={`min-w-[42px] flex-shrink-0 text-center text-base font-bold tabular-nums ${tone.text}`}>
        {unit.score}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">{unit.unitName}</p>
        <p className="truncate text-[10px] text-slate-500">
          {unit.positions} cargos · {unit.vacancies} vacante{unit.vacancies === 1 ? '' : 's'} ·{' '}
          {unit.missingMof} MOF pendiente{unit.missingMof === 1 ? '' : 's'}
        </p>
      </div>
      {unit.flags.length > 0 && (
        <span className="flex-shrink-0 rounded bg-white/80 px-1.5 py-0.5 text-[9px] font-medium text-slate-700">
          {unit.flags[0]}
        </span>
      )}
    </li>
  )
}
