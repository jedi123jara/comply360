'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ShieldAlert, Eye, Clock, CheckCircle2, XCircle, AlertTriangle,
  Loader2, ChevronDown, ChevronUp, Scale, MessageSquare,
  Timer, HeartPulse, ClipboardList, FileText, UploadCloud,
  KeyRound, Send, Copy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  COMPLAINT_REGIMES,
  COMPLAINT_TYPES,
  type ComplaintRegimeValue,
  type ComplaintTypeValue,
} from '@/lib/complaints/regime-rules'

type ComplaintStatus = 'RECEIVED' | 'UNDER_REVIEW' | 'INVESTIGATING' | 'PROTECTION_APPLIED' | 'RESOLVED' | 'DISMISSED'
type ComplaintType = ComplaintTypeValue
type ComplaintRegime = ComplaintRegimeValue
type ComplaintStage = 'RECEPCION' | 'EVALUACION' | 'MEDIDAS_PROTECCION' | 'INVESTIGACION' | 'INFORME_COMITE' | 'DECISION_FINAL' | 'COMUNICACION_AUTORIDAD' | 'CIERRE' | 'APELACION'
type ComplaintDocumentKind = 'ACTA' | 'QUEJA' | 'INFORME' | 'MEDIDA_PROTECCION' | 'COMUNICACION_AUTORIDAD' | 'DESCARGO' | 'EVIDENCIA' | 'RESOLUCION' | 'OTRO'

interface TimelineEntry {
  id: string
  action: string
  description: string | null
  visibleToReporter?: boolean
  publicDescription?: string | null
  performedBy: string | null
  createdAt: string
}

interface ComplaintDocument {
  id: string
  title: string
  stage: ComplaintStage
  kind: ComplaintDocumentKind
  url: string
  storagePath: string | null
  mimeType: string | null
  size: number | null
  hashSha256: string | null
  visibleToReporter: boolean
  uploadedBy: string | null
  createdAt: string
  updatedAt: string
}

interface ComplaintDocumentDraft {
  title: string
  stage: ComplaintStage
  kind: ComplaintDocumentKind
  visibleToReporter: boolean
  file: File | null
}

interface UpdateComplaintOptions {
  timelineDescription?: string
  publicTimeline?: boolean
  publicDescription?: string
  closeExceptionReason?: string
  resolution?: string
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
  regime: ComplaintRegime
  type: ComplaintType
  channel: string
  isAnonymous: boolean
  reporterName: string | null
  description: string
  accusedName: string | null
  accusedPosition: string | null
  occurredAt: string | null
  location: string | null
  caseMetadata: Record<string, unknown> | null
  evidenceUrls: string[]
  status: ComplaintStatus
  assignedTo: string | null
  resolution: string | null
  receivedAt: string
  resolvedAt: string | null
  timeline: TimelineEntry[]
  documents: ComplaintDocument[]
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
  SST_ACCIDENTE_MORTAL: 'Accidente mortal',
  SST_INCIDENTE_PELIGROSO: 'Incidente peligroso',
  SST_ACCIDENTE_NO_MORTAL: 'Accidente no mortal',
  SST_ENFERMEDAD_OCUPACIONAL: 'Enfermedad ocupacional',
  SST_CONDICION_INSEGURA: 'Condicion insegura',
  MPD_CORRUPCION: 'Corrupcion / cohecho',
  MPD_LAVADO_ACTIVOS: 'Lavado de activos',
  MPD_TRIBUTARIO_ADUANERO: 'Tributario / aduanero',
  MPD_TERRORISMO: 'Terrorismo / financiamiento',
  MPD_OTRO: 'Otra irregularidad MPD',
  OTRO: 'Otro',
}

const STAGE_LABELS: Record<ComplaintStage, string> = {
  RECEPCION: 'Recepcion',
  EVALUACION: 'Evaluacion inicial',
  MEDIDAS_PROTECCION: 'Medidas de proteccion',
  INVESTIGACION: 'Investigacion',
  INFORME_COMITE: 'Informe del Comite',
  DECISION_FINAL: 'Decision final',
  COMUNICACION_AUTORIDAD: 'Comunicacion a autoridad',
  CIERRE: 'Cierre',
  APELACION: 'Apelacion',
}

const DOCUMENT_KIND_LABELS: Record<ComplaintDocumentKind, string> = {
  ACTA: 'Acta',
  QUEJA: 'Queja / denuncia',
  INFORME: 'Informe',
  MEDIDA_PROTECCION: 'Medida de proteccion',
  COMUNICACION_AUTORIDAD: 'Comunicacion a autoridad',
  DESCARGO: 'Descargo',
  EVIDENCIA: 'Evidencia',
  RESOLUCION: 'Resolucion',
  OTRO: 'Otro',
}

const DEFAULT_DOCUMENT_DRAFT: ComplaintDocumentDraft = {
  title: '',
  stage: 'EVALUACION',
  kind: 'INFORME',
  visibleToReporter: false,
  file: null,
}

const STAGE_ORDER_BY_REGIME: Record<ComplaintRegime, ComplaintStage[]> = {
  HSL: ['RECEPCION', 'EVALUACION', 'MEDIDAS_PROTECCION', 'INVESTIGACION', 'INFORME_COMITE', 'DECISION_FINAL', 'COMUNICACION_AUTORIDAD', 'CIERRE'],
  SST: ['RECEPCION', 'EVALUACION', 'COMUNICACION_AUTORIDAD', 'INVESTIGACION', 'INFORME_COMITE', 'DECISION_FINAL', 'CIERRE'],
  MPD: ['RECEPCION', 'EVALUACION', 'INVESTIGACION', 'INFORME_COMITE', 'DECISION_FINAL', 'COMUNICACION_AUTORIDAD', 'CIERRE'],
}

const CLOSE_REQUIRED_STAGES: Record<ComplaintRegime, ComplaintStage[]> = {
  HSL: ['INFORME_COMITE', 'DECISION_FINAL'],
  SST: ['INFORME_COMITE', 'DECISION_FINAL'],
  MPD: ['INFORME_COMITE', 'DECISION_FINAL'],
}

const DISMISS_REQUIRED_STAGES: Record<ComplaintRegime, ComplaintStage[]> = {
  HSL: ['DECISION_FINAL'],
  SST: ['DECISION_FINAL'],
  MPD: ['DECISION_FINAL'],
}

const REGIME_STYLE: Record<ComplaintRegime, { label: string; badge: string; panel: string; icon: typeof ShieldAlert }> = {
  HSL: { label: 'HSL', badge: 'bg-red-100 text-red-800 ring-1 ring-red-300', panel: 'border-red-800 bg-red-900/20', icon: ShieldAlert },
  SST: { label: 'SST', badge: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300', panel: 'border-emerald-800 bg-emerald-900/20', icon: HeartPulse },
  MPD: { label: 'MPD', badge: 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300', panel: 'border-indigo-800 bg-indigo-900/20', icon: Scale },
}

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; color: string; icon: typeof Clock }> = {
  RECEIVED: { label: 'Recibida', color: 'bg-blue-900/30 text-emerald-600', icon: Clock },
  UNDER_REVIEW: { label: 'En Evaluacion', color: 'bg-yellow-900/30 text-yellow-400', icon: Eye },
  INVESTIGATING: { label: 'En Investigacion', color: 'bg-orange-900/30 text-orange-400', icon: AlertTriangle },
  PROTECTION_APPLIED: { label: 'Medidas Aplicadas', color: 'bg-purple-900/30 text-purple-400', icon: ShieldAlert },
  RESOLVED: { label: 'Resuelta', color: 'bg-green-900/30 text-green-400', icon: CheckCircle2 },
  DISMISSED: { label: 'Desestimada', color: 'bg-gray-900/30 text-[color:var(--text-tertiary)]', icon: XCircle },
}

const LEGAL_MILESTONES: Record<ComplaintRegime, Array<{ label: string; plazo: string; base: string }>> = {
  HSL: [
    { label: 'Atencion y traslado', plazo: '1 dia habil', base: 'D.S. 014-2019-MIMP, Arts. 17 y 29' },
    { label: 'Medidas de proteccion', plazo: '3 dias habiles', base: 'D.S. 014-2019-MIMP, Art. 18' },
    { label: 'Informe del Comite', plazo: '15 dias calendario', base: 'D.S. 014-2019-MIMP, Art. 29' },
  ],
  SST: [
    { label: 'Mortal/incidente peligroso', plazo: '24 horas', base: 'Ley 29783 / SAT-MTPE' },
    { label: 'Enfermedad ocupacional', plazo: '5 dias habiles', base: 'D.S. 005-2012-TR / D.S. 006-2022-TR' },
    { label: 'Registro e investigacion', plazo: '10-30 dias sugerido', base: 'R.M. 050-2013-TR' },
  ],
  MPD: [
    { label: 'Acuse confidencial', plazo: '24-72 horas', base: 'D.S. 002-2025-JUS, Art. 40' },
    { label: 'Triaje preliminar', plazo: '5-10 dias habiles', base: 'SMV / ISO 37301' },
    { label: 'Investigacion', plazo: '30-90 dias', base: 'D.S. 002-2025-JUS, Arts. 39-40' },
  ],
}

const TRIAGE_STALE_AFTER_MS = 2 * 60 * 1000

function isTriageStale(complaint: Pick<Complaint, 'triagedAt' | 'receivedAt'>) {
  if (complaint.triagedAt) return false
  const receivedAt = new Date(complaint.receivedAt).getTime()
  if (Number.isNaN(receivedAt)) return false
  return Date.now() - receivedAt > TRIAGE_STALE_AFTER_MS
}

function recommendedKindForStage(stage: ComplaintStage): ComplaintDocumentKind {
  if (stage === 'RECEPCION') return 'QUEJA'
  if (stage === 'MEDIDAS_PROTECCION') return 'MEDIDA_PROTECCION'
  if (stage === 'COMUNICACION_AUTORIDAD') return 'COMUNICACION_AUTORIDAD'
  if (stage === 'DECISION_FINAL') return 'RESOLUCION'
  if (stage === 'INFORME_COMITE' || stage === 'INVESTIGACION' || stage === 'EVALUACION') return 'INFORME'
  return 'ACTA'
}

function isReporterSafeStage(stage: ComplaintStage) {
  return stage === 'RECEPCION' || stage === 'MEDIDAS_PROTECCION' || stage === 'DECISION_FINAL' || stage === 'CIERRE'
}

function missingCloseStages(complaint: Complaint, status: ComplaintStatus) {
  const required = status === 'DISMISSED'
    ? DISMISS_REQUIRED_STAGES[complaint.regime]
    : CLOSE_REQUIRED_STAGES[complaint.regime]
  const present = new Set((complaint.documents ?? []).map((document) => document.stage))
  return required.filter((stage) => !present.has(stage))
}

function shortHash(hash: string | null) {
  return hash ? hash.slice(0, 10) : null
}

interface Deadline {
  label: string
  baseLegal: string
  dueDate: string
  daysRemaining: number
  status: 'OK' | 'EXPIRING_SOON' | 'OVERDUE'
  kind?: 'LEGAL' | 'BEST_PRACTICE' | 'EXTERNAL_REPORT' | 'PRESCRIPTION'
  action?: string
  authority?: string
}

interface ComplaintDeadlines {
  complaintId: string
  code: string
  regime: ComplaintRegime
  regimeLabel: string
  deadlines: Deadline[]
}

interface DeadlineSummary {
  total: number
  overdueDeadlines: number
  expiringSoonDeadlines: number
  compliant: boolean
  byRegime?: Partial<Record<ComplaintRegime, number>>
}

export default function DenunciasPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [stats, setStats] = useState({
    total: 0,
    received: 0,
    underReview: 0,
    investigating: 0,
    resolved: 0,
    dismissed: 0,
    byRegime: {} as Partial<Record<ComplaintRegime, number>>,
  })
  const [deadlineMap, setDeadlineMap] = useState<Record<string, ComplaintDeadlines>>({})
  const [deadlineSummary, setDeadlineSummary] = useState<DeadlineSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | ''>('')
  const [regimeFilter, setRegimeFilter] = useState<ComplaintRegime | ''>('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [documentDrafts, setDocumentDrafts] = useState<Record<string, ComplaintDocumentDraft>>({})
  const [publicNoteDrafts, setPublicNoteDrafts] = useState<Record<string, string>>({})
  const [closeExceptionDrafts, setCloseExceptionDrafts] = useState<Record<string, string>>({})
  const [trackingTokenResults, setTrackingTokenResults] = useState<Record<string, { token: string; url: string }>>({})

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (regimeFilter) params.set('regime', regimeFilter)
      const qs = params.toString()
      const [complaintsRes, deadlinesRes] = await Promise.all([
        fetch(`/api/complaints${qs ? `?${qs}` : ''}`),
        fetch('/api/complaints/deadlines'),
      ])
      const complaintsData = await complaintsRes.json()
      setComplaints(complaintsData.complaints || [])
      const nextStats = complaintsData.stats || {}
      setStats({
        total: nextStats.total || 0,
        received: nextStats.received || 0,
        underReview: nextStats.underReview || 0,
        investigating: nextStats.investigating || 0,
        resolved: nextStats.resolved || 0,
        dismissed: nextStats.dismissed || 0,
        byRegime: nextStats.byRegime || {},
      })

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
  }, [regimeFilter, statusFilter])

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

  useEffect(() => {
    const hasLiveTriage = complaints.some((complaint) => (
      !complaint.triagedAt && !isTriageStale(complaint)
    ))
    if (!hasLiveTriage) return

    const timer = window.setTimeout(() => {
      void loadData()
    }, 8000)

    return () => window.clearTimeout(timer)
  }, [complaints, loadData])

  async function updateComplaint(
    id: string,
    status: ComplaintStatus | undefined,
    timelineAction: string,
    options: UpdateComplaintOptions = {},
  ) {
    setUpdatingId(id)
    try {
      const timelineDescription = options.timelineDescription
        ?? (status ? `Estado cambiado a: ${STATUS_CONFIG[status].label}` : 'Actualizacion registrada en el expediente.')
      const body: Record<string, unknown> = {
        id,
        timelineAction,
        timelineDescription,
        performedBy: 'Admin',
      }
      if (status) body.status = status
      if (options.publicTimeline) {
        body.publicTimeline = true
        body.publicDescription = options.publicDescription || timelineDescription
      }
      if (options.closeExceptionReason) body.closeExceptionReason = options.closeExceptionReason
      if (options.resolution) body.resolution = options.resolution

      const res = await fetch('/api/complaints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const missing = Array.isArray(data?.missingStages) ? `\nFalta documentar: ${data.missingStages.join(', ')}` : ''
        throw new Error(`${data?.error || 'No se pudo actualizar la denuncia.'}${missing}`)
      }
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo actualizar la denuncia.')
    }
    finally { setUpdatingId(null) }
  }

  async function publishReporterUpdate(id: string) {
    const message = (publicNoteDrafts[id] ?? '').trim()
    if (message.length < 8) {
      alert('Escribe una actualizacion clara antes de publicarla al denunciante.')
      return
    }
    await updateComplaint(id, undefined, 'PUBLIC_REPORTER_UPDATE', {
      timelineDescription: message,
      publicTimeline: true,
      publicDescription: message,
    })
    setPublicNoteDrafts((prev) => ({ ...prev, [id]: '' }))
  }

  async function regenerateTrackingToken(complaint: Complaint) {
    const ok = window.confirm('Se generara un nuevo token privado. El token anterior dejara de funcionar. Continuar?')
    if (!ok) return

    setUpdatingId(`token:${complaint.id}`)
    try {
      const res = await fetch(`/api/complaints/${complaint.id}/tracking-token`, { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.trackingToken || !data?.trackingUrl) {
        throw new Error(data?.error || 'No se pudo generar el token privado.')
      }
      const absoluteUrl = new URL(data.trackingUrl, window.location.origin).toString()
      setTrackingTokenResults((prev) => ({
        ...prev,
        [complaint.id]: { token: data.trackingToken, url: absoluteUrl },
      }))
      await navigator.clipboard?.writeText(absoluteUrl).catch(() => undefined)
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo generar el token privado.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function retryTriage(id: string) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/complaints/${id}/re-triage`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Fallo el re-triaje IA')
      }
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error en re-triaje IA')
    } finally {
      setUpdatingId(null)
    }
  }

  function updateDocumentDraft(id: string, patch: Partial<ComplaintDocumentDraft>) {
    setDocumentDrafts((prev) => ({
      ...prev,
      [id]: {
        ...DEFAULT_DOCUMENT_DRAFT,
        ...(prev[id] ?? {}),
        ...patch,
      },
    }))
  }

  function prepareDocumentDraft(id: string, stage: ComplaintStage) {
    updateDocumentDraft(id, {
      stage,
      kind: recommendedKindForStage(stage),
      title: `${STAGE_LABELS[stage]} - expediente`,
      visibleToReporter: isReporterSafeStage(stage),
    })
  }

  async function uploadComplaintDocument(id: string) {
    const draft = documentDrafts[id] ?? DEFAULT_DOCUMENT_DRAFT
    if (!draft.file) {
      alert('Selecciona un archivo para subir al expediente.')
      return
    }

    const title = draft.title.trim() || draft.file.name
    setUpdatingId(`document:${id}`)

    try {
      const formData = new FormData()
      formData.append('file', draft.file)
      formData.append('bucket', 'documents')
      formData.append('subfolder', `complaints/${id}`)

      const uploadRes = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })
      const uploadData = await uploadRes.json().catch(() => null)
      if (!uploadRes.ok || !uploadData?.success) {
        throw new Error(uploadData?.error || 'No se pudo subir el archivo.')
      }

      const metaRes = await fetch(`/api/complaints/${id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          stage: draft.stage,
          kind: draft.kind,
          url: uploadData.data.url,
          storagePath: uploadData.data.path,
          mimeType: uploadData.data.mimeType,
          size: uploadData.data.size,
          hashSha256: uploadData.data.hashSha256,
          visibleToReporter: draft.visibleToReporter,
        }),
      })
      const metaData = await metaRes.json().catch(() => null)
      if (!metaRes.ok) {
        throw new Error(metaData?.error || 'El archivo subio, pero no se pudo documentar en el expediente.')
      }

      setDocumentDrafts((prev) => ({
        ...prev,
        [id]: { ...DEFAULT_DOCUMENT_DRAFT },
      }))
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo subir el documento.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Canal de Denuncias y Reclamos Internos</h1>
          <p className="mt-1 text-[color:var(--text-tertiary)]">
            Gestion por regimen: Hostigamiento Sexual, SST y Compliance Penal / MPD.
          </p>
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

      <div className="grid gap-3 md:grid-cols-3">
        {(Object.keys(COMPLAINT_REGIMES) as ComplaintRegime[]).map((regime) => {
          const conf = COMPLAINT_REGIMES[regime]
          const style = REGIME_STYLE[regime]
          const Icon = style.icon
          return (
            <button
              key={regime}
              type="button"
              onClick={() => setRegimeFilter(regimeFilter === regime ? '' : regime)}
              className={cn(
                'rounded-xl border p-4 text-left transition',
                regimeFilter === regime ? style.panel : 'border-[color:var(--border-default)] bg-white hover:bg-white/90',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm font-semibold text-white">{conf.title}</p>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', style.badge)}>
                  {stats.byRegime?.[regime] ?? 0}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[color:var(--text-tertiary)]">{conf.description}</p>
            </button>
          )
        })}
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
              El motor de plazos ahora consolida obligaciones HSL, SST y MPD. Revisa los casos vencidos antes de cerrar el dia.
            </p>
          </div>
        </div>
      )}

      {/* Plazos legales */}
      <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4">
        <h3 className="text-sm font-semibold text-white">Matriz de plazos críticos</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {(Object.keys(LEGAL_MILESTONES) as ComplaintRegime[]).map((regime) => (
            <div key={regime} className={cn('rounded-lg border p-3', REGIME_STYLE[regime].panel)}>
              <p className="text-xs font-bold uppercase text-white">{COMPLAINT_REGIMES[regime].shortLabel}</p>
              <div className="mt-2 space-y-2">
                {LEGAL_MILESTONES[regime].map((p) => (
                  <div key={p.label} className="rounded-lg bg-black/10 px-3 py-2">
                    <p className="text-xs font-semibold text-white">{p.label}</p>
                    <p className="text-[11px] font-bold text-emerald-300">{p.plazo}</p>
                    <p className="text-[10px] text-[color:var(--text-tertiary)]">{p.base}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[color:var(--text-tertiary)]">Filtrar:</span>
        <select
          value={regimeFilter}
          onChange={e => setRegimeFilter(e.target.value as ComplaintRegime | '')}
          className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] px-3 py-1.5 text-sm"
        >
          <option value="">Todos los regimenes</option>
          {(Object.keys(COMPLAINT_REGIMES) as ComplaintRegime[]).map((regime) => (
            <option key={regime} value={regime}>{COMPLAINT_REGIMES[regime].title}</option>
          ))}
        </select>
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
            const triageStale = isTriageStale(complaint)
            const regimeStyle = REGIME_STYLE[complaint.regime]
            const RegimeIcon = regimeStyle.icon
            const documentDraft = documentDrafts[complaint.id] ?? DEFAULT_DOCUMENT_DRAFT
            const isUploadingDocument = updatingId === `document:${complaint.id}`
            const stageOrder = STAGE_ORDER_BY_REGIME[complaint.regime]
            const requiredCloseStages = CLOSE_REQUIRED_STAGES[complaint.regime]
            const resolvedMissingStages = missingCloseStages(complaint, 'RESOLVED')
            const dismissedMissingStages = missingCloseStages(complaint, 'DISMISSED')
            const closeExceptionReason = (closeExceptionDrafts[complaint.id] ?? '').trim()
            const publicNoteDraft = publicNoteDrafts[complaint.id] ?? ''
            const trackingResult = trackingTokenResults[complaint.id]
            return (
              <div key={complaint.id} className="rounded-xl border border-[color:var(--border-default)] bg-white">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : complaint.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', regimeStyle.panel)}>
                      <RegimeIcon className="h-5 w-5 text-emerald-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white">{complaint.code}</p>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', regimeStyle.badge)}>
                          {regimeStyle.label}
                        </span>
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
                        {!complaint.triagedAt && !triageStale && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-700">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            Analizando con IA…
                          </span>
                        )}
                        {triageStale && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-300">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            IA sin respuesta
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[color:var(--text-tertiary)]">
                        {TYPE_LABELS[complaint.type] ?? COMPLAINT_TYPES[complaint.type]?.label ?? complaint.type}
                        {complaint.isAnonymous ? ' — Anonima' : ` — ${complaint.reporterName}`}
                        {' — '}{new Date(complaint.receivedAt).toLocaleDateString('es-PE')}
                      </p>
                      {(complaint.location || complaint.occurredAt) && (
                        <p className="mt-0.5 text-[11px] text-[color:var(--text-tertiary)]">
                          {complaint.location ? complaint.location : null}
                          {complaint.location && complaint.occurredAt ? ' — ' : null}
                          {complaint.occurredAt ? new Date(complaint.occurredAt).toLocaleString('es-PE') : null}
                        </p>
                      )}
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
                    <div className={cn('rounded-lg border p-3', regimeStyle.panel)}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-semibold uppercase text-white flex items-center gap-1">
                            <ClipboardList className="h-3.5 w-3.5" />
                            Perfil tecnico-juridico
                          </h4>
                          <p className="mt-1 text-sm font-semibold text-white">{COMPLAINT_REGIMES[complaint.regime].title}</p>
                          <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                            {COMPLAINT_TYPES[complaint.type]?.baseLegal ?? COMPLAINT_REGIMES[complaint.regime].baseLegal}
                          </p>
                        </div>
                        <div className="text-right text-xs text-[color:var(--text-tertiary)]">
                          <p>Responsable &lt;20: {COMPLAINT_REGIMES[complaint.regime].responsibleSmall}</p>
                          <p>Responsable 20+: {COMPLAINT_REGIMES[complaint.regime].responsibleLarge}</p>
                        </div>
                      </div>
                      {COMPLAINT_TYPES[complaint.type]?.externalReport && (
                        <div className="mt-3 rounded-lg border border-amber-700/60 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
                          Reporte externo esperado: {COMPLAINT_TYPES[complaint.type].externalReport}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="flex items-center gap-1 text-xs font-semibold uppercase text-blue-200">
                            <KeyRound className="h-3.5 w-3.5" />
                            Seguimiento del denunciante
                          </h4>
                          <p className="mt-1 text-xs leading-5 text-blue-100/80">
                            El denunciante necesita su codigo y token privado para ver el avance publico del expediente. Regenera el token si el caso fue creado antes de esta mejora o si lo perdio.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => regenerateTrackingToken(complaint)}
                          disabled={updatingId === `token:${complaint.id}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-blue-300/30 px-3 py-2 text-xs font-bold text-blue-100 hover:bg-blue-900/30 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingId === `token:${complaint.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                          Generar token
                        </button>
                      </div>
                      {trackingResult ? (
                        <div className="mt-3 rounded-lg border border-blue-300/20 bg-black/20 p-3">
                          <p className="text-[11px] font-bold uppercase text-blue-200">Nuevo acceso privado</p>
                          <p className="mt-1 break-all font-mono text-[11px] text-blue-50">{trackingResult.url}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="break-all rounded bg-blue-900/40 px-2 py-1 font-mono text-[10px] text-blue-100">
                              {trackingResult.token}
                            </span>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard?.writeText(trackingResult.url)}
                              className="inline-flex items-center gap-1 rounded border border-blue-300/30 px-2 py-1 text-[10px] font-bold text-blue-100 hover:bg-blue-900/30"
                            >
                              <Copy className="h-3 w-3" />
                              Copiar enlace
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

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
                    {triageStale && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start justify-between gap-3">
                        <div>
                          <ShieldAlert className="inline h-3.5 w-3.5 mr-1" />
                          El triaje IA no termino en el tiempo esperado. Reintenta el analisis o clasifica la denuncia manualmente.
                        </div>
                        <button
                          type="button"
                          onClick={() => retryTriage(complaint.id)}
                          disabled={updatingId === complaint.id}
                          className="shrink-0 rounded bg-amber-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingId === complaint.id ? 'Reintentando...' : 'Reintentar IA'}
                        </button>
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
                          onClick={() => retryTriage(complaint.id)}
                          disabled={updatingId === complaint.id}
                          className="rounded bg-amber-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingId === complaint.id ? 'Reintentando...' : 'Reintentar IA'}
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
                                  {d.kind && (
                                    <span className="ml-2 rounded-full bg-black/10 px-1.5 py-0.5 text-[9px] uppercase text-[color:var(--text-tertiary)]">
                                      {d.kind === 'EXTERNAL_REPORT' ? 'reporte externo' : d.kind === 'BEST_PRACTICE' ? 'buena practica' : d.kind === 'PRESCRIPTION' ? 'prescripcion' : 'legal'}
                                    </span>
                                  )}
                                </p>
                                <p className="text-[color:var(--text-tertiary)]">{d.baseLegal}</p>
                                {d.action && <p className="mt-0.5 text-[11px] text-[color:var(--text-tertiary)]">{d.action}</p>}
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

                    <div className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="flex items-center gap-1 text-xs font-semibold uppercase text-[color:var(--text-secondary)]">
                            <FileText className="h-3.5 w-3.5" />
                            Expediente documental por etapa
                          </h4>
                          <p className="mt-1 text-xs leading-5 text-[color:var(--text-tertiary)]">
                            Sube actas, informes, medidas, comunicaciones y resoluciones. Marca como visible solo lo que el denunciante puede consultar con su codigo y token privado.
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[color:var(--text-secondary)] ring-1 ring-[color:var(--border-default)]">
                          {complaint.documents?.length ?? 0} documento(s)
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {stageOrder.map((stage) => {
                          const docsForStage = (complaint.documents ?? []).filter((document) => document.stage === stage)
                          const isRequired = requiredCloseStages.includes(stage)
                          return (
                            <button
                              key={stage}
                              type="button"
                              onClick={() => prepareDocumentDraft(complaint.id, stage)}
                              className={cn(
                                'rounded-lg border px-3 py-2 text-left transition',
                                docsForStage.length > 0
                                  ? 'border-emerald-800/50 bg-emerald-950/20'
                                  : isRequired
                                    ? 'border-amber-800/70 bg-amber-950/20 hover:bg-amber-950/30'
                                    : 'border-[color:var(--border-default)] bg-white hover:bg-[color:var(--neutral-50)]',
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-[color:var(--text-secondary)]">{STAGE_LABELS[stage]}</p>
                                <span className={cn(
                                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                                  docsForStage.length > 0 ? 'bg-emerald-100 text-emerald-800' : isRequired ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600',
                                )}>
                                  {docsForStage.length > 0 ? `${docsForStage.length} doc` : isRequired ? 'requerido' : 'pendiente'}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)]">
                                {docsForStage.length > 0
                                  ? docsForStage.map((document) => document.title).slice(0, 2).join(' / ')
                                  : 'Preparar carga para esta etapa'}
                              </p>
                            </button>
                          )
                        })}
                      </div>

                      {(complaint.evidenceUrls?.length ?? 0) > 0 && (
                        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                          <p className="text-[11px] font-bold uppercase text-blue-900">Evidencia inicial reportada</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {complaint.evidenceUrls.map((url) => (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-800 ring-1 ring-blue-100 hover:bg-blue-100"
                              >
                                <FileText className="h-3 w-3 shrink-0" />
                                <span className="truncate">{url}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 grid gap-2 md:grid-cols-[1.2fr_0.9fr_0.9fr]">
                        <input
                          type="text"
                          value={documentDraft.title}
                          onChange={(e) => updateDocumentDraft(complaint.id, { title: e.target.value })}
                          placeholder="Titulo del documento"
                          className="rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs text-[color:var(--text-secondary)]"
                        />
                        <select
                          value={documentDraft.stage}
                          onChange={(e) => updateDocumentDraft(complaint.id, { stage: e.target.value as ComplaintStage })}
                          className="rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs text-[color:var(--text-secondary)]"
                        >
                          {Object.entries(STAGE_LABELS).map(([stage, label]) => (
                            <option key={stage} value={stage}>{label}</option>
                          ))}
                        </select>
                        <select
                          value={documentDraft.kind}
                          onChange={(e) => updateDocumentDraft(complaint.id, { kind: e.target.value as ComplaintDocumentKind })}
                          className="rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs text-[color:var(--text-secondary)]"
                        >
                          {Object.entries(DOCUMENT_KIND_LABELS).map(([kind, label]) => (
                            <option key={kind} value={kind}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
                        <input
                          type="file"
                          accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg"
                          onChange={(e) => updateDocumentDraft(complaint.id, { file: e.target.files?.[0] ?? null })}
                          className="min-w-0 flex-1 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs text-[color:var(--text-secondary)]"
                        />
                        <label className="flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--text-secondary)]">
                          <input
                            type="checkbox"
                            checked={documentDraft.visibleToReporter}
                            onChange={(e) => updateDocumentDraft(complaint.id, { visibleToReporter: e.target.checked })}
                            className="h-4 w-4 rounded border-[color:var(--border-default)]"
                          />
                          Visible al denunciante
                        </label>
                        <button
                          type="button"
                          onClick={() => uploadComplaintDocument(complaint.id)}
                          disabled={isUploadingDocument || !documentDraft.file}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isUploadingDocument ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                          {isUploadingDocument ? 'Subiendo...' : 'Subir al expediente'}
                        </button>
                      </div>

                      {(complaint.documents?.length ?? 0) > 0 ? (
                        <div className="mt-3 grid gap-2">
                          {complaint.documents.map((document) => {
                            const href = document.storagePath ? `/api/storage/documents/${document.storagePath}` : document.url
                            return (
                              <div key={document.id} className="flex flex-col gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 md:flex-row md:items-center md:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold text-[color:var(--text-secondary)] hover:text-emerald-600">
                                      <FileText className="h-3.5 w-3.5 shrink-0" />
                                      <span className="truncate">{document.title}</span>
                                    </a>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">{DOCUMENT_KIND_LABELS[document.kind]}</span>
                                    <span className={cn(
                                      'rounded-full px-2 py-0.5 text-[10px] font-bold',
                                      document.visibleToReporter ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-600',
                                    )}>
                                      {document.visibleToReporter ? 'Visible al denunciante' : 'Interno'}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[10px] text-[color:var(--text-tertiary)]">
                                    {STAGE_LABELS[document.stage]} - {new Date(document.createdAt).toLocaleString('es-PE')}
                                    {shortHash(document.hashSha256) ? ` - SHA ${shortHash(document.hashSha256)}` : ''}
                                  </p>
                                </div>
                                <span className="shrink-0 text-[10px] font-semibold text-[color:var(--text-tertiary)]">
                                  {document.size ? `${Math.round(document.size / 1024)} KB` : document.mimeType ?? 'Archivo'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-lg border border-dashed border-[color:var(--border-default)] bg-white px-3 py-3 text-xs text-[color:var(--text-tertiary)]">
                          Aun no hay informes o actas cargadas. Para que el seguimiento sea defendible, documenta cada avance relevante.
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="flex items-center gap-1 text-xs font-semibold uppercase text-emerald-200">
                            <Send className="h-3.5 w-3.5" />
                            Actualizacion visible al denunciante
                          </h4>
                          <p className="mt-1 text-xs leading-5 text-emerald-50/80">
                            Publica solo mensajes procesales y seguros. Evita nombres de testigos, datos sensibles o detalles probatorios internos.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => publishReporterUpdate(complaint.id)}
                          disabled={updatingId === complaint.id || publicNoteDraft.trim().length < 8}
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingId === complaint.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Publicar avance
                        </button>
                      </div>
                      <textarea
                        value={publicNoteDraft}
                        onChange={(e) => setPublicNoteDrafts((prev) => ({ ...prev, [complaint.id]: e.target.value }))}
                        rows={3}
                        maxLength={300}
                        placeholder="Ej.: El caso fue trasladado al Comite y se encuentra en etapa de investigacion. Se notificara el siguiente avance por este canal."
                        className="mt-3 w-full rounded-lg border border-emerald-900/50 bg-white px-3 py-2 text-xs text-[color:var(--text-secondary)] outline-none focus:border-emerald-500"
                      />
                      <p className="mt-1 text-right text-[10px] text-emerald-100/70">{publicNoteDraft.length}/300</p>
                    </div>

                    {/* Timeline */}
                    {complaint.timeline.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-[color:var(--text-tertiary)]">Historial</h4>
                        <div className="mt-2 space-y-2">
                          {complaint.timeline.map(entry => (
                            <div key={entry.id} className="flex items-start gap-2">
                              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-xs font-medium text-[color:var(--text-secondary)]">{entry.action.replace(/_/g, ' ')}</p>
                                  {entry.visibleToReporter ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                      visible
                                    </span>
                                  ) : null}
                                </div>
                                {entry.description && <p className="text-xs text-[color:var(--text-tertiary)]">{entry.description}</p>}
                                {entry.publicDescription && entry.publicDescription !== entry.description ? (
                                  <p className="text-xs text-emerald-600">Publico: {entry.publicDescription}</p>
                                ) : null}
                                <p className="text-[10px] text-[color:var(--text-tertiary)]">{new Date(entry.createdAt).toLocaleString('es-PE')} — {entry.performedBy}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {complaint.status !== 'RESOLVED' && complaint.status !== 'DISMISSED' && (
                      <div className="space-y-3 border-t border-[color:var(--border-default)] pt-3">
                        {(resolvedMissingStages.length > 0 || dismissedMissingStages.length > 0) && (
                          <div className="rounded-lg border border-amber-800/60 bg-amber-950/20 p-3">
                            <p className="text-xs font-bold text-amber-300">Control de cierre documentado</p>
                            <p className="mt-1 text-xs text-amber-100/80">
                              Para resolver falta: {resolvedMissingStages.length > 0 ? resolvedMissingStages.map((stage) => STAGE_LABELS[stage]).join(', ') : 'ningun documento minimo'}.
                              {' '}Para desestimar falta: {dismissedMissingStages.length > 0 ? dismissedMissingStages.map((stage) => STAGE_LABELS[stage]).join(', ') : 'ningun documento minimo'}.
                            </p>
                            <textarea
                              value={closeExceptionDrafts[complaint.id] ?? ''}
                              onChange={(e) => setCloseExceptionDrafts((prev) => ({ ...prev, [complaint.id]: e.target.value }))}
                              rows={2}
                              maxLength={1000}
                              placeholder="Excepcion justificada si legalmente corresponde cerrar sin algun documento minimo."
                              className="mt-2 w-full rounded-lg border border-amber-900/60 bg-white px-3 py-2 text-xs text-[color:var(--text-secondary)] outline-none focus:border-amber-500"
                            />
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {complaint.status === 'RECEIVED' && (
                            <button onClick={() => updateComplaint(complaint.id, 'UNDER_REVIEW', 'INICIO_EVALUACION')} disabled={updatingId === complaint.id} className="rounded border border-[color:var(--border-default)] px-3 py-1.5 text-xs font-medium text-yellow-400 hover:bg-yellow-900/20">Iniciar Evaluacion</button>
                          )}
                          {complaint.status === 'UNDER_REVIEW' && (
                            <>
                              <button onClick={() => updateComplaint(complaint.id, 'INVESTIGATING', 'INICIO_INVESTIGACION')} disabled={updatingId === complaint.id} className="rounded border border-[color:var(--border-default)] px-3 py-1.5 text-xs font-medium text-orange-400 hover:bg-orange-900/20">Iniciar Investigacion</button>
                              <button
                                onClick={() => updateComplaint(complaint.id, 'DISMISSED', 'DESESTIMADA', { closeExceptionReason: closeExceptionReason || undefined })}
                                disabled={updatingId === complaint.id}
                                className="rounded border border-[color:var(--border-default)] px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]"
                              >
                                Desestimar
                              </button>
                            </>
                          )}
                          {complaint.status === 'INVESTIGATING' && (
                            <button onClick={() => updateComplaint(complaint.id, 'PROTECTION_APPLIED', 'MEDIDAS_PROTECCION')} disabled={updatingId === complaint.id} className="rounded border border-[color:var(--border-default)] px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-900/20">Aplicar Medidas de Proteccion</button>
                          )}
                          {(complaint.status === 'INVESTIGATING' || complaint.status === 'PROTECTION_APPLIED') && (
                            <button
                              onClick={() => updateComplaint(complaint.id, 'RESOLVED', 'RESUELTA', { closeExceptionReason: closeExceptionReason || undefined })}
                              disabled={updatingId === complaint.id}
                              className="rounded border border-[color:var(--border-default)] px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-900/20"
                            >
                              Marcar Resuelta
                            </button>
                          )}
                        </div>
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
