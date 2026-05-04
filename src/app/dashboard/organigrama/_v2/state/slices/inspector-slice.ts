/**
 * Inspector slice — controla el panel lateral derecho que muestra detalle
 * del nodo seleccionado (info, MOF, reportes, costos, cumplimiento, etc).
 */
import type { StateCreator } from 'zustand'

export type InspectorTab =
  | 'info'
  | 'mof'
  | 'reportes'
  | 'costos'
  | 'cumplimiento'
  | 'historial'
  | 'comments'

export interface InspectorSlice {
  inspectorOpen: boolean
  inspectorPinned: boolean
  inspectorTab: InspectorTab
  setInspectorOpen: (open: boolean) => void
  toggleInspector: () => void
  setInspectorPinned: (pinned: boolean) => void
  setInspectorTab: (tab: InspectorTab) => void
}

export const createInspectorSlice: StateCreator<InspectorSlice, [], [], InspectorSlice> = (set) => ({
  inspectorOpen: false,
  inspectorPinned: false,
  inspectorTab: 'info',
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
  setInspectorPinned: (inspectorPinned) => set({ inspectorPinned }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
})
