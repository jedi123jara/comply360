'use client'

/**
 * DocumentosFirmaClient — UI admin de gestión de acuses.
 *
 * Vista lista (default): todos los docs requireAck con progress bars.
 * Click en un doc → drill-down (DrillDownDoc): tabla workers + acciones.
 *
 * Acciones por doc:
 *   - Recordar a pendientes (POST /notify-workers con force=true)
 *   - Descargar audit PDF (GET /audit-pdf — abre en nueva tab)
 *   - Ver detalle (drill-down)
 */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  FileSignature, Loader2, Download, Send, RefreshCw,
  CheckCircle2, Clock, AlertTriangle, ArrowLeft, Mail, Search,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner-toaster'
import { cn } from '@/lib/utils'

interface DocSummary {
  id: string
  type: string
  title: string
  version: number
  isPublishedToWorkers: boolean
  publishedAt: string | null
  lastNotifiedAt: string | null
  acknowledgmentDeadlineDays: number | null
  updatedAt: string
  progress: {
    total: number
    signed: number
    pending: number
    signedPct: number
    version: number
  }
}

interface AckItem {
  workerId: string
  firstName: string
  lastName: string
  email: string | null
  regimenLaboral: string
  department: string | null
  position: string | null
  status: 'signed' | 'pending'
  acknowledgedAt: string | null
  signatureMethod: string | null
  ip: string | null
  scrolledToEnd: boolean | null
  readingTimeMs: number | null
  daysSinceNotif: number | null
}

interface DrillDownData {
  docId: string
  docTitle: string
  docVersion: number
  lastNotifiedAt: string | null
  summary: { total: number; signed: number; pending: number; signedPct: number }
  items: AckItem[]
}

export function DocumentosFirmaClient() {
  const [docs, setDocs] = useState<DocSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/org-documents/with-ack')
      if (!res.ok) throw new Error('Error al cargar documentos')
      const data = await res.json()
      setDocs(data.documents)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchDocs()
  }, [fetchDocs])

  if (selectedDocId) {
    return (
      <DrillDownView
        docId={selectedDocId}
        onBack={() => {
          setSelectedDocId(null)
          void fetchDocs()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-slate-900"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
          >
            Documentos <em className="text-emerald-700">por firmar</em>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Políticas, RIT, SST y otros documentos que tus trabajadores deben acusar
            recibo con valor legal SUNAFIL (Ley 27269).
          </p>
        </div>
        <button
          onClick={fetchDocs}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refrescar
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      )}

      {/* Vacío */}
      {!loading && docs && docs.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
            <FileSignature className="w-7 h-7 text-emerald-700" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Aún no tienes documentos que requieran firma
          </h2>
          <p className="text-sm text-slate-600 mb-5 max-w-md mx-auto leading-relaxed">
            Marca tu RIT, política SST, política de hostigamiento u otros documentos como
            "requiere firma de los trabajadores" para activar el flujo automático de notificación
            + acuse de recibo + audit trail SUNAFIL.
          </p>
          <Link
            href="/dashboard/sst"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-2.5"
          >
            Ir a Generadores SST
          </Link>
        </div>
      )}

      {/* Lista de docs */}
      {!loading && docs && docs.length > 0 && (
        <div className="space-y-3">
          {docs.map((doc) => (
            <DocRow key={doc.id} doc={doc} onClick={() => setSelectedDocId(doc.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Row de doc en la lista ──────────────────────────────────────────────────
function DocRow({ doc, onClick }: { doc: DocSummary; onClick: () => void }) {
  const isFullySigned = doc.progress.pending === 0 && doc.progress.total > 0
  const hasPending = doc.progress.pending > 0
  const hasNoPublished = !doc.isPublishedToWorkers

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl bg-white ring-1 ring-slate-200 hover:ring-emerald-300 hover:shadow-md p-5 transition-all"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-slate-900 text-base">{doc.title}</h3>
            <span className="rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
              {doc.type.replace(/_/g, ' ')}
            </span>
            <span className="rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 ring-1 ring-purple-200">
              v{doc.version}
            </span>
            {hasNoPublished && (
              <span className="rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 ring-1 ring-amber-200">
                Sin publicar
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
            {doc.lastNotifiedAt ? (
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Notificado {relativeTime(doc.lastNotifiedAt)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Sin notificar aún
              </span>
            )}
            {doc.acknowledgmentDeadlineDays && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Plazo: {doc.acknowledgmentDeadlineDays} días
              </span>
            )}
          </div>

          {/* Progress bar */}
          {doc.progress.total > 0 ? (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span
                  className={cn(
                    'font-semibold',
                    isFullySigned
                      ? 'text-emerald-700'
                      : hasPending
                        ? 'text-amber-700'
                        : 'text-slate-700',
                  )}
                >
                  {doc.progress.signed} de {doc.progress.total} trabajadores firmaron ({doc.progress.signedPct}%)
                </span>
                <span className="text-slate-500">{doc.progress.pending} pendientes</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    isFullySigned ? 'bg-emerald-500' : 'bg-amber-500',
                  )}
                  style={{ width: `${doc.progress.signedPct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No hay trabajadores en el scope.</p>
          )}
        </div>

        {/* Status icon */}
        <div className="shrink-0">
          {isFullySigned ? (
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          ) : hasPending ? (
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          ) : (
            <Clock className="w-7 h-7 text-slate-400" />
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Drill-down view ────────────────────────────────────────────────────────
function DrillDownView({ docId, onBack }: { docId: string; onBack: () => void }) {
  const [data, setData] = useState<DrillDownData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'signed' | 'pending'>('all')
  const [search, setSearch] = useState('')
  const [reminding, setReminding] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/org-documents/${docId}/acknowledgments`)
      if (!res.ok) throw new Error('Error al cargar acuses')
      const json = await res.json()
      setData(json)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [docId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  async function handleRemind(force = true) {
    setReminding(true)
    try {
      const res = await fetch(`/api/org-documents/${docId}/notify-workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al recordar')
      if (json.throttled) {
        toast.info('Recordatorio enviado por banner. Email throttled (último envío < 7d).')
      } else {
        toast.success(`✓ Recordatorio enviado a ${json.emailsSent} trabajador(es)`)
      }
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al recordar')
    } finally {
      setReminding(false)
    }
  }

  function handleDownloadAuditPdf() {
    window.open(`/api/org-documents/${docId}/acknowledgments/audit-pdf`, '_blank')
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  const filtered = data.items.filter((item) => {
    if (filter !== 'all' && item.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      const fullName = `${item.firstName} ${item.lastName}`.toLowerCase()
      if (!fullName.includes(q) && !item.email?.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a la lista
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{data.docTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">
            Versión actual: <strong>v{data.docVersion}</strong>
            {data.lastNotifiedAt && ` · Notificado ${relativeTime(data.lastNotifiedAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleRemind(true)}
            disabled={reminding}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 disabled:opacity-50"
          >
            {reminding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Recordar a pendientes
          </button>
          <button
            onClick={handleDownloadAuditPdf}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-4 py-2"
          >
            <Download className="w-3.5 h-3.5" />
            Audit PDF SUNAFIL
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={String(data.summary.total)} color="slate" />
        <StatCard label="Firmados" value={String(data.summary.signed)} color="emerald" />
        <StatCard label="Pendientes" value={String(data.summary.pending)} color="amber" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(['all', 'signed', 'pending'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-semibold transition-colors',
                filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
              )}
            >
              {f === 'all' ? 'Todos' : f === 'signed' ? 'Firmados' : 'Pendientes'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl bg-white ring-1 ring-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-700 uppercase">Trabajador</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-700 uppercase">Régimen</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-700 uppercase">Estado</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-700 uppercase">Fecha firma</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-700 uppercase">Método</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-700 uppercase">IP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-sm text-slate-500 py-8">
                  Sin trabajadores que coincidan con el filtro
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.workerId} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.firstName} {item.lastName}</p>
                      <p className="text-xs text-slate-500">{item.email ?? 'sin email'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{item.regimenLaboral}</td>
                  <td className="px-4 py-3">
                    {item.status === 'signed' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-bold ring-1 ring-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Firmado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-xs font-bold ring-1 ring-amber-200">
                        <Clock className="w-3 h-3" /> Pendiente
                        {item.daysSinceNotif !== null && item.daysSinceNotif > 0 && (
                          <span className="ml-1 text-amber-600">({item.daysSinceNotif}d)</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    {item.acknowledgedAt
                      ? new Date(item.acknowledgedAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">{item.signatureMethod ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">{item.ip ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string; color: 'slate' | 'emerald' | 'amber' }) {
  const colorMap = {
    slate: 'bg-white ring-slate-200 text-slate-900',
    emerald: 'bg-emerald-50 ring-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 ring-amber-200 text-amber-700',
  }
  return (
    <div className={cn('rounded-xl p-4 ring-1 text-center', colorMap[color])}>
      <p className="text-xs uppercase tracking-wider opacity-70 font-semibold">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const hr = Math.floor(ms / (1000 * 60 * 60))
  if (hr < 24) return `hace ${hr} h`
  const days = Math.floor(hr / 24)
  if (days < 30) return `hace ${days} ${days === 1 ? 'día' : 'días'}`
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}
