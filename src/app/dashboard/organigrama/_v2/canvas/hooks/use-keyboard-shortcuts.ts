/**
 * Hook de atajos de teclado del canvas.
 *
 *   K       → abrir command palette
 *   F       → toggle focus mode
 *   [       → toggle inspector lateral
 *   Escape  → cerrar selección / modales / palette
 *   1-4     → cambiar layout (top-down, LR, radial, grouped)
 *
 * Se monta una sola vez en el shell v2.
 */
'use client'

import { useEffect } from 'react'
import { useOrgStore } from '../../state/org-store'
import type { LayoutMode } from '../../state/slices/canvas-slice'

const LAYOUT_BY_KEY: Record<string, LayoutMode> = {
  '1': 'top-down',
  '2': 'left-right',
  '3': 'radial',
  '4': 'grouped-by-area',
}

export function useKeyboardShortcuts() {
  const toggleCommandPalette = useOrgStore((s) => s.toggleCommandPalette)
  const toggleFocus = useOrgStore((s) => s.toggleFocus)
  const toggleInspector = useOrgStore((s) => s.toggleInspector)
  const setLayoutMode = useOrgStore((s) => s.setLayoutMode)
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

      // K (sin modifier) — command palette
      if (!isTyping && event.key.toLowerCase() === 'k' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        toggleCommandPalette()
        return
      }
      // Cmd+K / Ctrl+K también abre palette (universal)
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

      if (event.key in LAYOUT_BY_KEY) {
        event.preventDefault()
        setLayoutMode(LAYOUT_BY_KEY[event.key])
        return
      }

      if (event.key === 'Escape') {
        closeModal()
        setCommandPaletteOpen(false)
        clearSelection()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    toggleCommandPalette,
    toggleFocus,
    toggleInspector,
    setLayoutMode,
    closeModal,
    setCommandPaletteOpen,
    clearSelection,
  ])
}
