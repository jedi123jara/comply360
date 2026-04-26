'use client'

/**
 * NpsModal — modal in-product que pregunta NPS a usuarios "engaged".
 *
 * Trigger:
 *   - Mount: hace GET /api/feedback/nps para chequear si corresponde mostrar
 *   - Si shouldShow=true Y no hay flag localStorage → renderiza el modal
 *   - User puede dismiss → flag localStorage por 30d (no reaparece pronto)
 *   - User responde → POST /api/feedback/nps + flag permanente
 *
 * UX:
 *   - Bottom-right card no-bloqueante (no es un overlay modal; no interrumpe)
 *   - Score 0-10 como botones (estándar NPS visual)
 *   - Comentario opcional 200 chars
 *   - Después de submit: "Gracias!" + cierre auto
 */

import { useEffect, useState } from 'react'
import { X, Sparkles, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'comply360.npsState'
// Si el user dismiss, esperamos 30 días antes de volver a preguntar
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000

interface StorageState {
  status: 'dismissed' | 'responded'
  at: number
}

function readStorage(): StorageState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StorageState
  } catch {
    return null
  }
}

function writeStorage(status: 'dismissed' | 'responded') {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, at: Date.now() }))
  } catch {
    /* ignore */
  }
}

export function NpsModal({ source = 'dashboard' }: { source?: string }) {
  const [shouldShow, setShouldShow] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Check storage primero — barato y evita network
    const stored = readStorage()
    if (stored) {
      if (stored.status === 'responded') return
      if (stored.status === 'dismissed' && Date.now() - stored.at < DISMISS_TTL_MS) return
    }
    // Pregunta al server si corresponde
    fetch('/api/feedback/nps')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.shouldShow) setShouldShow(true)
      })
      .catch(() => { /* silent */ })
  }, [])

  function dismiss() {
    writeStorage('dismissed')
    setShouldShow(false)
  }

  async function submit() {
    if (score == null) return
    setSubmitting(true)
    try {
      await fetch('/api/feedback/nps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          score,
          comment: comment.trim() || undefined,
          source,
        }),
      })
      writeStorage('responded')
      setSubmitted(true)
      // Auto-cerrar después de 3 segundos
      setTimeout(() => setShouldShow(false), 3000)
    } catch {
      setSubmitting(false)
    }
  }

  if (!shouldShow) return null

  if (submitted) {
    return (
      <aside
        role="status"
        className="fixed bottom-6 right-6 z-[var(--z-toast)] w-80 rounded-2xl bg-white shadow-2xl border border-emerald-200 p-5 motion-fade-in-up"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-[color:var(--text-primary)]">¡Gracias!</p>
            <p className="text-xs text-[color:var(--text-secondary)] mt-0.5">
              Tu opinión nos ayuda a mejorar Comply360.
            </p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside
      role="dialog"
      aria-labelledby="nps-title"
      className="fixed bottom-6 right-6 z-[var(--z-toast)] w-[360px] rounded-2xl bg-white shadow-2xl border border-emerald-200 motion-fade-in-up"
    >
      <header className="flex items-start justify-between gap-3 p-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50">
            <Sparkles className="w-4 h-4 text-emerald-700" />
          </div>
          <h3
            id="nps-title"
            className="text-sm font-semibold text-[color:var(--text-primary)]"
          >
            ¿Cómo va Comply360 contigo?
          </h3>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="p-1 rounded text-[color:var(--text-tertiary)] hover:bg-[color:var(--neutral-100)]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </header>

      <div className="px-4 pb-4">
        <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed mb-3">
          ¿Qué tan probable es que recomiendes Comply360 a un colega?
        </p>

        {/* Score 0-10 */}
        <div className="grid grid-cols-11 gap-1 mb-3">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setScore(i)}
              className={cn(
                'aspect-square rounded text-xs font-semibold transition-all',
                score === i
                  ? 'bg-emerald-600 text-white scale-110 shadow-md'
                  : 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-200)]',
              )}
              aria-label={`Puntuación ${i}`}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-[color:var(--text-tertiary)] mb-3">
          <span>Nada probable</span>
          <span>Muy probable</span>
        </div>

        {/* Comentario opcional (aparece después de score) */}
        {score != null && (
          <div className="motion-fade-in">
            <label className="block text-[10px] font-medium text-[color:var(--text-tertiary)] mb-1 uppercase tracking-widest">
              ¿Qué te haría dar 10? (opcional)
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="Cuéntanos brevemente..."
              className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs resize-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
              maxLength={500}
            />
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="mt-2 w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold py-2 transition-colors"
            >
              {submitting ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
