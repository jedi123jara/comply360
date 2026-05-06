/**
 * Modal — Dossier de subordinación civil.
 *
 * Lista locadores y prestadores civiles con score de riesgo de desnaturalización
 * de la relación civil (que se convierta en laboral). Cada caso incluye
 * indicadores legales presentes (horario fijo, exclusividad, etc.) y evidencia.
 *
 * Backend: GET /api/orgchart/subordination + POST /api/orgchart/subordination/sync.
 */
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ScaleIcon, Loader2, RefreshCw, AlertTriangle, FileText, Filter } from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { alertsKey } from '../data/queries/use-alerts'

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAR'

interface DossierCase {
  providerId: string
  providerName: string
  document: string
  serviceDescription: string
  areaName: string | null
  unitName: string | null
  linkedPositionCount: number
  status: string
  severity: Severity
  score: number
  monthlyAmount: number
  currency: string
  startDate: string
  endDate: string | null
  indicators: Array<{ code: string; label: string; weight: number; present: boolean; legalMeaning: string }>
  presentIndicators: Array<{ code: string; label: string }>
  evidence: {
    hasContractFile: boolean
    invoiceCount: number
    hasAreaMapping: boolean
  }
  recommendedActions: string[]
}

interface DossierResponse {
  generatedAt: string
  summary: {
    providers: number
    critical: number
    high: number
    medium: number
    low: number
    clear: number
    mappedToOrgUnits: number
    missingContracts: number
    estimatedMonthlyCivilSpendAtRisk: number
  }
  cases: DossierCase[]
}

const SEVERITY_TONE: Record<Severity, string> = {
  CRITICAL: 'border-rose-300 bg-rose-50 text-rose-900',
  HIGH: 'border-amber-300 bg-amber-50 text-amber-900',
  MEDIUM: 'border-yellow-300 bg-yellow-50 text-yellow-900',
  LOW: 'border-slate-200 bg-slate-50 text-slate-700',
  CLEAR: 'border-emerald-200 bg-emerald-50 text-emerald-900',
}

const SEVERITY_BADGE: Record<Severity, string> = {
  CRITICAL: 'bg-rose-600 text-white',
  HIGH: 'bg-amber-500 text-white',
  MEDIUM: 'bg-yellow-400 text-yellow-900',
  LOW: 'bg-slate-400 text-white',
  CLEAR: 'bg-emerald-500 text-white',
}

export function SubordinationModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'subordination'
  const queryClient = useQueryClient()

  const dossierQuery = useQuery({
    queryKey: ['orgchart', 'subordination'],
    enabled: open,
    queryFn: async (): Promise<DossierResponse> => {
      const res = await fetch('/api/orgchart/subordination', { cache: 'no-store' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Error al cargar dossier')
      }
      return res.json()
    },
    staleTime: 60_000,
  })

  const syncMutation = useMutation({
    mutationFn: async (): Promise<{ created?: number; updated?: number; skipped?: number }> => {
      const res = await fetch('/api/orgchart/subordination/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createTasks: true }),
      })
      if (!res.ok) throw new Error('Error al sincronizar')
      return res.json()
    },
    onSuccess: (r) => {
      const parts: string[] = []
      if (r.created) parts.push(`${r.created} creados`)
      if (r.updated) parts.push(`${r.updated} actualizados`)
      if (r.skipped) parts.push(`${r.skipped} sin cambios`)
      toast.success(`Sincronizado: ${parts.join(' · ') || 'sin cambios'}`)
      queryClient.invalidateQueries({ queryKey: ['orgchart', 'subordination'] })
      queryClient.invalidateQueries({ queryKey: alertsKey })
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Error')
    },
  })

  const [filter, setFilter] = useState<'all' | Severity>('all')
  const cases = dossierQuery.data?.cases ?? []
  const filtered = filter === 'all' ? cases : cases.filter((c) => c.severity === filter)
  const fmt = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="Dossier de subordinación civil"
      subtitle="Riesgo de desnaturalización de relaciones civiles (RxH, locación)"
      icon={<ScaleIcon className="h-4 w-4" />}
      width="xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || !dossierQuery.data}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Sincronizar con eventos de riesgo
          </button>
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
      {dossierQuery.isLoading && (
        <div className="flex items-center justify-center py-10 text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando dossier…
        </div>
      )}

      {dossierQuery.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {dossierQuery.error instanceof Error
            ? dossierQuery.error.message
            : 'Error desconocido'}
        </div>
      )}

      {dossierQuery.data && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <SummaryStat label="Locadores" value={dossierQuery.data.summary.providers} />
            <SummaryStat
              label="Crítico"
              value={dossierQuery.data.summary.critical}
              tone={dossierQuery.data.summary.critical > 0 ? 'rose' : 'slate'}
            />
            <SummaryStat
              label="Alto"
              value={dossierQuery.data.summary.high}
              tone={dossierQuery.data.summary.high > 0 ? 'amber' : 'slate'}
            />
            <SummaryStat
              label="Sin contrato"
              value={dossierQuery.data.summary.missingContracts}
              tone={dossierQuery.data.summary.missingContracts > 0 ? 'amber' : 'slate'}
            />
          </div>

          {dossierQuery.data.summary.estimatedMonthlyCivilSpendAtRisk > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <strong>Gasto mensual en riesgo:</strong>{' '}
              {fmt.format(dossierQuery.data.summary.estimatedMonthlyCivilSpendAtRisk)} en
              honorarios civiles que podrían reclasificarse como laborales.
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-1">
            <Filter className="h-3 w-3 text-slate-400" />
            {(['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'CLEAR'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                  filter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'all' ? 'Todos' : s}
              </button>
            ))}
          </div>

          {/* Casos */}
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No hay casos en este filtro.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((c) => (
                <CaseRow key={c.providerId} case={c} fmt={fmt} />
              ))}
            </ul>
          )}
        </div>
      )}
    </ModalShell>
  )
}

function CaseRow({ case: c, fmt }: { case: DossierCase; fmt: Intl.NumberFormat }) {
  return (
    <li className={`rounded-lg border p-3 ${SEVERITY_TONE[c.severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${SEVERITY_BADGE[c.severity]}`}
            >
              {c.severity}
            </span>
            <span className="rounded bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              Score {c.score}/100
            </span>
            <span className="ml-auto text-[10px] text-slate-500 tabular-nums">
              {fmt.format(c.monthlyAmount)} / mes
            </span>
          </div>
          <h3 className="mt-1 truncate text-sm font-semibold text-slate-900">{c.providerName}</h3>
          <p className="text-[10px] text-slate-500">{c.document}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-700">{c.serviceDescription}</p>
          {c.areaName && (
            <p className="mt-0.5 text-[10px] text-slate-500">
              Área: {c.areaName}
              {c.unitName && c.unitName !== c.areaName && ` · Unidad: ${c.unitName}`}
            </p>
          )}
          {c.presentIndicators.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {c.presentIndicators.slice(0, 6).map((ind) => (
                <span
                  key={ind.code}
                  className="inline-flex items-center gap-1 rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                  title={ind.label}
                >
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {ind.label}
                </span>
              ))}
              {c.presentIndicators.length > 6 && (
                <span className="text-[10px] text-slate-500">
                  +{c.presentIndicators.length - 6} más
                </span>
              )}
            </div>
          )}
          {c.recommendedActions.length > 0 && (
            <details className="mt-2 cursor-pointer text-[11px] text-slate-700">
              <summary className="font-semibold">Acciones recomendadas</summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {c.recommendedActions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1 text-[10px]">
          {c.evidence.hasContractFile ? (
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1 py-0.5 text-emerald-700">
              <FileText className="h-2.5 w-2.5" />
              Contrato
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1 py-0.5 text-rose-700">
              <FileText className="h-2.5 w-2.5" />
              Sin contrato
            </span>
          )}
          <span className="text-slate-500">{c.evidence.invoiceCount} RxH</span>
        </div>
      </div>
    </li>
  )
}

function SummaryStat({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: number
  tone?: 'slate' | 'amber' | 'rose'
}) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
  }
  return (
    <div className={`rounded-lg border px-3 py-2 ${tones[tone]}`}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
    </div>
  )
}
