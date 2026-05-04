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
import { runLayout } from '../layouts/layout-engine'
import type { LayoutMode } from '../../state/slices/canvas-slice'

export interface UnitNodeData extends Record<string, unknown> {
  kind: 'unit'
  unitId: string
  name: string
  unitKind: string
  positionsCount: number
  occupantsCount: number
  coverage: UnitCoverage | null
}

export interface PositionNodeData extends Record<string, unknown> {
  kind: 'position'
  positionId: string
  unitId: string
  unitName: string | null
  title: string
  occupants: Array<{ workerId: string; name: string; isInterim: boolean; legajoScore: number | null }>
  vacant: boolean
  isManagerial: boolean
  isCritical: boolean
  directReports: number
  coverage: UnitCoverage | null
}

export type OrgFlowNode = Node<UnitNodeData> | Node<PositionNodeData>

export interface BuildFlowOptions {
  /** Si es true, usa nodos de tipo `positionNode` (cargo individual). Si no, agrupa por unidad. */
  positionMode?: boolean
}

/**
 * Convierte un `OrgChartTree` a nodos/aristas de @xyflow y aplica layout.
 */
export function useTreeToFlow(
  tree: OrgChartTree | null,
  layoutMode: LayoutMode,
  coverage: CoverageReport | null,
  opts: BuildFlowOptions = {},
): { nodes: OrgFlowNode[]; edges: Edge[] } {
  return useMemo(() => {
    if (!tree) return { nodes: [], edges: [] }

    if (opts.positionMode) {
      return buildPositionFlow(tree, layoutMode, coverage)
    }
    return buildUnitFlow(tree, layoutMode, coverage)
  }, [tree, layoutMode, coverage, opts.positionMode])
}

function buildUnitFlow(
  tree: OrgChartTree,
  layoutMode: LayoutMode,
  coverage: CoverageReport | null,
): { nodes: OrgFlowNode[]; edges: Edge[] } {
  // 1) Indexar posiciones y asignaciones por unidad
  const positionsByUnit = new Map<string, number>()
  for (const p of tree.positions) {
    positionsByUnit.set(p.orgUnitId, (positionsByUnit.get(p.orgUnitId) ?? 0) + 1)
  }
  const occupantsByUnit = new Map<string, number>()
  for (const a of tree.assignments) {
    const pos = tree.positions.find((p) => p.id === a.positionId)
    if (!pos) continue
    occupantsByUnit.set(pos.orgUnitId, (occupantsByUnit.get(pos.orgUnitId) ?? 0) + 1)
  }

  // 2) Construir nodos
  const nodes: OrgFlowNode[] = tree.units.map((u) => ({
    id: u.id,
    type: 'unitNode',
    position: { x: 0, y: 0 }, // será reemplazada por el layout
    data: {
      kind: 'unit',
      unitId: u.id,
      name: u.name,
      unitKind: u.kind,
      positionsCount: positionsByUnit.get(u.id) ?? 0,
      occupantsCount: occupantsByUnit.get(u.id) ?? 0,
      coverage: coverage?.byUnit.get(u.id) ?? null,
    } satisfies UnitNodeData,
  }))

  // 3) Aristas: padre → hijo
  const edges: Edge[] = []
  for (const u of tree.units) {
    if (u.parentId) {
      edges.push({
        id: `e-${u.parentId}-${u.id}`,
        source: u.parentId,
        target: u.id,
        type: 'smoothstep',
        style: { stroke: 'rgb(148 163 184 / 0.7)', strokeWidth: 1.5 },
      })
    }
  }

  // 4) Aplicar layout
  const { nodes: laidOut } = runLayout(nodes as Node[], edges, layoutMode)
  return { nodes: laidOut as OrgFlowNode[], edges }
}

function buildPositionFlow(
  tree: OrgChartTree,
  layoutMode: LayoutMode,
  coverage: CoverageReport | null,
): { nodes: OrgFlowNode[]; edges: Edge[] } {
  const unitsById = new Map(tree.units.map((u) => [u.id, u]))
  const positionIds = new Set(tree.positions.map((p) => p.id))

  // direct reports counter
  const directReportsByPos = new Map<string, number>()
  for (const p of tree.positions) {
    if (p.reportsToPositionId && positionIds.has(p.reportsToPositionId)) {
      directReportsByPos.set(
        p.reportsToPositionId,
        (directReportsByPos.get(p.reportsToPositionId) ?? 0) + 1,
      )
    }
  }

  // occupants by position
  const occupantsByPos = new Map<
    string,
    Array<{ workerId: string; name: string; isInterim: boolean; legajoScore: number | null }>
  >()
  for (const a of tree.assignments) {
    const list = occupantsByPos.get(a.positionId) ?? []
    list.push({
      workerId: a.workerId,
      name: `${a.worker.firstName} ${a.worker.lastName}`,
      isInterim: a.isInterim,
      legajoScore: a.worker.legajoScore,
    })
    occupantsByPos.set(a.positionId, list)
  }

  const nodes: OrgFlowNode[] = tree.positions.map((p) => {
    const unit = unitsById.get(p.orgUnitId) ?? null
    const occupants = occupantsByPos.get(p.id) ?? []
    return {
      id: p.id,
      type: 'positionNode',
      position: { x: 0, y: 0 },
      data: {
        kind: 'position',
        positionId: p.id,
        unitId: p.orgUnitId,
        unitName: unit?.name ?? null,
        title: p.title,
        occupants,
        vacant: occupants.length < p.seats,
        isManagerial: Boolean(p.isManagerial),
        isCritical: Boolean(p.isCritical),
        directReports: directReportsByPos.get(p.id) ?? 0,
        coverage: coverage?.byUnit.get(p.orgUnitId) ?? null,
      } satisfies PositionNodeData,
    }
  })

  const edges: Edge[] = []
  for (const p of tree.positions) {
    if (p.reportsToPositionId && positionIds.has(p.reportsToPositionId)) {
      edges.push({
        id: `e-${p.reportsToPositionId}-${p.id}`,
        source: p.reportsToPositionId,
        target: p.id,
        type: 'smoothstep',
        style: { stroke: 'rgb(148 163 184 / 0.7)', strokeWidth: 1.5 },
      })
    }
  }

  const { nodes: laidOut } = runLayout(nodes as Node[], edges, layoutMode)
  return { nodes: laidOut as OrgFlowNode[], edges }
}
