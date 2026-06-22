/**
 * Hook de atajos de teclado del canvas.
 *
 *   K       → abrir command palette
 *   F       → toggle focus mode
 *   [       → toggle inspector lateral
 *   Escape  → cerrar selección / modales / palette
 *
 * Se monta una sola vez en el shell v2.
 */
'use client'

import { useEffect } from 'react'
import { useOrgStore } from '../../state/org-store'

export function useKeyboardShortcuts() {
  const toggleCommandPalette = useOrgStore((s) => s.toggleCommandPalette)
  const toggleFocus = useOrgStore((s) => s.toggleFocus)
  const toggleInspector = useOrgStore((s) => s.toggleInspector)
  const closeModal = useOrgStore((s) => s.closeModal)
  const setCommandPaletteOpen = useOrgStore((s) => s.setCommandPaletteOpen)
  const clearSelection = useOrgStore((s) => s.clearSelection)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // No interferir cuando el usuario escribe en un input
      const target = event.target as HTMLElement | null
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      // Cmd+K / Ctrl+K abre el command palette (estándar universal). Quitamos
      // la 'k' suelta porque abría el palette por accidente al navegar.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        toggleCommandPalette()
        return
      }

      if (isTyping) return

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        toggleFocus()
        return
      }

      if (event.key === '[' || event.key === ']') {
        event.preventDefault()
        toggleInspector()
        return
      }

      if (event.key === 'Escape') {
        // Cerrar en cascada el panel/overlay de mayor prioridad visible.
        const s = useOrgStore.getState()
        if (s.commandPaletteOpen) return setCommandPaletteOpen(false)
        if (s.activeModal) return closeModal()
        if (s.copilotOpen) return s.setCopilotOpen(false)
        if (s.timemachineOpen) return s.setTimemachineOpen(false)
        if (s.alertsOpen) return s.setAlertsOpen(false)
        if (s.doctorOpen) return s.setDoctorOpen(false)
        if (s.inspectorOpen) {
          s.setInspectorOpen(false)
          clearSelection()
          return
        }
        clearSelection()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    toggleCommandPalette,
    toggleFocus,
    toggleInspector,
    closeModal,
    setCommandPaletteOpen,
    clearSelection,
  ])
}
