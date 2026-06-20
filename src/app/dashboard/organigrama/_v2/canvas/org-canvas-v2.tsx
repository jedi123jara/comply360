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

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

import type { OrgChartTree, DoctorReport, DoctorFinding } from '@/lib/orgchart/types'
import {
  buildCoverageReport,
  TONE_COLOR_HEX,
  type CoverageReport,
} from '@/lib/orgchart/coverage-aggregator'

import { useOrgStore } from '../state/org-store'
import type { OrgLens } from '../state/slices/canvas-slice'
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
import { NodeContextMenu, type CtxMenuState } from './overlays/node-context-menu'
import { useReparentPositionMutation } from '../data/mutations/use-reparent-position'
import { treeKey } from '../data/queries/use-tree'
import { WORKER_DRAG_MIME } from '../roster/constants'

const nodeTypes = {
  unitNode: UnitNode,
  positionNode: PositionNode,
}

/** Decide si un nodo debe atenuarse según la Lente activa (resalta lo relevante). */
function isLensDimmed(node: Node, lens: OrgLens): boolean {
  if (lens === 'general') return false
  const data = node.data as {
    vacant?: boolean
    coverage?: { findingCount: number } | null
    unitKind?: string | null
  }
  switch (lens) {
    case 'vacancies':
      // Resalta cargos vacantes; atenúa los ocupados. Las unidades quedan neutras.
      return node.type === 'positionNode' ? !data.vacant : false
    case 'compliance':
      // Resalta lo que tiene hallazgos de cumplimiento.
      return (data.coverage?.findingCount ?? 0) === 0
    case 'sst':
      // Resalta comités legales y brigadas (órganos SST).
      return data.unitKind !== 'COMITE_LEGAL' && data.unitKind !== 'BRIGADA'
    default:
      // mof / contractual: requieren data por-nodo aún no disponible.
      return false
  }
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
  const lens = useOrgStore((s) => s.lens)
  const collapsedIds = useOrgStore((s) => s.collapsedIds)
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
    collapsedIds,
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
      const dimmed = (focusSet ? !focusSet.has(n.id) : false) || isLensDimmed(n, lens)
      return {
        ...n,
        // Pasamos `dimmed` por `data` para que el nodo lo anime con un fade
        // suave (framer) en vez del cambio brusco de opacity del wrapper.
        data: { ...(n.data as Record<string, unknown>), dimmed },
        selected:
          (positionMode && selectedPositionId === n.id) ||
          (!positionMode && selectedUnitId === n.id),
      }
    })
  }, [layoutNodes, focusSet, lens, positionMode, selectedPositionId, selectedUnitId])

  // Hover: resalta la línea de mando del nodo bajo el cursor (lectura
  // instantánea sin clic). Estado local para no re-renderizar el árbol entero.
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null)
  const hoverSet = useFocusSet(hoveredId, edges, hoveredId != null)
  const displayEdges = useMemo(() => {
    if (!hoverSet) return edges
    return edges.map((e) => {
      const active = hoverSet.has(e.source) && hoverSet.has(e.target)
      if (!active) return e
      return {
        ...e,
        animated: true,
        style: { ...e.style, stroke: '#2563eb', strokeWidth: 2.6 },
      }
    })
  }, [edges, hoverSet])

  // Animar el deslizamiento de los nodos al cambiar de layout (se activa tras el
  // primer mount para que la entrada inicial sea instantánea, no un slide caótico).
  const [animateNodes, setAnimateNodes] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimateNodes(true), 120)
    return () => clearTimeout(t)
  }, [])

  // Reparent mutation
  const reparentMutation = useReparentPositionMutation()
  const { fitView, getIntersectingNodes, screenToFlowPosition } = useReactFlow()

  // --- Drag-to-reparent (modo Cargos): arrastra un cargo sobre otro → reporta a él ---
  const [posOverrides, setPosOverrides] = useState<Record<string, { x: number; y: number }>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)

  // ¿candidateId es descendiente de ancestorId? (para prohibir ciclos al reparentar).
  const isDescendant = useCallback(
    (ancestorId: string, candidateId: string): boolean => {
      const childrenOf = new Map<string, string[]>()
      for (const e of edges) {
        childrenOf.set(e.source, [...(childrenOf.get(e.source) ?? []), e.target])
      }
      const queue = [...(childrenOf.get(ancestorId) ?? [])]
      const seen = new Set<string>()
      while (queue.length) {
        const id = queue.shift()!
        if (id === candidateId) return true
        if (seen.has(id)) continue
        seen.add(id)
        queue.push(...(childrenOf.get(id) ?? []))
      }
      return false
    },
    [edges],
  )

  // Aplica las posiciones arrastradas encima del layout calculado.
  const finalNodes: Node[] = useMemo(() => {
    if (Object.keys(posOverrides).length === 0) return nodes
    return nodes.map((n) => {
      const o = posOverrides[n.id]
      return o ? { ...n, position: o } : n
    })
  }, [nodes, posOverrides])

  const handleNodeDragStop = useCallback(
    (node: Node) => {
      setDraggingId(null)
      if (positionMode && !readOnly) {
        const target = getIntersectingNodes(node).find((n) => n.id !== node.id)
        if (target && !isDescendant(node.id, target.id)) {
          reparentMutation.mutate(
            { positionId: node.id, newParentId: target.id },
            {
              onSuccess: () => toast.success('Línea de mando actualizada'),
              onError: (err) => toast.error(err instanceof Error ? err.message : 'Error'),
            },
          )
        } else if (target) {
          toast.error('No puedes mover un cargo bajo uno de sus propios subordinados')
        }
      }
      // Quitar el override → el nodo vuelve a su posición de layout (o el reparent
      // recalcula y lo recoloca).
      setPosOverrides((prev) => {
        const next = { ...prev }
        delete next[node.id]
        return next
      })
    },
    [positionMode, readOnly, getIntersectingNodes, isDescendant, reparentMutation],
  )

  // --- Drop desde el panel de Trabajadores: soltar un worker sobre un cargo lo asigna ---
  const queryClient = useQueryClient()
  const onDragOver = useCallback((e: DragEvent) => {
    if (e.dataTransfer.types.includes(WORKER_DRAG_MIME)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }, [])
  const onDrop = useCallback(
    async (e: DragEvent) => {
      const workerId = e.dataTransfer.getData(WORKER_DRAG_MIME)
      if (!workerId || readOnly) return
      e.preventDefault()
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const target = finalNodes.find((n) => {
        if (n.type !== 'positionNode') return false
        const w = (n.width as number | undefined) ?? 260
        const h = (n.height as number | undefined) ?? 126
        return (
          flowPos.x >= n.position.x &&
          flowPos.x <= n.position.x + w &&
          flowPos.y >= n.position.y &&
          flowPos.y <= n.position.y + h
        )
      })
      if (!target) {
        if (!positionMode) toast.message('Cambia a "Cargos" y suelta el trabajador sobre un cargo.')
        return
      }
      try {
        const res = await fetch('/api/orgchart/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workerId,
            positionId: target.id,
            isPrimary: true,
            isInterim: false,
            capacityPct: 100,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error ?? 'No se pudo asignar')
        toast.success('Trabajador asignado al cargo')
        queryClient.invalidateQueries({ queryKey: treeKey(null) })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al asignar')
      }
    },
    [readOnly, positionMode, finalNodes, screenToFlowPosition, queryClient],
  )

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

  // Clic en el lienzo vacío → deselecciona y cierra el inspector (control directo).
  const handlePaneClick = useCallback(() => {
    setSelectedUnit(null)
    setSelectedPosition(null)
    setInspectorOpen(false)
    setCtxMenu(null)
  }, [setSelectedUnit, setSelectedPosition, setInspectorOpen])

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
  // Re-encuadrar no solo al cambiar de layout, sino también al cambiar de modo
  // (unidades↔cargos) o al aparecer/desaparecer el preview del Copiloto, que
  // reemplazan el set de nodos y dejarían al usuario en un viewport viejo.
  const fitKey = `${layoutMode}|${positionMode ? 'pos' : 'unit'}|${copilotPreviewPlan ? 'plan' : 'none'}`
  const lastFitRef = useRef<string>(fitKey)
  useEffect(() => {
    if (lastFitRef.current === fitKey) return
    lastFitRef.current = fitKey
    const raf = requestAnimationFrame(() => {
      try {
        fitView({ padding: 0.18, minZoom: 0.42, maxZoom: 1.05, duration: 450 })
      } catch {
        /* fitView puede fallar si no hay nodos todavía */
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [fitKey, fitView])

  if (!tree || tree.units.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[color:var(--bg-canvas)] text-sm text-[color:var(--text-secondary)]">
        No hay unidades para mostrar.
      </div>
    )
  }

  // Habilitamos conexiones cuando estamos en positionMode y no es read-only:
  // arrastrar de un handle a otro reparenta el cargo.
  const allowReparent = positionMode && !readOnly

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      className={`relative h-full w-full bg-[color:var(--bg-canvas)] ${
        animateNodes && !draggingId
          ? '[&_.react-flow__node]:transition-transform [&_.react-flow__node]:duration-500 [&_.react-flow__node]:ease-[cubic-bezier(0.22,1,0.36,1)]'
          : ''
      }`}
    >
      <ReactFlow
        nodes={finalNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={(_, n) => setHoveredId(n.id)}
        onNodeMouseLeave={() => setHoveredId(null)}
        onNodeContextMenu={(e, node) => {
          e.preventDefault()
          setCtxMenu({ x: e.clientX, y: e.clientY, node })
        }}
        onPaneClick={handlePaneClick}
        onConnect={handleConnect}
        onNodesChange={(changes) => {
          setPosOverrides((prev) => {
            let next = prev
            for (const c of changes) {
              if (c.type === 'position' && c.position && c.dragging) {
                next = { ...next, [c.id]: c.position }
              }
            }
            return next
          })
        }}
        onNodeDragStart={(_, n) => setDraggingId(n.id)}
        onNodeDragStop={(_, n) => handleNodeDragStop(n)}
        nodesDraggable={allowReparent}
        nodesConnectable={allowReparent}
        elementsSelectable
        edgesFocusable={false}
        edgesReconnectable={false}
        fitView
        fitViewOptions={{ padding: 0.18, minZoom: 0.42, maxZoom: 1.05 }}
        minZoom={0.35}
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
          color="rgb(148 163 184 / 0.16)"
        />
        <Controls
          showInteractive={false}
          className="!rounded-xl !border !border-[color:var(--border-default)] !bg-[color:var(--bg-elevated)] !shadow-2xl [&_.react-flow__controls-button]:!border-[color:var(--border-subtle)] [&_.react-flow__controls-button]:!bg-[color:var(--bg-elevated)] [&_.react-flow__controls-button]:!text-[color:var(--text-secondary)] [&_.react-flow__controls-button:hover]:!bg-[color:var(--bg-surface-hover)] [&_.react-flow__controls-button_svg]:!fill-[color:var(--text-secondary)]"
        />
        <MiniMap
          nodeColor={minimapNodeColor}
          nodeStrokeColor="rgb(203 213 225 / 0.85)"
          nodeStrokeWidth={2}
          bgColor="rgb(10 15 28)"
          maskColor="rgb(6 10 18 / 0.7)"
          pannable
          zoomable
          className="!rounded-xl !border !border-[color:var(--border-default)] !bg-[color:var(--bg-elevated)] !shadow-2xl"
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

      {ctxMenu && <NodeContextMenu state={ctxMenu} onClose={() => setCtxMenu(null)} />}
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
