'use client'

/**
 * Cola mínima de estímulos: un solo aviso que pide atención a la vez.
 *
 * Quién la usa:
 *  - El panel principal: aviso de prueba gratis → recorrido guiado → celebración.
 *  - El pedido de permiso de notificaciones (global): espera a que no haya
 *    otro estímulo activo antes de aparecer.
 *
 * Es un estado de módulo (no de React) para que componentes lejanos en el
 * árbol se coordinen sin un provider nuevo.
 */

import { useSyncExternalStore } from 'react'

export type Stimulus = 'trial-toast' | 'tour' | 'celebration'

let active: Stimulus | null = null
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

/** Ocupa la cola. Si ya hay otro estímulo activo, no lo pisa y devuelve false. */
export function claimStimulus(stimulus: Stimulus): boolean {
  if (active !== null && active !== stimulus) return false
  if (active === stimulus) return true
  active = stimulus
  notify()
  return true
}

/** Libera la cola solo si la tenía este estímulo. */
export function releaseStimulus(stimulus: Stimulus): void {
  if (active !== stimulus) return
  active = null
  notify()
}

export function getActiveStimulus(): Stimulus | null {
  return active
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useActiveStimulus(): Stimulus | null {
  return useSyncExternalStore(subscribe, getActiveStimulus, () => null)
}
