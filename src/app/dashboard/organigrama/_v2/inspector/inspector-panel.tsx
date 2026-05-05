/**
 * Inspector lateral derecho — muestra detalle del nodo seleccionado.
 *
 * En esta primera iteración tiene 3 tabs (info, mof, cumplimiento).
 * Las demás (reportes, costos, historial, comments) llegan en fases
 * posteriores. Es persistente, colapsable con `[`.
 */
'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  X,
  ChevronRight,
  Loader2,
  Download,
  ScrollText,
  History as HistoryIcon,
  BriefcaseBusiness,
  Building2,
  ShieldCheck,
  UserCircle2,
  Users,
  UserPlus,
  Archive,
  FileCheck2,
  ExternalLink,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { OrgChartTree } from '@/lib/orgchart/types'
import { COMPLIANCE_ROLES } from '@/lib/orgchart/compliance-rules'
import {
  TONE_COLOR_HEX,
  TONE_LABEL,
  describeCoverage,
  type CoverageReport,
} from '@/lib/orgchart/coverage-aggregator'

import { useOrgStore } from '../state/org-store'
import type { InspectorTab } from '../state/slices/inspector-slice'
import { alertsKey } from '../data/queries/use-alerts'
import { treeKey } from '../data/queries/use-tree'
import {
  classifyCommissionUnit,
  commissionTypeLabel,
  isCommissionUnit,
} from '../utils/commission-classification'

const TABS: Array<{ id: InspectorTab; label: string }> = [
  { id: 'info', label: 'Información' },
  { id: 'mof', label: 'MOF' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'costos', label: 'Costos' },
  { id: 'cumplimiento', label: 'Cumplimiento' },
  { id: 'historial', label: 'Historial' },
]

export interface InspectorPanelProps {
  tree: OrgChartTree
  coverage: CoverageReport | null
}

export function InspectorPanel({ tree, coverage }: InspectorPanelProps) {
  const open = useOrgStore((s) => s.inspectorOpen)
  const tab = useOrgStore((s) => s.inspectorTab)
  const setTab = useOrgStore((s) => s.setInspectorTab)
  const setOpen = useOrgStore((s) => s.setInspectorOpen)
  const selectedUnitId = useOrgStore((s) => s.selectedUnitId)
  const selectedPositionId = useOrgStore((s) => s.selectedPositionId)
  const selectedWorkerId = useOrgStore((s) => s.selectedWorkerId)
  const setSelectedWorker = useOrgStore((s) => s.setSelectedWorker)
  const openModal = useOrgStore((s) => s.openModal)
  const queryClient = useQueryClient()
  const [retiringRoleId, setRetiringRoleId] = useState<string | null>(null)
  const [retiringAssignmentId, setRetiringAssignmentId] = useState<string | null>(null)

  const unit = useMemo(() => {
    if (!selectedUnitId) return null
    return tree.units.find((u) => u.id === selectedUnitId) ?? null
  }, [selectedUnitId, tree])

  const selectedPosition = useMemo(() => {
    if (!selectedPositionId) return null
    return tree.positions.find((p) => p.id === selectedPositionId) ?? null
  }, [selectedPositionId, tree.positions])

  const selectedWorkerAssignment = useMemo(() => {
    if (!selectedWorkerId) return null
    return tree.assignments.find((a) => a.workerId === selectedWorkerId) ?? null
  }, [selectedWorkerId, tree.assignments])

  const positions = useMemo(() => {
    if (!unit) return []
    return tree.positions.filter((p) => p.orgUnitId === unit.id)
  }, [unit, tree])

  const occupants = useMemo(() => {
    const positionIds = new Set(positions.map((p) => p.id))
    return tree.assignments.filter((a) => positionIds.has(a.positionId))
  }, [positions, tree])

  const unitLegalRoles = useMemo(() => {
    if (!unit) return []
    if (unit.kind !== 'COMITE_LEGAL' && unit.kind !== 'BRIGADA') return []
    return tree.complianceRoles.filter((role) => role.unitId === unit.id)
  }, [tree.complianceRoles, unit])
  const unitSupportsLegalRoles = unit?.kind === 'COMITE_LEGAL' || unit?.kind === 'BRIGADA'
  const unitIsCommission = unit ? isCommissionUnit(unit) : false
  const unitCommissionType = unit ? classifyCommissionUnit(unit) : null

  const duplicateLegalRoleIds = useMemo(() => {
    const roleIds = new Set<string>()
    const grouped = new Map<string, typeof unitLegalRoles>()
    for (const role of unitLegalRoles) {
      const key = `${role.roleType}:${role.unitId ?? 'global'}`
      grouped.set(key, [...(grouped.get(key) ?? []), role])
    }
    for (const roles of grouped.values()) {
      if (roles.length <= 1) continue
      const sorted = [...roles].sort(
        (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
      )
      for (const duplicate of sorted.slice(1)) roleIds.add(duplicate.id)
    }
    return roleIds
  }, [unitLegalRoles])

  const retireLegalRole = async (roleId: string) => {
    setRetiringRoleId(roleId)
    try {
      const res = await fetch(`/api/orgchart/compliance-roles/${roleId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error ?? 'No se pudo retirar la designación')
      }
      toast.success('Designación retirada')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: treeKey(null) }),
        queryClient.invalidateQueries({ queryKey: alertsKey }),
      ])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error')
    } finally {
      setRetiringRoleId(null)
    }
  }

  const retireAssignment = async (assignmentId: string) => {
    setRetiringAssignmentId(assignmentId)
    try {
      const res = await fetch(`/api/orgchart/assignments/${assignmentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error ?? 'No se pudo retirar la asignación')
      }
      toast.success('Asignación retirada')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: treeKey(null) }),
        queryClient.invalidateQueries({ queryKey: alertsKey }),
      ])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error')
    } finally {
      setRetiringAssignmentId(null)
    }
  }

  const unitCoverage = unit ? coverage?.byUnit.get(unit.id) ?? null : null

  if (!open) {
    return null
  }

  if (selectedWorkerAssignment) {
    const workerPosition = tree.positions.find((p) => p.id === selectedWorkerAssignment.positionId) ?? null
    const workerUnit = workerPosition
      ? tree.units.find((u) => u.id === workerPosition.orgUnitId) ?? null
      : null
    return (
      <WorkerInspector
        assignment={selectedWorkerAssignment}
        position={workerPosition}
        unit={workerUnit}
        onClose={() => setOpen(false)}
      />
    )
  }

  if (selectedPosition) {
    const positionUnit = tree.units.find((u) => u.id === selectedPosition.orgUnitId) ?? unit
    const positionOccupants = tree.assignments.filter((a) => a.positionId === selectedPosition.id)
    const manager = selectedPosition.reportsToPositionId
      ? tree.positions.find((p) => p.id === selectedPosition.reportsToPositionId) ?? null
      : null
    const reports = tree.positions.filter((p) => p.reportsToPositionId === selectedPosition.id)
    return (
      <PositionInspector
        position={selectedPosition}
        unit={positionUnit}
        occupants={positionOccupants}
        manager={manager}
        reports={reports}
        retiringAssignmentId={retiringAssignmentId}
        onRetireAssignment={retireAssignment}
        onClose={() => setOpen(false)}
      />
    )
  }

  if (!unit) {
    return null
  }

  return (
    <aside className="flex h-full w-[380px] flex-col border-l border-slate-200 bg-white">
      <header className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {unitIsCommission && unitCommissionType
              ? `${commissionTypeLabel(unitCommissionType)} · ${unit.kind}`
              : unit.kind}
          </div>
          <h2 className="truncate text-sm font-semibold text-slate-900">{unit.name}</h2>
          {unitCoverage && (
            <div className="mt-1 flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
                style={{
                  backgroundColor: `${TONE_COLOR_HEX[unitCoverage.tone]}1a`,
                  color: TONE_COLOR_HEX[unitCoverage.tone],
                }}
              >
                {unitCoverage.score} · {TONE_LABEL[unitCoverage.tone]}
              </span>
              {unitCoverage.findingCount > 0 && (
                <span className="text-[10px] text-slate-500">
                  {unitCoverage.findingCount} hallazgo
                  {unitCoverage.findingCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar inspector"
          title="Cerrar inspector ([)"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <nav
        role="tablist"
        className="flex overflow-x-auto border-b border-slate-200"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            type="button"
            className={`flex-shrink-0 border-b-2 px-3 py-2 text-[11px] font-medium transition ${
              tab === t.id
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'info' && (
          <div className="space-y-3">
            <Stat label="Cargos" value={positions.length} />
            <Stat label="Ocupantes" value={occupants.length} />
            <Stat
              label="Vacantes"
              value={positions.reduce(
                (sum, p) =>
                  sum +
                  Math.max(
                    0,
                    p.seats - occupants.filter((o) => o.positionId === p.id).length,
                  ),
                0,
              )}
            />
            {unit.code && <Stat label="Código" value={unit.code} />}
            {unit.costCenter && <Stat label="Centro de costo" value={unit.costCenter} />}
            {unit.description && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  {unitIsCommission ? 'Objetivo / encargo' : 'Descripción'}
                </div>
                <p className="mt-1 text-sm text-slate-700">{unit.description}</p>
              </div>
            )}
            {unitIsCommission && (
              <CommissionOperatingBlock
                positions={positions}
                occupants={occupants}
                legalRoles={unitLegalRoles}
                commissionType={unitCommissionType ?? 'legal'}
              />
            )}
            {positions.length > 0 && (
              <section className="space-y-2">
                <SectionTitle icon={<BriefcaseBusiness className="h-3.5 w-3.5" />} label="Cargos y responsables" />
                <div className="space-y-1.5">
                  {positions.map((position) => {
                    const positionOccupants = occupants.filter(
                      (assignment) => assignment.positionId === position.id,
                    )
                    return (
                      <div
                        key={position.id}
                        className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
                      >
                        <div className="font-semibold text-slate-900">
                          {position.title}
                        </div>
                        {positionOccupants.length === 0 ? (
                          <div className="mt-1 text-[11px] text-amber-700">
                            Vacante
                          </div>
                        ) : (
                          <div className="mt-1 space-y-1">
                            {positionOccupants.map((assignment) => (
                              <button
                                key={assignment.id}
                                type="button"
                                onClick={() => setSelectedWorker(assignment.workerId)}
                                className="block w-full truncate text-left text-[11px] font-semibold text-emerald-700 hover:underline"
                              >
                                {assignment.worker.firstName} {assignment.worker.lastName}
                                {assignment.isInterim ? ' · interino' : ' · titular'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
            {unitSupportsLegalRoles && (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <SectionTitle icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Responsables legales designados" />
                  <button
                    type="button"
                    onClick={() => openModal('assign-role', { unitId: unit.id })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Designar
                  </button>
                </div>
                {unitLegalRoles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900">
                    No hay responsables legales designados para esta comisión.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {unitLegalRoles.map((role) => (
                      <div
                        key={role.id}
                        className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">
                              {COMPLIANCE_ROLES[role.roleType]?.label ?? role.roleType}
                            </div>
                            <div className="mt-1 text-[11px] font-semibold text-emerald-700">
                              {role.worker.firstName} {role.worker.lastName}
                            </div>
                          </div>
                          <div className="flex flex-none items-center gap-1">
                            {duplicateLegalRoleIds.has(role.id) && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                Duplicado
                              </span>
                            )}
                            {role.endsAt && daysUntil(role.endsAt) <= 60 && daysUntil(role.endsAt) >= 0 && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                Vence pronto
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => retireLegalRole(role.id)}
                              disabled={retiringRoleId === role.id}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                              title="Retirar designación"
                              aria-label="Retirar designación"
                            >
                              {retiringRoleId === role.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Archive className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="mt-1 text-[10px] text-slate-500">
                          {role.endsAt
                            ? `Vigente hasta ${new Date(role.endsAt).toLocaleDateString('es-PE')}`
                            : 'Sin fecha de vencimiento'}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {role.actaUrl ? (
                            <a
                              href={role.actaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-50"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Ver acta
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                              <FileCheck2 className="h-3 w-3" />
                              Sin acta
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => openModal('role-evidence', { roleId: role.id })}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            <FileCheck2 className="h-3 w-3" />
                            {role.actaUrl ? 'Cambiar acta' : 'Cargar acta'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {tab === 'mof' && (
          <div className="space-y-2">
            {positions.length === 0 && (
              <p className="text-sm text-slate-500">Esta unidad no tiene cargos definidos.</p>
            )}
            {positions.map((p) => {
              const hasMof = Boolean(
                p.purpose && p.functions && p.responsibilities && p.requirements,
              )
              return (
                <div
                  key={p.id}
                  className={`rounded-lg border p-3 ${
                    hasMof
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-amber-200 bg-amber-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {p.title}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        hasMof
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-amber-200 text-amber-800'
                      }`}
                    >
                      {hasMof ? 'MOF OK' : 'MOF incompleto'}
                    </span>
                  </div>
                  {p.purpose && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">{p.purpose}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'reportes' && (
          <ReportsTab unitId={unit.id} unitName={unit.name} />
        )}

        {tab === 'costos' && (
          <CostsTab tree={tree} unitId={unit.id} positions={positions} occupants={occupants} />
        )}

        {tab === 'historial' && (
          <HistoryTab unitId={unit.id} />
        )}

        {tab === 'cumplimiento' && (
          <div className="space-y-3">
            {!unitCoverage && (
              <p className="text-sm text-slate-500">
                Corre el Org Doctor para ver el detalle de cumplimiento de esta unidad.
              </p>
            )}
            {unitCoverage && (
              <>
                <p className="text-sm text-slate-700">{describeCoverage(unitCoverage)}</p>
                {unitCoverage.findings.length === 0 ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                    Sin hallazgos registrados para esta unidad.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {unitCoverage.findings.map((f, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-2.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                              f.severity === 'CRITICAL'
                                ? 'bg-red-600 text-white'
                                : f.severity === 'HIGH'
                                  ? 'bg-amber-500 text-white'
                                  : f.severity === 'MEDIUM'
                                    ? 'bg-yellow-400 text-yellow-900'
                                    : 'bg-sky-500 text-white'
                            }`}
                          >
                            {f.severity}
                          </span>
                          <span className="text-xs font-semibold text-slate-900">
                            {f.title}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-700">{f.description}</p>
                        {f.baseLegal && (
                          <p className="mt-1 font-mono text-[10px] text-slate-500">
                            {f.baseLegal}
                          </p>
                        )}
                        {f.suggestedFix && (
                          <p className="mt-1 flex items-start gap-1 rounded bg-white p-1.5 text-[11px] text-slate-700">
                            <ChevronRight className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-600" />
                            {f.suggestedFix}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

function PositionInspector({
  position,
  unit,
  occupants,
  manager,
  reports,
  retiringAssignmentId,
  onRetireAssignment,
  onClose,
}: {
  position: OrgChartTree['positions'][number]
  unit: OrgChartTree['units'][number] | null
  occupants: OrgChartTree['assignments']
  manager: OrgChartTree['positions'][number] | null
  reports: OrgChartTree['positions']
  retiringAssignmentId: string | null
  onRetireAssignment: (assignmentId: string) => void
  onClose: () => void
}) {
  const setSelectedWorker = useOrgStore((s) => s.setSelectedWorker)
  const setSelectedPosition = useOrgStore((s) => s.setSelectedPosition)
  const setSelectedUnit = useOrgStore((s) => s.setSelectedUnit)
  const openModal = useOrgStore((s) => s.openModal)

  const vacancies = Math.max(0, (position.seats ?? 1) - occupants.length)
  const functions = formatUnknownList(position.functions)
  const responsibilities = formatUnknownList(position.responsibilities)
  const requirements = formatUnknownList(position.requirements)

  return (
    <aside className="flex h-full w-[400px] flex-col border-l border-slate-200 bg-white">
      <InspectorHeader
        eyebrow={unit?.name ?? 'Cargo'}
        title={position.title}
        icon={<BriefcaseBusiness className="h-4 w-4" />}
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Plazas" value={position.seats ?? 1} />
              <Stat label="Ocupantes" value={occupants.length} />
              <Stat label="Vacantes" value={vacancies} />
              <Stat label="Nivel" value={position.level ?? 'No definido'} />
            </div>
          </section>

          <section className="space-y-2">
            <SectionTitle icon={<Building2 className="h-3.5 w-3.5" />} label="Dependencia" />
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Área o gerencia</span>
                {unit ? (
                  <button
                    type="button"
                    onClick={() => setSelectedUnit(unit.id)}
                    className="truncate font-semibold text-emerald-700 hover:underline"
                  >
                    {unit.name}
                  </button>
                ) : (
                  <span className="font-semibold text-slate-700">No definida</span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-slate-500">Reporta a</span>
                {manager ? (
                  <button
                    type="button"
                    onClick={() => setSelectedPosition(manager.id)}
                    className="truncate font-semibold text-emerald-700 hover:underline"
                  >
                    {manager.title}
                  </button>
                ) : (
                  <span className="font-semibold text-slate-700">Sin jefe directo</span>
                )}
              </div>
            </div>
          </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <SectionTitle icon={<Users className="h-3.5 w-3.5" />} label="Trabajadores asignados" />
                <button
                  type="button"
                  onClick={() => openModal('assign-worker', { positionId: position.id })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Asignar
                </button>
              </div>
              {occupants.length === 0 ? (
                <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900">
                  <div className="font-semibold">Cargo vacante</div>
                  <p className="mt-1 text-amber-800">
                    Asigna un trabajador para cerrar la responsabilidad del cargo y
                    alimentar los controles de cumplimiento.
                  </p>
                  <button
                    type="button"
                    onClick={() => openModal('assign-worker', { positionId: position.id })}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Asignar trabajador
                  </button>
                </div>
              ) : (
              <div className="space-y-2">
                {occupants.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 transition hover:border-emerald-300 hover:bg-emerald-50/40"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedWorker(assignment.workerId)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <UserCircle2 className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {assignment.worker.firstName} {assignment.worker.lastName}
                        </span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {assignment.isInterim ? 'Interino' : 'Titular'} · Legajo{' '}
                          {assignment.worker.legajoScore ?? 's/d'}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRetireAssignment(assignment.id)}
                      disabled={retiringAssignmentId === assignment.id}
                      className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                      title="Retirar trabajador del cargo"
                      aria-label="Retirar trabajador del cargo"
                    >
                      {retiringAssignmentId === assignment.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <SectionTitle icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Riesgo y cumplimiento" />
            <div className="grid grid-cols-2 gap-2">
              <Flag label="Crítico" active={Boolean(position.isCritical)} />
              <Flag label="Gerencial" active={position.isManagerial} />
              <Flag label="SCTR" active={Boolean(position.requiresSctr)} />
              <Flag label="EMO" active={Boolean(position.requiresMedicalExam)} />
            </div>
            {(position.category || position.riskCategory) && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                {position.category && <div>Categoría: <strong>{position.category}</strong></div>}
                {position.riskCategory && <div>Riesgo: <strong>{position.riskCategory}</strong></div>}
              </div>
            )}
          </section>

          {(position.purpose || functions.length > 0 || responsibilities.length > 0 || requirements.length > 0) && (
            <section className="space-y-2">
              <SectionTitle icon={<ScrollText className="h-3.5 w-3.5" />} label="MOF del cargo" />
              {position.purpose && <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{position.purpose}</p>}
              <CompactList title="Funciones" items={functions} />
              <CompactList title="Responsabilidades" items={responsibilities} />
              <CompactList title="Requisitos" items={requirements} />
            </section>
          )}

          {reports.length > 0 && (
            <section className="space-y-2">
              <SectionTitle icon={<BriefcaseBusiness className="h-3.5 w-3.5" />} label="Cargos bajo su responsabilidad" />
              <div className="space-y-1.5">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedPosition(report.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs transition hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-800">{report.title}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </aside>
  )
}

function WorkerInspector({
  assignment,
  position,
  unit,
  onClose,
}: {
  assignment: OrgChartTree['assignments'][number]
  position: OrgChartTree['positions'][number] | null
  unit: OrgChartTree['units'][number] | null
  onClose: () => void
}) {
  const setSelectedPosition = useOrgStore((s) => s.setSelectedPosition)
  const worker = assignment.worker

  return (
    <aside className="flex h-full w-[400px] flex-col border-l border-slate-200 bg-white">
      <InspectorHeader
        eyebrow="Trabajador"
        title={`${worker.firstName} ${worker.lastName}`}
        icon={<UserCircle2 className="h-4 w-4" />}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="DNI" value={worker.dni} />
              <Stat label="Estado" value={worker.status} />
              <Stat label="Régimen" value={worker.regimenLaboral} />
              <Stat label="Legajo" value={worker.legajoScore ?? 's/d'} />
            </div>
          </section>

          <section className="space-y-2">
            <SectionTitle icon={<BriefcaseBusiness className="h-3.5 w-3.5" />} label="Asignación actual" />
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Cargo</span>
                {position ? (
                  <button
                    type="button"
                    onClick={() => setSelectedPosition(position.id)}
                    className="truncate font-semibold text-emerald-700 hover:underline"
                  >
                    {position.title}
                  </button>
                ) : (
                  <span className="font-semibold text-slate-700">{worker.position ?? 'No definido'}</span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-slate-500">Unidad</span>
                <span className="truncate font-semibold text-slate-700">
                  {unit?.name ?? worker.department ?? 'No definida'}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-slate-500">Tipo</span>
                <span className="font-semibold text-slate-700">
                  {assignment.isInterim ? 'Interino' : 'Titular'} · {assignment.capacityPct}%
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <SectionTitle icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Datos laborales" />
            <div className="grid grid-cols-1 gap-2">
              {worker.email && <Stat label="Email" value={worker.email} />}
              <Stat label="Contrato" value={worker.tipoContrato} />
              <Stat
                label="Ingreso"
                value={new Date(worker.fechaIngreso).toLocaleDateString('es-PE')}
              />
            </div>
          </section>
        </div>
      </div>
    </aside>
  )
}

function InspectorHeader({
  eyebrow,
  title,
  icon,
  onClose,
}: {
  eyebrow: string
  title: string
  icon: ReactNode
  onClose: () => void
}) {
  return (
    <header className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {eyebrow}
          </div>
          <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="Cerrar inspector"
        title="Cerrar inspector ([)"
      >
        <X className="h-4 w-4" />
      </button>
    </header>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-xs text-slate-600">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  )
}

function SectionTitle({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {icon}
      {label}
    </h3>
  )
}

function CommissionOperatingBlock({
  commissionType,
  legalRoles,
  occupants,
  positions,
}: {
  commissionType: Exclude<ReturnType<typeof classifyCommissionUnit>, never>
  legalRoles: OrgChartTree['complianceRoles']
  occupants: OrgChartTree['assignments']
  positions: OrgChartTree['positions']
}) {
  const totalSeats = positions.reduce((sum, position) => sum + (position.seats ?? 1), 0)
  const occupiedSeats = occupants.length
  const missingActas = legalRoles.filter((role) => !role.actaUrl).length
  const leaderPosition = positions.find(
    (position) => position.isManagerial || /líder|lider|responsable|presidente|jefe/i.test(position.title),
  )
  const leaderAssigned = leaderPosition
    ? occupants.some((assignment) => assignment.positionId === leaderPosition.id)
    : false
  const nextTasks =
    commissionType === 'temporary'
      ? [
          'Definir objetivo y fecha de cierre',
          'Asignar líder del equipo',
          'Asignar responsables por tarea',
          'Adjuntar evidencias de cierre',
        ]
      : [
          'Confirmar miembros titulares',
          'Adjuntar acta de designación',
          'Revisar fecha de vigencia',
          'Retirar duplicados si existen',
        ]

  return (
    <section className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <SectionTitle icon={<Users className="h-3.5 w-3.5" />} label="Control operativo" />
      <div className="grid grid-cols-2 gap-2">
        <MiniStatus label="Tipo" value={commissionTypeLabel(commissionType)} />
        <MiniStatus label="Cobertura" value={`${occupiedSeats}/${Math.max(totalSeats, 1)}`} />
        <MiniStatus
          label="Líder"
          value={leaderAssigned ? 'Asignado' : 'Pendiente'}
          tone={leaderAssigned ? 'ok' : 'warn'}
        />
        <MiniStatus
          label="Actas"
          value={missingActas === 0 ? 'OK' : `${missingActas} pendiente${missingActas === 1 ? '' : 's'}`}
          tone={missingActas === 0 ? 'ok' : 'warn'}
        />
      </div>
      <div className="rounded-lg border border-white bg-white p-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Siguientes pasos
        </div>
        <ul className="mt-1.5 space-y-1 text-[11px] text-slate-600">
          {nextTasks.map((task) => (
            <li key={task} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {task}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function MiniStatus({
  label,
  tone = 'neutral',
  value,
}: {
  label: string
  tone?: 'neutral' | 'ok' | 'warn'
  value: string
}) {
  const toneClass = {
    neutral: 'border-slate-200 bg-white text-slate-800',
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
  }[tone]
  return (
    <div className={`rounded-lg border px-2 py-1.5 ${toneClass}`}>
      <div className="text-[9px] font-bold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-0.5 truncate text-[11px] font-semibold">{value}</div>
    </div>
  )
}

function Flag({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-slate-50 text-slate-400'
      }`}
    >
      {label}
    </div>
  )
}

function CompactList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <ul className="mt-1 space-y-1 text-xs text-slate-700">
        {items.slice(0, 5).map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-1.5">
            <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-emerald-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatUnknownList(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(formatUnknownList)
  }
  if (typeof value === 'string') return [value]
  return []
}

function daysUntil(value: string) {
  const end = new Date(value).getTime()
  if (!Number.isFinite(end)) return Number.POSITIVE_INFINITY
  return Math.ceil((end - Date.now()) / 86_400_000)
}

// ─── Tab "Reportes" — descargas relacionadas con la unidad ───────────────────
function ReportsTab({ unitId, unitName }: { unitId: string; unitName: string }) {
  const reports = [
    {
      label: 'MOF de la unidad',
      sub: 'Manual de Organización y Funciones',
      href: `/api/orgchart/mof?unitId=${encodeURIComponent(unitId)}`,
      Icon: ScrollText,
    },
    {
      label: 'Memoria Anual del Organigrama',
      sub: 'PDF institucional con sello SHA-256',
      href: `/api/orgchart/memoria-anual?year=${new Date().getFullYear()}`,
      Icon: ScrollText,
    },
    {
      label: 'Gráfico del organigrama',
      sub: 'PDF con jerarquía visual',
      href: `/api/orgchart/export-pdf`,
      Icon: Download,
    },
    {
      label: 'Reglamento Interno (RIT)',
      sub: 'Capítulos por jerarquía',
      href: `/api/orgchart/rit`,
      Icon: ScrollText,
    },
  ]

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-600">
        Reportes y documentos relacionados con <strong>{unitName}</strong>.
      </p>
      {reports.map((r) => (
        <a
          key={r.label}
          href={r.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition hover:border-emerald-300 hover:bg-emerald-50/40"
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
            <r.Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-semibold text-slate-900">{r.label}</div>
            <div className="text-[10px] text-slate-500">{r.sub}</div>
          </div>
          <Download className="h-3 w-3 text-slate-400" />
        </a>
      ))}
    </div>
  )
}

// ─── Tab "Costos" — sueldos agregados por unidad ─────────────────────────────
interface CostsTabProps {
  tree: OrgChartTree
  unitId: string
  positions: OrgChartTree['positions']
  occupants: OrgChartTree['assignments']
}

function CostsTab({ tree, unitId, positions, occupants }: CostsTabProps) {
  // Mapa unitId → todos los descendientes (incluyéndose a sí mismo)
  const descendantUnitIds = useMemo(() => {
    const result = new Set<string>([unitId])
    const queue = [unitId]
    while (queue.length) {
      const current = queue.shift()!
      const kids = tree.units.filter((u) => u.parentId === current)
      for (const k of kids) {
        if (!result.has(k.id)) {
          result.add(k.id)
          queue.push(k.id)
        }
      }
    }
    return result
  }, [tree.units, unitId])

  const subtreePositions = useMemo(
    () => tree.positions.filter((p) => descendantUnitIds.has(p.orgUnitId)),
    [tree.positions, descendantUnitIds],
  )
  const subtreePositionIds = new Set(subtreePositions.map((p) => p.id))
  const subtreeAssignments = tree.assignments.filter((a) =>
    subtreePositionIds.has(a.positionId),
  )

  // Sueldos: usamos salaryBandMin/Max como rango si están; si no, basados en
  // legajoScore/posición no tenemos sueldo real expuesto, así que mostramos
  // bandas. (El v1 hace esto mismo en what-if-cost.ts.)
  const positionsWithBand = subtreePositions.filter(
    (p) => p.salaryBandMin || p.salaryBandMax,
  )
  const totalMinAnnual = positionsWithBand.reduce((sum, p) => {
    const min = Number(p.salaryBandMin ?? '0')
    return sum + (Number.isFinite(min) ? min * 14 * (p.seats ?? 1) : 0)
  }, 0)
  const totalMaxAnnual = positionsWithBand.reduce((sum, p) => {
    const max = Number(p.salaryBandMax ?? p.salaryBandMin ?? '0')
    return sum + (Number.isFinite(max) ? max * 14 * (p.seats ?? 1) : 0)
  }, 0)

  const totalSeats = subtreePositions.reduce((s, p) => s + (p.seats ?? 1), 0)
  const totalOccupied = subtreeAssignments.length
  const fillRate = totalSeats > 0 ? Math.round((totalOccupied / totalSeats) * 100) : 100

  void positions
  void occupants

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600">
        Vista agregada de costos del subárbol bajo esta unidad
        ({descendantUnitIds.size} unidad{descendantUnitIds.size === 1 ? '' : 'es'}{' '}
        incluida{descendantUnitIds.size === 1 ? '' : 's'}).
      </p>

      <Stat label="Cargos totales (subárbol)" value={subtreePositions.length} />
      <Stat label="Plazas totales" value={totalSeats} />
      <Stat label="Ocupadas" value={`${totalOccupied} (${fillRate}%)`} />
      {totalMinAnnual > 0 && (
        <>
          <Stat
            label="Costo anual mínimo"
            value={`S/ ${totalMinAnnual.toLocaleString('es-PE')}`}
          />
          <Stat
            label="Costo anual máximo"
            value={`S/ ${totalMaxAnnual.toLocaleString('es-PE')}`}
          />
          <p className="text-[10px] text-slate-500">
            Estimación basada en bandas salariales registradas y 14 sueldos al año
            (incluye gratificaciones).
          </p>
        </>
      )}
      {totalMinAnnual === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
          Esta unidad no tiene bandas salariales registradas. Asígnalas en cada cargo
          para ver costos estimados.
        </div>
      )}
    </div>
  )
}

// ─── Tab "Historial" — últimos cambios estructurales ─────────────────────────
interface ChangeLogEntry {
  id: string
  type: string
  entityType: string
  entityId: string | null
  reason: string | null
  createdAt: string
  performedBy: { name: string } | null
}

function HistoryTab({ unitId }: { unitId: string }) {
  // Usamos useQuery para evitar el patrón "setState in effect" — react-query
  // maneja loading/error/data como state externo (cumple la regla nueva).
  const { data, isLoading, error } = useQuery({
    queryKey: ['orgchart', 'change-log', unitId],
    queryFn: async () => {
      const res = await fetch(
        `/api/orgchart/change-log?entityId=${encodeURIComponent(unitId)}&limit=50`,
        { cache: 'no-store' },
      )
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      return (json.entries ?? json ?? []) as ChangeLogEntry[]
    },
    staleTime: 60_000,
  })
  const entries = data ?? []
  const loading = isLoading

  if (loading) {
    return (
      <div className="flex justify-center py-6 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
        {error instanceof Error ? error.message : 'Error'}
      </div>
    )
  }
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        No hay cambios registrados sobre esta unidad.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs text-slate-600">
        <HistoryIcon className="h-3.5 w-3.5 text-slate-400" />
        Últimos {entries.length} cambios
      </p>
      <ol className="space-y-1.5">
        {entries.map((e) => (
          <li
            key={e.id}
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs"
          >
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-700">
                {e.type.replace(/_/g, ' ')}
              </span>
              <span className="ml-auto text-[10px] text-slate-500 tabular-nums">
                {new Date(e.createdAt).toLocaleString('es-PE', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {e.reason && (
              <p className="mt-1 text-[11px] text-slate-700">{e.reason}</p>
            )}
            {e.performedBy?.name && (
              <p className="mt-1 text-[10px] text-slate-500">
                por {e.performedBy.name}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
