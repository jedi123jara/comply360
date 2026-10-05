'use client'

/**
 * Marcas pequeñas en localStorage ("ya vi el recorrido", "ya celebré este
 * paso") leídas con useSyncExternalStore: el HTML del servidor y la primera
 * pintura del navegador coinciden (valor `undefined` = aún no se sabe) y luego
 * se usa el valor real. Si el almacenamiento está bloqueado (modo privado,
 * políticas del navegador) todo sigue funcionando: se lee como `null`.
 */

import { useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

export function readStoredValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStoredValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* almacenamiento bloqueado: no recordamos, pero no rompemos nada */
  }
  notify()
}

/**
 * Valor guardado bajo `key`.
 *  - `undefined`: render del servidor o hidratación (todavía no se sabe).
 *  - `null`: no hay nada guardado (o el almacenamiento está bloqueado).
 */
export function useStoredValue(key: string): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => readStoredValue(key),
    () => undefined,
  )
}
