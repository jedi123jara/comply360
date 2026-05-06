/**
 * Modal What-If — simula mover un cargo bajo un nuevo padre y muestra impacto.
 *
 * Flujo:
 *   1. Usuario selecciona cargo a mover + nuevo jefe + nombre del escenario.
 *   2. Click "Simular y guardar" → POST /api/orgchart/drafts (crea borrador con
 *      impactReport pre-calculado).
 *   3. Muestra impactReport: métricas, riesgos, impacto en payroll.
 *   4. Botones: "Aplicar al organigrama" / "Descartar" / "Cerrar".
 */
'use client'

import { useEffect, useMemo, useState } from 'react'
import { ListTree, Loader2, AlertTriangle, ShieldAlert, TrendingUp, Trash2, Check } from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { useTreeQuery } from '../data/queries/use-tree'
import {
  useCreateDraftMutation,
  useApplyDraftMutation,
  useDiscardDraftMutation,
} from '../data/mutations/use-draft-mutations'
import type { DraftDTO, WhatIfImpactReportDTO, WhatIfRiskDTO } from '../data/queries/use-drafts'

const SEVERITY_TONE: Record<WhatIfRiskDTO['severity'], string> = {
  CRITICAL: 'border-rose-200 bg-rose-50 text-rose-900',
  HIGH: 'border-amber-200 bg-amber-50 text-amber-900',
  MEDIUM: 'border-yellow-200 bg-yellow-50 text-yellow-900',
  LOW: 'border-slate-200 bg-slate-50 text-slate-700',
}

export function WhatIfModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'what-if'

  const treeQuery = useTreeQuery(null)
  const positions = useMemo(() => treeQuery.data?.positions ?? [], [treeQuery.data])
  const unitsById = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of treeQuery.data?.units ?? []) map.set(u.id, u.name)
    return map
  }, [treeQuery.data])

  const [name, setName] = useState('')
  const [positionId, setPositionId] = useState<string>('')
  const [newParentId, setNewParentId] = useState<string>('')
  const [draft, setDraft] = useState<DraftDTO | null>(null)

  const createMutation = useCreateDraftMutation()
  const applyMutation = useApplyDraftMutation()
  const discardMutation = useDiscardDraftMutation()

  const reset = () => {
    setName('')
    setPositionId('')
    setNewParentId('')
    setDraft(null)
  }

  // Cuando cierra el modal, limpiar.
  useEffect(() => {
    if (!open) reset()
  }, [open])

  const submit = async () => {
    if (!name.trim() || !positionId || !newParentId) return
    try {
      const result = await createMutation.mutateAsync({
        name: name.trim(),
        positionId,
        newParentId,
      })
      setDraft(result)
      toast.success('Escenario simulado y guardado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo simular')
    }
  }

  const apply = async () => {
    if (!draft) return
    try {
      await applyMutation.mutateAsync(draft.id)
      toast.success(`Escenario "${draft.name}" aplicado al organigrama`)
      closeModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo aplicar')
    }
  }

  const discard = async () => {
    if (!draft) return
    try {
      await discardMutation.mutateAsync(draft.id)
      toast.info('Escenario descartado')
      closeModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo descartar')
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="What-If — simular cambio en la estructura"
      subtitle="Mueve un cargo a otra jefatura y revisa el impacto antes de aplicarlo"
      icon={<ListTree className="h-4 w-4" />}
      width="lg"
      footer={
        draft ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              Estado:{' '}
              <strong className="font-semibold text-slate-700">{draft.status}</strong>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={discard}
                disabled={discardMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
              >
                {discardMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Descartar
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={applyMutation.isPending || draft.impactReport?.blocked}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {applyMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Aplicar al organigrama
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={
                createMutation.isPending || !name.trim() || !positionId || !newParentId
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ListTree className="h-3.5 w-3.5" />
              )}
              Simular y guardar
            </button>
          </div>
        )
      }
    >
      {!draft ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Nombre del escenario <span className="text-rose-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Mover Marketing bajo Comercial"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cargo a mover <span className="text-rose-500">*</span>
            </label>
            <select
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">— Selecciona un cargo —</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} · {unitsById.get(p.orgUnitId) ?? '—'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Nuevo jefe inmediato <span className="text-rose-500">*</span>
            </label>
            <select
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              disabled={!positionId}
            >
              <option value="">— Selecciona el nuevo jefe —</option>
              {positions
                .filter((p) => p.id !== positionId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} · {unitsById.get(p.orgUnitId) ?? '—'}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              El cargo se reportará a este nuevo cargo. La simulación detecta ciclos
              jerárquicos y los bloquea.
            </p>
          </div>
        </div>
      ) : (
        <ImpactView impact={draft.impactReport} />
      )}
    </ModalShell>
  )
}

function ImpactView({ impact }: { impact: WhatIfImpactReportDTO | null }) {
  if (!impact) {
    return (
      <p className="text-sm text-slate-500">
        El escenario no contiene un reporte de impacto. Vuelve a simularlo.
      </p>
    )
  }

  const fmt = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })

  return (
    <div className="space-y-4">
      {/* Encabezado del escenario */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <p className="font-semibold text-slate-900">{impact.scenario.positionTitle}</p>
        <p className="mt-0.5 text-xs text-slate-600">
          Reporta a:{' '}
          <span className="font-medium text-slate-500 line-through">
            {impact.scenario.fromParentTitle ?? 'sin jefe'}
          </span>{' '}
          → <span className="font-semibold text-emerald-700">{impact.scenario.toParentTitle}</span>
        </p>
        {impact.scenario.unitName && (
          <p className="mt-0.5 text-[11px] text-slate-500">Unidad: {impact.scenario.unitName}</p>
        )}
      </div>

      {/* Bloqueado */}
      {impact.blocked && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">Escenario bloqueado</p>
            <p>El cambio crearía un ciclo jerárquico. No se puede aplicar.</p>
          </div>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric label="Ocupantes" value={impact.metrics.occupants} />
        <Metric label="Reportes movidos" value={impact.metrics.directReportsMoved} />
        <Metric label="Span proyectado" value={impact.metrics.projectedSpanOfControl} />
        <Metric label="Riesgos" value={impact.metrics.risks} tone={impact.metrics.risks > 0 ? 'amber' : 'slate'} />
      </div>

      {/* Costo */}
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <TrendingUp className="h-3.5 w-3.5" />
          Impacto en payroll (cargos afectados)
        </h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <CostRow label="Mensual estimado" value={fmt.format(impact.costImpact.estimatedMonthlyPayroll)} />
          <CostRow label="Anual estimado" value={fmt.format(impact.costImpact.estimatedAnnualPayroll)} />
          <CostRow
            label="Vacantes (mensual)"
            value={fmt.format(impact.costImpact.estimatedMonthlyVacancyBudget)}
          />
          <CostRow label="Exposición liquidación" value={fmt.format(impact.costImpact.estimatedSeveranceExposure)} />
        </div>
        {impact.costImpact.notes.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[11px] text-slate-500">
            {impact.costImpact.notes.map((note, i) => (
              <li key={i}>· {note}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Riesgos */}
      {impact.risks.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            Riesgos detectados ({impact.risks.length})
          </h3>
          <ul className="space-y-1.5">
            {impact.risks.map((risk, i) => (
              <li key={i} className={`rounded-lg border px-3 py-2 text-xs ${SEVERITY_TONE[risk.severity]}`}>
                <p className="font-semibold">{risk.title}</p>
                <p className="mt-0.5 leading-relaxed">{risk.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: number
  tone?: 'slate' | 'amber' | 'emerald'
}) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }
  return (
    <div className={`rounded-lg border px-3 py-2 ${tones[tone]}`}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  )
}
