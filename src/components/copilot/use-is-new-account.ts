'use client'

import { useEffect, useState } from 'react'

/** Cada cuánto se vuelve a consultar si la cuenta sigue "nueva". */
const STALE_MS = 2 * 60 * 1000

let cached: { isNew: boolean; at: number } | null = null

/**
 * ¿La empresa todavía no registra trabajadores? Sirve para que el asistente
 * priorice preguntas de arranque.
 *
 * Reusa `/api/onboarding/progress` (solo conteos) y consulta únicamente
 * cuando `enabled` es true (el panel del asistente está abierto). Mientras no
 * hay respuesta, o si falla, devuelve `false` para mostrar las preguntas
 * normales de la pantalla.
 */
export function useIsNewAccount(enabled: boolean): boolean {
  const [isNew, setIsNew] = useState<boolean>(() => cached?.isNew ?? false)

  useEffect(() => {
    if (!enabled) return
    if (cached && Date.now() - cached.at < STALE_MS) {
      const fresh = cached.isNew
      // Asíncrono para no actualizar estado durante el efecto.
      void Promise.resolve().then(() => setIsNew(fresh))
      return
    }

    let cancelled = false
    fetch('/api/onboarding/progress')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { hasWorker?: boolean } | null) => {
        if (cancelled || !data || typeof data.hasWorker !== 'boolean') return
        cached = { isNew: !data.hasWorker, at: Date.now() }
        setIsNew(!data.hasWorker)
      })
      .catch(() => {
        /* sin datos: se muestran las preguntas normales */
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return isNew
}
