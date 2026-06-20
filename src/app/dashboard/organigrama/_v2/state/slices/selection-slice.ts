/**
 * Selection slice — qué nodo está seleccionado en el canvas,
 * tanto unidades como posiciones.
 */
import type { StateCreator } from 'zustand'

export interface SelectionSlice {
  selectedUnitId: string | null
  selectedPositionId: string | null
  selectedWorkerId: string | null
  setSelectedUnit: (id: string | null) => void
  setSelectedPosition: (id: string | null) => void
  setSelectedWorker: (id: string | null) => void
  clearSelection: () => void
}

export const createSelectionSlice: StateCreator<SelectionSlice, [], [], SelectionSlice> = (set) => ({
  selectedUnitId: null,
  selectedPositionId: null,
  selectedWorkerId: null,
  setSelectedUnit: (id) => set({ selectedUnitId: id, selectedPositionId: null, selectedWorkerId: null }),
  setSelectedPosition: (id) => set({ selectedPositionId: id, selectedWorkerId: null }),
  setSelectedWorker: (id) => set({ selectedWorkerId: id }),
  clearSelection: () => set({ selectedUnitId: null, selectedPositionId: null, selectedWorkerId: null }),
})
