/**
 * Drafts slice — gestión del borrador (escenario what-if) activo,
 * con cambios optimistas locales antes de aplicar al servidor.
 *
 * También guarda el plan del Copiloto IA en preview, para que el canvas
 * pueda renderizarlo como ghost nodes sobre el árbol real.
 */
import type { StateCreator } from 'zustand'
import type { CopilotPlan } from '@/lib/orgchart/copilot/operations'

export interface DraftsSlice {
  activeDraftId: string | null
  /**
   * Plan del Copiloto IA en estado preview — el canvas dibuja ghost nodes
   * y edges punteadas para visualizarlo. null si no hay preview activo.
   */
  copilotPreviewPlan: CopilotPlan | null
  setActiveDraft: (id: string | null) => void
  setCopilotPreviewPlan: (plan: CopilotPlan | null) => void
}

export const createDraftsSlice: StateCreator<DraftsSlice, [], [], DraftsSlice> = (set) => ({
  activeDraftId: null,
  copilotPreviewPlan: null,
  setActiveDraft: (activeDraftId) => set({ activeDraftId }),
  setCopilotPreviewPlan: (copilotPreviewPlan) => set({ copilotPreviewPlan }),
})
