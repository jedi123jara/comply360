/**
 * Layout engine — orquesta los 4 modos disponibles.
 *
 *   - top-down       : Dagre TB, el clásico de organigrama
 *   - left-right     : Dagre LR, ideal para árboles muy profundos
 *   - radial         : d3-hierarchy.tree() en coordenadas polares
 *   - grouped-by-area: Dagre TB pero con nodos hermanos clusterizados visualmente
 *                      (por ahora reusamos top-down; se sofisticará después)
 */
import type { Node, Edge } from '@xyflow/react'
import type { LayoutMode } from '../../state/slices/canvas-slice'

import { applyDagreLayout } from './dagre-adapter'
import { applyRadialLayout } from './radial-adapter'

export interface LayoutResult {
  nodes: Node[]
}

/**
 * Defaults de tamaño por tipo de nodo. El canvas v2 usa nodos `unitNode` y
 * `positionNode` con tamaños distintos; pasamos el ancho/alto correcto al
 * algoritmo según el `data.kind` de cada nodo.
 */
const NODE_SIZE_BY_KIND: Record<string, { w: number; h: number }> = {
  unit: { w: 240, h: 120 },
  position: { w: 200, h: 90 },
}

function resolvedSize(node: Node) {
  const kind =
    (node.type as string | undefined) === 'positionNode' ? 'position' : 'unit'
  return NODE_SIZE_BY_KIND[kind]
}

export function runLayout(
  nodes: Node[],
  edges: Edge[],
  mode: LayoutMode,
): LayoutResult {
  // Pre-computar dimensiones de cada nodo si no las tienen para que dagre
  // no las trate como 0.
  const sizedNodes = nodes.map((n) => {
    if (n.width && n.height) return n
    const size = resolvedSize(n)
    return { ...n, width: n.width ?? size.w, height: n.height ?? size.h }
  })

  switch (mode) {
    case 'top-down':
      return {
        nodes: applyDagreLayout(sizedNodes, edges, {
          direction: 'TB',
          nodeWidth: 240,
          nodeHeight: 120,
          rankSep: 90,
          nodeSep: 40,
        }),
      }
    case 'left-right':
      return {
        nodes: applyDagreLayout(sizedNodes, edges, {
          direction: 'LR',
          nodeWidth: 240,
          nodeHeight: 120,
          rankSep: 110,
          nodeSep: 28,
        }),
      }
    case 'radial':
      return {
        nodes: applyRadialLayout(sizedNodes, edges, {
          radius: Math.max(420, sizedNodes.length * 18),
          nodeWidth: 240,
          nodeHeight: 120,
        }),
      }
    case 'grouped-by-area':
      // Por ahora reuso top-down con más rankSep para diferenciar áreas
      // visualmente. La versión avanzada (clusters compuestos con d3-cluster)
      // queda para una iteración posterior.
      return {
        nodes: applyDagreLayout(sizedNodes, edges, {
          direction: 'TB',
          nodeWidth: 240,
          nodeHeight: 120,
          rankSep: 110,
          nodeSep: 60,
        }),
      }
    default: {
      const _exhaustive: never = mode
      void _exhaustive
      return { nodes: sizedNodes }
    }
  }
}
