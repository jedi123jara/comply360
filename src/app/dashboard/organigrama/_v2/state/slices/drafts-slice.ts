/**
 * Drafts slice — gestión del borrador (escenario what-if) activo,
 * con cambios optimistas locales antes de aplicar al servidor.
 */
import type { StateCreator } from 'zustand'

export type DirtyChangeKind =
  | 'reparent-position'
  | 'create-unit'
  | 'delete-unit'
  | 'create-position'
  | 'delete-position'
  | 'assign-worker'

export interface DirtyChange {
  id: string
  kind: DirtyChangeKind
  payload: Record<string, unknown>
  appliedAt: number
}

export interface DraftsSlice {
  activeDraftId: string | null
  dirtyChanges: DirtyChange[]
  setActiveDraft: (id: string | null) => void
  pushDirty: (change: Omit<DirtyChange, 'id' | 'appliedAt'>) => void
  popDirty: (id: string) => void
  clearDirty: () => void
}

export const createDraftsSlice: StateCreator<DraftsSlice, [], [], DraftsSlice> = (set) => ({
  activeDraftId: null,
  dirtyChanges: [],
  setActiveDraft: (activeDraftId) => set({ activeDraftId }),
  pushDirty: (change) =>
    set((s) => ({
      dirtyChanges: [
        ...s.dirtyChanges,
        { ...change, id: crypto.randomUUID(), appliedAt: Date.now() },
      ],
    })),
  popDirty: (id) =>
    set((s) => ({
      dirtyChanges: s.dirtyChanges.filter((c) => c.id !== id),
    })),
  clearDirty: () => set({ dirtyChanges: [] }),
})
