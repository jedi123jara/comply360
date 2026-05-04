'use client'

import { useEffect, useState } from 'react'
import {
  Loader2,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export type SealKind = 'iperc' | 'accidente' | 'emo' | 'visita'

interface SealResponse {
  kind: string
  resourceId: string
  resourceLabel: string
  fingerprint: string
  slug: string
  publicUrl: string
  qrDataUrl: string | null
  issuedAt: string
}

interface SealQRModalProps {
  /** Tipo de recurso a sellar (URL: /api/sst/seal/{kind}/{id}). */
  kind: SealKind
  /** ID del recurso. */
  resourceId: string
  /** Etiqueta corta del recurso para el header del modal (ej "IPERC v3"). */
  label?: string
  /** Si está abierto. */
  isOpen: boolean
  /** Callback al cerrar. */
  onClose: () => void
}

/**
 * Modal de "Sello criptográfico" — genera el sello QR para un recurso SST y
 * lo presenta de forma imprimible. Reutilizable en los 4 tipos de recurso.
 *
 * El endpoint `/api/sst/seal/[kind]/[id]` registra cada emisión en el audit
 * log, así que abrir este modal deja huella si el contenido cambia entre
 * impresiones (re-emisión).
 */
export function SealQRModal({
  kind,
  resourceId,
  label,
  isOpen,
  onClose,
}: SealQRModalProps) {
  const [data, setData] = useState<SealResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'url' | 'hash' | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setData(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/sst/seal/${kind}/${resourceId}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j?.error || 'No se pudo generar el sello')
        }
        return r.json() as Promise<SealResponse>
      })
      .then((j) => {
        if (!cancelled) setData(j)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error desconocido')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, kind, resourceId])

  function copy(value: string, which: 'url' | 'hash') {
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(which)
        toast.success('Copiado al portapapeles')
        setTimeout(() => setCopied(null), 2000)
      },
      () => toast.error('No se pudo copiar'),
    )
  }

  function downloadQr() {
    if (!data?.qrDataUrl) return
    const a = document.createElement('a')
    a.href = data.qrDataUrl
    a.download = `sello-${kind}-${data.slug}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success('QR descargado')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Sello criptográfico${label ? ` · ${label}` : ''}`}>
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generando sello...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-700">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      ) : data ? (
        <div className="space-y-5">
          {/* Banner explicativo */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
              <div className="text-xs text-emerald-900">
                <strong>Sello SHA-256 + slug público.</strong> Cualquier persona con el QR llega a
                la página de verificación que prueba la autenticidad sin exponer datos sensibles.
                Si el registro se modifica después de imprimirlo, el sello queda inválido.
              </div>
            </div>
          </div>

          {/* QR + datos */}
          <div className="grid items-start gap-4 md:grid-cols-[auto_1fr]">
            {data.qrDataUrl && (
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.qrDataUrl}
                  alt="QR del sello"
                  className="h-48 w-48 rounded-lg border border-slate-200 bg-white p-2"
                />
                <Button size="xs" variant="secondary" onClick={downloadQr}>
                  <Download className="mr-1 h-3 w-3" />
                  Descargar PNG
                </Button>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <Field label="Recurso">
                <Badge variant="emerald" size="xs">
                  {data.kind}
                </Badge>{' '}
                <span className="text-slate-700">{data.resourceLabel}</span>
              </Field>

              <Field label="Slug público">
                <div className="flex items-center gap-2">
                  <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs">
                    {data.slug}
                  </code>
                </div>
              </Field>

              <Field label="URL de verificación">
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700">
                    {data.publicUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(data.publicUrl, 'url')}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    title="Copiar URL"
                  >
                    {copied === 'url' ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <a
                    href={data.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    title="Abrir verificación"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </Field>

              <Field label="Hash SHA-256">
                <div className="flex items-start gap-2">
                  <code className="flex-1 break-all rounded bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-700">
                    {data.fingerprint}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(data.fingerprint, 'hash')}
                    className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    title="Copiar hash"
                  >
                    {copied === 'hash' ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>

              <p className="text-[11px] text-slate-500">
                Emitido el{' '}
                {new Date(data.issuedAt).toLocaleString('es-PE', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-3">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  )
}
