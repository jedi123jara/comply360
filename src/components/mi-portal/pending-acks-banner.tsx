'use client'

/**
 * PendingAcksBanner — banner sticky en /mi-portal home cuando el worker
 * tiene documentos pendientes de firmar.
 *
 * Estados visuales:
 *   - 0 pendientes → no renderiza nada
 *   - 1+ pendientes (no urgentes) → banner emerald
 *   - 1+ pendientes urgentes (deadline ≤2 días) → banner ámbar
 *   - 1+ vencidos → banner rojo (futuro: si se implementa overdue)
 *
 * Click en banner → navega a /mi-portal/documentos (sección "Por firmar").
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileSignature, AlertTriangle, X, ArrowRight } from 'lucide-react'

interface PendingDoc {
  id: string
  title: string
  daysRemaining: number | null
  urgent: boolean
}

interface ApiResponse {
  pending: PendingDoc[]
  total: number
  urgentCount: number
}

const DISMISS_KEY = 'comply360.miportal.pendingAcksBanner.dismissed'

export function PendingAcksBanner() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Session-level dismiss (re-aparece en próxima sesión si sigue habiendo pendientes)
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') {
        setDismissed(true)
      }
    } catch {
      /* ignore */
    }

    fetch('/api/mi-portal/pending-acknowledgments')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ApiResponse | null) => {
        if (d) setData(d)
      })
      .catch(() => null)
  }, [])

  function handleDismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  if (!data || data.total === 0 || dismissed) return null

  const isUrgent = data.urgentCount > 0
  const Icon = isUrgent ? AlertTriangle : FileSignature
  const palette = isUrgent
    ? {
        bg: 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 50%, #fffbeb 100%)',
        text: '#92400e',
        border: 'rgba(245, 158, 11, 0.35)',
      }
    : {
        bg: 'linear-gradient(90deg, #eff6ff 0%, #dbeafe 50%, #eff6ff 100%)',
        text: '#1e3a8a',
        border: 'rgba(16, 185, 129, 0.35)',
      }

  const message =
    data.total === 1
      ? `Tienes 1 documento por firmar: "${data.pending[0].title}"`
      : `Tienes ${data.total} documentos por firmar${data.urgentCount > 0 ? ` (${data.urgentCount} urgentes)` : ''}`

  return (
    <div
      className="relative px-4 py-2.5 text-sm flex items-center justify-center gap-3"
      style={{
        background: palette.bg,
        color: palette.text,
        borderBottom: `1px solid ${palette.border}`,
      }}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-center leading-tight">
        <strong>{message}</strong>{' '}
        <Link
          href="/mi-portal/documentos"
          className="underline underline-offset-2 font-semibold hover:opacity-80 inline-flex items-center gap-0.5"
        >
          Ver y firmar <ArrowRight className="inline h-3 w-3" />
        </Link>
      </span>
      {!isUrgent && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar banner"
          className="flex-shrink-0 rounded p-1 opacity-70 hover:opacity-100"
          style={{ color: palette.text }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
