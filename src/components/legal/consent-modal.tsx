'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertTriangle, ExternalLink, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from '@/components/ui/sonner-toaster'
import { track } from '@/lib/analytics'
import {
  CONSENT_COPY,
  ORG_CONSENT_DOCS,
  WORKER_CONSENT_DOCS,
  type ConsentDoc,
  type ConsentScope,
} from '@/lib/legal/consent-versions'

/**
 * ConsentModal — bloquea la UI hasta que el usuario acepta los documentos
 * legales requeridos. Se ejecuta:
 *
 *  • Al sign-up del admin (scope='org')
 *  • Al primer login del trabajador en /mi-portal (scope='worker')
 *  • Si subimos la versión del consent (CONSENT_VERSION bumped)
 *
 * Uso:
 * ```tsx
 * <ConsentGate scope="org">
 *   <DashboardContent />
 * </ConsentGate>
 * ```
 */

interface ConsentModalProps {
  scope: ConsentScope
  /** Se ejecuta cuando el usuario acepta. */
  onAccept: () => void
  /** Si provisto, muestra botón "Rechazar y salir" que ejecuta esto. */
  onReject?: () => void
}

export function ConsentModal({ scope, onAccept, onReject }: ConsentModalProps) {
  const docs = scope === 'org' ? ORG_CONSENT_DOCS : WORKER_CONSENT_DOCS
  const copy = CONSENT_COPY[scope]
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    track('consent_shown', { scope })
  }, [scope])

  const allChecked = useMemo(
    () => docs.every((d) => !d.required || checkedDocs[d.id]),
    [docs, checkedDocs],
  )

  const handleToggle = useCallback((id: string) => {
    setCheckedDocs((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const handleAccept = useCallback(async () => {
    if (!allChecked || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          acceptedDocs: Object.entries(checkedDocs)
            .filter(([, v]) => v)
            .map(([k]) => k),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      track('consent_accepted', { scope, docsCount: docs.length })
      toast.success('Consentimiento registrado')
      onAccept()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar el consentimiento')
    } finally {
      setSubmitting(false)
    }
  }, [allChecked, submitting, scope, checkedDocs, onAccept, docs.length])

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm motion-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl motion-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-[color:var(--border-subtle)] px-6 py-5">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_4px_14px_rgba(4,120,87,0.3)]"
              style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}
            >
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                Ley N° 29733 · Protección de Datos Personales
              </p>
              <h2
                id="consent-title"
                className="mt-0.5 text-2xl leading-tight text-[color:var(--text-primary)]"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
              >
                {copy.title}
              </h2>
              <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                {copy.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Docs list */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {docs.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              checked={!!checkedDocs[doc.id]}
              onToggle={() => handleToggle(doc.id)}
            />
          ))}

          {/* Nota legal */}
          <div className="mt-4 rounded-xl bg-[color:var(--neutral-50)] p-3 text-[11px] leading-relaxed text-[color:var(--text-secondary)]">
            <AlertTriangle className="mr-1 inline h-3 w-3 text-amber-600" />
            <strong>Registro de aceptación:</strong> {copy.legalNote}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[color:var(--border-subtle)] px-6 py-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          {onReject ? (
            <button
              type="button"
              onClick={onReject}
              disabled={submitting}
              className="text-xs font-medium text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
            >
              Rechazar y salir
            </button>
          ) : (
            <span className="text-[11px] text-[color:var(--text-tertiary)]">
              {allChecked ? '✓ Todo listo' : `Falta marcar ${docs.filter((d) => d.required && !checkedDocs[d.id]).length} documento(s)`}
            </span>
          )}
          <button
            type="button"
            onClick={handleAccept}
            disabled={!allChecked || submitting}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(4,120,87,0.3)] transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Registrando…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {copy.confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function DocRow({
  doc,
  checked,
  onToggle,
}: {
  doc: ConsentDoc
  checked: boolean
  onToggle: () => void
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
        checked
          ? 'border-emerald-300 bg-emerald-50/50'
          : 'border-[color:var(--border-default)] bg-white hover:border-emerald-200'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 h-4 w-4 accent-emerald-600 shrink-0"
        required={doc.required}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[color:var(--text-primary)]">
            He leído y acepto: {doc.label}
          </span>
          {doc.required ? (
            <span className="text-[10px] font-semibold text-rose-600">*obligatorio</span>
          ) : null}
        </div>
        <Link
          href={doc.href}
          target="_blank"
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Leer documento completo <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </label>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Gate wrapper que consulta /api/consent y muestra el modal si falta
// ═══════════════════════════════════════════════════════════════════════════

export function ConsentGate({
  scope,
  children,
}: {
  scope: ConsentScope
  children: React.ReactNode
}) {
  const [status, setStatus] = useState<'loading' | 'needs-consent' | 'ok'>('loading')

  useEffect(() => {
    let mounted = true
    fetch(`/api/consent?scope=${scope}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!mounted) return
        // CRÍTICO: si el endpoint retorna 401 (no autenticado) o 404 (sin
        // Worker vinculado), NO mostrar el modal — fail-open. Antes el
        // código trataba 401/404 como "necesita consent" y mostraba el
        // modal a usuarios sin sesión que llegaban por PWA cacheada,
        // confundiéndolos. El modal de consent solo tiene sentido si el
        // user está autenticado y el endpoint responde con accepted=false.
        if (!r.ok) {
          setStatus('ok') // fail-open: no bloquear render
          return
        }
        const data = (await r.json()) as { accepted?: boolean }
        setStatus(data.accepted ? 'ok' : 'needs-consent')
      })
      .catch(() => {
        if (mounted) setStatus('ok') // fail-open para no bloquear si API falla
      })
    return () => {
      mounted = false
    }
  }, [scope])

  return (
    <>
      {children}
      {status === 'needs-consent' ? (
        <ConsentModal scope={scope} onAccept={() => setStatus('ok')} />
      ) : null}
    </>
  )
}
