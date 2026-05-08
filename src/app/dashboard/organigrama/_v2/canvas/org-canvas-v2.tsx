/**
 * Canvas v2 — orquesta @xyflow/react con:
 *   - Nodos custom (UnitNode, PositionNode) con LOD
 *   - Edges suaves
 *   - Layout switch animado (top-down, LR, radial, grouped)
 *   - Compliance Heatmap (color por tone del coverage)
 *   - Smart Nudges flotantes
 *   - Focus mode (dimea no-relacionados al seleccionado)
 *   - Minimap + controls + leyenda
 *   - Drag-and-drop reparenting con optimistic update y validación de ciclo
 */
'use client'

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type NodeMouseHandler,
  type OnConnect,
  type Connection,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'

import type { OrgChartTree, DoctorReport, DoctorFinding } from '@/lib/orgchart/types'
import {
  buildCoverageReport,
  TONE_COLOR_HEX,
  type CoverageReport,
} from '@/lib/orgchart/coverage-aggregator'

import { useOrgStore } from '../state/org-store'
import {
  useTreeToFlow,
  type UnitNodeData,
  type PositionNodeData,
} from './hooks/use-tree-to-flow'
import { useFocusSet } from './hooks/use-focus-set'
import { UnitNode } from './nodes/unit-node'
import { PositionNode } from './nodes/position-node'
import { NudgeBadgeList } from './overlays/nudge-badge'
import { HeatmapLegend } from './overlays/heatmap-legend'
import { useReparentPositionMutation } from '../data/mutations/use-reparent-position'

const nodeTypes = {
  unitNode: UnitNode,
  positionNode: PositionNode,
}

export interface OrgCanvasV2Props {
  tree: OrgChartTree | null
  doctorReport: DoctorReport | null
  /** Si se quiere usar nodos por cargo (no por unidad). */
  positionMode?: boolean
  readOnly?: boolean
}

function OrgCanvasV2Inner({
  tree,
  doctorReport,
  positionMode = false,
  readOnly = false,
}: OrgCanvasV2Props) {
  const layoutMode = useOrgStore((s) => s.layoutMode)
  const focusEnabled = useOrgStore((s) => s.focusEnabled)
  const selectedUnitId = useOrgStore((s) => s.selectedUnitId)
  const selectedPositionId = useOrgStore((s) => s.selectedPositionId)
  const setSelectedUnit = useOrgStore((s) => s.setSelectedUnit)
  const setSelectedPosition = useOrgStore((s) => s.setSelectedPosition)
  const setInspectorOpen = useOrgStore((s) => s.setInspectorOpen)

  // Coverage report — la base del Compliance Heatmap.
  const coverage: CoverageReport | null = useMemo(() => {
    if (!tree) return null
    const findings = doctorReport?.findings ?? []
    return buildCoverageReport(tree, findings)
  }, [tree, doctorReport])

  // Plan del Copiloto IA en preview (ghost nodes).
  const copilotPreviewPlan = useOrgStore((s) => s.copilotPreviewPlan)

  // Nodes/Edges con layout aplicado.
  const { nodes: layoutNodes, edges } = useTreeToFlow(tree, layoutMode, coverage, {
    positionMode,
    copilotPreviewPlan,
  })

  // Foco: set de IDs relacionados al seleccionado (ancestros + descendientes).
  const focusSet = useFocusSet(
    positionMode ? selectedPositionId : selectedUnitId,
    edges,
    focusEnabled,
  )

  // Inyectar `dimmed` por nodo según focusSet
  const nodes: Node[] = useMemo(() => {
    return layoutNodes.map((n) => {
      const dimmed = focusSet ? !focusSet.has(n.id) : false
      return {
        ...n,
        data: { ...(n.data as Record<string, unknown>) },
        // Atributos custom que pasamos a los nodos via `data` —
        // dado que nuestros componentes leen `data.dimmed`.
        ...(dimmed ? { style: { ...n.style, opacity: 0.18 } } : {}),
        selected:
          (positionMode && selectedPositionId === n.id) ||
          (!positionMode && selectedUnitId === n.id),
      }
    })
  }, [layoutNodes, focusSet, positionMode, selectedPositionId, selectedUnitId])

  // Reparent mutation
  const reparentMutation = useReparentPositionMutation()

  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!positionMode || readOnly || !connection.source || !connection.target) return
      // En positionMode, source = nuevo padre, target = posición que se mueve.
      // Si el usuario arrastra al revés (target → source), los xyflow handles
      // determinan el sentido — en nuestro modelo el "source" es el jefe.
      reparentMutation.mutate(
        {
          positionId: connection.target,
          newParentId: connection.source,
        },
        {
          onSuccess: () => toast.success('Línea de mando actualizada'),
          onError: (err) => toast.error(err instanceof Error ? err.message : 'Error'),
        },
      )
    },
    [positionMode, readOnly, reparentMutation],
  )

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (positionMode) {
        setSelectedPosition(node.id)
        const data = node.data as PositionNodeData
        setSelectedUnit(data.unitId ?? null)
      } else {
        setSelectedUnit(node.id)
      }
      setInspectorOpen(true)
    },
    [positionMode, setSelectedPosition, setSelectedUnit, setInspectorOpen],
  )

  const minimapNodeColor = useCallback(
    (n: Node) => {
      const data = n.data as { coverage?: UnitNodeData['coverage'] } | undefined
      const tone = data?.coverage?.tone ?? 'success'
      return TONE_COLOR_HEX[tone] ?? TONE_COLOR_HEX.success
    },
    [],
  )

  // Hook de la API de @xyflow para fitView en cambios de layout.
  // Usamos useEffect (no checkear-y-mutar-ref durante render) para respetar
  // las reglas de pureza de React.
  const { fitView } = useReactFlow()
  const lastLayoutRef = useRef<string>(layoutMode)
  useEffect(() => {
    if (lastLayoutRef.current === layoutMode) return
    lastLayoutRef.current = layoutMode
    const raf = requestAnimationFrame(() => {
      try {
        fitView({ padding: 0.15, duration: 450 })
      } catch {
        /* fitView puede fallar si no hay nodos todavía */
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [layoutMode, fitView])

  if (!tree || tree.units.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">
        No hay unidades para mostrar.
      </div>
    )
  }

  // Habilitamos conexiones cuando estamos en positionMode y no es read-only:
  // arrastrar de un handle a otro reparenta el cargo.
  const allowReparent = positionMode && !readOnly

  return (
    <div className="relative h-full w-full bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onConnect={handleConnect}
        nodesDraggable={false}
        nodesConnectable={allowReparent}
        elementsSelectable
        edgesFocusable={false}
        edgesReconnectable={false}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2.5}
        connectionLineStyle={{ stroke: '#2563eb', strokeWidth: 2, strokeDasharray: '6 4' }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: 'rgb(148 163 184 / 0.7)', strokeWidth: 1.5 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgb(0 0 0 / 0.05)"
        />
        <Controls
          showInteractive={false}
          className="!rounded-xl !border !border-slate-200 !bg-white !shadow-md"
        />
        <MiniMap
          nodeColor={minimapNodeColor}
          nodeStrokeWidth={2}
          maskColor="rgb(0 0 0 / 0.04)"
          pannable
          zoomable
          className="!rounded-xl !border !border-slate-200 !bg-white !shadow-md"
        />
      </ReactFlow>

      {/* Overlays */}
      <HeatmapLegend coverage={coverage} />
      <NudgeBadgeList
        findings={doctorReport?.findings ?? ([] as DoctorFinding[])}
        onFocusUnit={(unitId) => {
          setSelectedUnit(unitId)
          setInspectorOpen(true)
        }}
      />
    </div>
  )
}

/**
 * Wrapper con `<ReactFlowProvider>`. Imprescindible — todos los hooks de
 * @xyflow (useReactFlow, useViewport, etc.) necesitan estar dentro del
 * provider para funcionar.
 */
export function OrgCanvasV2(props: OrgCanvasV2Props) {
  return (
    <ReactFlowProvider>
      <OrgCanvasV2Inner {...props} />
    </ReactFlowProvider>
  )
}
