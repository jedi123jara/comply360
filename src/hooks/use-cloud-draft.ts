'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseCloudDraftOptions {
  /** Identificador unico del flujo (ej. 'contract-draft', 'worker-draft') */
  key: string
  /** orgId del usuario actual. Si es null/undefined, no persiste (evita fugas) */
  orgId?: string | null
  /** TTL en dias (default 7) */
  ttlDays?: number
  /** Debounce en ms para writes (default 1500) */
  debounceMs?: number
}

export interface UseCloudDraftReturn<T> {
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
  /** Loading state while fetching initial draft */
  loading: boolean
}

export function useCloudDraft<T>(options: UseCloudDraftOptions): UseCloudDraftReturn<T> {
  const { key, orgId, ttlDays = 7, debounceMs = 1500 } = options

  const [draft, setDraft] = useState<T | null>(null)
  const [restoredAt, setRestoredAt] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch initial draft
  useEffect(() => {
    let isMounted = true
    if (!orgId) {
      void Promise.resolve().then(() => {
        if (isMounted) setLoading(false)
      })
      return () => {
        isMounted = false
      }
    }

    void Promise.resolve().then(() => {
      if (!isMounted) return
      setLoading(true)

      fetch(`/api/drafts?key=${encodeURIComponent(key)}`)
        .then(res => res.json())
        .then(res => {
          if (!isMounted) return
          if (res.data) {
            setDraft(res.data)
            setRestoredAt(new Date(res.savedAt))
          } else {
            setDraft(null)
            setRestoredAt(null)
          }
        })
        .catch(err => {
          console.error('Failed to load cloud draft:', err)
        })
        .finally(() => {
          if (isMounted) setLoading(false)
        })
    })

    return () => { isMounted = false }
  }, [key, orgId])

  const writeNow = useCallback(
    async (data: T | null) => {
      if (!orgId) return
      try {
        await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, data, ttlDays })
        })
      } catch (err) {
        console.error('Failed to save cloud draft:', err)
      } finally {
        setSaving(false)
      }
    },
    [key, orgId, ttlDays]
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

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  return { draft, restoredAt, save, clear, saving, loading }
}
