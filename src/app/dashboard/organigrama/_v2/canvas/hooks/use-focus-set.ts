/**
 * Hook que calcula el conjunto de IDs "relacionados" al nodo seleccionado:
 * ancestros + descendientes. Se usa para el modo focus que dimea el resto
 * del canvas.
 */
'use client'

import { useMemo } from 'react'
import type { Edge } from '@xyflow/react'

export function useFocusSet(
  selectedId: string | null,
  edges: Edge[],
  enabled: boolean,
): Set<string> | null {
  return useMemo(() => {
    if (!enabled || !selectedId) return null
    const result = new Set<string>([selectedId])
    // Ancestros: subir por edges.target === current
    const parentByChild = new Map<string, string>()
    const childrenByParent = new Map<string, string[]>()
    for (const e of edges) {
      parentByChild.set(e.target, e.source)
      const list = childrenByParent.get(e.source) ?? []
      list.push(e.target)
      childrenByParent.set(e.source, list)
    }
    let cursor: string | undefined = parentByChild.get(selectedId)
    while (cursor) {
      if (result.has(cursor)) break
      result.add(cursor)
      cursor = parentByChild.get(cursor)
    }
    // Descendientes: BFS
    const queue: string[] = [...(childrenByParent.get(selectedId) ?? [])]
    while (queue.length) {
      const id = queue.shift()!
      if (result.has(id)) continue
      result.add(id)
      const kids = childrenByParent.get(id) ?? []
      queue.push(...kids)
    }
    return result
  }, [selectedId, edges, enabled])
}
