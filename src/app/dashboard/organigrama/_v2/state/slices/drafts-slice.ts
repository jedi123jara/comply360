/**
 * Drafts slice — gestión del borrador (escenario what-if) activo,
 * con cambios optimistas locales antes de aplicar al servidor.
 *
 * También guarda el plan del Copiloto IA en preview, para que el canvas
 * pueda renderizarlo como ghost nodes sobre el árbol real.
 */
import type { StateCreator } from 'zustand'
import type { CopilotPlan } from '@/lib/orgchart/copilot/operations'

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
  /**
   * Plan del Copiloto IA en estado preview — el canvas dibuja ghost nodes
   * y edges punteadas para visualizarlo. null si no hay preview activo.
   */
  copilotPreviewPlan: CopilotPlan | null
  setActiveDraft: (id: string | null) => void
  pushDirty: (change: Omit<DirtyChange, 'id' | 'appliedAt'>) => void
  popDirty: (id: string) => void
  clearDirty: () => void
  setCopilotPreviewPlan: (plan: CopilotPlan | null) => void
}

export const createDraftsSlice: StateCreator<DraftsSlice, [], [], DraftsSlice> = (set) => ({
  activeDraftId: null,
  dirtyChanges: [],
  copilotPreviewPlan: null,
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
  setCopilotPreviewPlan: (copilotPreviewPlan) => set({ copilotPreviewPlan }),
})
