'use client'

/**
 * ContractVersionsPanel — Generador de Contratos / Chunk 3
 *
 * Muestra el historial criptográfico (hash-chain) del contrato:
 *   - Lista de versiones con resumen de cambios + hash truncado
 *   - Botón "Verificar cadena" que recomputa los hashes server-side
 *   - Click en una versión → muestra detalle (modal) con contenido + metadata
 *
 * Posicionamiento de producto: la mayoría de SaaS de RRHH no ofrece
 * trazabilidad criptográfica. Este panel es uno de los diferenciadores
 * para SUNAFIL Diagnostic y peritajes laborales.
 */

import { useEffect, useState, useCallback } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Hash,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

interface VersionSummary {
  id: string
  versionNumber: number
  contentSha256: string
  prevHash: string
  versionHash: string
  diffSummary: string | null
  changeReason: string
  changedBy: string
  createdAt: string
}

interface ChainVerification {
  contractId: string
  versions: number
  valid: boolean
  checkedVersions?: number
  breakAt?: number
  reason?: string
  detail?: string
  verifiedAt: string
}

interface VersionDetail extends VersionSummary {
  contentHtml: string | null
  contentJson: unknown
  formData: unknown
  diffJson: unknown
  orgId: string
  contractId: string
}

interface Props {
  contractId: string
}

function shortHash(h: string): string {
  if (h.startsWith('0x') && h.length === 66) return `${h.slice(0, 8)}…${h.slice(-6)}`
  if (h.length >= 10) return `${h.slice(0, 8)}…${h.slice(-6)}`
  return h
}

export function ContractVersionsPanel({ contractId }: Props) {
  const { toast } = useToast()
  const [versions, setVersions] = useState<VersionSummary[] | null>(null)
  const [verification, setVerification] = useState<ChainVerification | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [detail, setDetail] = useState<VersionDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/versions`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setVersions(data.data)
    } catch {
      toast({ title: 'No se pudieron cargar las versiones', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [contractId, toast])

  useEffect(() => { void load() }, [load])

  async function verifyChain() {
    setVerifying(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/versions/verify`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setVerification(data.data)
      toast({
        title: data.data.valid ? 'Cadena íntegra ✓' : `Cadena rota en v${data.data.breakAt}`,
        type: data.data.valid ? 'success' : 'error',
      })
    } catch {
      toast({ title: 'Error verificando la cadena', type: 'error' })
    } finally {
      setVerifying(false)
    }
  }

  async function openDetail(versionNumber: number) {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/versions/${versionNumber}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDetail(data.data)
    } catch {
      toast({ title: 'No se pudo cargar la versión', type: 'error' })
    } finally {
      setLoadingDetail(false)
    }
  }

  function toggleExpanded(n: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        <Hash className="w-5 h-5 inline mr-2" />
        Aún no hay versiones registradas para este contrato. Se creará la primera al guardar contenido.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen + verificar cadena */}
      <div
        className={cn(
          'rounded-2xl border p-4 flex items-start gap-4',
          verification?.valid === false
            ? 'border-red-300 bg-red-50'
            : verification?.valid === true
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-slate-200 bg-white',
        )}
      >
        <div className="flex-shrink-0">
          {verification?.valid === true ? (
            <ShieldCheck className="w-9 h-9 text-emerald-600" />
          ) : verification?.valid === false ? (
            <ShieldAlert className="w-9 h-9 text-red-600" />
          ) : (
            <Hash className="w-9 h-9 text-slate-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900">
            {versions.length} versión{versions.length === 1 ? '' : 'es'} en hash-chain
          </h3>
          {verification ? (
            verification.valid ? (
              <p className="text-sm text-emerald-700">
                Cadena íntegra · {verification.checkedVersions} versión{(verification.checkedVersions ?? 0) === 1 ? '' : 'es'} verificadas el{' '}
                {new Date(verification.verifiedAt).toLocaleString('es-PE')}
              </p>
            ) : (
              <p className="text-sm text-red-700">
                <strong>Cadena rota en versión {verification.breakAt}.</strong>{' '}
                {verification.detail ?? verification.reason}
              </p>
            )
          ) : (
            <p className="text-sm text-slate-600">
              Trazabilidad criptográfica SHA-256: cada edición encadena con la versión anterior. Si alguien
              altera datos en BD, la cadena se rompe.
            </p>
          )}
        </div>
        <button
          onClick={verifyChain}
          disabled={verifying}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 disabled:opacity-50 flex-shrink-0"
        >
          {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Verificar cadena
        </button>
      </div>

      {/* Timeline de versiones */}
      <ol className="relative border-l border-slate-200 ml-3 space-y-3">
        {[...versions].reverse().map((v) => {
          const isExpanded = expanded.has(v.versionNumber)
          return (
            <li key={v.id} className="ml-6">
              <span className="absolute -left-2 flex items-center justify-center w-4 h-4 bg-primary rounded-full ring-4 ring-white">
                <span className="text-[9px] font-bold text-white">{v.versionNumber}</span>
              </span>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleExpanded(v.versionNumber)}
                  className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">
                        v{v.versionNumber}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(v.createdAt).toLocaleString('es-PE')}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-700">{v.changeReason}</p>
                    {v.diffSummary && (
                      <p className="text-xs text-slate-500 mt-0.5">{v.diffSummary}</p>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-slate-100 pt-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
                      <div>
                        <span className="text-slate-500 block">Content SHA-256</span>
                        <span className="text-slate-800" title={v.contentSha256}>
                          {shortHash(v.contentSha256)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Prev hash</span>
                        <span className="text-slate-800" title={v.prevHash}>
                          {shortHash(v.prevHash)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Version hash</span>
                        <span className="text-slate-800" title={v.versionHash}>
                          {shortHash(v.versionHash)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {v.changedBy}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(v.createdAt).toLocaleString('es-PE')}
                      </span>
                    </div>
                    <button
                      onClick={() => openDetail(v.versionNumber)}
                      disabled={loadingDetail}
                      className="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      {loadingDetail ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Ver contenido completo de esta versión →
                    </button>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {/* Modal detalle versión */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Versión {detail.versionNumber}
                </h3>
                <p className="text-xs text-slate-500 font-mono">{detail.versionHash}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Razón del cambio</h4>
                <p className="text-slate-700">{detail.changeReason}</p>
              </div>
              {detail.diffSummary && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Resumen de diff</h4>
                  <p className="text-slate-700">{detail.diffSummary}</p>
                </div>
              )}
              {detail.contentHtml && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Contenido HTML</h4>
                  <div
                    className="prose prose-sm max-w-none border border-slate-200 rounded-lg p-3 bg-slate-50"
                    dangerouslySetInnerHTML={{ __html: detail.contentHtml }}
                  />
                </div>
              )}
              {detail.formData !== null && detail.formData !== undefined && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">formData</h4>
                  <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto">
                    {JSON.stringify(detail.formData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
