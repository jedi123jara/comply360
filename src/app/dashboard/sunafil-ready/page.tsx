'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  FileText,
  Upload,
  Sparkles,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  MinusCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { ProgressRing } from '@/components/ui/progress-ring'
import { PageHeader } from '@/components/comply360/editorial-title'
import { cn } from '@/lib/utils'

/**
 * /dashboard/sunafil-ready — Checklist visual de los 28 documentos SUNAFIL
 * con % completitud global, multa potencial, breakdown por categoría y CTAs
 * directos a upload / generator por cada documento faltante.
 *
 * Esta es la "visión completa" del producto: el usuario ve de un vistazo
 * dónde está parado frente a una inspección y qué le falta hacer.
 */

type DocStatus = 'COMPLETO' | 'PARCIAL' | 'FALTANTE' | 'VENCIDO' | 'NO_APLICA'
type Gravity = 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
type Scope = 'worker' | 'org' | 'hybrid' | 'exhibited'

interface Entry {
  id: string
  number: number
  title: string
  description: string
  category: string
  categoryLabel: string
  gravity: Gravity
  multaUIT: number
  multaSoles: number
  baseLegal: string
  scope: Scope
  status: DocStatus
  coverage: { present: number; total: number }
  lastExpiresAt: string | null
  generatorSlug?: string
  actionHint: string
  conditionReason?: string
}

interface CategoryBreakdown {
  category: string
  label: string
  total: number
  aplicables: number
  completos: number
  parciales: number
  faltantes: number
  vencidos: number
  score: number
  multaSoles: number
  items: Entry[]
}

interface SunafilReadyPayload {
  meta: { totalDocs: number; totalWorkers: number; tipoEmpresa: string; calculatedAt: string }
  stats: {
    scoreGlobal: number
    aplicables: number
    completos: number
    parciales: number
    faltantes: number
    vencidos: number
    noAplica: number
    multaPotencialSoles: number
    multaConSubsanacionSoles: number
    ahorroSubsanacionSoles: number
  }
  byCategory: CategoryBreakdown[]
  entries: Entry[]
}

export default function SunafilReadyPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SunafilReadyPayload | null>(null)
  const [statusFilter, setStatusFilter] = useState<DocStatus | 'ALL'>('ALL')
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/sunafil-ready', { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const body = (await r.json()) as SunafilReadyPayload
      setData(body)
      // Auto-expand categorías con faltantes
      const expand = new Set<string>()
      for (const c of body.byCategory) {
        if (c.faltantes + c.vencidos + c.parciales > 0) expand.add(c.category)
      }
      setExpandedCats(expand)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

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

  const toggleCategory = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <main className="min-h-[calc(100vh-var(--topbar-height))] text-[color:var(--text-primary)] relative px-4 py-8 sm:px-6 lg:px-12">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <HeroHeader />
        {loading ? (
          <LoadingPanel />
        ) : error ? (
          <ErrorPanel error={error} onRetry={load} />
        ) : !data ? null : (
          <>
            <ScoreHero data={data} />
            <StatusFilterBar
              stats={data.stats}
              active={statusFilter}
              onChange={setStatusFilter}
            />
            <div className="space-y-4">
              {data.byCategory.map((cat) => (
                <CategoryBlock
                  key={cat.category}
                  cat={cat}
                  expanded={expandedCats.has(cat.category)}
                  onToggle={() => toggleCategory(cat.category)}
                  filter={statusFilter}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

/* ── Hero header ───────────────────────────────────────────────────── */

function HeroHeader() {
  return (
    <PageHeader
      eyebrow="SUNAFIL-Ready"
      title="Tu empresa está <em>lista para inspección</em>."
      subtitle="Catálogo oficial de 28 documentos según protocolo R.M. 199-2016-TR. Vemos qué tienes, qué te falta y cuánto puedes ahorrar subsanando antes de la inspección."
    />
  )
}

/* ── Score hero ────────────────────────────────────────────────────── */

function ScoreHero({ data }: { data: SunafilReadyPayload }) {
  const { stats, meta } = data
  const scoreTone =
    stats.scoreGlobal >= 80 ? 'text-emerald-700' : stats.scoreGlobal >= 60 ? 'text-amber-700' : 'text-crimson-700'
  const fmtSoles = (n: number) =>
    n > 0
      ? `S/ ${n.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`
      : '—'

  return (
    <Card padding="lg" className="bg-gradient-to-br from-emerald-50/60 to-white">
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-center">
        <div className="flex items-center justify-center">
          <ProgressRing value={stats.scoreGlobal} size={180} stroke={14}>
            <div className="text-center">
              <div className={cn('text-5xl font-bold tabular-nums', scoreTone)}>
                {stats.scoreGlobal}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] mt-0.5">
                SUNAFIL-Ready
              </div>
            </div>
          </ProgressRing>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-2xl font-bold">
              {stats.completos} de {stats.aplicables} documentos al día
            </p>
            <p className="text-sm text-[color:var(--text-secondary)] mt-1">
              {stats.faltantes + stats.vencidos + stats.parciales > 0 ? (
                <>
                  Te faltan <strong className="text-crimson-700">{stats.faltantes}</strong>,{' '}
                  tienes <strong className="text-amber-700">{stats.parciales}</strong> parciales y{' '}
                  <strong className="text-amber-700">{stats.vencidos}</strong> vencidos.
                  {stats.noAplica > 0 ? ` (${stats.noAplica} no aplican por tu tamaño/sector.)` : ''}
                </>
              ) : (
                '¡Estás listo para una inspección SUNAFIL!'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatTile
              label="Multa potencial"
              value={fmtSoles(stats.multaPotencialSoles)}
              tone={stats.multaPotencialSoles > 0 ? 'crimson' : 'emerald'}
              icon={TrendingDown}
            />
            <StatTile
              label="Con subsanación (−90%)"
              value={fmtSoles(stats.multaConSubsanacionSoles)}
              hint="Art. 40 Ley 28806"
              tone="amber"
              icon={TrendingUp}
            />
            <StatTile
              label="Tu empresa"
              value={`${meta.totalWorkers} trab.`}
              hint={meta.tipoEmpresa === 'MICRO' ? 'Micro' : meta.tipoEmpresa === 'PEQUENA' ? 'Pequeña' : 'No-MYPE'}
              tone="neutral"
              icon={ShieldCheck}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}

function StatTile({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string
  value: string
  hint?: string
  tone: 'emerald' | 'amber' | 'crimson' | 'neutral'
  icon?: React.ComponentType<{ className?: string }>
}) {
  const cls = {
    emerald: 'border-emerald-200 bg-emerald-50/50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50/50 text-amber-900',
    crimson: 'border-crimson-200 bg-crimson-50/50 text-crimson-900',
    neutral: 'border-[color:var(--border-subtle)] bg-white text-[color:var(--text-primary)]',
  }[tone]
  return (
    <div className={cn('rounded-xl border px-4 py-3', cls)}>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon ? <Icon className="h-3 w-3 opacity-60" /> : null}
        <span className="text-[10px] uppercase tracking-widest opacity-70">{label}</span>
      </div>
      <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
      {hint ? <p className="text-[11px] opacity-70 mt-0.5">{hint}</p> : null}
    </div>
  )
}

/* ── Status filter bar ─────────────────────────────────────────────── */

function StatusFilterBar({
  stats,
  active,
  onChange,
}: {
  stats: SunafilReadyPayload['stats']
  active: DocStatus | 'ALL'
  onChange: (s: DocStatus | 'ALL') => void
}) {
  const pills: Array<{ key: DocStatus | 'ALL'; label: string; count: number; tone: string }> = [
    { key: 'ALL', label: 'Todos', count: stats.aplicables + stats.noAplica, tone: 'emerald' },
    { key: 'FALTANTE', label: 'Faltantes', count: stats.faltantes, tone: 'crimson' },
    { key: 'VENCIDO', label: 'Vencidos', count: stats.vencidos, tone: 'amber' },
    { key: 'PARCIAL', label: 'Parciales', count: stats.parciales, tone: 'amber' },
    { key: 'COMPLETO', label: 'Completos', count: stats.completos, tone: 'emerald' },
    { key: 'NO_APLICA', label: 'No aplica', count: stats.noAplica, tone: 'neutral' },
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
            active === p.key
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-[color:var(--border-default)] bg-white text-[color:var(--text-secondary)] hover:border-emerald-200',
          )}
          aria-pressed={active === p.key}
        >
          {p.label}
          <span
            className={cn(
              'inline-flex min-w-[1.5rem] justify-center rounded-full px-1.5 text-[10px] font-bold',
              active === p.key ? 'bg-emerald-600 text-white' : 'bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)]',
            )}
          >
            {p.count}
          </span>
        </button>
      ))}
    </div>
  )
}

/* ── Category block ────────────────────────────────────────────────── */

function CategoryBlock({
  cat,
  expanded,
  onToggle,
  filter,
}: {
  cat: CategoryBreakdown
  expanded: boolean
  onToggle: () => void
  filter: DocStatus | 'ALL'
}) {
  const items = filter === 'ALL' ? cat.items : cat.items.filter((i) => i.status === filter)
  if (items.length === 0 && filter !== 'ALL') return null

  const scoreTone =
    cat.score >= 80 ? 'text-emerald-700' : cat.score >= 60 ? 'text-amber-700' : 'text-crimson-700'

  return (
    <Card padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-[color:var(--neutral-50)]/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-[color:var(--text-tertiary)]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)]" />
        )}
        <div className="flex-1 text-left">
          <p className="text-base font-bold">{cat.label}</p>
          <p className="text-xs text-[color:var(--text-tertiary)]">
            {cat.completos} de {cat.aplicables} completos · {cat.faltantes} faltantes ·{' '}
            {cat.vencidos} vencidos
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cat.multaSoles > 0 ? (
            <span className="text-xs font-mono font-bold text-crimson-700">
              −S/ {Math.round(cat.multaSoles).toLocaleString('es-PE')}
            </span>
          ) : null}
          <span className={cn('text-2xl font-bold tabular-nums', scoreTone)}>{cat.score}</span>
          <span className="text-xs text-[color:var(--text-tertiary)]">/ 100</span>
        </div>
      </button>
      {expanded ? (
        <div className="px-5 pb-5 space-y-2 border-t border-[color:var(--border-subtle)]">
          {items.map((item) => (
            <DocRow key={item.id} entry={item} />
          ))}
        </div>
      ) : null}
    </Card>
  )
}

/* ── Doc row ───────────────────────────────────────────────────────── */

function DocRow({ entry }: { entry: Entry }) {
  const statusConfig: Record<
    DocStatus,
    { icon: React.ComponentType<{ className?: string }>; label: string; tone: string }
  > = {
    COMPLETO: {
      icon: CheckCircle2,
      label: 'Completo',
      tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    PARCIAL: {
      icon: AlertTriangle,
      label: 'Parcial',
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    VENCIDO: {
      icon: Clock,
      label: 'Vencido',
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    FALTANTE: {
      icon: XCircle,
      label: 'Faltante',
      tone: 'bg-crimson-50 text-crimson-700 border-crimson-200',
    },
    NO_APLICA: {
      icon: MinusCircle,
      label: 'No aplica',
      tone: 'bg-[color:var(--neutral-50)] text-[color:var(--text-tertiary)] border-[color:var(--border-default)]',
    },
  }
  const cfg = statusConfig[entry.status]
  const SIcon = cfg.icon

  const gravityTone =
    entry.gravity === 'MUY_GRAVE'
      ? 'bg-crimson-50 text-crimson-700 border-crimson-200'
      : entry.gravity === 'GRAVE'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200'

  const needsAction =
    entry.status === 'FALTANTE' || entry.status === 'VENCIDO' || entry.status === 'PARCIAL'

  return (
    <div className="flex items-start gap-3 rounded-lg border border-[color:var(--border-subtle)] bg-white px-3 py-3 mt-2">
      <span
        className={cn(
          'mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md border font-mono text-[11px] font-bold shrink-0',
          cfg.tone,
        )}
      >
        {entry.number}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <p className="text-sm font-bold truncate">{entry.title}</p>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0 text-[9px] font-bold uppercase tracking-widest',
              gravityTone,
            )}
          >
            {entry.gravity.replace('_', ' ')}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0 text-[10px] font-semibold',
              cfg.tone,
            )}
          >
            <SIcon className="h-3 w-3" />
            {cfg.label}
            {entry.coverage.total > 0 && entry.scope === 'worker' ? (
              <span className="font-mono font-normal opacity-70 ml-0.5">
                {entry.coverage.present}/{entry.coverage.total}
              </span>
            ) : null}
          </span>
        </div>
        <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">
          {entry.description}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
          <span className="font-mono text-[color:var(--text-tertiary)]">{entry.baseLegal}</span>
          {needsAction && entry.multaSoles > 0 ? (
            <span className="text-crimson-700 font-semibold">
              Multa estimada: S/ {Math.round(entry.multaSoles).toLocaleString('es-PE')}
            </span>
          ) : null}
          {entry.conditionReason ? (
            <span className="text-[color:var(--text-tertiary)] italic">
              {entry.conditionReason}
            </span>
          ) : null}
        </div>
        {needsAction ? (
          <p className="mt-1.5 text-xs text-emerald-700">
            <strong>Qué hacer:</strong> {entry.actionHint}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 shrink-0 items-end">
        {entry.status === 'NO_APLICA' ? (
          <span className="text-[11px] text-[color:var(--text-tertiary)] italic">
            N/A
          </span>
        ) : needsAction ? (
          <>
            {entry.generatorSlug ? (
              <Link
                href={resolveGeneratorHref(entry.generatorSlug)}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 text-xs font-semibold transition-colors"
                title={`Generar ${entry.title} con IA`}
              >
                <Sparkles className="h-3 w-3" />
                Generar
              </Link>
            ) : null}
            <Link
              href={resolveUploadHref(entry)}
              className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--border-default)] bg-white hover:border-emerald-300 px-2.5 py-1.5 text-xs font-semibold text-[color:var(--text-primary)] transition-colors"
              title={`Subir ${entry.title}`}
            >
              <Upload className="h-3 w-3" />
              Subir
            </Link>
          </>
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-label="Completo" />
        )}
      </div>
    </div>
  )
}

/* ── Helpers ───────────────────────────────────────────────────────── */

/**
 * Resuelve la ruta del generador. Hoy muchos generadores aún no existen:
 * redirigimos a un placeholder con el slug para que el backlog sea explícito.
 */
function resolveGeneratorHref(slug: string): string {
  const knownGenerators: Record<string, string> = {
    // ── Generadores IA nuevos (disponibles) ──
    'politica-sst': '/dashboard/generadores/politica-sst',
    'politica-hostigamiento': '/dashboard/generadores/politica-hostigamiento',
    'cuadro-categorias': '/dashboard/generadores/cuadro-categorias',
    // ── Módulos existentes del producto ──
    'contrato-trabajo': '/dashboard/contratos/nuevo',
    'cts-liquidacion': '/dashboard/calculadoras/cts',
    gratificacion: '/dashboard/calculadoras/gratificacion',
    'boleta-pago': '/dashboard/boletas',
    'asistencia-export': '/dashboard/asistencia',
    'vacaciones-export': '/dashboard/vacaciones',
    // ── Backlog (en hub /dashboard/generadores con available:false) ──
    iperc: '/dashboard/generadores',
    'plan-anual-sst': '/dashboard/generadores',
    'acta-comite-sst': '/dashboard/generadores',
    'capacitacion-sst': '/dashboard/generadores',
    'entrega-epp': '/dashboard/generadores',
    'induccion-sst': '/dashboard/generadores',
    'mapa-riesgos': '/dashboard/generadores',
    'registro-accidentes': '/dashboard/generadores',
    'reglamento-interno': '/dashboard/generadores',
    'declaracion-jurada': '/dashboard/generadores',
    'horario-trabajo-cartel': '/dashboard/generadores',
    'sintesis-legislacion': '/dashboard/generadores',
  }
  return knownGenerators[slug] ?? `/dashboard/generadores`
}

function resolveUploadHref(entry: Entry): string {
  if (entry.scope === 'worker' || entry.scope === 'hybrid') {
    return '/dashboard/trabajadores'
  }
  return '/dashboard/documentos'
}

/* ── Loading / Error ───────────────────────────────────────────────── */

function LoadingPanel() {
  return (
    <div className="flex items-center justify-center gap-2 py-20 text-sm text-[color:var(--text-tertiary)]">
      <Loader2 className="h-4 w-4 animate-spin" />
      Calculando estado SUNAFIL-Ready…
    </div>
  )
}

function ErrorPanel({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Card padding="lg" className="text-center">
      <AlertTriangle className="h-8 w-8 text-crimson-700 mx-auto mb-3" />
      <CardTitle>No pudimos calcular el estado</CardTitle>
      <CardDescription className="mt-2">{error}</CardDescription>
      <div className="mt-4">
        <Button size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </Card>
  )
}

// Re-export para coherencia con otros archivos del dashboard
export { FileText }
