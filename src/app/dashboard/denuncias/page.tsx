'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ShieldAlert, Eye, Clock, CheckCircle2, XCircle, AlertTriangle,
  Loader2, ChevronDown, ChevronUp, UserX, Scale, MessageSquare,
  Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ComplaintStatus = 'RECEIVED' | 'UNDER_REVIEW' | 'INVESTIGATING' | 'PROTECTION_APPLIED' | 'RESOLVED' | 'DISMISSED'
type ComplaintType = 'HOSTIGAMIENTO_SEXUAL' | 'DISCRIMINACION' | 'ACOSO_LABORAL' | 'OTRO'

interface TimelineEntry {
  id: string
  action: string
  description: string | null
  performedBy: string | null
  createdAt: string
}

type ComplaintSeverity = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'
type ComplaintUrgency = 'BAJA' | 'MEDIA' | 'ALTA' | 'INMEDIATA'

interface TriagePayload {
  ok: boolean
  severity?: ComplaintSeverity
  urgency?: ComplaintUrgency
  summary?: string
  redFlags?: string[]
  suggestedProtectionMeasures?: string[]
  reason?: string
  error?: string
}

interface Complaint {
  id: string
  code: string
  type: ComplaintType
  isAnonymous: boolean
  reporterName: string | null
  description: string
  accusedName: string | null
  accusedPosition: string | null
  status: ComplaintStatus
  assignedTo: string | null
  resolution: string | null
  receivedAt: string
  resolvedAt: string | null
  timeline: TimelineEntry[]
  severityAi: ComplaintSeverity | null
  urgencyAi: ComplaintUrgency | null
  triagedAt: string | null
  triageJson: TriagePayload | null
}

const SEVERITY_STYLE: Record<ComplaintSeverity, string> = {
  CRITICA: 'bg-red-600 text-white',
  ALTA: 'bg-orange-500 text-white',
  MEDIA: 'bg-amber-400 text-amber-950',
  BAJA: 'bg-slate-200 text-slate-700',
}

const URGENCY_STYLE: Record<ComplaintUrgency, string> = {
  INMEDIATA: 'bg-red-100 text-red-800 ring-1 ring-red-300',
  ALTA: 'bg-orange-100 text-orange-800 ring-1 ring-orange-300',
  MEDIA: 'bg-blue-100 text-blue-800 ring-1 ring-blue-300',
  BAJA: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300',
}

const TYPE_LABELS: Record<ComplaintType, string> = {
  HOSTIGAMIENTO_SEXUAL: 'Hostigamiento Sexual',
  DISCRIMINACION: 'Discriminacion',
  ACOSO_LABORAL: 'Acoso Laboral',
  OTRO: 'Otro',
}

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; color: string; icon: typeof Clock }> = {
  RECEIVED: { label: 'Recibida', color: 'bg-blue-900/30 text-emerald-600', icon: Clock },
  UNDER_REVIEW: { label: 'En Evaluacion', color: 'bg-yellow-900/30 text-yellow-400', icon: Eye },
  INVESTIGATING: { label: 'En Investigacion', color: 'bg-orange-900/30 text-orange-400', icon: AlertTriangle },
  PROTECTION_APPLIED: { label: 'Medidas Aplicadas', color: 'bg-purple-900/30 text-purple-400', icon: ShieldAlert },
  RESOLVED: { label: 'Resuelta', color: 'bg-green-900/30 text-green-400', icon: CheckCircle2 },
  DISMISSED: { label: 'Desestimada', color: 'bg-gray-900/30 text-[color:var(--text-tertiary)]', icon: XCircle },
}

const PLAZOS = [
  { label: 'Medidas de proteccion', plazo: '3 dias habiles', base: 'D.S. 014-2019-MIMP, Art. 18' },
  { label: 'Investigacion', plazo: '30 dias calendario', base: 'D.S. 014-2019-MIMP, Art. 20' },
  { label: 'Resolucion', plazo: '5 dias habiles', base: 'D.S. 014-2019-MIMP, Art. 22' },
]

interface Deadline {
  label: string
  baseLegal: string
  dueDate: string
  daysRemaining: number
  status: 'OK' | 'EXPIRING_SOON' | 'OVERDUE'
}

interface ComplaintDeadlines {
  complaintId: string
  code: string
  deadlines: Deadline[]
}

interface DeadlineSummary {
  total: number
  overdueDeadlines: number
  expiringSoonDeadlines: number
  compliant: boolean
}

export default function DenunciasPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [stats, setStats] = useState({ total: 0, received: 0, underReview: 0, investigating: 0, resolved: 0, dismissed: 0 })
  const [deadlineMap, setDeadlineMap] = useState<Record<string, ComplaintDeadlines>>({})
  const [deadlineSummary, setDeadlineSummary] = useState<DeadlineSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | ''>('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const qs = params.toString()
      const [complaintsRes, deadlinesRes] = await Promise.all([
        fetch(`/api/complaints${qs ? `?${qs}` : ''}`),
        fetch('/api/complaints/deadlines'),
      ])
      const complaintsData = await complaintsRes.json()
      setComplaints(complaintsData.complaints || [])
      setStats(complaintsData.stats || {})

      if (deadlinesRes.ok) {
        const deadlinesData = await deadlinesRes.json()
        const map: Record<string, ComplaintDeadlines> = {}
        for (const c of (deadlinesData.data?.complaints || [])) {
          map[c.complaintId] = c
        }
        setDeadlineMap(map)
        setDeadlineSummary(deadlinesData.data?.summary || null)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      loadData()
    })
    return () => {
      cancelled = true
    }
  }, [loadData])

  async function updateComplaint(id: string, status: ComplaintStatus, timelineAction: string) {
    setUpdatingId(id)
    try {
      await fetch('/api/complaints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, timelineAction, timelineDescription: `Estado cambiado a: ${STATUS_CONFIG[status].label}`, performedBy: 'Admin' }),
      })
      loadData()
    } catch { /* ignore */ }
    finally { setUpdatingId(null) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Canal de Denuncias</h1>
          <p className="mt-1 text-[color:var(--text-tertiary)]">Gestion de denuncias por hostigamiento, discriminacion y acoso laboral (Ley 27942)</p>
        </div>
        <div className="rounded-lg border bg-amber-900/20 border-amber-800 px-3 py-2">
          <p className="text-xs font-medium text-amber-400">URL publica para denuncias:</p>
          <p className="text-xs text-amber-400 font-mono">/denuncias/org-demo</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-3 text-center">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-[color:var(--text-tertiary)]">Total</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border-default)] bg-blue-900/20 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.received}</p>
          <p className="text-xs text-emerald-600">Recibidas</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border-default)] bg-orange-900/20 p-3 text-center">
          <p className="text-2xl font-bold text-orange-400">{(stats.underReview || 0) + (stats.investigating || 0)}</p>
          <p className="text-xs text-orange-400">En Proceso</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border-default)] bg-green-900/20 p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
          <p className="text-xs text-green-400">Resueltas</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)] p-3 text-center">
          <p className="text-2xl font-bold text-[color:var(--text-secondary)]">{stats.dismissed}</p>
          <p className="text-xs text-[color:var(--text-tertiary)]">Desestimadas</p>
        </div>
      </div>

      {/* Deadline Alert Banner */}
      {deadlineSummary && (deadlineSummary.overdueDeadlines > 0 || deadlineSummary.expiringSoonDeadlines > 0) && (
        <div className={cn(
          'rounded-xl border p-4 flex items-start gap-3',
          deadlineSummary.overdueDeadlines > 0 ? 'border-red-300 bg-red-50 border-red-800 bg-red-900/20' : 'border-amber-300 bg-amber-50 border-amber-800 bg-amber-900/20'
        )}>
          <Timer className={cn('h-5 w-5 shrink-0 mt-0.5', deadlineSummary.overdueDeadlines > 0 ? 'text-red-400' : 'text-amber-400')} />
          <div>
            <p className={cn('font-semibold', deadlineSummary.overdueDeadlines > 0 ? 'text-red-400' : 'text-amber-400')}>
              {deadlineSummary.overdueDeadlines > 0
                ? `${deadlineSummary.overdueDeadlines} plazo(s) VENCIDO(S) — accion inmediata requerida`
                : `${deadlineSummary.expiringSoonDeadlines} plazo(s) vencen en menos de 3 dias`}
            </p>
            <p className={cn('text-sm mt-0.5', deadlineSummary.overdueDeadlines > 0 ? 'text-red-400' : 'text-amber-400')}>
              Los plazos de hostigamiento sexual son obligatorios bajo D.S. 014-2019-MIMP.
              Su incumplimiento expone a la empresa a multas SUNAFIL por infraccion muy grave.
            </p>
          </div>
        </div>
      )}

      {/* Plazos legales */}
      <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4">
        <h3 className="text-sm font-semibold text-white">Plazos Legales Obligatorios</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {PLAZOS.map(p => (
            <div key={p.label} className="rounded-lg bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)] px-3 py-2">
              <p className="text-sm font-medium text-white text-[color:var(--text-emerald-700)]">{p.label}</p>
              <p className="text-xs text-emerald-700 font-semibold">{p.plazo}</p>
              <p className="text-[10px] text-[color:var(--text-tertiary)]">{p.base}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-[color:var(--text-tertiary)]">Filtrar:</span>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ComplaintStatus | '')}
          className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] px-3 py-1.5 text-sm"
        >
          <option value="">Todas</option>
          {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
            <option key={key} value={key}>{conf.label}</option>
          ))}
        </select>
      </div>

      {/* Complaints list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 border-[color:var(--border-default)] bg-[color:var(--neutral-50)] bg-white/50 p-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-[color:var(--text-secondary)]" />
          <p className="mt-2 text-sm text-[color:var(--text-tertiary)]">No hay denuncias registradas.</p>
          <p className="text-xs text-[color:var(--text-tertiary)]">Las denuncias se reciben a traves del formulario publico.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map(complaint => {
            const statusConf = STATUS_CONFIG[complaint.status]
            const isExpanded = expandedId === complaint.id
            return (
              <div key={complaint.id} className="rounded-xl border border-[color:var(--border-default)] bg-white">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : complaint.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', complaint.type === 'HOSTIGAMIENTO_SEXUAL' ? 'bg-red-900/30' : 'bg-orange-900/30')}>
                      {complaint.type === 'HOSTIGAMIENTO_SEXUAL' ? <UserX className="h-5 w-5 text-red-400" /> : <Scale className="h-5 w-5 text-orange-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white">{complaint.code}</p>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusConf.color)}>
                          {statusConf.label}
                        </span>
                        {complaint.severityAi && (
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', SEVERITY_STYLE[complaint.severityAi])}>
                            {complaint.severityAi}
                          </span>
                        )}
                        {complaint.urgencyAi && complaint.urgencyAi !== 'BAJA' && (
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', URGENCY_STYLE[complaint.urgencyAi])}>
                            ⚡ {complaint.urgencyAi}
                          </span>
                        )}
                        {!complaint.triagedAt && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-700">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            Analizando con IA…
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[color:var(--text-tertiary)]">
                        {TYPE_LABELS[complaint.type]}
                        {complaint.isAnonymous ? ' — Anonima' : ` — ${complaint.reporterName}`}
                        {' — '}{new Date(complaint.receivedAt).toLocaleDateString('es-PE')}
                      </p>
                      {/* Deadline badges */}
                      {deadlineMap[complaint.id] && (() => {
                        const overdue = deadlineMap[complaint.id].deadlines.filter(d => d.status === 'OVERDUE')
                        const soon = deadlineMap[complaint.id].deadlines.filter(d => d.status === 'EXPIRING_SOON')
                        if (overdue.length === 0 && soon.length === 0) return null
                        return (
                          <div className="flex items-center gap-1 mt-0.5">
                            {overdue.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-900/30 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                                <Timer className="h-2.5 w-2.5" />{overdue.length} vencido{overdue.length > 1 ? 's' : ''}
                              </span>
                            )}
                            {soon.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                                <Timer className="h-2.5 w-2.5" />{soon.length} por vencer
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-[color:var(--text-tertiary)]" /> : <ChevronDown className="h-4 w-4 text-[color:var(--text-tertiary)]" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-[color:var(--border-default)] px-4 py-4 space-y-4">
                    {/* Recomendaciones IA */}
                    {complaint.triageJson?.ok && complaint.triageJson.summary && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <h4 className="text-xs font-semibold uppercase text-emerald-800 flex items-center gap-1 mb-2">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Análisis IA
                        </h4>
                        <p className="text-sm text-slate-700 mb-2">{complaint.triageJson.summary}</p>
                        {complaint.triageJson.redFlags && complaint.triageJson.redFlags.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[11px] font-semibold text-red-700 uppercase">Red flags detectados</p>
                            <ul className="mt-1 ml-4 list-disc text-xs text-red-900 space-y-0.5">
                              {complaint.triageJson.redFlags.map((f, i) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {complaint.triageJson.suggestedProtectionMeasures && complaint.triageJson.suggestedProtectionMeasures.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[11px] font-semibold text-emerald-800 uppercase">Medidas de protección sugeridas</p>
                            <ul className="mt-1 ml-4 list-disc text-xs text-emerald-900 space-y-0.5">
                              {complaint.triageJson.suggestedProtectionMeasures.map((m, i) => (
                                <li key={i}>{m}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {complaint.triagedAt && complaint.triageJson && !complaint.triageJson.ok && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start justify-between gap-2">
                        <div>
                          <ShieldAlert className="inline h-3.5 w-3.5 mr-1" />
                          Triaje IA no disponible ({complaint.triageJson.reason ?? 'error'}). Clasifique manualmente.
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                `/api/complaints/${complaint.id}/re-triage`,
                                { method: 'POST' },
                              )
                              if (res.ok) window.location.reload()
                              else throw new Error('Falló re-triage')
                            } catch (err) {
                              alert(
                                err instanceof Error ? err.message : 'Error en re-triage',
                              )
                            }
                          }}
                          className="rounded bg-amber-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-700"
                        >
                          Reintentar IA
                        </button>
                      </div>
                    )}
                    {/* Deadline tracker */}
                    {deadlineMap[complaint.id] && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-[color:var(--text-tertiary)] flex items-center gap-1">
                          <Timer className="h-3.5 w-3.5" /> Plazos Legales
                        </h4>
                        <div className="mt-2 space-y-1.5">
                          {deadlineMap[complaint.id].deadlines.map((d, i) => (
                            <div key={i} className={cn(
                              'flex items-center justify-between rounded-lg px-3 py-2 text-xs',
                              d.status === 'OVERDUE' ? 'bg-red-50 border border-red-200 bg-red-900/20 border-red-800' :
                              d.status === 'EXPIRING_SOON' ? 'bg-amber-50 border border-amber-200 bg-amber-900/20 border-amber-800' :
                              'bg-[color:var(--neutral-50)] border border-[color:var(--border-default)] bg-[color:var(--neutral-100)] border-[color:var(--border-default)]'
                            )}>
                              <div>
                                <p className={cn('font-semibold', d.status === 'OVERDUE' ? 'text-red-400' : d.status === 'EXPIRING_SOON' ? 'text-amber-400' : 'text-[color:var(--text-secondary)]')}>
                                  {d.label}
                                </p>
                                <p className="text-[color:var(--text-tertiary)]">{d.baseLegal}</p>
                              </div>
                              <div className="text-right">
                                <p className={cn('font-bold', d.status === 'OVERDUE' ? 'text-red-400' : d.status === 'EXPIRING_SOON' ? 'text-amber-400' : 'text-green-400')}>
                                  {d.status === 'OVERDUE' ? `Vencido hace ${Math.abs(d.daysRemaining)} dia(s)` :
                                   d.status === 'EXPIRING_SOON' ? `${d.daysRemaining} dia(s)` :
                                   `${d.daysRemaining} dia(s)`}
                                </p>
                                <p className="text-[color:var(--text-tertiary)]">{new Date(d.dueDate).toLocaleDateString('es-PE')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-[color:var(--text-tertiary)]">Descripcion</h4>
                      <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{complaint.description}</p>
                    </div>

                    {complaint.accusedName && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-[color:var(--text-tertiary)]">Denunciado</h4>
                        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{complaint.accusedName} {complaint.accusedPosition && `— ${complaint.accusedPosition}`}</p>
                      </div>
                    )}

                    {complaint.resolution && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-[color:var(--text-tertiary)]">Resolucion</h4>
                        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{complaint.resolution}</p>
                      </div>
                    )}

                    {/* Timeline */}
                    {complaint.timeline.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-[color:var(--text-tertiary)]">Historial</h4>
                        <div className="mt-2 space-y-2">
                          {complaint.timeline.map(entry => (
                            <div key={entry.id} className="flex items-start gap-2">
                              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                              <div>
                                <p className="text-xs font-medium text-[color:var(--text-secondary)]">{entry.action.replace(/_/g, ' ')}</p>
                                {entry.description && <p className="text-xs text-[color:var(--text-tertiary)]">{entry.description}</p>}
                                <p className="text-[10px] text-[color:var(--text-tertiary)]">{new Date(entry.createdAt).toLocaleString('es-PE')} — {entry.performedBy}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {complaint.status !== 'RESOLVED' && complaint.status !== 'DISMISSED' && (
                      <div className="flex flex-wrap gap-2 border-t border-[color:var(--border-default)] pt-3">
                        {complaint.status === 'RECEIVED' && (
                          <button onClick={() => updateComplaint(complaint.id, 'UNDER_REVIEW', 'INICIO_EVALUACION')} disabled={updatingId === complaint.id} className="rounded border border-[color:var(--border-default)] px-3 py-1.5 text-xs font-medium text-yellow-400 hover:bg-yellow-900/20">Iniciar Evaluacion</button>
                        )}
                        {complaint.status === 'UNDER_REVIEW' && (
                          <>
                            <button onClick={() => updateComplaint(complaint.id, 'INVESTIGATING', 'INICIO_INVESTIGACION')} disabled={updatingId === complaint.id} className="rounded border border-[color:var(--border-default)] px-3 py-1.5 text-xs font-medium text-orange-400 hover:bg-orange-900/20">Iniciar Investigacion</button>
                            <button onClick={() => updateComplaint(complaint.id, 'DISMISSED', 'DESESTIMADA')} disabled={updatingId === complaint.id} className="rounded border border-[color:var(--border-default)] px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]">Desestimar</button>
                          </>
                        )}
                        {complaint.status === 'INVESTIGATING' && (
                          <button onClick={() => updateComplaint(complaint.id, 'PROTECTION_APPLIED', 'MEDIDAS_PROTECCION')} disabled={updatingId === complaint.id} className="rounded border border-[color:var(--border-default)] px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-900/20">Aplicar Medidas de Proteccion</button>
                        )}
                        {(complaint.status === 'INVESTIGATING' || complaint.status === 'PROTECTION_APPLIED') && (
                          <button onClick={() => updateComplaint(complaint.id, 'RESOLVED', 'RESUELTA')} disabled={updatingId === complaint.id} className="rounded border border-[color:var(--border-default)] px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-900/20">Marcar Resuelta</button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
