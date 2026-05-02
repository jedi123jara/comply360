'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Eye,
  PenTool,
  AlertTriangle,
  Archive,
  Loader2,
  Bot,
  Shield,
  ChevronRight,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Users,
  Link2,
  Search,
  UserCheck,
  Scroll,
  Download,
} from 'lucide-react'
import { cn, displayWorkerName, workerInitials } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { ContractValidationsPanel } from '@/components/contracts/contract-validations-panel'
import { ContractVersionsPanel } from '@/components/contracts/contract-versions-panel'
import { ClauseComposer } from '@/components/contracts/clause-composer'
import { ContractRiskBadge } from '@/components/contracts/contract-risk-badge'

// =============================================
// Types
// =============================================

type ActiveTab = 'detalles' | 'contrato' | 'clausulas' | 'validacion' | 'historial' | 'ia'

interface WorkerOption {
  id: string
  firstName: string
  lastName: string
  position: string | null
  legajoScore: number | null
}

interface LinkedWorker extends WorkerOption {
  linkedAt: string
}

interface Contract {
  id: string
  title: string
  type: string
  status: string
  formData: Record<string, unknown> | null
  contentHtml: string | null
  aiRiskScore: number | null
  aiRisksJson: AiReviewResult | null
  aiReviewedAt: string | null
  signedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  createdBy: { firstName: string | null; lastName: string | null; email: string } | null
  template: { id: string; name: string; type: string; legalBasis: string | null } | null
}

interface AiRisk {
  id: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  description: string
  recommendation: string
}

interface AiReviewResult {
  overallScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  risks: AiRisk[]
  suggestions?: string[]
  model?: string
}

// =============================================
// Constants
// =============================================

const TYPE_LABELS: Record<string, string> = {
  LABORAL_INDEFINIDO: 'Plazo Indeterminado',
  LABORAL_PLAZO_FIJO: 'Plazo Fijo',
  LABORAL_TIEMPO_PARCIAL: 'Tiempo Parcial',
  LOCACION_SERVICIOS: 'Locacion de Servicios',
  CONFIDENCIALIDAD: 'Confidencialidad',
  NO_COMPETENCIA: 'No Competencia',
  POLITICA_HOSTIGAMIENTO: 'Pol. Hostigamiento',
  POLITICA_SST: 'Pol. SST',
  REGLAMENTO_INTERNO: 'Reglamento Interno',
  ADDENDUM: 'Addendum',
  CONVENIO_PRACTICAS: 'Conv. Practicas',
  CUSTOM: 'Personalizado',
}

const STATUS_CONFIG: Record<string, {
  label: string
  icon: React.ElementType
  color: string
  dot: string
}> = {
  DRAFT:     { label: 'Borrador',    icon: PenTool,       color: 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]',    dot: 'bg-gray-400' },
  IN_REVIEW: { label: 'En Revision', icon: Eye,           color: 'bg-amber-900/30 text-amber-400',   dot: 'bg-amber-400' },
  APPROVED:  { label: 'Aprobado',    icon: CheckCircle,   color: 'bg-blue-900/30 text-emerald-600',     dot: 'bg-blue-500' },
  SIGNED:    { label: 'Firmado',     icon: CheckCircle,   color: 'bg-green-900/30 text-green-400',   dot: 'bg-green-500' },
  EXPIRED:   { label: 'Vencido',     icon: AlertTriangle, color: 'bg-red-900/30 text-red-400',       dot: 'bg-red-500' },
  ARCHIVED:  { label: 'Archivado',   icon: Archive,       color: 'bg-[color:var(--neutral-100)] text-gray-400',   dot: 'bg-slate-400' },
}

const WORKFLOW_ORDER = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SIGNED']

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  HIGH:   { color: 'text-red-400',    bg: 'bg-red-900/20 border-red-800',    label: 'Alto' },
  MEDIUM: { color: 'text-amber-400',  bg: 'bg-amber-900/20 border-amber-800', label: 'Medio' },
  LOW:    { color: 'text-green-400',  bg: 'bg-green-900/20 border-green-800', label: 'Bajo' },
}

const RISK_LEVEL_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  LOW:      { color: 'text-green-400', icon: ShieldCheck },
  MEDIUM:   { color: 'text-amber-400', icon: Shield },
  HIGH:     { color: 'text-red-400',   icon: ShieldAlert },
  CRITICAL: { color: 'text-red-300',   icon: ShieldAlert },
}

// =============================================
// Component
// =============================================

export default function ContratoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [reviewing] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('detalles')
  // Vincular trabajador
  const [linkedWorkers, setLinkedWorkers] = useState<LinkedWorker[]>([])
  const [workerSearch, setWorkerSearch] = useState('')
  const [workerResults, setWorkerResults] = useState<WorkerOption[]>([])
  const [searchingWorkers, setSearchingWorkers] = useState(false)
  const [linkingWorker, setLinkingWorker] = useState<string | null>(null)

  const fetchContract = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${id}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      setContract(data.data)
    } catch {
      toast({ title: 'Contrato no encontrado', type: 'error' })
      router.push('/dashboard/contratos')
    } finally {
      setLoading(false)
    }
  }, [id, router, toast])

  useEffect(() => { fetchContract() }, [fetchContract])

  // Fetch linked workers
  const fetchLinkedWorkers = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${id}/link-worker`)
      if (!res.ok) return
      const data = await res.json()
      setLinkedWorkers(data.data ?? [])
    } catch { /* silent */ }
  }, [id])

  useEffect(() => { fetchLinkedWorkers() }, [fetchLinkedWorkers])

  // Search workers for linking
  useEffect(() => {
    if (!workerSearch.trim()) { setWorkerResults([]); return }
    const t = setTimeout(async () => {
      setSearchingWorkers(true)
      try {
        const res = await fetch(`/api/workers?search=${encodeURIComponent(workerSearch)}&limit=8`)
        if (!res.ok) return
        const d = await res.json()
        setWorkerResults(d.data ?? [])
      } catch { /* silent */ } finally {
        setSearchingWorkers(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [workerSearch])

  async function linkWorker(workerId: string) {
    setLinkingWorker(workerId)
    try {
      const res = await fetch(`/api/contracts/${id}/link-worker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId }),
      })
      if (!res.ok) throw new Error('Error al vincular')
      const data = await res.json()
      toast({
        title: 'Trabajador vinculado ✓',
        description: `Legajo actualizado a ${data.legajoScore}%`,
        type: 'success',
      })
      setWorkerSearch('')
      setWorkerResults([])
      fetchLinkedWorkers()
    } catch {
      toast({ title: 'Error al vincular trabajador', type: 'error' })
    } finally {
      setLinkingWorker(null)
    }
  }

  async function transitionStatus(newStatus: string) {
    if (!contract) return
    setTransitioning(true)
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      const data = await res.json()
      setContract(prev => prev ? { ...prev, status: data.data.status, signedAt: data.data.signedAt } : prev)
      toast({ title: `Contrato movido a "${STATUS_CONFIG[newStatus]?.label}"`, type: 'success' })
    } catch {
      toast({ title: 'Error al cambiar estado', type: 'error' })
    } finally {
      setTransitioning(false)
    }
  }

  async function archiveContract() {
    setConfirmArchive(false)
    setArchiving(true)
    try {
      const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al archivar')
      toast({ title: 'Contrato archivado', type: 'success' })
      router.push('/dashboard/contratos')
    } catch {
      toast({ title: 'Error al archivar', type: 'error' })
      setArchiving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!contract) return null

  const statusCfg = STATUS_CONFIG[contract.status] ?? STATUS_CONFIG.DRAFT
  const StatusIcon = statusCfg.icon
  const currentWorkflowIndex = WORKFLOW_ORDER.indexOf(contract.status)
  const nextStatus = currentWorkflowIndex >= 0 && currentWorkflowIndex < WORKFLOW_ORDER.length - 1
    ? WORKFLOW_ORDER[currentWorkflowIndex + 1]
    : null

  const aiReview = contract.aiRisksJson
  const riskCfg = aiReview ? (RISK_LEVEL_CONFIG[aiReview.riskLevel] ?? RISK_LEVEL_CONFIG.MEDIUM) : null
  const RiskIcon = riskCfg?.icon

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/contratos" className="flex items-center gap-1 hover:text-[color:var(--text-secondary)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Contratos
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white font-medium truncate max-w-[200px]">{contract.title}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-white/[0.08] shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{contract.title}</h1>
              <div className="flex items-center flex-wrap gap-2 mt-1.5">
                <span className="text-xs px-2.5 py-1 rounded-full bg-[color:var(--neutral-100)] text-gray-400 font-medium">
                  {TYPE_LABELS[contract.type] ?? contract.type.replace(/_/g, ' ')}
                </span>
                <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full', statusCfg.color)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                  <StatusIcon className="w-3 h-3" />
                  {statusCfg.label}
                </span>
                {/* Risk badge — Generador de Contratos / Chunk 5 */}
                <ContractRiskBadge contractId={id as string} refreshKey={contract.updatedAt} />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Creado {new Date(contract.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
                {contract.createdBy && ` por ${displayWorkerName(contract.createdBy.firstName, contract.createdBy.lastName)}`}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={`/api/contracts/${id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-sm font-semibold transition-colors border border-emerald-500/20"
            >
              <Download className="w-4 h-4" />
              PDF
            </a>
            <a
              href={`/api/contracts/${id}/render-docx`}
              download
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-semibold transition-colors border border-blue-500/20"
            >
              <Download className="w-4 h-4" />
              DOCX
            </a>
            <Link
              href={`/dashboard/contratos/${id}/analisis`}
              className="flex items-center gap-2 px-4 py-2 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl text-sm font-semibold transition-colors border border-primary/20"
            >
              <Shield className="w-4 h-4" />
              Análisis Normativo
            </Link>
            {confirmArchive ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-red-400">¿Archivar?</span>
                <button
                  onClick={archiveContract}
                  disabled={archiving}
                  className="px-2.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {archiving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sí'}
                </button>
                <button
                  onClick={() => setConfirmArchive(false)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-[color:var(--text-secondary)] border border-white/[0.08] hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmArchive(true)}
                disabled={archiving}
                className="p-2 hover:bg-red-900/20 text-gray-400 hover:text-red-400 rounded-xl transition-colors"
                title="Archivar contrato"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Workflow stepper */}
        {!['EXPIRED', 'ARCHIVED'].includes(contract.status) && (
          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <div className="flex items-center gap-1 mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Flujo de aprobacion</p>
            </div>
            <div className="flex items-center gap-1">
              {WORKFLOW_ORDER.map((step, idx) => {
                const stepCfg = STATUS_CONFIG[step] ?? STATUS_CONFIG.DRAFT
                const isPast = idx < currentWorkflowIndex
                const isCurrent = idx === currentWorkflowIndex

                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className={cn(
                      'flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-center transition-colors',
                      isCurrent ? 'bg-primary/10' : isPast ? 'bg-green-900/20' : 'bg-[color:var(--neutral-50)]',
                    )}>
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                        isCurrent ? 'bg-primary text-white' : isPast ? 'bg-green-500 text-white' : 'bg-white/[0.08] text-gray-400',
                      )}>
                        {isPast ? '✓' : idx + 1}
                      </div>
                      <span className={cn(
                        'text-[10px] font-medium whitespace-nowrap',
                        isCurrent ? 'text-primary' : isPast ? 'text-green-400' : 'text-gray-400',
                      )}>
                        {stepCfg.label}
                      </span>
                    </div>
                    {idx < WORKFLOW_ORDER.length - 1 && (
                      <div className={cn('w-4 h-px flex-shrink-0', isPast ? 'bg-green-600' : 'bg-white/[0.08]')} />
                    )}
                  </div>
                )
              })}
            </div>

            {nextStatus && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => transitionStatus(nextStatus)}
                  disabled={transitioning}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-700 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  {transitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  Avanzar a {STATUS_CONFIG[nextStatus]?.label}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white rounded-xl p-1 w-fit">
        {([
          { key: 'detalles', label: 'Detalles', Icon: FileText },
          { key: 'contrato', label: 'Ver Contrato', Icon: Scroll },
          { key: 'clausulas', label: 'Cláusulas', Icon: Scroll },
          { key: 'validacion', label: 'Validación legal', Icon: ShieldCheck },
          { key: 'historial', label: 'Historial', Icon: TrendingUp },
          { key: 'ia', label: 'Análisis IA', Icon: Bot },
        ] as { key: ActiveTab; label: string; Icon: React.ElementType }[]).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
              activeTab === key
                ? 'bg-primary/10 text-white shadow-sm'
                : 'text-gray-400 hover:text-slate-200',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════ TAB: DETALLES ══════════════════ */}
      {activeTab === 'detalles' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Form data */}
            {contract.formData && Object.keys(contract.formData).length > 0 && (
              <div className="bg-white rounded-2xl border border-white/[0.08] shadow-sm p-6">
                <h2 className="text-sm font-semibold text-white mb-4">Datos del contrato</h2>
                <dl className="space-y-3">
                  {Object.entries(contract.formData).map(([key, value]) => {
                    if (!value || value === '') return null
                    const label = key
                      .replace(/_/g, ' ')
                      .replace(/([a-z])([A-Z])/g, '$1 $2')
                      .replace(/\b\w/g, l => l.toUpperCase())
                    return (
                      <div key={key} className="flex gap-3">
                        <dt className="text-xs text-gray-500 font-medium w-36 flex-shrink-0 pt-0.5">{label}</dt>
                        <dd className="text-sm text-[color:var(--text-secondary)] break-words">{String(value)}</dd>
                      </div>
                    )
                  })}
                </dl>
              </div>
            )}

            {/* Contract info */}
            <div className="bg-white rounded-2xl border border-white/[0.08] shadow-sm p-6">
              <h2 className="text-sm font-semibold text-white mb-4">Informacion general</h2>
              <dl className="space-y-3">
                {contract.template && (
                  <div className="flex gap-3">
                    <dt className="text-xs text-gray-500 w-32 flex-shrink-0 pt-0.5">Plantilla</dt>
                    <dd className="text-sm text-[color:var(--text-secondary)]">{contract.template.name}</dd>
                  </div>
                )}
                {contract.expiresAt && (
                  <div className="flex gap-3">
                    <dt className="text-xs text-gray-500 w-32 flex-shrink-0 pt-0.5">Vencimiento</dt>
                    <dd className="text-sm text-[color:var(--text-secondary)]">
                      {new Date(contract.expiresAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </dd>
                  </div>
                )}
                {contract.signedAt && (
                  <div className="flex gap-3">
                    <dt className="text-xs text-gray-500 w-32 flex-shrink-0 pt-0.5">Firmado</dt>
                    <dd className="text-sm text-green-400 font-medium">
                      {new Date(contract.signedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </dd>
                  </div>
                )}
                {contract.template?.legalBasis && (
                  <div className="flex gap-3">
                    <dt className="text-xs text-gray-500 w-32 flex-shrink-0 pt-0.5">Base legal</dt>
                    <dd className="text-xs text-gray-400 leading-relaxed">{contract.template.legalBasis}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* ── Vincular Trabajador ── */}
          <div className="bg-white rounded-2xl border border-white/[0.08] shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-white">Trabajadores vinculados</h2>
              <span className="ml-auto text-xs text-gray-400">Vincular actualiza el legajo automáticamente</span>
            </div>

            {/* Already linked */}
            {linkedWorkers.length > 0 && (
              <div className="mb-4 space-y-2">
                {linkedWorkers.map(w => (
                  <div key={w.id} className="flex items-center gap-3 p-3 rounded-xl bg-green-900/20 border border-green-800">
                    <UserCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{displayWorkerName(w.firstName, w.lastName)}</p>
                      <p className="text-xs text-gray-500">{w.position ?? 'Sin cargo'} · Legajo {w.legajoScore ?? 0}%</p>
                    </div>
                    <span className="text-[10px] text-green-600 font-semibold bg-green-900/40 px-2 py-0.5 rounded-full">Vinculado</span>
                  </div>
                ))}
              </div>
            )}

            {/* Search to link */}
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/[0.08] bg-[color:var(--neutral-100)] focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  value={workerSearch}
                  onChange={e => setWorkerSearch(e.target.value)}
                  placeholder="Buscar trabajador por nombre o DNI..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 outline-none"
                />
                {searchingWorkers && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              </div>

              {workerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-white/[0.08] rounded-xl shadow-lg z-10 overflow-hidden">
                  {workerResults.map(w => {
                    const alreadyLinked = linkedWorkers.some(l => l.id === w.id)
                    return (
                      <button
                        key={w.id}
                        onClick={() => !alreadyLinked && linkWorker(w.id)}
                        disabled={alreadyLinked || linkingWorker === w.id}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                          alreadyLinked
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-[color:var(--neutral-100)] cursor-pointer',
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                          {workerInitials(w.firstName, w.lastName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{displayWorkerName(w.firstName, w.lastName)}</p>
                          <p className="text-xs text-gray-500 truncate">{w.position ?? 'Sin cargo'}</p>
                        </div>
                        {alreadyLinked ? (
                          <span className="text-xs text-green-600 font-medium">Ya vinculado</span>
                        ) : linkingWorker === w.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : (
                          <Link2 className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ TAB: VER CONTRATO ══════════════════ */}
      {activeTab === 'contrato' && (
        <div className="bg-white rounded-2xl border border-white/[0.08] shadow-sm overflow-hidden">
          {contract.contentHtml ? (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.08] bg-[color:var(--neutral-50)]">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Scroll className="w-4 h-4" />
                  <span className="font-medium">{contract.title}</span>
                </div>
                <button
                  onClick={() => {
                    const w = window.open('', '_blank')
                    if (w) {
                      w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${contract.title}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;line-height:1.7;color:#111}h1,h2,h3{color:#1e3a6e}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}</style></head><body>${contract.contentHtml}</body></html>`)
                      w.document.close()
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir en nueva pestaña
                </button>
              </div>
              {/* HTML content rendered in a sandboxed iframe-like container */}
              <div className="p-8 max-w-4xl mx-auto">
                <div
                  className="prose prose-sm max-w-none prose-invert [&_h1]:text-[#1e3a6e] [&_h2]:text-[#1e3a6e] [&_h3]:text-[#1e3a6e] [&_table]:border-collapse [&_td]:border [&_td]:border-white/10 [&_td]:p-2 [&_th]:border [&_th]:border-white/10 [&_th]:p-2 [&_th]:bg-[color:var(--neutral-50)]"
                  dangerouslySetInnerHTML={{ __html: contract.contentHtml }}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <Scroll className="w-12 h-12 text-[color:var(--text-secondary)] mb-3" />
              <p className="text-sm font-semibold text-gray-400">Sin contenido HTML disponible</p>
              <p className="text-xs text-slate-500 mt-1">Este contrato fue creado sin plantilla HTML. Los datos están en la pestaña Detalles.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ TAB: CLÁUSULAS ══════════════════ */}
      {activeTab === 'clausulas' && (
        <div className="bg-white rounded-2xl border border-white/[0.08] shadow-sm p-6">
          <ClauseComposer
            contractId={id as string}
            contractType={contract.type}
            onChange={() => fetchContract()}
          />
        </div>
      )}

      {/* ══════════════════ TAB: VALIDACIÓN LEGAL ══════════════════ */}
      {activeTab === 'validacion' && (
        <div className="bg-white rounded-2xl border border-white/[0.08] shadow-sm p-6">
          <ContractValidationsPanel contractId={id as string} />
        </div>
      )}

      {/* ══════════════════ TAB: HISTORIAL (HASH-CHAIN) ══════════════════ */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-2xl border border-white/[0.08] shadow-sm p-6">
          <ContractVersionsPanel contractId={id as string} />
        </div>
      )}

      {/* ══════════════════ TAB: ANÁLISIS IA ══════════════════ */}
      {activeTab === 'ia' && (
        <div className="bg-white rounded-2xl border border-white/[0.08] shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              Revisión IA de Riesgos
            </h2>
            <Link
              href={`/dashboard/contratos/${id}/analisis`}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              Análisis normativo completo
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {reviewing && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-gray-500">Analizando el contrato con IA...</span>
            </div>
          )}

          {!reviewing && aiReview && riskCfg && RiskIcon && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[color:var(--neutral-100)]">
                <div className={cn(
                  'flex items-center justify-center w-16 h-16 rounded-full border-4 flex-shrink-0',
                  aiReview.overallScore >= 80 ? 'border-green-400' : aiReview.overallScore >= 60 ? 'border-amber-400' : 'border-red-400',
                )}>
                  <span className="text-xl font-bold text-white">{aiReview.overallScore}</span>
                </div>
                <div>
                  <div className={cn('flex items-center gap-1.5 font-semibold text-sm', riskCfg.color)}>
                    <RiskIcon className="w-4 h-4" />
                    Riesgo {aiReview.riskLevel === 'LOW' ? 'Bajo' : aiReview.riskLevel === 'MEDIUM' ? 'Medio' : aiReview.riskLevel === 'HIGH' ? 'Alto' : 'Critico'}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {aiReview.risks.length} riesgo{aiReview.risks.length !== 1 ? 's' : ''} detectado{aiReview.risks.length !== 1 ? 's' : ''}
                  </p>
                  {contract.aiReviewedAt && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Analizado {new Date(contract.aiReviewedAt).toLocaleDateString('es-PE')}
                      {aiReview.model && ` · ${aiReview.model}`}
                    </p>
                  )}
                </div>
              </div>

              {aiReview.risks.length > 0 && (
                <div className="space-y-2">
                  {aiReview.risks.map(risk => {
                    const sev = SEVERITY_CONFIG[risk.severity] ?? SEVERITY_CONFIG.LOW
                    const TrendIcon = risk.severity === 'HIGH' ? TrendingDown : TrendingUp
                    return (
                      <div key={risk.id} className={cn('rounded-xl border p-4', sev.bg)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <TrendIcon className={cn('w-4 h-4 flex-shrink-0', sev.color)} />
                            <span className={cn('text-sm font-semibold', sev.color)}>{risk.title}</span>
                          </div>
                          <span className={cn('text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border', sev.bg, sev.color)}>
                            {sev.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{risk.description}</p>
                        {risk.recommendation && (
                          <p className="text-xs text-gray-500 mt-1.5 italic">→ {risk.recommendation}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {aiReview.suggestions && aiReview.suggestions.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-slate-300 mb-2">Recomendaciones</p>
                  <ul className="space-y-1">
                    {aiReview.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                        <span className="text-primary font-bold mt-0.5">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!reviewing && !aiReview && (
            <div className="flex flex-col items-center py-8 text-center">
              <Shield className="w-10 h-10 text-[color:var(--text-secondary)] mb-3" />
              <p className="text-sm text-gray-500 font-medium">Sin análisis normativo todavía</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">Verifica cláusulas obligatorias, riesgos legales y cumplimiento SUNAFIL</p>
              <Link
                href={`/dashboard/contratos/${id}/analisis`}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <Shield className="w-4 h-4" />
                Iniciar Análisis Normativo
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
