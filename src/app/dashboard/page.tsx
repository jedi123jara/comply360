'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Users,
  FileText,
  Calculator,
  ShieldAlert,
  Bot,
  BarChart3,
} from 'lucide-react'
import { useCopilot } from '@/providers/copilot-provider'
import {
  ScoreNarrative,
  MomentCard,
  ActivityHeatmap,
  SectorRadar,
  UpcomingDeadlines,
  RiskLeaderboard,
  QuickActions,
  ComplianceTasksPanel,
  mockHeatmapData,
} from '@/components/cockpit'
import type {
  DeadlineItem,
  WorkerRiskItem,
  RadarAxisDatum,
  QuickAction,
  HeatmapDay,
  ComplianceTaskTeaser,
} from '@/components/cockpit'
import { SkeletonStats, SkeletonCard } from '@/components/ui/skeleton'
import { OnboardingWizard } from '@/components/dashboard/onboarding-wizard'
import { HeroPanel } from '@/components/comply360/hero-panel'

/**
 * Cockpit v2 — "Obsidian + Esmeralda".
 *
 * Reemplaza la grilla de widgets anterior por una narrativa que cuenta la
 * historia del periodo: score hero → momentos (lo que cerraste / lo que se
 * viene / mayor riesgo) → acciones rápidas → vencimientos + workers en riesgo
 * → heatmap + benchmark sectorial.
 *
 * Data flow:
 *   - GET /api/dashboard       → stats, breakdowns, recent activity
 *   - GET /api/compliance/score → score history + delta
 *   - Fallbacks a mock sólo si la API está vacía (cuentas nuevas sin datos)
 */

interface DashboardPayload {
  stats?: {
    totalWorkers?: number
    expiringCount?: number
    criticalAlerts?: number
    complianceScore?: number | null
    multaPotencial?: number | null
  }
  complianceBreakdown?: { label: string; score: number; weight?: number }[]
  recentContracts?: { id: string; title: string; status: string }[]
  recentCriticalAlerts?: {
    id: string
    title: string
    severity: string
    dueDate: string | null
    type: string
  }[]
  riskWorkers?: WorkerRiskItem[]
  upcomingDeadlines?: DeadlineItem[]
  activityHeatmap?: HeatmapDay[]
  sectorRadar?: RadarAxisDatum[]
  topRisk?: { label: string; impact: number }
  complianceTasks?: {
    open: number
    pending: number
    inProgress: number
    completed: number
    dismissed: number
    overdue: number
    multaEvitable: number
    multaEvitada: number
    top: ComplianceTaskTeaser[]
  }
}

interface ScorePayload {
  scoreGlobal?: number
  delta?: number
  data?: { scoreGlobal?: number; delta?: number }
}

export default function DashboardPage() {
  const copilot = useCopilot()
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [scoreData, setScoreData] = useState<ScorePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)

  // Fetch dashboard + score in parallel
  useEffect(() => {
    let mounted = true
    Promise.allSettled([
      fetch('/api/dashboard').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/compliance/score').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/onboarding/progress').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([dashRes, scoreRes, onbRes]) => {
        if (!mounted) return
        if (dashRes.status === 'fulfilled' && dashRes.value) setData(dashRes.value)
        if (scoreRes.status === 'fulfilled' && scoreRes.value) setScoreData(scoreRes.value)
        if (onbRes.status === 'fulfilled' && onbRes.value) {
          const needs =
            onbRes.value.completed === false ||
            onbRes.value?.data?.completed === false
          setNeedsOnboarding(needs)
        } else {
          setNeedsOnboarding(false)
        }
        setLoading(false)
      })
      .catch(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  // Derived values
  const score = useMemo(() => {
    const s =
      scoreData?.scoreGlobal ??
      scoreData?.data?.scoreGlobal ??
      data?.stats?.complianceScore ??
      null
    return typeof s === 'number' ? s : 72
  }, [scoreData, data])

  const delta = useMemo(
    () => scoreData?.delta ?? scoreData?.data?.delta ?? 0,
    [scoreData]
  )

  const totalWorkers = data?.stats?.totalWorkers ?? 0
  const expiringCount = data?.stats?.expiringCount ?? 0
  const criticalAlerts = data?.stats?.criticalAlerts ?? 0
  const multaPotencial = data?.stats?.multaPotencial ?? 0

  const topRisk = data?.topRisk?.label ?? inferTopRisk(data?.complianceBreakdown)
  const topRiskImpact = data?.topRisk?.impact ?? 6

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'new-worker',
        label: 'Nuevo trabajador',
        hint: 'Wizard + DNI · RUC',
        icon: Users,
        href: '/dashboard/trabajadores/nuevo',
        accent: 'emerald',
      },
      {
        id: 'new-contract',
        label: 'Generar contrato',
        hint: 'Plantilla + IA',
        icon: FileText,
        href: '/dashboard/contratos/nuevo',
        accent: 'emerald',
      },
      {
        id: 'calc-cts',
        label: 'Calcular CTS',
        hint: 'Pre-fill por worker',
        icon: Calculator,
        href: '/dashboard/calculadoras/cts',
        accent: 'cyan',
      },
      {
        id: 'sunafil-ready',
        label: 'SUNAFIL-Ready',
        hint: 'Checklist 28 docs',
        icon: ShieldCheck,
        href: '/dashboard/sunafil-ready',
        accent: 'emerald',
      },
      {
        id: 'simulacro',
        label: 'Simulacro SUNAFIL',
        hint: 'Inspector virtual',
        icon: ShieldAlert,
        href: '/dashboard/simulacro',
        accent: 'amber',
      },
      {
        id: 'asistente',
        label: 'Asistente IA',
        hint: 'Consultas laborales',
        icon: Bot,
        onClick: () => copilot.open(),
        accent: 'gold',
      },
      {
        id: 'reportes',
        label: 'Reporte ejecutivo',
        hint: 'PDF mensual',
        icon: BarChart3,
        href: '/dashboard/reportes',
        accent: 'emerald',
      },
    ],
    [copilot]
  )

  const [nowMs] = useState(() => Date.now())
  const deadlines: DeadlineItem[] = useMemo(() => {
    if (data?.upcomingDeadlines?.length) return data.upcomingDeadlines
    // Synthesize from recentCriticalAlerts when available
    if (data?.recentCriticalAlerts?.length) {
      return data.recentCriticalAlerts.slice(0, 5).map((a) => {
        const days = a.dueDate
          ? Math.max(
              -30,
              Math.ceil((new Date(a.dueDate).getTime() - nowMs) / (1000 * 60 * 60 * 24))
            )
          : 7
        return {
          id: a.id,
          label: a.title,
          dueIn: days,
          category: mapAlertTypeToCategory(a.type),
          href: '/dashboard/alertas',
        }
      })
    }
    return []
  }, [data, nowMs])

  const riskWorkers: WorkerRiskItem[] = data?.riskWorkers ?? []
  const heatmap: HeatmapDay[] = data?.activityHeatmap?.length
    ? data.activityHeatmap
    : mockHeatmapData(12)
  const sectorRadar: RadarAxisDatum[] = data?.sectorRadar ?? []

  // ── UI states ──
  if (needsOnboarding) {
    return <OnboardingWizard />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-64" />
        <SkeletonStats count={3} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  // ── Render cockpit ──
  // Hero panel signature (Variant A del prototipo de diseño "sello notarial")
  // Se renderiza arriba del ScoreNarrative legacy para no romper backcompat; el
  // ScoreNarrative sigue sirviendo como breakdown detallado por área.
  return (
    <div className="space-y-8">
      <HeroPanel
        score={typeof score === 'number' ? Math.round(score) : 82}
        userFirstName={(data?.stats as { ownerFirstName?: string } | undefined)?.ownerFirstName ?? 'equipo'}
        orgName={(data as { orgName?: string } | undefined)?.orgName ?? 'tu empresa'}
        multaEvitadaSoles={
          (data?.complianceTasks?.multaEvitada as number | undefined) ?? multaPotencial ?? 0
        }
        alertasCriticas={criticalAlerts}
        trabajadoresProtegidos={totalWorkers}
        diasSinMulta={Math.min(365, Math.max(0, (data?.stats?.complianceScore ?? 82) * 2))}
        onReviewAlerts={() => window.location.assign('/dashboard/alertas')}
        onOpenDiagnostic={() => window.location.assign('/dashboard/diagnostico')}
        onAskAssistant={() => copilot.open()}
      />
      <ScoreNarrative
        score={score}
        delta={delta}
        topRisk={topRisk}
        topRiskImpact={topRiskImpact}
        multaEvitada={multaPotencial}
        onAskCopilot={() => copilot.open()}
        onOpenActionPlan={() => {
          window.location.assign('/dashboard/diagnostico')
        }}
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MomentCard
          variant="closed"
          label="Lo que cerraste"
          title={buildClosedTitle(data)}
          description="Revisá el detalle de alertas resueltas y contratos renovados."
          icon={ShieldCheck}
          href="/dashboard/alertas"
          cta="Ver alertas"
        />
        <MomentCard
          variant="upcoming"
          label="Lo que se viene"
          title={`${expiringCount || deadlines.length} vencimientos · 30 días`}
          description="Contratos, exámenes médicos, capacitaciones SST y aportes AFP en el horizonte."
          icon={Calendar}
          href="/dashboard/calendario"
          cta="Ver calendario"
        />
        <MomentCard
          variant="risk"
          label="Tu mayor riesgo"
          title={topRisk}
          description={
            multaPotencial > 0
              ? `Multa estimada ${formatPEN(multaPotencial)} si hay inspección.`
              : `${criticalAlerts} alertas críticas activas. Prioridad de resolución.`
          }
          icon={AlertTriangle}
          href="/dashboard/sunafil-ready"
          cta="Ver los 28 docs"
        />
      </section>

      <QuickActions actions={quickActions} />

      <ComplianceTasksPanel
        open={data?.complianceTasks?.open ?? 0}
        completed={data?.complianceTasks?.completed ?? 0}
        overdue={data?.complianceTasks?.overdue ?? 0}
        multaEvitable={data?.complianceTasks?.multaEvitable ?? 0}
        multaEvitada={data?.complianceTasks?.multaEvitada ?? 0}
        top={data?.complianceTasks?.top ?? []}
      />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingDeadlines items={deadlines} />
        <RiskLeaderboard workers={riskWorkers} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityHeatmap data={heatmap} />
        {sectorRadar.length > 0 ? (
          <SectorRadar data={sectorRadar} sectorLabel="Promedio sector" />
        ) : (
          <PlaceholderRadar totalWorkers={totalWorkers} />
        )}
      </section>
    </div>
  )
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function inferTopRisk(breakdown?: DashboardPayload['complianceBreakdown']): string {
  if (!breakdown?.length) return 'Sin análisis'
  const worst = [...breakdown].sort((a, b) => a.score - b.score)[0]
  return worst?.label ?? 'Sin análisis'
}

function mapAlertTypeToCategory(type?: string): DeadlineItem['category'] {
  if (!type) return 'other'
  const t = type.toLowerCase()
  if (t.includes('contrato')) return 'contract'
  if (t.includes('cts')) return 'cts'
  if (t.includes('grat')) return 'grat'
  if (t.includes('sst') || t.includes('exam')) return 'sst'
  if (t.includes('afp')) return 'afp'
  if (t.includes('doc')) return 'document'
  return 'other'
}

function buildClosedTitle(data: DashboardPayload | null): string {
  const closed = data?.recentContracts?.filter((c) => c.status === 'SIGNED').length ?? 0
  if (closed > 0) return `${closed} contratos firmados`
  return 'Todo al día esta semana'
}

function formatPEN(n: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(n)
}

function PlaceholderRadar({ totalWorkers }: { totalWorkers: number }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]/40 p-8 flex flex-col items-center justify-center text-center gap-3">
      <BarChart3 className="h-10 w-10 text-[color:var(--text-tertiary)]" />
      <div>
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">
          Benchmark sectorial en preparación
        </p>
        <p className="text-xs text-[color:var(--text-tertiary)] mt-1 max-w-xs">
          {totalWorkers === 0
            ? 'Registrá trabajadores y corré un diagnóstico para empezar a comparar con tu sector.'
            : 'El benchmark se actualizará tras el próximo diagnóstico mensual.'}
        </p>
      </div>
    </div>
  )
}
