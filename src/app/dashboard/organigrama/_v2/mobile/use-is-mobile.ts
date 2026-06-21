/**
 * Hook que detecta si el viewport es mobile (<768px).
 *
 * Implementado con `useSyncExternalStore`: el snapshot del servidor es
 * `undefined` (no conocemos el viewport en SSR), así que el primer render del
 * cliente coincide con el del servidor y se evita el hydration mismatch + el
 * flash de canvas→lista en móvil. Tras hidratar, React vuelve a leer el
 * snapshot del cliente y resuelve a `true`/`false`. Los consumidores deben
 * tratar `undefined` como "aún no sé". `matchMedia` se suscribe para responder
 * a cambios en vivo (rotación, drawer DevTools).
 */
'use client'

import { useSyncExternalStore } from 'react'

const MOBILE_QUERY = '(max-width: 767px)'

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const mq = window.matchMedia(MOBILE_QUERY)
  if (mq.addEventListener) mq.addEventListener('change', onChange)
  else mq.addListener(onChange) // Safari < 14
  return () => {
    if (mq.removeEventListener) mq.removeEventListener('change', onChange)
    else mq.removeListener(onChange)
  }
}

// getSnapshot solo corre en el cliente (en SSR se usa getServerSnapshot).
// Devuelve un boolean primitivo → estable bajo Object.is, sin bucles.
function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches
}

function getServerSnapshot(): boolean | undefined {
  return undefined
}

export function useIsMobile(): boolean | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
