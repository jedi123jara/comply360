/**
 * Hook que adapta `OrgChartTree` (formato del backend) al formato de @xyflow.
 *
 * Devuelve `{ nodes, edges }` listos para pasarle a `<ReactFlow>` con el
 * layout aplicado según el `layoutMode` actual del store.
 */
'use client'

import { useMemo } from 'react'
import type { Node, Edge } from '@xyflow/react'

import type { OrgChartTree } from '@/lib/orgchart/types'
import type { CoverageReport, UnitCoverage } from '@/lib/orgchart/coverage-aggregator'
import type { CopilotPlan } from '@/lib/orgchart/copilot/operations'
import {
  buildUnitPath,
  inferPositionHierarchy,
  inferUnitHierarchy,
  isParallelGovernanceUnit,
} from '@/lib/orgchart/hierarchy-inference'
import { runLayout } from '../layouts/layout-engine'
import type { LayoutMode } from '../../state/slices/canvas-slice'

/** Responsable (líder) de una unidad, derivado de leadByUnit + su ocupante titular. */
export interface UnitResponsable {
  name: string
  photoUrl: string | null
  gender: string | null
  title: string
  interim: boolean
}

/** Cargo de una unidad, resumido para la tarjeta rica. */
export interface UnitCargoLite {
  positionId: string
  title: string
  vacant: boolean
  occupantName: string | null
  occupantPhotoUrl: string | null
  isCritical: boolean
}

export interface UnitNodeData extends Record<string, unknown> {
  kind: 'unit'
  unitId: string
  name: string
  unitKind: string
  hierarchyLevel: number
  unitPath: string
  positionsCount: number
  occupantsCount: number
  coverage: UnitCoverage | null
  /** Tarjeta rica (Fase 1 v3): responsable + cargos + vacantes. */
  responsable?: UnitResponsable | null
  cargos?: UnitCargoLite[]
  vacantesCount?: number
  /** Si este nodo viene del plan del Copiloto (no del árbol real). */
  ghost?: boolean
  /** Focus mode: si true, el nodo se atenúa con un fade suave (framer). */
  dimmed?: boolean
  /** Plegado: este nodo está colapsado (oculta sus descendientes). */
  collapsed?: boolean
  /** Cuántos descendientes oculta el plegado. */
  hiddenCount?: number
}

export interface PositionNodeData extends Record<string, unknown> {
  kind: 'position'
  positionId: string
  unitId: string
  unitName: string | null
  unitKind: string | null
  unitPath: string
  hierarchyLevel: number
  title: string
  occupants: Array<{ workerId: string; name: string; isInterim: boolean; legajoScore: number | null; status: string }>
  vacant: boolean
  isManagerial: boolean
  isCritical: boolean
  isUnitLead: boolean
  inferredReportsTo: boolean
  directReports: number
  coverage: UnitCoverage | null
  /** Focus mode: si true, el nodo se atenúa con un fade suave (framer). */
  dimmed?: boolean
}

export type OrgFlowNode = Node<UnitNodeData> | Node<PositionNodeData>

export interface BuildFlowOptions {
  /** Si es true, usa nodos de tipo `positionNode` (cargo individual). Si no, agrupa por unidad. */
  positionMode?: boolean
  /** Plan del Copiloto IA — si está, se inyectan ghost nodes y edges punteadas para preview. */
  copilotPreviewPlan?: CopilotPlan | null
  /** IDs de unidades colapsadas — se ocultan sus descendientes. */
  collapsedIds?: Set<string>
  /**
   * Vista Comisiones: los comités son órganos PARALELOS independientes (no
   * tienen jerarquía entre sí). Cuando es true, se excluyen de la inferencia de
   * jerarquía para no pintar aristas padre-hijo falsas → tarjetas independientes.
   */
  committeesView?: boolean
}

/**
 * Convierte un `OrgChartTree` a nodos/aristas de @xyflow y aplica layout.
 *
 * Si recibe un plan del Copiloto (`copilotPreviewPlan`), inyecta ghost nodes
 * (createUnit/createPosition) y edges punteadas verdes para visualizar el
 * diff propuesto sin tocar el árbol real.
 */
export function useTreeToFlow(
  tree: OrgChartTree | null,
  layoutMode: LayoutMode,
  coverage: CoverageReport | null,
  opts: BuildFlowOptions = {},
): { nodes: OrgFlowNode[]; edges: Edge[] } {
  return useMemo(() => {
    if (!tree) return { nodes: [], edges: [] }

    const base = opts.positionMode
      ? buildPositionFlow(tree, layoutMode, coverage, opts.committeesView)
      : buildUnitFlow(tree, layoutMode, coverage, opts.collapsedIds, opts.committeesView)

    if (!opts.copilotPreviewPlan) return base
    // Aplica overlay de ghost nodes encima del árbol real
    return overlayCopilotPreview(base, opts.copilotPreviewPlan, layoutMode, opts.positionMode ?? false)
  }, [
    tree,
    layoutMode,
    coverage,
    opts.positionMode,
    opts.copilotPreviewPlan,
    opts.collapsedIds,
    opts.committeesView,
  ])
}

/**
 * Toma el árbol real ya layouteado y le agrega los ghost nodes del plan
 * Copiloto sin re-layoutear todo el árbol (mantenemos posiciones reales).
 *
 * Para los ghost: layouteamos solo el subgrafo nuevo (createUnit/createPosition)
 * con dagre LR pequeño y los posicionamos cerca del nodo padre real.
 */
function overlayCopilotPreview(
  base: { nodes: OrgFlowNode[]; edges: Edge[] },
  plan: CopilotPlan,
  _layoutMode: LayoutMode,
  positionMode: boolean,
): { nodes: OrgFlowNode[]; edges: Edge[] } {
  const ghostNodes: OrgFlowNode[] = []
  const ghostEdges: Edge[] = []

  // Mapa de keys/temp → posición (para colocar el ghost donde corresponde)
  const realPositionByNodeId = new Map<string, { x: number; y: number; w: number; h: number }>()
  for (const n of base.nodes) {
    realPositionByNodeId.set(n.id, {
      x: n.position.x,
      y: n.position.y,
      w: (n.width as number | undefined) ?? 240,
      h: (n.height as number | undefined) ?? 120,
    })
  }

  const ghostUnitOps = plan.operations.filter((op) => op.op === 'createUnit')
  const ghostPositionOps = plan.operations.filter((op) => op.op === 'createPosition')

  // Posicionar ghosts cerca de su parent: si parent es real → bajo el parent.
  // Si parent es otro ghost → cascada al lado.
  const ghostPositions = new Map<string, { x: number; y: number }>()

  function findChildOffset(parentX: number, parentY: number, parentH: number, index: number) {
    return {
      x: parentX + index * 260,
      y: parentY + parentH + 90,
    }
  }

  // Layout de ghost units
  ghostUnitOps.forEach((op, i) => {
    if (op.op !== 'createUnit') return
    const parentRef = op.parentRef
    let baseX = 0
    let baseY = 0
    let baseH = 100
    if (parentRef && realPositionByNodeId.has(parentRef)) {
      const real = realPositionByNodeId.get(parentRef)!
      baseX = real.x
      baseY = real.y
      baseH = real.h
    } else if (parentRef && ghostPositions.has(parentRef)) {
      const ghost = ghostPositions.get(parentRef)!
      baseX = ghost.x
      baseY = ghost.y
      baseH = 100
    } else {
      // Sin parent → ponerlo arriba del árbol
      baseX = -300
      baseY = -200 + i * 140
    }
    const pos = findChildOffset(baseX, baseY, baseH, i)
    ghostPositions.set(op.tempKey, pos)

    ghostNodes.push({
      id: `ghost-unit-${op.tempKey}`,
      type: 'unitNode',
      position: pos,
      data: {
        kind: 'unit',
        unitId: `ghost-${op.tempKey}`,
        name: `+ ${op.name}`,
        unitKind: op.kind,
        hierarchyLevel: 0,
        unitPath: `+ ${op.name}`,
        positionsCount: 0,
        occupantsCount: 0,
        coverage: null,
        ghost: true,
      } satisfies UnitNodeData,
      style: { opacity: 0.7 },
      width: 240,
      height: 120,
    })

    if (parentRef) {
      const sourceId = realPositionByNodeId.has(parentRef)
        ? parentRef
        : `ghost-unit-${parentRef}`
      ghostEdges.push({
        id: `ghost-edge-${parentRef}-${op.tempKey}`,
        source: sourceId,
        target: `ghost-unit-${op.tempKey}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#2563eb', strokeWidth: 2, strokeDasharray: '6 4' },
      })
    }
  })

  // Ghost positions
  if (positionMode) {
    ghostPositionOps.forEach((op, i) => {
      if (op.op !== 'createPosition') return
      const parentInGhostUnit = ghostPositions.get(op.unitRef)
      let baseX = 0
      let baseY = 0
      if (parentInGhostUnit) {
        baseX = parentInGhostUnit.x + 24
        baseY = parentInGhostUnit.y + 130 + i * 110
      } else if (realPositionByNodeId.has(op.unitRef)) {
        const real = realPositionByNodeId.get(op.unitRef)!
        baseX = real.x + 24
        baseY = real.y + real.h + 16 + i * 110
      } else {
        baseX = -200 + i * 220
        baseY = 200
      }

      ghostNodes.push({
        id: `ghost-pos-${op.tempKey}`,
        type: 'positionNode',
        position: { x: baseX, y: baseY },
        data: {
          kind: 'position',
          positionId: `ghost-${op.tempKey}`,
          unitId: op.unitRef,
          unitName: null,
          unitKind: null,
          unitPath: 'Propuesta IA',
          hierarchyLevel: 0,
          title: `+ ${op.title}`,
          occupants: [],
          vacant: true,
          isManagerial: op.isManagerial ?? false,
          isCritical: op.isCritical ?? false,
          isUnitLead: false,
          inferredReportsTo: false,
          directReports: 0,
          coverage: null,
        } satisfies PositionNodeData,
        style: { opacity: 0.7 },
        width: 260,
        height: 126,
      })

      if (op.reportsToRef) {
        const sourceId = realPositionByNodeId.has(op.reportsToRef)
          ? op.reportsToRef
          : `ghost-pos-${op.reportsToRef}`
        ghostEdges.push({
          id: `ghost-edge-${op.reportsToRef}-${op.tempKey}`,
          source: sourceId,
          target: `ghost-pos-${op.tempKey}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#2563eb', strokeWidth: 2, strokeDasharray: '6 4' },
        })
      }
    })
  }

  return {
    nodes: [...base.nodes, ...ghostNodes],
    edges: [...base.edges, ...ghostEdges],
  }
}

/**
 * Oculta los descendientes de los nodos colapsados y marca cada nodo colapsado
 * con `collapsed: true` + `hiddenCount`. `parentOf` devuelve el padre de un id.
 */
function applyCollapse(
  nodes: OrgFlowNode[],
  edges: Edge[],
  parentOf: (id: string) => string | null | undefined,
  collapsed?: Set<string>,
): { nodes: OrgFlowNode[]; edges: Edge[] } {
  if (!collapsed || collapsed.size === 0) return { nodes, edges }
  const hiddenCount = new Map<string, number>()
  const visible = nodes.filter((n) => {
    // Contar el nodo en TODOS sus ancestros colapsados (no solo el más cercano):
    // con colapsos anidados en la misma rama, el badge del ancestro externo debe
    // reflejar el total real de descendientes ocultos.
    let cur = parentOf(n.id)
    let hidden = false
    while (cur) {
      if (collapsed.has(cur)) {
        hidden = true
        hiddenCount.set(cur, (hiddenCount.get(cur) ?? 0) + 1)
      }
      cur = parentOf(cur)
    }
    return !hidden
  })
  const visibleIds = new Set(visible.map((n) => n.id))
  const decorated = visible.map((n) =>
    collapsed.has(n.id)
      ? ({ ...n, data: { ...n.data, collapsed: true, hiddenCount: hiddenCount.get(n.id) ?? 0 } } as OrgFlowNode)
      : n,
  )
  const visibleEdges = edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
  return { nodes: decorated, edges: visibleEdges }
}

function buildUnitFlow(
  tree: OrgChartTree,
  layoutMode: LayoutMode,
  coverage: CoverageReport | null,
  collapsedIds?: Set<string>,
  committeesView?: boolean,
): { nodes: OrgFlowNode[]; edges: Edge[] } {
  const unitsById = new Map(tree.units.map((unit) => [unit.id, unit]))
  // 1) Indexar posiciones y asignaciones por unidad
  const positionsByUnit = new Map<string, number>()
  for (const p of tree.positions) {
    positionsByUnit.set(p.orgUnitId, (positionsByUnit.get(p.orgUnitId) ?? 0) + 1)
  }
  const positionById = new Map(tree.positions.map((p) => [p.id, p]))
  const occupantsByUnit = new Map<string, number>()
  for (const a of tree.assignments) {
    const pos = positionById.get(a.positionId)
    if (!pos) continue
    occupantsByUnit.set(pos.orgUnitId, (occupantsByUnit.get(pos.orgUnitId) ?? 0) + 1)
  }

  // 1b) Datos de la tarjeta rica (Fase 1 v3): cargos por unidad, ocupantes por
  // cargo, y el responsable (ocupante titular del cargo líder de la unidad).
  const positionsListByUnit = new Map<string, OrgChartTree['positions']>()
  for (const p of tree.positions) {
    const arr = positionsListByUnit.get(p.orgUnitId) ?? []
    arr.push(p)
    positionsListByUnit.set(p.orgUnitId, arr)
  }
  const occupantsByPos = new Map<string, OrgChartTree['assignments']>()
  for (const a of tree.assignments) {
    const arr = occupantsByPos.get(a.positionId) ?? []
    arr.push(a)
    occupantsByPos.set(a.positionId, arr)
  }
  const leadByUnit = inferPositionHierarchy({
    units: tree.units,
    positions: tree.positions,
    assignments: tree.assignments,
  }).leadByUnit

  function buildCargos(unitId: string): { cargos: UnitCargoLite[]; vacantes: number } {
    let vacantes = 0
    const cargos = (positionsListByUnit.get(unitId) ?? []).map((p) => {
      const occ = occupantsByPos.get(p.id) ?? []
      const seats = p.seats ?? 1
      if (occ.length < seats) vacantes += seats - occ.length
      const first = occ[0]
      return {
        positionId: p.id,
        title: p.title,
        vacant: occ.length === 0,
        occupantName: first ? `${first.worker.firstName} ${first.worker.lastName}` : null,
        occupantPhotoUrl: first?.worker.photoUrl ?? null,
        isCritical: Boolean(p.isCritical),
      } satisfies UnitCargoLite
    })
    return { cargos, vacantes }
  }

  function buildResponsable(unitId: string): UnitResponsable | null {
    const lead = leadByUnit.get(unitId)
    if (!lead) return null
    const first = (occupantsByPos.get(lead.id) ?? [])[0]
    if (!first) return null
    return {
      name: `${first.worker.firstName} ${first.worker.lastName}`,
      photoUrl: first.worker.photoUrl,
      gender: first.worker.gender,
      title: lead.title,
      interim: first.isInterim,
    }
  }

  // 2) Construir nodos
  const nodes: OrgFlowNode[] = tree.units.map((u) => {
    const { cargos, vacantes } = buildCargos(u.id)
    return {
      id: u.id,
      type: 'unitNode',
      position: { x: 0, y: 0 }, // será reemplazada por el layout
      data: {
        kind: 'unit',
        unitId: u.id,
        name: u.name,
        unitKind: u.kind,
        hierarchyLevel: u.level,
        unitPath: buildUnitPath(u.id, unitsById),
        positionsCount: positionsByUnit.get(u.id) ?? 0,
        occupantsCount: occupantsByUnit.get(u.id) ?? 0,
        coverage: coverage?.byUnit.get(u.id) ?? null,
        responsable: buildResponsable(u.id),
        cargos,
        vacantesCount: vacantes,
      } satisfies UnitNodeData,
    }
  })

  // En la vista Comisiones, los comités son órganos PARALELOS independientes
  // (Art. 44 D.S. 005-2012-TR / comités obligatorios): NO tienen jerarquía entre
  // sí. Los excluimos de la inferencia (mismo criterio que reorganize/route.ts)
  // para que no se les invente un padre → se pintan como tarjetas independientes
  // sin aristas. Si no, la heurística los cuelga de un comité-raíz artificial.
  const excludedUnitIds = committeesView
    ? new Set(tree.units.filter(isParallelGovernanceUnit).map((u) => u.id))
    : undefined

  const unitHierarchy = inferUnitHierarchy({
    units: tree.units,
    positions: tree.positions,
    assignments: tree.assignments,
    excludedUnitIds,
  })

  // 3) Aristas: padre → hijo. Si la estructura viene plana desde planilla,
  // pintamos la jerarquía sugerida para que el organigrama nazca como árbol.
  const edges: Edge[] = []
  for (const u of tree.units) {
    const parentId = unitHierarchy.parentByUnit.get(u.id) ?? null
    if (parentId) {
      const inferred = unitHierarchy.inferredUnitIds.has(u.id)
      edges.push({
        id: `e-${parentId}-${u.id}`,
        source: parentId,
        target: u.id,
        type: 'smoothstep',
        style: inferred
          ? { stroke: 'rgb(56 189 248 / 0.55)', strokeWidth: 1.6, strokeDasharray: '6 5' }
          : { stroke: 'rgb(148 163 184 / 0.7)', strokeWidth: 1.5 },
      })
    }
  }

  // 4) Plegar ramas: ocultar descendientes de unidades colapsadas
  const pruned = applyCollapse(
    nodes,
    edges,
    (id) => unitHierarchy.parentByUnit.get(id) ?? null,
    collapsedIds,
  )
  // 5) Aplicar layout
  const { nodes: laidOut } = runLayout(pruned.nodes as Node[], pruned.edges, layoutMode)
  return { nodes: laidOut as OrgFlowNode[], edges: pruned.edges }
}

function buildPositionFlow(
  tree: OrgChartTree,
  layoutMode: LayoutMode,
  coverage: CoverageReport | null,
  committeesView?: boolean,
): { nodes: OrgFlowNode[]; edges: Edge[] } {
  const unitsById = new Map(tree.units.map((u) => [u.id, u]))
  const occupantsByPos = new Map<
    string,
    Array<{ workerId: string; name: string; isInterim: boolean; legajoScore: number | null; status: string }>
  >()
  for (const a of tree.assignments) {
    const list = occupantsByPos.get(a.positionId) ?? []
    list.push({
      workerId: a.workerId,
      name: `${a.worker.firstName} ${a.worker.lastName}`,
      isInterim: a.isInterim,
      legajoScore: a.worker.legajoScore,
      status: a.worker.status,
    })
    occupantsByPos.set(a.positionId, list)
  }

  // Vista Comisiones: los comités son órganos paralelos independientes; se
  // excluyen de la inferencia para no encadenar los cargos de un comité al líder
  // de otro (aristas cruzadas falsas). Mismo criterio que buildUnitFlow.
  const excludedUnitIds = committeesView
    ? new Set(tree.units.filter(isParallelGovernanceUnit).map((u) => u.id))
    : undefined

  const hierarchy = inferPositionHierarchy({
    units: tree.units,
    positions: tree.positions,
    assignments: tree.assignments,
    excludedUnitIds,
  })

  const nodes: OrgFlowNode[] = tree.positions.map((p) => {
    const unit = unitsById.get(p.orgUnitId) ?? null
    const occupants = occupantsByPos.get(p.id) ?? []
    return {
      id: p.id,
      type: 'positionNode',
      position: { x: 0, y: 0 },
      width: 260,
      height: 126,
      data: {
        kind: 'position',
        positionId: p.id,
        unitId: p.orgUnitId,
        unitName: unit?.name ?? null,
        unitKind: unit?.kind ?? null,
        unitPath: buildUnitPath(unit?.id ?? null, unitsById),
        hierarchyLevel: unit?.level ?? 0,
        title: p.title,
        occupants,
        vacant: occupants.length < p.seats,
        isManagerial: Boolean(p.isManagerial),
        isCritical: Boolean(p.isCritical),
        isUnitLead: hierarchy.leadByUnit.get(p.orgUnitId)?.id === p.id,
        inferredReportsTo: hierarchy.inferredPositionIds.has(p.id),
        directReports: hierarchy.directReportsByPosition.get(p.id) ?? 0,
        coverage: coverage?.byUnit.get(p.orgUnitId) ?? null,
      } satisfies PositionNodeData,
    }
  })

  const edges: Edge[] = []
  for (const p of tree.positions) {
    const parentId = hierarchy.parentByPosition.get(p.id)
    if (parentId) {
      const edgeId = `e-${parentId}-${p.id}`
      const inferred = hierarchy.inferredPositionIds.has(p.id)
      edges.push({
        id: edgeId,
        source: parentId,
        target: p.id,
        type: 'smoothstep',
        style: inferred
          ? { stroke: 'rgb(56 189 248 / 0.55)', strokeWidth: 1.6, strokeDasharray: '6 5' }
          : { stroke: 'rgb(148 163 184 / 0.76)', strokeWidth: 1.8 },
      })
    }
  }

  const { nodes: laidOut } = runLayout(nodes as Node[], edges, layoutMode)
  return { nodes: laidOut as OrgFlowNode[], edges }
}
