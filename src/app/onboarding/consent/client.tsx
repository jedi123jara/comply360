'use client'

/**
 * ConsentClient — UI de aceptación de documentos legales como pantalla de
 * onboarding dedicada (Ley 29733 · Protección de Datos Personales).
 *
 * Reemplaza al ConsentModal flotante. Esta versión es una PÁGINA, no un
 * modal: el usuario navega a /onboarding/consent y queda bloqueado ahí
 * hasta que acepta. Mismo registro en AuditLog que la versión modal.
 */

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from 'lucide-react'

import { toast } from '@/components/ui/sonner-toaster'
import { track } from '@/lib/analytics'
import {
  CONSENT_COPY,
  ORG_CONSENT_DOCS,
  type ConsentDoc,
} from '@/lib/legal/consent-versions'

export function ConsentClient() {
  const router = useRouter()
  const docs = ORG_CONSENT_DOCS
  const copy = CONSENT_COPY.org

  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)

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
          scope: 'org',
          acceptedDocs: Object.entries(checkedDocs)
            .filter(([, v]) => v)
            .map(([k]) => k),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      track('consent_accepted', { scope: 'org', docsCount: docs.length })
      toast.success('Consentimiento registrado')
      router.replace('/dashboard')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar el consentimiento')
    } finally {
      setSubmitting(false)
    }
  }, [allChecked, submitting, checkedDocs, docs.length, router])

  return (
    <div className="min-h-screen bg-[color:var(--bg-canvas)] flex items-start sm:items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-[color:var(--border-subtle)] px-6 py-5">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_4px_14px_rgba(4,120,87,0.3)]"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}
            >
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                Ley N° 29733 · Protección de Datos Personales
              </p>
              <h1
                className="mt-0.5 text-2xl leading-tight text-[color:var(--text-primary)]"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
              >
                {copy.title}
              </h1>
              <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                {copy.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Docs list */}
        <div className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {docs.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              checked={!!checkedDocs[doc.id]}
              onToggle={() => handleToggle(doc.id)}
            />
          ))}

          <div className="mt-4 rounded-xl bg-[color:var(--neutral-50)] p-3 text-[11px] leading-relaxed text-[color:var(--text-secondary)]">
            <AlertTriangle className="mr-1 inline h-3 w-3 text-amber-600" />
            <strong>Registro de aceptación:</strong> {copy.legalNote}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[color:var(--border-subtle)] px-6 py-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-[color:var(--text-tertiary)]">
            {allChecked
              ? '✓ Todo listo'
              : `Falta marcar ${docs.filter((d) => d.required && !checkedDocs[d.id]).length} documento(s)`}
          </span>
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
