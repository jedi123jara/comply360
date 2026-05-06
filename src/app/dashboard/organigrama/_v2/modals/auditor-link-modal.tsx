/**
 * Modal — generar link público para que un auditor o cliente externo vea
 * el organigrama en modo solo-lectura.
 *
 * Cada link viene firmado con SHA-256 contra un snapshot fresco. Permite
 * configurar duración (24/48/72/168/360 h) y qué se incluye (trabajadores,
 * roles de compliance).
 *
 * Backend: POST /api/orgchart/public-link.
 */
'use client'

import { useState } from 'react'
import { Link2, Loader2, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'

const EXPIRY_OPTIONS: Array<{ hours: 24 | 48 | 72 | 168 | 360; label: string; sub: string }> = [
  { hours: 24, label: '24 horas', sub: 'Inspección rápida' },
  { hours: 48, label: '48 horas', sub: 'Auditoría SUNAFIL típica' },
  { hours: 72, label: '72 horas', sub: 'Inspección extendida' },
  { hours: 168, label: '7 días', sub: 'Due diligence M&A' },
  { hours: 360, label: '15 días', sub: 'Homologación con cliente' },
]

interface PublicLinkResult {
  token: string
  url: string
  expiresAt: string
  hash: string
  snapshotId: string
}

export function AuditorLinkModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'auditor-link'

  const [expiresInHours, setExpiresInHours] = useState<24 | 48 | 72 | 168 | 360>(48)
  const [includeWorkers, setIncludeWorkers] = useState(true)
  const [includeComplianceRoles, setIncludeComplianceRoles] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<PublicLinkResult | null>(null)
  const [copied, setCopied] = useState(false)

  const reset = () => {
    setExpiresInHours(48)
    setIncludeWorkers(true)
    setIncludeComplianceRoles(true)
    setResult(null)
    setCopied(false)
  }

  const handleClose = () => {
    reset()
    closeModal()
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/orgchart/public-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInHours, includeWorkers, includeComplianceRoles }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error al generar el link')
      }
      const data = (await res.json()) as PublicLinkResult
      setResult(data)
      toast.success('Link generado y firmado con SHA-256')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const copyLink = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.url)
      setCopied(true)
      toast.success('Link copiado al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar — copia manualmente desde el campo')
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title="Auditor Link"
      subtitle="Comparte el organigrama en modo solo-lectura, firmado con SHA-256"
      icon={<Link2 className="h-4 w-4" />}
      width="md"
      footer={
        result ? (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
            >
              Listo
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}
              Generar link
            </button>
          </div>
        )
      }
    >
      {!result ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Vigencia
            </label>
            <div className="mt-1 grid grid-cols-1 gap-1.5 md:grid-cols-2">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.hours}
                  type="button"
                  onClick={() => setExpiresInHours(opt.hours)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                    expiresInHours === opt.hours
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Información incluida
            </label>
            <div className="mt-2 space-y-2">
              <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={includeWorkers}
                  onChange={(e) => setIncludeWorkers(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs">
                  <span className="block font-semibold text-slate-900">
                    Nombres de trabajadores
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Si lo desactivas, el auditor solo verá cargos vacantes/ocupados, sin
                    nombres concretos.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={includeComplianceRoles}
                  onChange={(e) => setIncludeComplianceRoles(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs">
                  <span className="block font-semibold text-slate-900">
                    Roles de compliance (CSST, brigadas, etc.)
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Útil para auditorías SUNAFIL. Desactiva si solo quieres compartir
                    estructura sin designaciones legales.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <p>
              El link se firma contra un snapshot del estado actual del organigrama. Si
              cambias la estructura después de generarlo, el auditor seguirá viendo la foto
              firmada (no el estado vivo).
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
              <Check className="h-4 w-4" />
              Link generado y snapshot firmado
            </p>
            <p className="mt-1 text-[11px] text-emerald-800">
              Vence el{' '}
              <strong>
                {new Date(result.expiresAt).toLocaleString('es-PE', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
              .
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              URL para auditor
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                readOnly
                value={result.url}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:outline-none"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                title="Abrir en pestaña nueva"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir
              </a>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Hash SHA-256 del snapshot
            </p>
            <p className="mt-1 break-all font-mono text-[10px] text-slate-600">{result.hash}</p>
            <p className="mt-2 text-[10px] text-slate-500">
              El auditor puede verificar que la información no fue modificada después de la
              firma comparando este hash.
            </p>
          </div>
        </div>
      )}
    </ModalShell>
  )
}
