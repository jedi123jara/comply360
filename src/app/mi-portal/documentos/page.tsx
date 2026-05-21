'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  FolderOpen,
  Heart,
  LogOut as DepartureIcon,
  Shield,
  ShieldCheck,
  Upload,
} from 'lucide-react'

interface DocItem {
  id: string
  category: string
  documentType: string
  title: string
  status: string
  fileUrl: string | null
  isRequired: boolean
  expiresAt: string | null
  createdAt: string
}

const MOCK_DOCS: DocItem[] = [
  {
    id: 'dni',
    category: 'INGRESO',
    documentType: 'DNI',
    title: 'DNI vigente',
    status: 'VERIFIED',
    fileUrl: null,
    isRequired: true,
    expiresAt: null,
    createdAt: '2026-05-01T12:00:00.000Z',
  },
  {
    id: 'cuenta',
    category: 'INGRESO',
    documentType: 'CUENTA_BANCARIA',
    title: 'Constancia de cuenta bancaria',
    status: 'UPLOADED',
    fileUrl: null,
    isRequired: true,
    expiresAt: null,
    createdAt: '2026-05-02T12:00:00.000Z',
  },
  {
    id: 'emo',
    category: 'SST',
    documentType: 'CERTIFICADO_MEDICO',
    title: 'Examen médico ocupacional',
    status: 'MISSING',
    fileUrl: null,
    isRequired: true,
    expiresAt: '2026-06-20T12:00:00.000Z',
    createdAt: '2026-05-03T12:00:00.000Z',
  },
  {
    id: 'afp',
    category: 'PREVISIONAL',
    documentType: 'AFP_ONP',
    title: 'Constancia previsional',
    status: 'PENDING',
    fileUrl: null,
    isRequired: true,
    expiresAt: null,
    createdAt: '2026-05-04T12:00:00.000Z',
  },
  {
    id: 'epp',
    category: 'SST',
    documentType: 'ENTREGA_EPP',
    title: 'Cargo de entrega de EPP',
    status: 'VERIFIED',
    fileUrl: null,
    isRequired: false,
    expiresAt: null,
    createdAt: '2026-05-05T12:00:00.000Z',
  },
]

const STATUS_META: Record<
  string,
  {
    label: string
    bg: string
    text: string
    icon: LucideIcon
    iconColor: string
  }
> = {
  VERIFIED: {
    label: 'Verificado',
    bg: 'rgba(16,185,129,0.14)',
    text: '#047857',
    icon: CheckCircle2,
    iconColor: '#059669',
  },
  UPLOADED: {
    label: 'Subido',
    bg: 'rgba(59,130,246,0.12)',
    text: '#1d4ed8',
    icon: FileText,
    iconColor: '#2563eb',
  },
  PENDING: {
    label: 'Pendiente',
    bg: 'rgba(245,158,11,0.14)',
    text: '#b45309',
    icon: Clock,
    iconColor: '#d97706',
  },
  MISSING: {
    label: 'Falta subir',
    bg: 'rgba(239,68,68,0.12)',
    text: '#b91c1c',
    icon: AlertCircle,
    iconColor: '#dc2626',
  },
  EXPIRED: {
    label: 'Vencido',
    bg: 'rgba(239,68,68,0.12)',
    text: '#b91c1c',
    icon: AlertCircle,
    iconColor: '#dc2626',
  },
}

const CATEGORY_META: Record<
  string,
  { label: string; description: string; icon: LucideIcon; accent: string }
> = {
  INGRESO: {
    label: 'Ingreso',
    description: 'DNI, CV, antecedentes y datos de alta',
    icon: FolderOpen,
    accent: '#2563eb',
  },
  VIGENTE: {
    label: 'Vigentes',
    description: 'Documentos activos durante tu vínculo',
    icon: FileText,
    accent: '#3b82f6',
  },
  SST: {
    label: 'SST',
    description: 'Salud ocupacional, EPP y seguridad',
    icon: Shield,
    accent: '#f59e0b',
  },
  PREVISIONAL: {
    label: 'Previsional',
    description: 'AFP, ONP, SCTR, EsSalud y aportes',
    icon: Heart,
    accent: '#8b5cf6',
  },
  CESE: {
    label: 'Cese',
    description: 'Liquidación y cierre documental',
    icon: DepartureIcon,
    accent: '#64748b',
  },
}

const CATEGORY_ORDER = ['INGRESO', 'VIGENTE', 'SST', 'PREVISIONAL', 'CESE'] as const

export default function MisDocumentosPage() {
  const [docs, setDocs] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const isWorkerPreview =
    process.env.NODE_ENV === 'development' && searchParams.get('__workerPreview') === '1'
  const displayDocs = isWorkerPreview ? MOCK_DOCS : docs

  useEffect(() => {
    if (isWorkerPreview) return

    let mounted = true
    fetch('/api/mi-portal/documentos')
      .then((r) => {
        if (!r.ok) throw new Error('No pudimos cargar tus documentos')
        return r.json()
      })
      .then((d: { documents?: DocItem[] }) => {
        if (!mounted) return
        setDocs(d.documents || [])
      })
      .catch((e: Error) => {
        if (!mounted) return
        setError(e.message)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [isWorkerPreview])

  const grouped = useMemo(() => {
    const g: Record<string, DocItem[]> = {}
    for (const d of displayDocs) {
      if (!g[d.category]) g[d.category] = []
      g[d.category].push(d)
    }
    return g
  }, [displayDocs])

  const completeness = useMemo(() => {
    if (displayDocs.length === 0) return { pct: 0, verified: 0, missing: 0, total: 0, critical: 0 }
    const verified = displayDocs.filter((d) => d.status === 'VERIFIED' || d.status === 'UPLOADED').length
    const missing = displayDocs.filter((d) => d.status === 'MISSING' || d.status === 'PENDING' || d.status === 'EXPIRED').length
    const critical = displayDocs.filter((d) => d.isRequired && (d.status === 'MISSING' || d.status === 'EXPIRED')).length
    return {
      pct: Math.round((verified / displayDocs.length) * 100),
      verified,
      missing,
      total: displayDocs.length,
      critical,
    }
  }, [displayDocs])

  const criticalDocs = useMemo(
    () => displayDocs.filter((d) => d.isRequired && (d.status === 'MISSING' || d.status === 'EXPIRED' || d.status === 'PENDING')).slice(0, 4),
    [displayDocs],
  )

  if (!isWorkerPreview && loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} />

  return (
    <div className="c360-worker-os c360-worker-passport space-y-6 pb-24">
      <section className="c360-os-hero c360-passport-hero">
        <div className="c360-os-hero-copy">
          <span className="c360-os-eyebrow">
            <Archive className="h-3.5 w-3.5" />
            Pasaporte laboral
          </span>
          <h1>Tu legajo, completo y siempre defendible.</h1>
          <p>
            Cada documento cuenta para proteger tus derechos laborales y sostener
            evidencia frente a auditorías o fiscalización.
          </p>
          <div className="c360-os-hero-actions">
            <Link href="/mi-portal/documentos/subir" className="c360-os-primary-action">
              Subir documento
              <Upload className="h-4 w-4" />
            </Link>
            <span className="c360-os-audit-pill">
              <ShieldCheck className="h-4 w-4" />
              Legajo seguro
            </span>
          </div>
        </div>

        <aside className="c360-passport-card">
          <div
            className="c360-passport-ring"
            style={{
              background: `conic-gradient(#14b8a6 ${completeness.pct * 3.6}deg, rgba(226,232,240,0.86) 0deg)`,
            }}
          >
            <span>{completeness.pct}%</span>
          </div>
          <div>
            <p>Estado del legajo</p>
            <h2>{completeness.critical > 0 ? 'Requiere atención' : 'En buen estado'}</h2>
            <small>
              {completeness.verified}/{completeness.total} documentos completos
            </small>
          </div>
        </aside>
      </section>

      <section className="c360-os-metrics-grid">
        <MetricCard icon={CheckCircle2} label="Completos" value={completeness.verified} helper="Verificados o subidos" tone="emerald" />
        <MetricCard icon={Clock} label="Pendientes" value={completeness.missing} helper="Falta acción o revisión" tone="amber" />
        <MetricCard icon={AlertCircle} label="Críticos" value={completeness.critical} helper="Obligatorios por resolver" tone="blue" />
      </section>

      {criticalDocs.length > 0 ? (
        <section className="c360-os-panel c360-passport-critical">
          <div className="c360-os-section-head">
            <div>
              <span>Prioridad</span>
              <h2>Faltantes críticos</h2>
            </div>
            <small>{criticalDocs.length} por resolver</small>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {criticalDocs.map((doc) => (
              <DocActionCard key={doc.id} doc={doc} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="c360-os-panel">
        <div className="c360-os-section-head">
          <div>
            <span>Expediente</span>
            <h2>Documentos por categoría</h2>
          </div>
          <small>{displayDocs.length} documentos</small>
        </div>

        {displayDocs.length === 0 ? (
          <div className="c360-os-empty">
            <FolderOpen className="h-9 w-9" />
            <h3>No hay documentos asignados aún</h3>
            <p>Cuando la empresa configure tu legajo digital, aparecerá acá.</p>
          </div>
        ) : (
          <div className="c360-passport-category-grid">
            {CATEGORY_ORDER.filter((k) => grouped[k]?.length > 0).map((category) => {
              const items = grouped[category] ?? []
              const meta = CATEGORY_META[category] ?? {
                label: category,
                description: '',
                icon: FileText,
                accent: '#64748b',
              }
              const CatIcon = meta.icon
              const verifiedCount = items.filter((i) => i.status === 'VERIFIED' || i.status === 'UPLOADED').length

              return (
                <article key={category} className="c360-passport-category">
                  <div className="c360-passport-category-head">
                    <div className="c360-passport-category-icon" style={{ color: meta.accent, background: `${meta.accent}16` }}>
                      <CatIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3>{meta.label}</h3>
                      <p>{meta.description}</p>
                    </div>
                    <span>{verifiedCount}/{items.length}</span>
                  </div>
                  <ul className="c360-passport-doc-list">
                    {items.map((doc) => (
                      <DocRow key={doc.id} doc={doc} />
                    ))}
                  </ul>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  helper: string
  tone: 'emerald' | 'blue' | 'amber'
}) {
  return (
    <article className={`c360-os-metric c360-os-tone-${tone}`}>
      <div className="c360-os-metric-icon">
        <Icon className="h-5 w-5" />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  )
}

function DocActionCard({ doc }: { doc: DocItem }) {
  const status = STATUS_META[doc.status] ?? STATUS_META.PENDING
  const StatusIcon = status.icon
  return (
    <Link href={`/mi-portal/documentos/subir?type=${doc.documentType}`} className="c360-passport-action-card">
      <div className="c360-passport-action-icon">
        <StatusIcon className="h-5 w-5" style={{ color: status.iconColor }} />
      </div>
      <div>
        <h3>{doc.title}</h3>
        <p>{status.label} · {doc.documentType.replaceAll('_', ' ').toLowerCase()}</p>
      </div>
      <ChevronRight className="h-4 w-4" />
    </Link>
  )
}

function DocRow({ doc }: { doc: DocItem }) {
  const status = STATUS_META[doc.status] ?? STATUS_META.PENDING
  const StatusIcon = status.icon
  const isActionable = doc.status === 'MISSING' || doc.status === 'PENDING' || doc.status === 'EXPIRED'
  const niceType = doc.documentType.replaceAll('_', ' ').toLowerCase()

  return (
    <li className="c360-passport-doc-row">
      <div className="c360-passport-doc-icon">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h4>{doc.title}</h4>
        <p>
          <span>{niceType}</span>
          {doc.isRequired ? <b>Obligatorio</b> : null}
        </p>
      </div>
      <span className="c360-passport-status" style={{ background: status.bg, color: status.text }}>
        <StatusIcon className="h-3 w-3" style={{ color: status.iconColor }} />
        {status.label}
      </span>
      {doc.fileUrl ? (
        <a href={doc.fileUrl} download aria-label="Descargar documento">
          <Download className="h-4 w-4" />
        </a>
      ) : isActionable ? (
        <Link href={`/mi-portal/documentos/subir?type=${doc.documentType}`} aria-label="Subir documento">
          <Upload className="h-4 w-4" />
        </Link>
      ) : (
        <ChevronRight className="h-4 w-4 text-slate-400" />
      )}
    </li>
  )
}

function LoadingSkeleton() {
  return (
    <div className="c360-worker-os space-y-6" aria-busy="true">
      <div className="c360-os-skeleton-block h-[330px]" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="c360-os-skeleton-block h-32" />
        <div className="c360-os-skeleton-block h-32" />
        <div className="c360-os-skeleton-block h-32" />
      </div>
      <div className="c360-os-skeleton-block h-80" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="c360-os-error">
      <AlertCircle className="h-5 w-5" />
      <div>
        <h3>No pudimos cargar tus documentos</h3>
        <p>{message}</p>
      </div>
    </div>
  )
}
