'use client'

/**
 * /admin/normas — Cola de revisión de novedades normativas.
 *
 * El cron diario `/api/cron/norm-updates` puebla la tabla `norm_updates` con
 * status=PENDING_REVIEW. Este es el único lugar donde el equipo de Comply360
 * aprueba o rechaza cada entrada antes de que el sistema notifique a las
 * empresas afectadas (cuando impactLevel es HIGH o CRITICAL).
 *
 * Backend:
 *   GET   /api/admin/norm-updates?status=...
 *   PATCH /api/admin/norm-updates/:id  { action, notes }
 *
 * Gating: ambos endpoints usan `withSuperAdmin` — si el usuario no es
 * SUPER_ADMIN verá "Unauthorized" como respuesta del fetch.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Newspaper,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Calendar,
  Loader2,
  AlertTriangle,
  Clock,
  User,
} from 'lucide-react'

type NormStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
type ImpactLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null

interface NormUpdate {
  id: string
  source: 'EL_PERUANO' | 'SUNAFIL' | 'MTPE' | 'SUNAT' | 'MANUAL'
  normCode: string
  title: string
  summary: string | null
  category: string
  publishedAt: string | null
  effectiveAt: string | null
  sourceUrl: string | null
  impactAnalysis: string | null
  impactLevel: ImpactLevel
  affectedModules: string[]
  affectedRegimens: string[]
  actionRequired: string | null
  actionDeadline: string | null
  status: NormStatus
  reviewNotes: string | null
  reviewedAt: string | null
  reviewedBy: string | null
  createdAt: string
}

interface ListResponse {
  data: NormUpdate[]
  counts: Partial<Record<NormStatus, number>>
  total: number
}

const STATUS_LABEL: Record<NormStatus, string> = {
  PENDING_REVIEW: 'Pendientes',
  APPROVED: 'Aprobadas',
  REJECTED: 'Rechazadas',
}

const IMPACT_STYLE: Record<Exclude<ImpactLevel, null>, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-amber-100 text-amber-800 border-amber-200',
  MEDIUM: 'bg-blue-100 text-blue-800 border-blue-200',
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
}

const SOURCE_LABEL: Record<NormUpdate['source'], string> = {
  EL_PERUANO: 'El Peruano',
  SUNAFIL: 'SUNAFIL',
  MTPE: 'MTPE',
  SUNAT: 'SUNAT',
  MANUAL: 'Manual',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function AdminNormUpdatesPage() {
  const [status, setStatus] = useState<NormStatus>('PENDING_REVIEW')
  const [norms, setNorms] = useState<NormUpdate[]>([])
  const [counts, setCounts] = useState<Record<NormStatus, number>>({
    PENDING_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [flash, setFlash] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/norm-updates?status=${status}&limit=100`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        throw new Error(
          res.status === 401 || res.status === 403
            ? 'Necesitas rol SUPER_ADMIN para ver esta página.'
            : `Error ${res.status} al cargar novedades.`,
        )
      }
      const body = (await res.json()) as ListResponse
      setNorms(body.data)
      setCounts({
        PENDING_REVIEW: body.counts.PENDING_REVIEW ?? 0,
        APPROVED: body.counts.APPROVED ?? 0,
        REJECTED: body.counts.REJECTED ?? 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  async function review(id: string, action: 'approve' | 'reject') {
    setActioningId(id)
    setFlash(null)
    try {
      const res = await fetch(`/api/admin/norm-updates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notesById[id]?.trim() || undefined }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        orgsNotified?: boolean
      }
      if (!res.ok) {
        throw new Error(body.error || `Error ${res.status}`)
      }
      if (action === 'approve') {
        setFlash(
          body.orgsNotified
            ? 'Aprobada. Empresas afectadas notificadas por email.'
            : 'Aprobada. Impacto no crítico → sin notificaciones masivas.',
        )
      } else {
        setFlash('Norma rechazada correctamente.')
      }
      setNotesById((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      await load()
    } catch (err) {
      setFlash(null)
      alert(err instanceof Error ? err.message : 'Error al procesar la norma')
    } finally {
      setActioningId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Novedades normativas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Cola del crawler diario (El Peruano, SUNAFIL, MTPE, SUNAT). Revisa cada
          norma antes de que el sistema notifique a las empresas suscritas.
        </p>
      </div>

      {/* Flash success */}
      {flash && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
          <span>{flash}</span>
          <button
            onClick={() => setFlash(null)}
            className="ml-auto text-emerald-700 hover:text-emerald-900"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-1">
        {(Object.keys(STATUS_LABEL) as NormStatus[]).map((s) => {
          const active = status === s
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                active
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {STATUS_LABEL[s]}
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {counts[s]}
              </span>
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="py-16 text-center">
          <Loader2 className="w-6 h-6 animate-spin inline-block text-slate-400" />
          <p className="text-sm text-slate-500 mt-2">Cargando normas…</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">No se pudo cargar la cola</p>
            <p className="text-sm text-red-800 mt-1">{error}</p>
            <button
              onClick={load}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900"
            >
              Reintentar →
            </button>
          </div>
        </div>
      )}

      {!loading && !error && norms.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <Newspaper className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            No hay normas {STATUS_LABEL[status].toLowerCase()}.
          </p>
          {status === 'PENDING_REVIEW' && (
            <p className="text-xs text-slate-400 mt-1">
              El cron corre todos los días a las 07:00 Lima.
            </p>
          )}
        </div>
      )}

      {!loading && !error && norms.length > 0 && (
        <div className="space-y-4">
          {norms.map((norm) => (
            <NormCard
              key={norm.id}
              norm={norm}
              notes={notesById[norm.id] ?? ''}
              onNotesChange={(v) =>
                setNotesById((prev) => ({ ...prev, [norm.id]: v }))
              }
              busy={actioningId === norm.id}
              onApprove={() => review(norm.id, 'approve')}
              onReject={() => review(norm.id, 'reject')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── NormCard ─────────────────────────────────────────────────────────────────

interface CardProps {
  norm: NormUpdate
  notes: string
  onNotesChange: (v: string) => void
  busy: boolean
  onApprove: () => void
  onReject: () => void
}

function NormCard({ norm, notes, onNotesChange, busy, onApprove, onReject }: CardProps) {
  const impact = norm.impactLevel
  const impactClass = impact ? IMPACT_STYLE[impact] : 'bg-slate-100 text-slate-600 border-slate-200'
  const isPending = norm.status === 'PENDING_REVIEW'

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 mb-3">
        <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-1 rounded">
          {norm.normCode}
        </span>
        {impact && (
          <span className={`text-xs font-semibold px-2 py-1 rounded border ${impactClass}`}>
            {impact}
          </span>
        )}
        <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded">
          {SOURCE_LABEL[norm.source]}
        </span>
        <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
          {norm.category}
        </span>
        <div className="ml-auto flex items-center gap-1 text-xs text-slate-500">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(norm.publishedAt ?? norm.createdAt)}
        </div>
      </div>

      <h3 className="text-base font-semibold text-slate-900 leading-snug mb-2">
        {norm.title}
      </h3>

      {norm.summary && (
        <p className="text-sm text-slate-700 leading-relaxed mb-3">{norm.summary}</p>
      )}

      {/* Action required box */}
      {norm.actionRequired && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-1">
            Acción requerida
          </p>
          <p className="text-sm text-amber-900">{norm.actionRequired}</p>
          {norm.actionDeadline && (
            <p className="text-xs text-amber-800 mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Plazo: {formatDate(norm.actionDeadline)}
            </p>
          )}
        </div>
      )}

      {/* Affected tags */}
      {(norm.affectedModules.length > 0 || norm.affectedRegimens.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {norm.affectedModules.map((m) => (
            <span
              key={`mod-${m}`}
              className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
            >
              mod:{m}
            </span>
          ))}
          {norm.affectedRegimens.map((r) => (
            <span
              key={`reg-${r}`}
              className="text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded"
            >
              reg:{r}
            </span>
          ))}
        </div>
      )}

      {/* IA analysis — collapsible */}
      {norm.impactAnalysis && (
        <details className="group border-t border-slate-100 pt-3 mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-slate-900 select-none list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
            Análisis IA
          </summary>
          <p className="text-sm text-slate-700 mt-2 leading-relaxed whitespace-pre-wrap">
            {norm.impactAnalysis}
          </p>
        </details>
      )}

      {/* Source link */}
      {norm.sourceUrl && (
        <a
          href={norm.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ver norma en la fuente oficial
        </a>
      )}

      {/* Review state for non-pending */}
      {!isPending && (
        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>
              Revisada por <strong>{norm.reviewedBy ?? 'desconocido'}</strong> ·{' '}
              {formatDate(norm.reviewedAt)}
            </span>
          </div>
          {norm.reviewNotes && (
            <p className="italic text-slate-700 bg-slate-50 rounded px-3 py-2 mt-1">
              «{norm.reviewNotes}»
            </p>
          )}
        </div>
      )}

      {/* Review actions (PENDING_REVIEW only) */}
      {isPending && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">
              Notas de revisión (opcional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={2}
              placeholder="Ej: duplica D.S. 001-2026-TR, no aplica al régimen agrario, etc."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              disabled={busy}
            />
          </label>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onReject}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-red-200 text-red-700 bg-white rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-4 h-4" />
              Rechazar
            </button>
            <button
              onClick={onApprove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {busy ? 'Procesando…' : 'Aprobar y notificar'}
            </button>
          </div>
          {(impact === 'HIGH' || impact === 'CRITICAL') && (
            <p className="text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1">
              Al aprobar, el sistema enviará un email a las empresas cuyo régimen principal
              coincida con los regímenes afectados.
            </p>
          )}
        </div>
      )}
    </article>
  )
}
