/**
 * UI slice — overlays de UI (command palette, modales, drawers, doctor).
 */
import type { StateCreator } from 'zustand'

export type UiModal =
  | null
  | 'create-unit'
  | 'create-position'
  | 'edit-position'
  | 'assign-worker'
  | 'assign-role'
  | 'role-evidence'
  | 'import-excel'
  | 'templates'
  | 'snapshot-diff'
  | 'what-if'
  | 'drafts'
  | 'auditor-link'
  | 'seed-wizard'

export interface UiSlice {
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void

  doctorOpen: boolean
  setDoctorOpen: (open: boolean) => void

  copilotOpen: boolean
  setCopilotOpen: (open: boolean) => void
  toggleCopilot: () => void

  timemachineOpen: boolean
  setTimemachineOpen: (open: boolean) => void

  activeModal: UiModal
  modalProps: Record<string, unknown>
  openModal: (modal: UiModal, props?: Record<string, unknown>) => void
  closeModal: () => void
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  doctorOpen: false,
  setDoctorOpen: (doctorOpen) => set({ doctorOpen }),

  copilotOpen: false,
  setCopilotOpen: (copilotOpen) => set({ copilotOpen }),
  toggleCopilot: () => set((s) => ({ copilotOpen: !s.copilotOpen })),

  timemachineOpen: false,
  setTimemachineOpen: (timemachineOpen) => set({ timemachineOpen }),

  activeModal: null,
  modalProps: {},
  openModal: (modal, props = {}) => set({ activeModal: modal, modalProps: props }),
  closeModal: () => set({ activeModal: null, modalProps: {} }),
})
