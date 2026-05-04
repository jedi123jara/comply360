/**
 * Canvas slice — controla zoom, viewport, modo de layout, lente activa,
 * vista (jerarquía vs comités) y modo de foco.
 */
import type { StateCreator } from 'zustand'

export type LayoutMode = 'top-down' | 'left-right' | 'radial' | 'grouped-by-area'
export type OrgLens = 'general' | 'mof' | 'compliance' | 'contractual' | 'sst' | 'vacancies'
export type View = 'hierarchy' | 'committees'

export interface CanvasSlice {
  // Layout
  layoutMode: LayoutMode
  setLayoutMode: (mode: LayoutMode) => void
  // Vista
  view: View
  setView: (view: View) => void
  // Lente
  lens: OrgLens
  setLens: (lens: OrgLens) => void
  // Foco (dimea no-relacionados al nodo seleccionado)
  focusEnabled: boolean
  toggleFocus: () => void
  setFocusEnabled: (enabled: boolean) => void
  // Modo presentación / time-machine / what-if (transforma el chrome del canvas)
  canvasMode: 'edit' | 'time-machine' | 'what-if' | 'present'
  setCanvasMode: (mode: 'edit' | 'time-machine' | 'what-if' | 'present') => void
}

export const createCanvasSlice: StateCreator<CanvasSlice, [], [], CanvasSlice> = (set) => ({
  layoutMode: 'top-down',
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  view: 'hierarchy',
  setView: (view) => set({ view }),
  lens: 'general',
  setLens: (lens) => set({ lens }),
  focusEnabled: false,
  toggleFocus: () => set((s) => ({ focusEnabled: !s.focusEnabled })),
  setFocusEnabled: (focusEnabled) => set({ focusEnabled }),
  canvasMode: 'edit',
  setCanvasMode: (canvasMode) => set({ canvasMode }),
})
