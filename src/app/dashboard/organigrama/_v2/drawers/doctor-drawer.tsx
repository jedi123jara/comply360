/**
 * Doctor de cumplimiento — drawer con los hallazgos del motor de diagnóstico
 * (reglas deterministas vs ley laboral peruana). Reemplaza el placeholder que
 * solo mostraba el score: ahora lista cada hallazgo con severidad, base legal,
 * sugerencia de arreglo y un botón "Ir al nodo" para saltar al área afectada.
 */
'use client'

import { m, AnimatePresence } from 'framer-motion'
import {
  Stethoscope,
  X,
  ArrowUpRight,
  Lightbulb,
  Scale,
  ShieldCheck,
  Loader2,
} from 'lucide-react'

import { useOrgStore } from '../state/org-store'
import type { DoctorReport, DoctorSeverity } from '@/lib/orgchart/types'

const SEVERITY_ORDER: Record<DoctorSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

const SEVERITY: Record<DoctorSeverity, { label: string; badge: string; bar: string }> = {
  CRITICAL: { label: 'Crítico', badge: 'bg-rose-100 text-rose-700 ring-rose-200', bar: 'bg-rose-500' },
  HIGH: { label: 'Alto', badge: 'bg-amber-100 text-amber-700 ring-amber-200', bar: 'bg-amber-500' },
  MEDIUM: { label: 'Medio', badge: 'bg-yellow-100 text-yellow-800 ring-yellow-200', bar: 'bg-yellow-400' },
  LOW: { label: 'Bajo', badge: 'bg-sky-100 text-sky-700 ring-sky-200', bar: 'bg-sky-400' },
}

function scoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-600'
  if (score >= 65) return 'text-amber-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-rose-600'
}

export function DoctorDrawer({
  report,
  isLoading,
}: {
  report: DoctorReport | null
  isLoading: boolean
}) {
  const open = useOrgStore((s) => s.doctorOpen)
  const setOpen = useOrgStore((s) => s.setDoctorOpen)
  const setSelectedUnit = useOrgStore((s) => s.setSelectedUnit)
  const setInspectorOpen = useOrgStore((s) => s.setInspectorOpen)

  const findings = report
    ? [...report.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    : []

  const goToNode = (unitId: string) => {
    setSelectedUnit(unitId)
    setInspectorOpen(true)
  }

  return (
    <AnimatePresence>
      {open && (
        <m.aside
          initial={{ x: 392 }}
          animate={{ x: 0 }}
          exit={{ x: 392 }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          className="absolute right-0 top-0 z-20 flex h-full w-[384px] flex-col border-l border-slate-200 bg-white shadow-xl"
          role="dialog"
          aria-label="Doctor de cumplimiento"
        >
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">Doctor de cumplimiento</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-slate-400 transition hover:bg-slate-100"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto">
            {isLoading && !report ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : report ? (
              <>
                {/* Score + totales */}
                <div className="border-b border-slate-100 p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        Salud del organigrama
                      </div>
                      <div className={`text-3xl font-bold ${scoreColor(report.scoreOrgHealth)}`}>
                        {report.scoreOrgHealth}
                        <span className="text-base font-normal text-slate-400"> / 100</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 text-center text-[10px] text-slate-600">
                      {(['critical', 'high', 'medium', 'low'] as const).map((k) => (
                        <div key={k} className="rounded-md bg-slate-50 px-2 py-1">
                          <div className="text-sm font-bold tabular-nums text-slate-800">
                            {report.totals[k]}
                          </div>
                          <div className="capitalize">{k === 'critical' ? 'crít.' : k}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hallazgos */}
                {findings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                    <ShieldCheck className="h-8 w-8 text-emerald-500" />
                    <p className="text-sm font-medium text-slate-700">Sin hallazgos</p>
                    <p className="text-xs text-slate-500">
                      Tu estructura no tiene observaciones de cumplimiento ahora mismo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 p-3">
                    {findings.map((f, i) => {
                      const sev = SEVERITY[f.severity]
                      const unitId = f.affectedUnitIds[0]
                      return (
                        <div
                          key={`${f.rule}-${i}`}
                          className="relative overflow-hidden rounded-lg border border-slate-200 bg-white"
                        >
                          <div className={`absolute inset-y-0 left-0 w-1 ${sev.bar}`} aria-hidden />
                          <div className="p-3 pl-4">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-[13px] font-semibold text-slate-900">{f.title}</h3>
                              <span
                                className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ring-1 ${sev.badge}`}
                              >
                                {sev.label}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                              {f.description}
                            </p>
                            {f.baseLegal && (
                              <p className="mt-1.5 flex items-start gap-1 text-[11px] text-slate-500">
                                <Scale className="mt-0.5 h-3 w-3 flex-shrink-0" />
                                {f.baseLegal}
                              </p>
                            )}
                            {f.suggestedFix && (
                              <p className="mt-1.5 flex items-start gap-1 rounded-md bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-900">
                                <Lightbulb className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-600" />
                                {f.suggestedFix}
                              </p>
                            )}
                            {unitId && (
                              <button
                                type="button"
                                onClick={() => goToNode(unitId)}
                                className="mt-2 inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
                              >
                                <ArrowUpRight className="h-3 w-3" />
                                Ir al nodo
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <p className="px-4 py-12 text-center text-xs text-slate-400">
                No se pudo cargar el diagnóstico.
              </p>
            )}
          </div>
        </m.aside>
      )}
    </AnimatePresence>
  )
}
