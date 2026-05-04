/**
 * Time-machine slice — selección de snapshot histórico activo y
 * comparación entre snapshots.
 */
import type { StateCreator } from 'zustand'

export interface TimeMachineSlice {
  // null = "vista actual" (sin snapshot)
  currentSnapshotId: string | null
  // null o id = comparar contra otro snapshot
  compareSnapshotId: string | null
  setCurrentSnapshotId: (id: string | null) => void
  setCompareSnapshotId: (id: string | null) => void
  clearTimemachine: () => void
}

export const createTimemachineSlice: StateCreator<TimeMachineSlice, [], [], TimeMachineSlice> = (
  set,
) => ({
  currentSnapshotId: null,
  compareSnapshotId: null,
  setCurrentSnapshotId: (currentSnapshotId) => set({ currentSnapshotId }),
  setCompareSnapshotId: (compareSnapshotId) => set({ compareSnapshotId }),
  clearTimemachine: () => set({ currentSnapshotId: null, compareSnapshotId: null }),
})
