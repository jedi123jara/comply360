'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  ChevronRight,
  FolderOpen,
  Shield,
  Heart,
  LogOut as DepartureIcon,
} from 'lucide-react'

/**
 * /mi-portal/documentos — Legajo Digital del trabajador (Emerald Light).
 *
 * Muestra los 28 documentos clasificados en 5 categorías con score de completitud.
 * Cada doc tiene estado (PENDING / UPLOADED / VERIFIED / EXPIRED / MISSING) + acción
 * correspondiente (subir / ver / reemplazar / descargar).
 *
 * Consume `GET /api/mi-portal/documentos` — no altera contrato API.
 */

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

// ─────────────────────────────────────────────────────────────────────────────
//  Config
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  {
    label: string
    bg: string
    text: string
    icon: typeof CheckCircle2
    iconColor: string
  }
> = {
  VERIFIED: {
    label: 'Verificado',
    bg: 'rgba(16,185,129,0.12)',
    text: 'var(--emerald-700)',
    icon: CheckCircle2,
    iconColor: 'var(--emerald-600)',
  },
  UPLOADED: {
    label: 'Subido',
    bg: 'rgba(59,130,246,0.12)',
    text: 'rgb(29, 78, 216)',
    icon: FileText,
    iconColor: 'rgb(37, 99, 235)',
  },
  PENDING: {
    label: 'Pendiente',
    bg: 'rgba(245,158,11,0.12)',
    text: 'var(--amber-700, #b45309)',
    icon: Clock,
    iconColor: 'var(--amber-600, #d97706)',
  },
  MISSING: {
    label: 'Falta subir',
    bg: 'rgba(239,68,68,0.12)',
    text: 'var(--crimson-700, #b91c1c)',
    icon: AlertCircle,
    iconColor: 'var(--crimson-600, #dc2626)',
  },
  EXPIRED: {
    label: 'Vencido',
    bg: 'rgba(239,68,68,0.12)',
    text: 'var(--crimson-700, #b91c1c)',
    icon: AlertCircle,
    iconColor: 'var(--crimson-600, #dc2626)',
  },
}

const CATEGORY_META: Record<
  string,
  { label: string; description: string; icon: typeof FolderOpen; accent: string }
> = {
  INGRESO: {
    label: 'Documentos de ingreso',
    description: 'DNI, CV, antecedentes y certificados iniciales',
    icon: FolderOpen,
    accent: '#10b981',
  },
  VIGENTE: {
    label: 'Documentos vigentes',
    description: 'Actualizaciones recurrentes durante tu vínculo laboral',
    icon: FileText,
    accent: '#3b82f6',
  },
  SST: {
    label: 'Seguridad y Salud (SST)',
    description: 'Exámenes médicos, capacitaciones, entrega de EPP',
    icon: Shield,
    accent: '#f59e0b',
  },
  PREVISIONAL: {
    label: 'Previsional',
    description: 'AFP / ONP, SCTR, EsSalud y aportes',
    icon: Heart,
    accent: '#8b5cf6',
  },
  CESE: {
    label: 'Documentos de cese',
    description: 'Liquidación, carta de cese, certificado de trabajo',
    icon: DepartureIcon,
    accent: '#64748b',
  },
}

const CATEGORY_ORDER = ['INGRESO', 'VIGENTE', 'SST', 'PREVISIONAL', 'CESE'] as const

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────

export default function MisDocumentosPage() {
  const [docs, setDocs] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
  }, [])

  const grouped = useMemo(() => {
    const g: Record<string, DocItem[]> = {}
    for (const d of docs) {
      if (!g[d.category]) g[d.category] = []
      g[d.category].push(d)
    }
    return g
  }, [docs])

  const completeness = useMemo(() => {
    if (docs.length === 0) return { pct: 0, verified: 0, missing: 0, total: 0 }
    const verified = docs.filter((d) => d.status === 'VERIFIED' || d.status === 'UPLOADED').length
    const missing = docs.filter((d) => d.status === 'MISSING' || d.status === 'PENDING').length
    return {
      pct: Math.round((verified / docs.length) * 100),
      verified,
      missing,
      total: docs.length,
    }
  }, [docs])

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-6">
      {/* ─── Header editorial ─────────────────────────────────────────── */}
      <header
        className="pb-4"
        style={{ borderBottom: '0.5px solid var(--border-default)' }}
      >
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-700 mb-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            style={{ boxShadow: '0 0 0 3px rgba(16,185,129,0.15)' }}
          />
          <span>Mi legajo digital</span>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginBottom: 6,
          }}
          dangerouslySetInnerHTML={{
            __html: `Tu <em style="color: var(--emerald-700); font-style: italic">legajo</em> está al ${completeness.pct}%`,
          }}
        />
        <p className="text-sm text-[color:var(--text-secondary)] max-w-xl">
          {completeness.missing > 0
            ? `Te faltan ${completeness.missing} de ${completeness.total} documentos. Completar el legajo protege tus derechos laborales y a tu empresa ante SUNAFIL.`
            : 'Tu legajo está completo. Mantenelo actualizado cuando cambie algún documento.'}
        </p>
      </header>

      {/* ─── Progress bar + CTA ──────────────────────────────────────── */}
      <section
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)',
          border: '0.5px solid rgba(16,185,129,0.22)',
        }}
      >
        <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
          <div className="flex items-baseline gap-3">
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 40,
                fontWeight: 400,
                color: 'var(--emerald-700)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {completeness.pct}
              <span style={{ fontSize: 18, opacity: 0.6 }}>%</span>
            </div>
            <div className="text-xs text-[color:var(--text-secondary)]">
              <div>
                <b>{completeness.verified}</b> completos
              </div>
              <div>
                <b>{completeness.missing}</b> pendientes
              </div>
            </div>
          </div>
          <Link
            href="/mi-portal/documentos/subir"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-bold transition-colors"
            style={{
              boxShadow:
                '0 8px 20px -6px rgba(4,120,87,0.45), inset 0 1px 0 rgba(255,255,255,0.14)',
            }}
          >
            <Upload className="h-4 w-4" />
            Subir documento
          </Link>
        </div>

        {/* Progress bar */}
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(15,23,42,0.06)' }}
        >
          <div
            className="h-full transition-all duration-700"
            style={{
              width: `${completeness.pct}%`,
              background: 'linear-gradient(90deg, var(--emerald-500), var(--emerald-700))',
            }}
          />
        </div>
      </section>

      {/* ─── Empty state ──────────────────────────────────────────────── */}
      {docs.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'white', border: '0.5px dashed var(--border-default)' }}
        >
          <FolderOpen className="h-12 w-12 text-[color:var(--text-tertiary)] mx-auto mb-3 opacity-60" />
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              fontWeight: 400,
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}
          >
            No hay documentos asignados aún
          </h3>
          <p className="text-sm text-[color:var(--text-tertiary)] max-w-md mx-auto">
            La empresa aún no ha configurado tu legajo digital. Cuando lo haga, aparecerá acá.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {CATEGORY_ORDER.filter((k) => grouped[k]?.length > 0).map((category) => {
            const items = grouped[category] ?? []
            const meta = CATEGORY_META[category] ?? {
              label: category,
              description: '',
              icon: FileText,
              accent: '#64748b',
            }
            const CatIcon = meta.icon
            const verifiedCount = items.filter(
              (i) => i.status === 'VERIFIED' || i.status === 'UPLOADED',
            ).length

            return (
              <section key={category}>
                {/* Category header */}
                <div className="flex items-center gap-3 mb-3 px-1">
                  <div
                    className="flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      background: `${meta.accent}15`,
                      color: meta.accent,
                    }}
                  >
                    <CatIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-[color:var(--text-primary)]">
                      {meta.label}
                    </h2>
                    <p className="text-[11px] text-[color:var(--text-tertiary)] truncate">
                      {meta.description}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[color:var(--text-tertiary)] tabular-nums">
                    {verifiedCount}/{items.length}
                  </span>
                </div>

                {/* Items */}
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'white', border: '0.5px solid var(--border-default)' }}
                >
                  <ul
                    className="divide-y"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    {items.map((doc) => (
                      <DocRow key={doc.id} doc={doc} />
                    ))}
                  </ul>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  DocRow
// ─────────────────────────────────────────────────────────────────────────────

function DocRow({ doc }: { doc: DocItem }) {
  const status = STATUS_META[doc.status] ?? STATUS_META.PENDING
  const StatusIcon = status.icon
  const isActionable = doc.status === 'MISSING' || doc.status === 'PENDING' || doc.status === 'EXPIRED'
  const niceType = doc.documentType.replaceAll('_', ' ').toLowerCase()
  const expires = doc.expiresAt ? new Date(doc.expiresAt) : null
  const expiresText = expires
    ? expires.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  return (
    <li className="px-4 py-3 flex items-center gap-3 hover:bg-[color:var(--neutral-50)] transition-colors">
      {/* Doc icon */}
      <div
        className="flex items-center justify-center rounded-lg flex-shrink-0"
        style={{
          width: 40,
          height: 40,
          background: 'var(--neutral-50)',
          color: 'var(--text-tertiary)',
        }}
      >
        <FileText className="h-5 w-5" />
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[color:var(--text-primary)] truncate">
          {doc.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[color:var(--text-tertiary)]">
          <span className="capitalize truncate">{niceType}</span>
          {doc.isRequired ? (
            <span
              className="px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px]"
              style={{
                background: 'rgba(239,68,68,0.1)',
                color: 'var(--crimson-700, #b91c1c)',
              }}
            >
              Obligatorio
            </span>
          ) : null}
          {expiresText ? (
            <span className="hidden sm:inline truncate">· Vence {expiresText}</span>
          ) : null}
        </div>
      </div>

      {/* Status badge */}
      <span
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
        style={{
          background: status.bg,
          color: status.text,
        }}
      >
        <StatusIcon className="h-3 w-3" style={{ color: status.iconColor }} />
        <span className="hidden sm:inline">{status.label}</span>
      </span>

      {/* Action */}
      {doc.fileUrl ? (
        <a
          href={doc.fileUrl}
          download
          className="flex items-center justify-center rounded-lg p-1.5 text-[color:var(--text-tertiary)] hover:text-emerald-700 hover:bg-emerald-50 transition-colors flex-shrink-0"
          title="Descargar"
          aria-label="Descargar documento"
        >
          <Download className="h-4 w-4" />
        </a>
      ) : isActionable ? (
        <Link
          href={`/mi-portal/documentos/subir?type=${doc.documentType}`}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-xs font-bold transition-colors flex-shrink-0"
        >
          <Upload className="h-3 w-3" />
          <span className="hidden sm:inline">Subir</span>
        </Link>
      ) : (
        <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)] flex-shrink-0" />
      )}
    </li>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Loading + Error states
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-3 w-24 rounded bg-emerald-100 mb-2" />
        <div className="h-9 w-72 rounded-lg bg-gray-200 mb-2" />
        <div className="h-4 w-96 rounded bg-[color:var(--neutral-100)]" />
      </div>
      <div className="rounded-2xl h-24 bg-emerald-50/60" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-4 w-40 rounded bg-gray-200 mb-2" />
            <div className="rounded-2xl h-40 bg-[color:var(--neutral-100)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: '#fef2f2', border: '0.5px solid rgba(239,68,68,0.25)' }}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-red-900">No pudimos cargar tus documentos</h3>
          <p className="text-sm text-red-800 mt-1">{message}</p>
        </div>
      </div>
    </div>
  )
}
