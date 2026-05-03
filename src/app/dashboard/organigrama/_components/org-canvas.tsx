'use client'

import { useState, useRef, useCallback } from 'react'
import { computeLayout, computePositionLayout, bezierPath, orthogonalPath } from './layout-utils'
import type { OrgChartTree, OrgComplianceRoleDTO, OrgPositionDTO, OrgAssignmentDTO, OrgUnitDTO } from '@/lib/orgchart/types'
import { COMPLIANCE_ROLES } from '@/lib/orgchart/compliance-rules'
import { Building2, Users, ShieldCheck, AlertTriangle } from 'lucide-react'

const KIND_LABELS: Record<string, string> = {
  GERENCIA: 'Gerencia',
  AREA: 'Área',
  DEPARTAMENTO: 'Departamento',
  EQUIPO: 'Equipo',
  COMITE_LEGAL: 'Comité legal',
  BRIGADA: 'Brigada',
  PROYECTO: 'Proyecto',
}

const KIND_COLORS: Record<string, string> = {
  GERENCIA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  AREA: 'bg-sky-50 text-sky-700 border-sky-200',
  DEPARTAMENTO: 'bg-slate-50 text-slate-700 border-slate-200',
  EQUIPO: 'bg-violet-50 text-violet-700 border-violet-200',
  COMITE_LEGAL: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  BRIGADA: 'bg-amber-50 text-amber-700 border-amber-200',
  PROYECTO: 'bg-rose-50 text-rose-700 border-rose-200',
}

const ROLE_CHIP_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-800',
  sky: 'bg-sky-100 text-sky-800',
  amber: 'bg-amber-100 text-amber-800',
  violet: 'bg-violet-100 text-violet-800',
  rose: 'bg-rose-100 text-rose-800',
  slate: 'bg-slate-100 text-slate-700',
}

export interface OrgCanvasProps {
  tree: OrgChartTree
  view: 'hierarchy' | 'committees'
  lens: 'general' | 'mof' | 'compliance' | 'contractual' | 'sst' | 'vacancies'
  onSelectUnit: (unitId: string) => void
  selectedUnitId: string | null
  readOnly: boolean
  onRequestReparentPosition: (positionId: string, newParentId: string) => void
}

export default function OrgCanvas({
  tree,
  view,
  lens,
  onSelectUnit,
  selectedUnitId,
  readOnly,
  onRequestReparentPosition,
}: OrgCanvasProps) {
  const [zoom, setZoom] = useState(0.85)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [draggedPositionId, setDraggedPositionId] = useState<string | null>(null)
  const [dragOverPositionId, setDragOverPositionId] = useState<string | null>(null)
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filtrar unidades según vista
  const filteredUnits = view === 'committees' ? filterCommitteeUnits(tree) : tree.units
  const filteredUnitIds = new Set(filteredUnits.map(u => u.id))
  const filteredPositions = tree.positions.filter(p => filteredUnitIds.has(p.orgUnitId))
  const filteredAssignments = tree.assignments.filter(a =>
    filteredPositions.some(p => p.id === a.positionId),
  )

  const usesPositionNodes = view === 'hierarchy' && filteredPositions.length > 0
  const unitLayout = computeLayout(filteredUnits, filteredPositions, filteredAssignments)
  const positionLayout = computePositionLayout(filteredUnits, filteredPositions, filteredAssignments)
  const layout = usesPositionNodes ? positionLayout : unitLayout

  // Roles legales por workerId para mostrar chips
  const rolesByWorker = new Map<string, OrgComplianceRoleDTO[]>()
  for (const r of tree.complianceRoles) {
    const list = rolesByWorker.get(r.workerId) ?? []
    list.push(r)
    rolesByWorker.set(r.workerId, list)
  }

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    setDragging(true)
  }, [pan])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy })
  }, [])

  const onMouseUp = useCallback(() => {
    dragRef.current = null
    setDragging(false)
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    setZoom(z => Math.max(0.3, Math.min(2, z + delta)))
  }, [])

  const isValidPositionDrop = useCallback((targetPositionId: string) => {
    if (!draggedPositionId) return false
    if (draggedPositionId === targetPositionId) return false
    return !wouldCreatePositionCycle(tree, draggedPositionId, targetPositionId)
  }, [draggedPositionId, tree])

  if (filteredUnits.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-slate-500">
        <Building2 className="h-12 w-12 opacity-30" />
        <div className="text-sm">No hay unidades para mostrar en esta vista.</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle,_rgba(0,0,0,0.04)_1px,_transparent_1px)] bg-[size:24px_24px]"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      style={{ cursor: dragging ? 'grabbing' : 'grab' }}
    >
      <div
        className="origin-top-left transition-transform"
        style={{
          transform: `translate(${pan.x + 40}px, ${pan.y + 40}px) scale(${zoom})`,
          width: layout.width,
          height: layout.height,
        }}
      >
        <svg
          width={layout.width}
          height={layout.height}
          className="absolute inset-0 pointer-events-none"
        >
          {layout.edges.map((e, i) => (
            <path
              key={i}
              d={usesPositionNodes ? orthogonalPath(e) : bezierPath(e)}
              stroke="rgb(148 163 184 / 0.6)"
              strokeWidth={1.5}
              fill="none"
            />
          ))}
        </svg>
        {usesPositionNodes ? positionLayout.nodes.map(node => {
          const primaryOccupant = node.occupants.find(a => a.isPrimary) ?? node.occupants[0]
          const score = primaryOccupant?.worker.legajoScore ?? null
          const isVacant = node.occupants.length < node.position.seats
          const isSelected = node.unit?.id === selectedUnitId
          const isDropTarget = dragOverPositionId === node.id && draggedPositionId !== null
          const canDropHere = isDropTarget && isValidPositionDrop(node.id)
          const lensMeta = positionLensMeta(lens, node.position, node.occupants, rolesByWorker)
          const sstStamps = primaryOccupant
            ? sstRoleStamps(rolesByWorker.get(primaryOccupant.workerId) ?? [])
            : []
          const workerName = primaryOccupant
            ? `${primaryOccupant.worker.firstName} ${primaryOccupant.worker.lastName}`
            : `Vacante${isVacant && node.position.seats > 1 ? ` (${node.position.seats - node.occupants.length})` : ''}`
          return (
            <button
              key={node.id}
              draggable={!readOnly}
              onDragStart={(e) => {
                if (readOnly) return
                e.stopPropagation()
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', node.id)
                setDraggedPositionId(node.id)
              }}
              onDragEnd={() => {
                setDraggedPositionId(null)
                setDragOverPositionId(null)
              }}
              onDragOver={(e) => {
                if (readOnly || !draggedPositionId) return
                e.preventDefault()
                e.dataTransfer.dropEffect = isValidPositionDrop(node.id) ? 'move' : 'none'
                setDragOverPositionId(node.id)
              }}
              onDragLeave={() => {
                setDragOverPositionId(current => (current === node.id ? null : current))
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const draggedId = e.dataTransfer.getData('text/plain') || draggedPositionId
                setDraggedPositionId(null)
                setDragOverPositionId(null)
                if (!draggedId || readOnly || draggedId === node.id) return
                if (wouldCreatePositionCycle(tree, draggedId, node.id)) return
                onRequestReparentPosition(draggedId, node.id)
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onSelectUnit(node.unit?.id ?? node.position.orgUnitId)}
              className={`absolute rounded-lg border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                isSelected ? 'ring-4 ring-emerald-400/40 border-emerald-500' : 'border-slate-200'
              } ${isVacant ? 'border-dashed' : ''} ${score !== null && score >= 90 ? 'border-rose-400' : ''} ${
                canDropHere ? 'ring-4 ring-emerald-300 border-emerald-500' : ''
              } ${isDropTarget && !canDropHere ? 'ring-4 ring-rose-200 border-rose-400' : ''} ${
                draggedPositionId === node.id ? 'opacity-60' : ''
              } ${positionLensCardClass(lensMeta)}`}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
              }}
            >
              <div className={`h-1.5 rounded-t-lg ${contractBarClass(primaryOccupant?.worker.tipoContrato, isVacant)}`} />
              <div className="relative flex h-[84px] flex-col px-2.5 py-2">
                {(sstStamps.length > 0 || (score !== null && score >= 70)) && (
                  <div className="absolute right-2 top-1.5 flex max-w-[120px] flex-wrap justify-end gap-1">
                    {sstStamps.map(stamp => (
                      <span
                        key={stamp.title}
                        title={stamp.title}
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${stamp.className}`}
                      >
                        {stamp.label}
                      </span>
                    ))}
                    {score !== null && score >= 70 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${riskPillClass(score)}`}>
                        {score >= 90 ? `CRITICAL ${score}` : score}
                      </span>
                    )}
                  </div>
                )}
                {lensMeta && (
                  <span className={`absolute bottom-1.5 right-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${lensMeta.badgeClass}`}>
                    {lensMeta.label}
                  </span>
                )}
                <div className="max-w-[150px] truncate text-[10px] font-semibold uppercase text-slate-400">
                  {node.unit?.name ?? 'Sin área'}
                </div>
                <div className={`mt-1 truncate text-[13px] font-medium ${isVacant ? 'text-slate-400' : 'text-slate-900'}`}>
                  {workerName}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-slate-600">{node.position.title}</div>
                <div className="mt-auto flex items-center justify-between gap-2 text-[10px] text-slate-500">
                  <span>{node.directReports} reportes</span>
                  <span>{score === null ? 'Riesgo —' : `Riesgo ${score}`}</span>
                </div>
              </div>
            </button>
          )
        }) : unitLayout.nodes.map(node => {
          const isSelected = node.id === selectedUnitId
          const totalOccupants = Array.from(node.occupants.values()).reduce((s, l) => s + l.length, 0)
          return (
            <button
              key={node.id}
              onClick={() => onSelectUnit(node.id)}
              className={`absolute rounded-2xl border-2 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                isSelected ? 'ring-4 ring-emerald-400/40 border-emerald-500' : 'border-slate-200'
              }`}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                minHeight: node.height,
              }}
            >
              <div className={`flex items-center gap-2 rounded-t-2xl border-b px-4 py-2 text-xs font-medium ${KIND_COLORS[node.unit.kind]}`}>
                <Building2 className="h-3.5 w-3.5" />
                <span>{KIND_LABELS[node.unit.kind] ?? node.unit.kind}</span>
                {node.unit.code && <span className="ml-auto opacity-70">#{node.unit.code}</span>}
              </div>
              <div className="px-4 py-3">
                <div className="text-base font-semibold text-slate-900">{node.unit.name}</div>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {totalOccupants}{' '}
                    {totalOccupants === 1 ? 'persona' : 'personas'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {node.positions.length}{' '}
                    {node.positions.length === 1 ? 'cargo' : 'cargos'}
                  </span>
                </div>
                {/* Posiciones con ocupantes */}
                <div className="mt-3 space-y-1.5">
                  {node.positions.slice(0, 4).map(p => {
                    const occupants = node.occupants.get(p.id) ?? []
                    const vacant = p.seats > 0 && occupants.length < p.seats
                    const lensMeta = positionLensMeta(lens, p, occupants, rolesByWorker)
                    return (
                      <div key={p.id} className={`rounded-lg border bg-slate-50/60 px-2.5 py-1.5 ${positionLensRowClass(lensMeta)}`}>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="truncate font-medium text-slate-700">{p.title}</span>
                          {p.isManagerial && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                              Jefatura
                            </span>
                          )}
                          {lensMeta && (
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${lensMeta.badgeClass}`}>
                              {lensMeta.label}
                            </span>
                          )}
                        </div>
                        {occupants.length === 0 && vacant ? (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            Vacante
                          </div>
                        ) : (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {occupants.slice(0, 3).map(a => {
                              const roles = rolesByWorker.get(a.workerId) ?? []
                              return (
                                <div
                                  key={a.id}
                                  className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px]"
                                  title={`${a.worker.firstName} ${a.worker.lastName}`}
                                >
                                  {a.worker.photoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={a.worker.photoUrl}
                                      alt=""
                                      className="h-4 w-4 rounded-full"
                                    />
                                  ) : (
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">
                                      {a.worker.firstName.charAt(0)}
                                      {a.worker.lastName.charAt(0)}
                                    </span>
                                  )}
                                  <span className="max-w-[120px] truncate text-slate-700">
                                    {a.worker.firstName} {a.worker.lastName.charAt(0)}.
                                  </span>
                                  {a.isInterim && <span className="text-[9px] text-amber-600">(int.)</span>}
                                  {roles.slice(0, 2).map(r => {
                                    const def = COMPLIANCE_ROLES[r.roleType]
                                    return (
                                      <span
                                        key={r.id}
                                        className={`rounded px-1 text-[9px] font-bold ${ROLE_CHIP_COLORS[def.color]}`}
                                        title={`${def.label} · ${def.baseLegal}`}
                                      >
                                        {def.shortLabel}
                                      </span>
                                    )
                                  })}
                                </div>
                              )
                            })}
                            {occupants.length > 3 && (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600">
                                +{occupants.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {node.positions.length > 4 && (
                    <div className="text-[11px] text-slate-400">
                      +{node.positions.length - 4} cargos más
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Controles de zoom */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-sm shadow-lg backdrop-blur">
        <button
          onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100"
          title="Reducir zoom"
        >
          −
        </button>
        <span className="min-w-[40px] text-center text-xs tabular-nums text-slate-600">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => Math.min(2, z + 0.1))}
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100"
          title="Aumentar zoom"
        >
          +
        </button>
        <button
          onClick={() => {
            setZoom(0.85)
            setPan({ x: 0, y: 0 })
          }}
          className="ml-1 rounded-full px-2 py-0.5 text-xs hover:bg-slate-100"
        >
          Centrar
        </button>
      </div>
    </div>
  )
}

function filterCommitteeUnits(tree: OrgChartTree): OrgUnitDTO[] {
  // Vista "Comités legales": solo muestra unidades de tipo COMITE_LEGAL o BRIGADA,
  // y unidades que tengan algún rol de compliance asignado a sus posiciones.
  const unitIdsWithRoles = new Set(tree.complianceRoles.map(r => r.unitId).filter(Boolean) as string[])
  return tree.units.filter(
    u => u.kind === 'COMITE_LEGAL' || u.kind === 'BRIGADA' || unitIdsWithRoles.has(u.id),
  )
}

function contractBarClass(contractType: string | undefined, isVacant: boolean) {
  if (isVacant || !contractType) return 'bg-slate-300'
  if (contractType.includes('INDEFINIDO')) return 'bg-emerald-500'
  if (contractType.includes('PLAZO') || contractType.includes('MODAL')) return 'bg-amber-500'
  if (contractType.includes('LOCACION') || contractType.includes('SERVICIO')) return 'bg-orange-600'
  return 'bg-sky-500'
}

function riskPillClass(score: number) {
  if (score >= 90) return 'bg-rose-100 text-rose-700'
  if (score >= 70) return 'bg-amber-100 text-amber-800'
  return 'bg-emerald-100 text-emerald-700'
}

function positionLensMeta(
  lens: OrgCanvasProps['lens'],
  position: OrgPositionDTO,
  occupants: OrgAssignmentDTO[],
  rolesByWorker: Map<string, OrgComplianceRoleDTO[]> = new Map(),
) {
  const vacant = occupants.length < position.seats
  const missingMof = !hasMof(position)
  const occupantSstStamps = occupants.flatMap(occupant => sstRoleStamps(rolesByWorker.get(occupant.workerId) ?? []))
  const sstSensitive = Boolean(
    position.requiresSctr ||
    position.requiresMedicalExam ||
    position.isCritical ||
    ['ALTO', 'CRITICO', 'CRÍTICO'].includes((position.riskCategory ?? '').toUpperCase()),
  )

  if (lens === 'mof' && missingMof) {
    return { label: 'MOF', badgeClass: 'bg-rose-100 text-rose-700', tone: 'danger' as const }
  }
  if (lens === 'compliance') {
    const score = occupants.find(item => item.isPrimary)?.worker.legajoScore ?? occupants[0]?.worker.legajoScore ?? null
    if (score !== null && score >= 90) return { label: `Critico ${score}`, badgeClass: 'bg-rose-100 text-rose-700', tone: 'danger' as const }
    if (score !== null && score >= 70) return { label: `Riesgo ${score}`, badgeClass: 'bg-amber-100 text-amber-800', tone: 'warning' as const }
    if (position.isCritical) return { label: 'Critico', badgeClass: 'bg-amber-100 text-amber-800', tone: 'warning' as const }
  }
  if (lens === 'contractual') {
    const contractType = occupants.find(item => item.isPrimary)?.worker.tipoContrato ?? occupants[0]?.worker.tipoContrato ?? null
    if (vacant) return { label: 'Vacante', badgeClass: 'bg-sky-100 text-sky-700', tone: 'info' as const }
    if (contractType) return contractLensMeta(contractType)
  }
  if (lens === 'sst' && sstSensitive && occupantSstStamps.length === 0) {
    return { label: 'SST sin rol', badgeClass: 'bg-slate-200 text-slate-700', tone: 'neutral' as const }
  }
  if (lens === 'sst' && sstSensitive) {
    return { label: 'SST', badgeClass: 'bg-amber-100 text-amber-800', tone: 'warning' as const }
  }
  if (lens === 'sst' && occupantSstStamps.length > 0) {
    return { label: occupantSstStamps.map(stamp => stamp.label).join('/'), badgeClass: 'bg-emerald-100 text-emerald-800', tone: 'success' as const }
  }
  if (lens === 'vacancies' && vacant) {
    return { label: 'Vacante', badgeClass: 'bg-sky-100 text-sky-700', tone: 'info' as const }
  }
  return null
}

function positionLensCardClass(meta: ReturnType<typeof positionLensMeta>) {
  if (!meta) return ''
  if (meta.tone === 'danger') return 'border-rose-300 ring-2 ring-rose-100'
  if (meta.tone === 'warning') return 'border-amber-300 ring-2 ring-amber-100'
  if (meta.tone === 'success') return 'border-emerald-300 ring-2 ring-emerald-100'
  if (meta.tone === 'neutral') return 'border-slate-300 ring-2 ring-slate-100'
  return 'border-sky-300 ring-2 ring-sky-100'
}

function positionLensRowClass(meta: ReturnType<typeof positionLensMeta>) {
  if (!meta) return 'border-slate-100'
  if (meta.tone === 'danger') return 'border-rose-200 bg-rose-50'
  if (meta.tone === 'warning') return 'border-amber-200 bg-amber-50'
  if (meta.tone === 'success') return 'border-emerald-200 bg-emerald-50'
  if (meta.tone === 'neutral') return 'border-slate-200 bg-slate-100'
  return 'border-sky-200 bg-sky-50'
}

function sstRoleStamps(roles: OrgComplianceRoleDTO[]) {
  const stamps = roles
    .map(role => {
      if (role.roleType === 'PRESIDENTE_COMITE_SST') {
        return { label: 'P', title: 'Presidente Comité SST', className: 'bg-emerald-100 text-emerald-800' }
      }
      if (role.roleType === 'SECRETARIO_COMITE_SST') {
        return { label: 'S', title: 'Secretario Comité SST', className: 'bg-sky-100 text-sky-800' }
      }
      if (role.roleType === 'REPRESENTANTE_TRABAJADORES_SST' || role.roleType === 'REPRESENTANTE_EMPLEADOR_SST') {
        return { label: 'M', title: COMPLIANCE_ROLES[role.roleType].label, className: 'bg-amber-100 text-amber-800' }
      }
      if (role.roleType === 'SUPERVISOR_SST') {
        return { label: 'Sup', title: 'Supervisor SST', className: 'bg-violet-100 text-violet-800' }
      }
      return null
    })
    .filter(Boolean) as Array<{ label: string; title: string; className: string }>

  return Array.from(new Map(stamps.map(stamp => [stamp.title, stamp])).values()).slice(0, 3)
}

function contractLensMeta(contractType: string) {
  const normalized = contractType.toUpperCase()
  if (normalized.includes('LOCACION') || normalized.includes('SERVICIO')) {
    return { label: 'Civil', badgeClass: 'bg-orange-100 text-orange-800', tone: 'warning' as const }
  }
  if (normalized.includes('PLAZO') || normalized.includes('MODAL') || normalized.includes('TEMPORAL')) {
    return { label: 'Plazo', badgeClass: 'bg-amber-100 text-amber-800', tone: 'warning' as const }
  }
  if (normalized.includes('INDEFINIDO')) {
    return { label: 'Indef.', badgeClass: 'bg-emerald-100 text-emerald-800', tone: 'success' as const }
  }
  return { label: 'Contrato', badgeClass: 'bg-sky-100 text-sky-700', tone: 'info' as const }
}

function hasMof(position: OrgPositionDTO) {
  return Boolean(position.purpose && position.functions && position.responsibilities && position.requirements)
}

function wouldCreatePositionCycle(tree: OrgChartTree, positionId: string, newParentId: string) {
  let cursor: string | null = newParentId
  const seen = new Set<string>()
  const positionsById = new Map(tree.positions.map(position => [position.id, position]))

  while (cursor) {
    if (cursor === positionId) return true
    if (seen.has(cursor)) return true
    seen.add(cursor)
    cursor = positionsById.get(cursor)?.reportsToPositionId ?? null
  }

  return false
}
