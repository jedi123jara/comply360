/**
 * Hook de Level-of-Detail (LOD).
 *
 * Decide qué tanto detalle mostrar en los nodos según el zoom actual del
 * viewport de @xyflow. Esto es lo que mantiene 60 fps con 300+ nodos.
 *
 *   < 0.4   → solo cuadro coloreado + nombre
 *   0.4-0.8 → + título cargo, avatar, indicador vacante
 *   0.8-1.5 → + chips compliance, score, contrato
 *   > 1.5   → + lista completa de ocupantes y roles SST
 */
'use client'

import { useViewport } from '@xyflow/react'
import { useMemo } from 'react'

export type LODLevel = 'tiny' | 'compact' | 'detailed' | 'verbose'

export function useLOD(): LODLevel {
  const { zoom } = useViewport()
  return useMemo(() => {
    if (zoom < 0.4) return 'tiny'
    if (zoom < 0.8) return 'compact'
    if (zoom < 1.5) return 'detailed'
    return 'verbose'
  }, [zoom])
}

/**
 * Variante "estática" para usar fuera de un `<ReactFlow>` provider
 * (ej. en thumbnails server-rendered).
 */
export function lodFromZoom(zoom: number): LODLevel {
  if (zoom < 0.4) return 'tiny'
  if (zoom < 0.8) return 'compact'
  if (zoom < 1.5) return 'detailed'
  return 'verbose'
}
