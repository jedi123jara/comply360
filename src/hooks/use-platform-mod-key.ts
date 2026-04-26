'use client'

import { useSyncExternalStore } from 'react'

/**
 * Hook que detecta el modificador de teclado correcto según la plataforma.
 *
 * - macOS / iOS / iPadOS → '⌘' (Command)
 * - Windows / Linux / Android / etc. → 'Ctrl'
 *
 * Para usar en hints visuales de atajos (kbd badges, tooltips, command palette).
 * El handler keyboard real ya soporta ambos via `e.metaKey || e.ctrlKey`, esto
 * es solo para que el COPY mostrado al usuario coincida con su teclado.
 *
 * Implementación: useSyncExternalStore (idiom React 19 para sincronizar con
 * sistema externo, ej. navigator). Server snapshot retorna 'Ctrl' (default
 * mundial); client snapshot detecta Mac via navigator.platform.
 *
 * Ojo: navigator.platform queda en pantalla por unos ms en Mac mientras
 * hidrata. Es aceptable porque el COPY no cambia layout (ambos miden ~24px).
 */

const MAC_REGEX = /Mac|iPhone|iPad|iPod/i

function subscribe(): () => void {
  // El platform key es estático (no cambia en runtime una vez detectado el OS).
  // Retornamos no-op subscribe — useSyncExternalStore re-snapshot solo en mount.
  return () => {}
}

function getSnapshot(): string {
  if (typeof navigator === 'undefined') return 'Ctrl'
  // navigator.platform está deprecated pero sigue siendo el detector más
  // confiable cross-browser. userAgentData.platform aún sin soporte universal.
  const platform =
    navigator.platform ||
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    ''
  return MAC_REGEX.test(platform) ? '⌘' : 'Ctrl'
}

function getServerSnapshot(): string {
  return 'Ctrl'
}

export function usePlatformModKey(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
