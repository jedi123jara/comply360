/**
 * Selection slice — qué nodo está seleccionado en el canvas,
 * tanto unidades como posiciones, con soporte para multi-selección futura.
 */
import type { StateCreator } from 'zustand'

export interface SelectionSlice {
  selectedUnitId: string | null
  selectedPositionId: string | null
  multiSelectIds: string[]
  setSelectedUnit: (id: string | null) => void
  setSelectedPosition: (id: string | null) => void
  clearSelection: () => void
  toggleMultiSelect: (id: string) => void
}

export const createSelectionSlice: StateCreator<SelectionSlice, [], [], SelectionSlice> = (set) => ({
  selectedUnitId: null,
  selectedPositionId: null,
  multiSelectIds: [],
  setSelectedUnit: (id) => set({ selectedUnitId: id, selectedPositionId: null }),
  setSelectedPosition: (id) => set({ selectedPositionId: id }),
  clearSelection: () => set({ selectedUnitId: null, selectedPositionId: null, multiSelectIds: [] }),
  toggleMultiSelect: (id) =>
    set((s) => {
      const exists = s.multiSelectIds.includes(id)
      return {
        multiSelectIds: exists
          ? s.multiSelectIds.filter((x) => x !== id)
          : [...s.multiSelectIds, id],
      }
    }),
})
