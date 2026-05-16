'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  ClipboardCheck,
  Database,
  FileText,
  Layers,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Table,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { cn } from '@/lib/utils'

interface OpsResponse {
  generatedAt: string
  health: {
    totalActive: number
    blockerCount: number
    blockerContracts: number
    fallbackCount: number
    unreviewedAiCount: number
    templatesWithGaps: number
    failedBulkJobs: number
    ackPendingDocuments: number
    qualityBlocked: number
    qualityReady: number
    qualityReviewRequired: number
    qualityMissingAnnexes: number
  }
  warnings?: string[]
  schema?: {
    status: 'ok' | 'compatibility'
    pendingCount: number
    checks: Array<{
      code: string
      label: string
      status: 'ok' | 'compatibility'
      impact: string
      migration: string
      action: string
    }>
  }
  byProvenance: Record<string, number>
  recentBlockers: Array<{
    id: string
    ruleCode: string
    message: string
    createdAt: string
    contract: { id: string; title: string; status: string; provenance?: string }
    rule: { title: string; legalBasis: string }
  }>
  templates: {
    total: number
    activeDedicated: number
    legacy: number
    withGaps: Array<{
      id: string
      title: string
      storage: 'orgTemplate' | 'legacyOrgDocument'
      documentType: string
      placeholderCount: number
      unmappedCount: number
      unmapped: string[]
      usageCount: number
      version: number
      updatedAt: string
    }>
  }
  bulkJobs: Array<{
    id: string
    status: string
    contractType: string
    sourceFileName: string | null
    totalRows: number
    succeededRows: number
    failedRows: number
    createdAt: string
    finishedAt: string | null
  }>
  acknowledgments: {
    activeWorkers: number
    documents: Array<{
      id: string
      title: string
      type: string
      version: number
      acknowledged: number
      pending: number
      totalWorkers: number
      updatedAt: string
    }>
  }
  quality: {
    sampled: number
    withPersistedQuality: number
    blocked: QualityOpsItem[]
    ready: QualityOpsItem[]
    missingAnnexes: QualityOpsItem[]
    reviewRequired: QualityOpsItem[]
  }
  aiReviewRequired: Array<{
    id: string
    title: string
    type: string
    status: string
    provenance: string | null
    isFallback: boolean | null
    updatedAt: string
  }>
}

interface QualityOpsItem {
  id: string
  title: string
  type: string
  status: string
  qualityStatus: string
  qualityScore: number
  blockers: number
  missingAnnexes: string[]
  updatedAt: string
}

const PROVENANCE_LABELS: Record<string, string> = {
  MANUAL_TEMPLATE: 'Plantilla sistema',
  ORG_TEMPLATE: 'Plantilla empresa',
  AI_GENERATED: 'IA',
  AI_FALLBACK: 'Fallback',
  BULK_GENERATED: 'Masivo',
  LEGACY: 'Legacy',
}

export default function ContractOpsPage() {
  const [data, setData] = useState<OpsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load(refresh = false) {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch('/api/contracts/ops', { cache: 'no-store' })
      if (!res.ok) throw new Error('No se pudo cargar operaciones')
      setData(await res.json())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      void load()
    })
    return () => {
      cancelled = true
    }
  }, [])

  const healthLevel = useMemo(() => {
    if (!data) return 'ok'
    if (data.health.blockerContracts > 0 || data.health.failedBulkJobs > 0 || data.health.qualityBlocked > 0) return 'risk'
    if (data.warnings && data.warnings.length > 0) return 'watch'
    if (data.health.fallbackCount > 0 || data.health.templatesWithGaps > 0) return 'watch'
    return 'ok'
  }, [data])

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Operaciones" title="Generador de contratos" subtitle="No se pudo cargar el tablero operativo." />
        <button onClick={() => load()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
          Reintentar
        </button>
      </div>
    )
  }

  const qualityOps = {
    sampled: data.quality?.sampled ?? 0,
    withPersistedQuality: data.quality?.withPersistedQuality ?? 0,
    blocked: data.quality?.blocked ?? [],
    ready: data.quality?.ready ?? [],
    missingAnnexes: data.quality?.missingAnnexes ?? [],
    reviewRequired: data.quality?.reviewRequired ?? [],
  }
  const aiReviewRequired = data.aiReviewRequired ?? []
  const recentBlockers = data.recentBlockers ?? []
  const templateGaps = data.templates?.withGaps ?? []
  const bulkJobs = data.bulkJobs ?? []
  const acknowledgmentDocuments = data.acknowledgments?.documents ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contratos & Docs"
        title="Centro operativo del <em>generador documental</em>."
        subtitle="Blockers, procedencia, fallbacks, bulk, plantillas y acuses en una sola vista de control."
        actions={
          <>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] hover:border-emerald-500/60 disabled:opacity-60"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              Actualizar
            </button>
            <Link href="/dashboard/contratos/nuevo" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
              <FileText className="h-3.5 w-3.5" />
              Crear contrato
            </Link>
          </>
        }
      />

      <div className={cn(
        'rounded-xl border px-4 py-3 text-sm',
        healthLevel === 'risk' && 'border-red-200 bg-red-50 text-red-800',
        healthLevel === 'watch' && 'border-amber-200 bg-amber-50 text-amber-800',
        healthLevel === 'ok' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
      )}>
        {healthLevel === 'risk'
          ? 'Hay bloqueos o contratos detenidos por calidad legal que requieren atención antes de avanzar a firma.'
          : healthLevel === 'watch'
            ? 'El módulo está operativo, con elementos para revisar antes de confiar en todos los indicadores.'
            : 'El módulo no muestra bloqueos operativos en este momento.'}
      </div>
      {data.warnings && data.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Hay migraciones pendientes en esta base. El tablero opera en modo compatibilidad y algunos contadores pueden aparecer en cero hasta aplicar el schema nuevo.
        </div>
      )}
      {data.schema && (
        <section className={cn(
          'rounded-xl border bg-white p-4',
          data.schema.status === 'compatibility' ? 'border-amber-200' : 'border-emerald-100',
        )}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database className={cn(
                'h-4 w-4',
                data.schema.status === 'compatibility' ? 'text-amber-600' : 'text-emerald-600',
              )} />
              <div>
                <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Estado de schema documental</h2>
                <p className="text-xs text-[color:var(--text-tertiary)]">
                  {data.schema.pendingCount > 0
                    ? `${data.schema.pendingCount} componente(s) operan en compatibilidad.`
                    : 'Schema alineado con el pipeline documental nuevo.'}
                </p>
              </div>
            </div>
            <span className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold',
              data.schema.status === 'compatibility'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-700',
            )}>
              {data.schema.status === 'compatibility' ? 'Compatibilidad' : 'OK'}
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.schema.checks.map((check) => (
              <div
                key={check.code}
                className={cn(
                  'rounded-lg border p-3',
                  check.status === 'compatibility'
                    ? 'border-amber-100 bg-amber-50/70'
                    : 'border-emerald-100 bg-emerald-50/50',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    'text-sm font-semibold',
                    check.status === 'compatibility' ? 'text-amber-900' : 'text-emerald-900',
                  )}>
                    {check.label}
                  </p>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    check.status === 'compatibility'
                      ? 'bg-white text-amber-700'
                      : 'bg-white text-emerald-700',
                  )}>
                    {check.status === 'compatibility' ? 'Pendiente' : 'Listo'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[color:var(--text-secondary)]">{check.impact}</p>
                <p className="mt-2 text-[11px] font-medium text-[color:var(--text-tertiary)]">
                  Migración: <span className="font-mono">{check.migration}</span>
                </p>
                {check.status === 'compatibility' && (
                  <p className="mt-1 text-[11px] text-amber-700">{check.action}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard icon={FileText} label="Activos" value={data.health.totalActive} tone="neutral" />
        <KpiCard icon={AlertTriangle} label="Contratos bloqueados" value={data.health.blockerContracts} tone={data.health.blockerContracts ? 'danger' : 'ok'} />
        <KpiCard icon={ShieldCheck} label="Bloqueados calidad" value={data.health.qualityBlocked} tone={data.health.qualityBlocked ? 'danger' : 'ok'} />
        <KpiCard icon={AlertTriangle} label="Anexos faltantes" value={data.health.qualityMissingAnnexes ?? 0} tone={data.health.qualityMissingAnnexes ? 'warn' : 'ok'} />
        <KpiCard icon={Bot} label="IA requiere revisión" value={data.health.unreviewedAiCount ?? 0} tone={data.health.unreviewedAiCount ? 'warn' : 'ok'} />
        <KpiCard icon={ClipboardCheck} label="Listos para firma" value={data.health.qualityReady ?? 0} tone="ok" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-[color:var(--border-default)] bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Blockers pendientes</h2>
              <p className="text-xs text-[color:var(--text-tertiary)]">{data.health.blockerCount} regla(s), {data.health.blockerContracts} contrato(s)</p>
            </div>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          {recentBlockers.length === 0 ? (
            <EmptyLine text="No hay blockers sin reconocer." />
          ) : (
            <div className="space-y-3">
              {recentBlockers.map((item) => (
                <Link key={item.id} href={`/dashboard/contratos/${item.contract.id}`} className="block rounded-lg border border-red-100 bg-red-50/60 p-3 hover:border-red-300">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-red-900">{item.contract.title}</p>
                      <p className="mt-1 text-xs text-red-700">{item.ruleCode} · {item.rule.title}</p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-red-700">{item.contract.status}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-red-700">{item.message}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[color:var(--border-default)] bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Procedencia</h2>
              <p className="text-xs text-[color:var(--text-tertiary)]">Contratos no archivados</p>
            </div>
            <Layers className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="space-y-2">
            {Object.entries(PROVENANCE_LABELS).map(([key, label]) => (
              <MetricRow key={key} label={label} value={data.byProvenance[key] ?? 0} total={Math.max(data.health.totalActive, 1)} />
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Calidad legal premium" icon={ShieldCheck} href="/dashboard/contratos">
          {qualityOps.blocked.length === 0 ? (
            <EmptyLine text="No hay contratos bloqueados por calidad persistida." />
          ) : qualityOps.blocked.map((item) => (
            <Link key={item.id} href={`/dashboard/contratos/${item.id}`} className="block rounded-lg border border-red-100 bg-red-50/70 p-3 hover:border-red-300">
              <div className="flex items-center justify-between gap-2">
                <p className="line-clamp-1 text-sm font-semibold text-red-900">{item.title}</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-red-700">{item.qualityScore}/100</span>
              </div>
              <p className="mt-1 text-xs text-red-700">{item.blockers} blocker(s) · {item.missingAnnexes.length} anexo(s) faltante(s)</p>
            </Link>
          ))}
        </Panel>

        <Panel title="Anexos faltantes" icon={AlertTriangle} href="/dashboard/contratos">
          {qualityOps.missingAnnexes.length === 0 ? (
            <EmptyLine text="No hay anexos críticos faltantes en contratos con calidad persistida." />
          ) : qualityOps.missingAnnexes.map((item) => (
            <Link key={item.id} href={`/dashboard/contratos/${item.id}`} className="block rounded-lg border border-amber-100 bg-amber-50/70 p-3 hover:border-amber-300">
              <div className="flex items-center justify-between gap-2">
                <p className="line-clamp-1 text-sm font-semibold text-amber-900">{item.title}</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700">{item.missingAnnexes.length}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-amber-700">{item.missingAnnexes.join(', ')}</p>
            </Link>
          ))}
        </Panel>

        <Panel title="IA requiere revisión" icon={Bot} href="/dashboard/contratos">
          {aiReviewRequired.length === 0 ? (
            <EmptyLine text="No hay contratos IA pendientes de revisión normativa." />
          ) : aiReviewRequired.map((item) => (
            <Link key={item.id} href={`/dashboard/contratos/${item.id}`} className="block rounded-lg border border-amber-100 bg-amber-50/70 p-3 hover:border-amber-300">
              <div className="flex items-center justify-between gap-2">
                <p className="line-clamp-1 text-sm font-semibold text-amber-900">{item.title}</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  {item.isFallback ? 'Fallback' : 'IA'}
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-700">{item.status} · {PROVENANCE_LABELS[item.provenance ?? ''] ?? item.provenance}</p>
            </Link>
          ))}
        </Panel>

        <Panel title="Plantillas con placeholders faltantes" icon={Layers} href="/dashboard/generadores">
          {templateGaps.length === 0 ? (
            <EmptyLine text="Todas las plantillas activas tienen mappings completos." />
          ) : templateGaps.map((template) => (
            <div key={template.id} className="rounded-lg border border-amber-100 bg-amber-50/70 p-3">
              <p className="text-sm font-semibold text-amber-900">{template.title}</p>
              <p className="mt-1 text-xs text-amber-700">{template.unmappedCount} sin mapear · v{template.version} · {template.storage === 'legacyOrgDocument' ? 'legacy' : 'dedicada'}</p>
              <p className="mt-2 line-clamp-1 text-[11px] text-amber-700">{template.unmapped.join(', ')}</p>
            </div>
          ))}
        </Panel>

        <Panel title="Generación masiva reciente" icon={Table} href="/dashboard/contratos/bulk">
          {bulkJobs.length === 0 ? (
            <EmptyLine text="No hay corridas masivas recientes." />
          ) : bulkJobs.map((job) => (
            <div key={job.id} className="rounded-lg border border-[color:var(--border-subtle)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">{job.sourceFileName ?? job.contractType}</p>
                <StatusPill status={job.status} />
              </div>
              <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">{job.succeededRows}/{job.totalRows} ok · {job.failedRows} error(es)</p>
            </div>
          ))}
        </Panel>

        <Panel title="Acuses institucionales" icon={ClipboardCheck} href="/dashboard/documentos-firma">
          {acknowledgmentDocuments.length === 0 ? (
            <EmptyLine text="No hay documentos publicados con acuse requerido." />
          ) : acknowledgmentDocuments.map((doc) => (
            <Link key={doc.id} href={`/dashboard/documentos-firma`} className="block rounded-lg border border-[color:var(--border-subtle)] p-3 hover:border-emerald-300">
              <div className="flex items-center justify-between gap-2">
                <p className="line-clamp-1 text-sm font-semibold text-[color:var(--text-primary)]">{doc.title}</p>
                <span className={cn('text-xs font-semibold', doc.pending > 0 ? 'text-amber-700' : 'text-emerald-700')}>
                  {doc.pending} pend.
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{ width: `${doc.totalWorkers ? (doc.acknowledged / doc.totalWorkers) * 100 : 0}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)]">{doc.acknowledged}/{doc.totalWorkers} acuses · v{doc.version}</p>
            </Link>
          ))}
        </Panel>
      </div>

      <p className="text-xs text-[color:var(--text-tertiary)]">
        Actualizado {new Date(data.generatedAt).toLocaleString('es-PE')}.
      </p>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, tone }: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: number
  tone: 'neutral' | 'ok' | 'warn' | 'danger'
}) {
  return (
    <div className={cn(
      'rounded-xl border bg-white p-4',
      tone === 'neutral' && 'border-[color:var(--border-default)]',
      tone === 'ok' && 'border-emerald-100',
      tone === 'warn' && 'border-amber-100',
      tone === 'danger' && 'border-red-100',
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[color:var(--text-tertiary)]">{label}</span>
        <Icon className={cn(
          'h-4 w-4',
          tone === 'danger' ? 'text-red-500' : tone === 'warn' ? 'text-amber-500' : 'text-emerald-600',
        )} />
      </div>
      <p className="mt-2 text-2xl font-bold text-[color:var(--text-primary)]">{value}</p>
    </div>
  )
}

function MetricRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = Math.min((value / total) * 100, 100)
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-[color:var(--text-secondary)]">{label}</span>
        <span className="font-semibold text-[color:var(--text-primary)]">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Panel({ title, icon: Icon, href, children }: {
  title: string
  icon: ComponentType<{ className?: string }>
  href: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-[color:var(--border-default)] bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h2>
        </div>
        <Link href={href} className="text-xs font-semibold text-emerald-700 hover:underline">Abrir</Link>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function StatusPill({ status }: { status: string }) {
  const ok = status === 'COMPLETED'
  const bad = status === 'FAILED' || status === 'CANCELLED'
  return (
    <span className={cn(
      'rounded-full px-2 py-1 text-[11px] font-semibold',
      ok && 'bg-emerald-50 text-emerald-700',
      bad && 'bg-red-50 text-red-700',
      !ok && !bad && 'bg-amber-50 text-amber-700',
    )}>
      {status}
    </span>
  )
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[color:var(--border-subtle)] p-4 text-center">
      <CheckCircle className="mx-auto mb-2 h-4 w-4 text-emerald-600" />
      <p className="text-xs text-[color:var(--text-tertiary)]">{text}</p>
    </div>
  )
}
