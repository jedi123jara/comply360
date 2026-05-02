'use client'

/* -------------------------------------------------------------------------- */
/*  use-local-draft — autosave de formulario a localStorage con TTL           */
/* -------------------------------------------------------------------------- */
/*
 * Persiste el estado del formulario en localStorage con debounce 1.5s,
 * scoped por orgId para evitar fugas entre organizaciones del mismo usuario.
 *
 * Uso:
 *   const { draft, save, clear, restoredAt } = useLocalDraft({
 *     key: 'contract-draft',
 *     orgId,
 *     ttlDays: 7,
 *   })
 *
 *   // Guardar (debounced)
 *   useEffect(() => { save({ formData, step }) }, [formData, step])
 *
 *   // Restaurar (al montar)
 *   useEffect(() => {
 *     if (draft) showRestoreBanner()
 *   }, [draft])
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/** Version del formato de serializacion. Incrementar si cambia la shape del draft. */
const DRAFT_FORMAT_VERSION = 1

interface DraftEnvelope<T> {
  v: number
  savedAt: number
  expiresAt: number
  data: T
}

export interface UseLocalDraftOptions {
  /** Identificador unico del flujo (ej. 'contract-draft', 'worker-draft') */
  key: string
  /** orgId del usuario actual. Si es null/undefined, no persiste (evita fugas) */
  orgId?: string | null
  /** TTL en dias (default 7) */
  ttlDays?: number
  /** Debounce en ms para writes (default 1500) */
  debounceMs?: number
}

export interface UseLocalDraftReturn<T> {
  /** Draft restaurado al montar (null si no habia o expiro) */
  draft: T | null
  /** Timestamp del draft restaurado (Date object) */
  restoredAt: Date | null
  /** Guardar draft (debounced). Pasar null para borrar. */
  save: (data: T | null) => void
  /** Borrar inmediatamente */
  clear: () => void
  /** True mientras hay un write pendiente del debounce */
  saving: boolean
}

function buildKey(key: string, orgId: string | null | undefined): string {
  return `comply360:${key}:v${DRAFT_FORMAT_VERSION}:${orgId ?? 'no-org'}`
}

function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const probe = '__comply360_probe__'
    window.localStorage.setItem(probe, probe)
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/**
 * Autosave con TTL a localStorage. SSR-safe (no toca window en server).
 */
export function useLocalDraft<T>(options: UseLocalDraftOptions): UseLocalDraftReturn<T> {
  const { key, orgId, ttlDays = 7, debounceMs = 1500 } = options

  const [draft, setDraft] = useState<T | null>(null)
  const [restoredAt, setRestoredAt] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const storageKey = buildKey(key, orgId)

  // Restaurar al montar (o al cambiar orgId)
  useEffect(() => {
    if (!isLocalStorageAvailable()) return
    if (!orgId) return

    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) {
        setDraft(null)
        setRestoredAt(null)
        return
      }
      const env = JSON.parse(raw) as DraftEnvelope<T>
      if (env.v !== DRAFT_FORMAT_VERSION) {
        // Formato viejo: descartar
        window.localStorage.removeItem(storageKey)
        setDraft(null)
        setRestoredAt(null)
        return
      }
      if (Date.now() > env.expiresAt) {
        // Expirado: limpiar
        window.localStorage.removeItem(storageKey)
        setDraft(null)
        setRestoredAt(null)
        return
      }
      setDraft(env.data)
      setRestoredAt(new Date(env.savedAt))
    } catch {
      // Si el JSON esta corrupto, descartamos
      try {
        window.localStorage.removeItem(storageKey)
      } catch {
        // ignore
      }
      setDraft(null)
      setRestoredAt(null)
    }
  }, [storageKey, orgId])

  const writeNow = useCallback(
    (data: T | null) => {
      if (!isLocalStorageAvailable() || !orgId) return
      try {
        if (data === null) {
          window.localStorage.removeItem(storageKey)
        } else {
          const now = Date.now()
          const env: DraftEnvelope<T> = {
            v: DRAFT_FORMAT_VERSION,
            savedAt: now,
            expiresAt: now + ttlDays * 24 * 60 * 60 * 1000,
            data,
          }
          window.localStorage.setItem(storageKey, JSON.stringify(env))
        }
      } catch {
        // localStorage lleno o bloqueado: silenciamos para no romper la UX
      } finally {
        setSaving(false)
      }
    },
    [storageKey, orgId, ttlDays]
  )

  const save = useCallback(
    (data: T | null) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      setSaving(true)
      debounceTimer.current = setTimeout(() => {
        writeNow(data)
      }, debounceMs)
    },
    [writeNow, debounceMs]
  )

  const clear = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    writeNow(null)
    setDraft(null)
    setRestoredAt(null)
  }, [writeNow])

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  return { draft, restoredAt, save, clear, saving }
}
