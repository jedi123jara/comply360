/**
 * Store global del módulo Organigrama v2.
 *
 * Combina 6 slices independientes en una sola tienda Zustand.
 * Cada slice es responsable de una porción específica del estado UI:
 * canvas, selección, inspector, ui (overlays), time-machine, drafts.
 *
 * Uso:
 *   import { useOrgStore } from '@/app/dashboard/organigrama/_v2/state/org-store'
 *   const lens = useOrgStore(s => s.lens)
 *   const setLens = useOrgStore(s => s.setLens)
 *
 * Para evitar re-renders innecesarios, prefiere selectores específicos
 * sobre desestructurar el estado completo.
 */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { createCanvasSlice, type CanvasSlice } from './slices/canvas-slice'
import { createSelectionSlice, type SelectionSlice } from './slices/selection-slice'
import { createInspectorSlice, type InspectorSlice } from './slices/inspector-slice'
import { createUiSlice, type UiSlice } from './slices/ui-slice'
import { createTimemachineSlice, type TimeMachineSlice } from './slices/timemachine-slice'
import { createDraftsSlice, type DraftsSlice } from './slices/drafts-slice'

export type OrgStore = CanvasSlice &
  SelectionSlice &
  InspectorSlice &
  UiSlice &
  TimeMachineSlice &
  DraftsSlice

export const useOrgStore = create<OrgStore>()(
  devtools(
    (...a) => ({
      ...createCanvasSlice(...a),
      ...createSelectionSlice(...a),
      ...createInspectorSlice(...a),
      ...createUiSlice(...a),
      ...createTimemachineSlice(...a),
      ...createDraftsSlice(...a),
    }),
    { name: 'orgchart-v2', enabled: process.env.NODE_ENV === 'development' },
  ),
)

// Helpers para usar fuera de componentes (event listeners, etc)
export const orgStore = {
  getState: () => useOrgStore.getState(),
  setState: (partial: Partial<OrgStore>) => useOrgStore.setState(partial),
  subscribe: useOrgStore.subscribe,
}
