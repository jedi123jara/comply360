/**
 * Adapter Dagre — calcula posiciones top-down y left-right.
 *
 * Recibe nodos y aristas en formato @xyflow/react ya pre-construidos
 * por `use-tree-to-flow`, y devuelve los mismos nodos con `position` actualizada.
 */
import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'

export type DagreDirection = 'TB' | 'LR'

export interface DagreOptions {
  direction: DagreDirection
  nodeWidth: number
  nodeHeight: number
  rankSep?: number // separación vertical (TB) o horizontal (LR) entre niveles
  nodeSep?: number // separación entre nodos del mismo nivel
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  opts: DagreOptions,
): Node[] {
  const g = new dagre.graphlib.Graph<{ width: number; height: number }>({
    multigraph: false,
  })
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSep ?? 80,
    nodesep: opts.nodeSep ?? 36,
    edgesep: 12,
    marginx: 20,
    marginy: 20,
  })

  for (const node of nodes) {
    const w = (node.width as number | undefined) ?? opts.nodeWidth
    const h = (node.height as number | undefined) ?? opts.nodeHeight
    g.setNode(node.id, { width: w, height: h })
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map((node) => {
    const meta = g.node(node.id)
    if (!meta) return node
    const w = (node.width as number | undefined) ?? opts.nodeWidth
    const h = (node.height as number | undefined) ?? opts.nodeHeight
    // Dagre devuelve el centro del nodo. @xyflow espera la esquina superior izquierda.
    return {
      ...node,
      position: {
        x: meta.x - w / 2,
        y: meta.y - h / 2,
      },
    }
  })
}
