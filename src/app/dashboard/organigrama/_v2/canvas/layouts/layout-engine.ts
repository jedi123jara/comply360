/**
 * Layout engine — el organigrama usa una única vista: top-down (Dagre TB), el
 * clásico de organigrama. Las vistas Horizontal/Radial/Disperso se eliminaron
 * por decisión de producto (simplicidad).
 */
import type { Node, Edge } from '@xyflow/react'
import type { LayoutMode } from '../../state/slices/canvas-slice'

import { applyDagreLayout } from './dagre-adapter'

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
  position: { w: 260, h: 126 },
}

function resolvedSize(node: Node) {
  const kind =
    (node.type as string | undefined) === 'positionNode' ? 'position' : 'unit'
  return NODE_SIZE_BY_KIND[kind]
}

export function runLayout(
  nodes: Node[],
  edges: Edge[],
  mode: LayoutMode = 'top-down',
): LayoutResult {
  void mode // única vista soportada: top-down (parámetro conservado por firma)
  // Pre-computar dimensiones de cada nodo si no las tienen para que dagre
  // no las trate como 0.
  const sizedNodes = nodes.map((n) => {
    if (n.width && n.height) return n
    const size = resolvedSize(n)
    return { ...n, width: n.width ?? size.w, height: n.height ?? size.h }
  })

  // Única vista: top-down (Dagre TB), el organigrama clásico.
  return {
    nodes: applyDagreLayout(sizedNodes, edges, {
      direction: 'TB',
      nodeWidth: 260,
      nodeHeight: 126,
      rankSep: 126,
      nodeSep: 54,
    }),
  }
}
