/**
 * Adapter Radial — calcula posiciones polares con d3-hierarchy.
 *
 * Útil cuando el árbol tiene muchas ramas y top-down se vuelve plano y ancho.
 * El nodo raíz queda en el centro y los descendientes se distribuyen por
 * sectores angulares según su rama.
 */
import { hierarchy, tree as d3tree } from 'd3-hierarchy'
import type { Node, Edge } from '@xyflow/react'

export interface RadialOptions {
  radius: number // radio máximo (px) — distancia del root al nodo más profundo
  nodeWidth: number
  nodeHeight: number
}

interface HierItem {
  id: string
  parentId: string | null
}

export function applyRadialLayout(
  nodes: Node[],
  edges: Edge[],
  opts: RadialOptions,
): Node[] {
  if (nodes.length === 0) return nodes

  // 1) Reconstruir relaciones padre-hijo desde las edges.
  const parentByChild = new Map<string, string>()
  for (const e of edges) {
    parentByChild.set(e.target, e.source)
  }

  // 2) Encontrar raíces (nodos sin entrada en parentByChild).
  const items: HierItem[] = nodes.map((n) => ({
    id: n.id,
    parentId: parentByChild.get(n.id) ?? null,
  }))
  const roots = items.filter((i) => i.parentId === null)
  // Si hay múltiples raíces, creamos una virtual para que d3 funcione.
  const virtualRootId = '__virtual_root__'
  let stratum: HierItem[]
  let useVirtualRoot = false
  if (roots.length === 1) {
    stratum = items
  } else {
    useVirtualRoot = true
    stratum = [
      { id: virtualRootId, parentId: null },
      ...items.map((i) => (i.parentId === null ? { ...i, parentId: virtualRootId } : i)),
    ]
  }

  // 3) Usamos `hierarchy` con accesor `parent`, no `stratify` para evitar
  //    errores con datos huérfanos.
  const idToItem = new Map(stratum.map((i) => [i.id, i]))
  const rootId = useVirtualRoot ? virtualRootId : roots[0].id
  const childrenById = new Map<string, HierItem[]>()
  for (const item of stratum) {
    if (item.parentId) {
      const list = childrenById.get(item.parentId) ?? []
      list.push(item)
      childrenById.set(item.parentId, list)
    }
  }

  const rootItem = idToItem.get(rootId)
  if (!rootItem) return nodes
  const root = hierarchy(rootItem, (d) => childrenById.get(d.id) ?? [])

  // 4) Aplicar layout circular. d3-tree retorna x ∈ [0, 2π) e y ∈ [0, 1].
  const layout = d3tree<HierItem>().size([2 * Math.PI, opts.radius])
  layout(root)

  // 5) Convertir polar → cartesiano y volcar a nodos.
  const positionById = new Map<string, { x: number; y: number }>()
  root.each((d) => {
    if (d.data.id === virtualRootId) return
    const angle = d.x ?? 0
    const radius = d.y ?? 0
    const cx = Math.cos(angle - Math.PI / 2) * radius
    const cy = Math.sin(angle - Math.PI / 2) * radius
    positionById.set(d.data.id, { x: cx, y: cy })
  })

  return nodes.map((n) => {
    const p = positionById.get(n.id)
    if (!p) return n
    const w = (n.width as number | undefined) ?? opts.nodeWidth
    const h = (n.height as number | undefined) ?? opts.nodeHeight
    return {
      ...n,
      position: {
        x: p.x - w / 2,
        y: p.y - h / 2,
      },
    }
  })
}
