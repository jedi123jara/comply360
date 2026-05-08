'use client'

import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
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
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { toast } from '@/components/ui/sonner-toaster'
import { useCopilot } from '@/providers/copilot-provider'
import {
  ScoreNarrative,
  MomentCard,
  ActivityHeatmap,
  UpcomingDeadlines,
  CalendarWidget,
  RiskLeaderboard,
  QuickActions,
  ComplianceTasksPanel,
} from '@/components/cockpit'
import { DecisionesLaborales } from './_components/decisiones-laborales'

// SectorRadar usa `recharts` (~102KB gzipped). Lo cargamos dinámicamente
// para que no infle el bundle inicial del dashboard. ssr:false porque
// recharts requiere DOM.
const SectorRadar = dynamic(
  () => import('@/components/cockpit').then((m) => ({ default: m.SectorRadar })),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-1)]"
        style={{ height: 320, animation: 'pulse 1.5s ease-in-out infinite' }}
      />
    ),
  },
)
import type {
  DeadlineItem,
  WorkerRiskItem,
  RadarAxisDatum,
  QuickAction,
} from '@/components/cockpit'
import { WelcomeTour } from '@/components/dashboard/welcome-tour'
import { HeroPanel } from '@/components/comply360/hero-panel'
import type { CockpitFullPayload, ScoreSnapshot } from '@/lib/cockpit/data'

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

/**
 * Props inyectados desde el Server Component `dashboard/page.tsx`.
 * El cockpit ya no fetchea en el cliente — recibe la data resuelta vía RSC.
 */
export interface CockpitClientProps {
  initialData: CockpitFullPayload
  initialScore: ScoreSnapshot
}

export default function CockpitPage({ initialData, initialScore }: CockpitClientProps) {
  const copilot = useCopilot()
  const searchParams = useSearchParams()

  const data = initialData
  const scoreData = initialScore

  // Toast "Trial PRO activado" — se muestra UNA sola vez al venir del onboarding
  // con `?welcome=trial`. Usamos sessionStorage para no spam al refrescar.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (searchParams?.get('welcome') !== 'trial') return
    const KEY = 'comply360.welcomeTrialToastShown'
    if (sessionStorage.getItem(KEY)) return
    sessionStorage.setItem(KEY, '1')
    toast.success('Trial PRO activado por 14 días', {
      description: 'Explora el cockpit, agrega tu primer trabajador y dispara un diagnóstico.',
    })
  }, [searchParams])

  // Derived values
  const score: number | null = useMemo(() => {
    const s = scoreData.scoreGlobal ?? data.stats.complianceScore ?? null
    return typeof s === 'number' ? s : null
  }, [scoreData, data])

  const delta = scoreData.delta ?? 0

  const totalWorkers = data.stats.totalWorkers ?? 0
  const expiringCount = data.stats.expiringCount ?? 0
  const criticalAlerts = data.stats.criticalAlerts ?? 0
  const multaPotencial = data.stats.multaPotencial ?? 0
  const workersProtected = data.stats.workersProtected ?? totalWorkers
  const daysSinceOrgCreated = data.stats.daysSinceOrgCreated ?? 0
  const totalWorkersDeclared = data.stats.totalWorkersDeclared ?? null
  const subdeclarationGap = data.stats.subdeclarationGap ?? null

  // Estado "primera vez": cuenta nueva, sin trabajadores ni señales de actividad.
  // Antes el cockpit asumía score 72 por defecto y disparaba narrativa de "zona crítica",
  // lo cual asustaba sin razón a usuarios recién registrados. Mostramos un banner
  // bienvenida que reemplaza ese mensaje y guía a los 3 primeros pasos útiles.
  const isFirstTime =
    totalWorkers === 0 && criticalAlerts === 0 && expiringCount === 0

  // Estado "onboarding intermedio": ya tiene trabajadores pero todavía no
  // corrió el diagnóstico. Heurística: score viene null/0 desde la API.
  const hasDiagnosticData = typeof scoreData.scoreGlobal === 'number' && scoreData.scoreGlobal > 0
  const isOnboardingMidway = !isFirstTime && totalWorkers > 0 && !hasDiagnosticData

  const topRisk = data.topRisk?.label ?? inferTopRisk(data.complianceBreakdown)
  const topRiskImpact = data.topRisk?.impact ?? 6

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

  const deadlines: DeadlineItem[] = useMemo(() => {
    if (data.upcomingDeadlines?.length) return data.upcomingDeadlines as DeadlineItem[]
    return []
  }, [data])

  const riskWorkers: WorkerRiskItem[] = (data.riskWorkers ?? []) as WorkerRiskItem[]
  const heatmap = data.activityHeatmap ?? []
  const sectorRadar: RadarAxisDatum[] = (data.sectorRadar ?? []) as RadarAxisDatum[]

  // ── Render cockpit ──
  // Hero panel signature (Variant A del prototipo de diseño "sello notarial")
  // Se renderiza arriba del ScoreNarrative legacy para no romper backcompat; el
  // ScoreNarrative sigue sirviendo como breakdown detallado por área.
  return (
    <div className="space-y-8">
      <WelcomeTour />
      {isOnboardingMidway && (
        <section
          className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 p-6 sm:p-8 shadow-sm"
          aria-labelledby="onboarding-midway-title"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-xl bg-amber-100">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                Siguiente paso
              </p>
              <h2
                id="onboarding-midway-title"
                className="text-2xl font-bold text-[color:var(--text-primary)] mt-1"
              >
                Tienes {totalWorkers} {totalWorkers === 1 ? 'trabajador' : 'trabajadores'} pero aún sin diagnóstico.
              </h2>
              <p className="text-sm text-[color:var(--text-secondary)] mt-1.5 max-w-2xl">
                Corre el diagnóstico SUNAFIL (3 min · 20 preguntas express) para conocer tu compliance score real y prevenir multas.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link
              href="/dashboard/diagnostico"
              className="group inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm px-5 py-2.5 transition-colors"
            >
              Empezar diagnóstico express
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/dashboard/sunafil-ready"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 font-semibold text-sm px-5 py-2.5 transition-colors"
            >
              Ver checklist SUNAFIL
            </Link>
          </div>
        </section>
      )}
      {isFirstTime && (
        <>
          <section
            className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 p-6 sm:p-8 shadow-sm"
            aria-labelledby="welcome-cockpit-title"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-xl bg-emerald-100">
                <Sparkles className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                  Bienvenido a Comply360
                </p>
                <h2
                  id="welcome-cockpit-title"
                  className="text-2xl font-bold text-[color:var(--text-primary)] mt-1"
                >
                  Tu cuenta está lista. Vamos a un compliance 60+ en 5 minutos.
                </h2>
                <p className="text-sm text-[color:var(--text-secondary)] mt-1.5 max-w-2xl">
                  Empieza por estos tres pasos. Cada acción suma a tu score y reduce el riesgo de multa SUNAFIL.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <Link
                href="/dashboard/trabajadores/nuevo"
                className="group rounded-xl border border-emerald-300 bg-emerald-600 text-white p-4 hover:bg-emerald-700 transition-colors flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Paso 1</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-base font-semibold mt-2">Sube tu primer trabajador</p>
                <p className="text-xs opacity-90 mt-1">Wizard con auto-completado por DNI · 30 seg</p>
              </Link>
              <Link
                href="/dashboard/trabajadores?import=excel"
                className="group rounded-xl border border-emerald-300 bg-white p-4 hover:bg-emerald-50 transition-colors flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Paso 2</span>
                  <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-base font-semibold text-[color:var(--text-primary)] mt-2">Importa de Excel</p>
                <p className="text-xs text-[color:var(--text-secondary)] mt-1">Sube tu planilla completa en un clic</p>
              </Link>
              <Link
                href="/dashboard/diagnostico"
                className="group rounded-xl border border-emerald-200 bg-white p-4 hover:bg-emerald-50 transition-colors flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)]">Paso 3</span>
                  <ArrowRight className="w-4 h-4 text-[color:var(--text-tertiary)] group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-base font-semibold text-[color:var(--text-primary)] mt-2">Corre tu diagnóstico</p>
                <p className="text-xs text-[color:var(--text-secondary)] mt-1">3 minutos · 20 preguntas SUNAFIL</p>
              </Link>
            </div>
          </section>

          {/* Quick actions útiles incluso para usuario nuevo (calculadoras, asistente IA) */}
          <QuickActions actions={quickActions} />

          {/* Hint a futuro: cuando agregues tu primer trabajador, aquí aparecerán
              tu Compliance Score, alertas activas, vencimientos próximos y más. */}
          <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-8 text-center">
            <ShieldCheck className="w-8 h-8 mx-auto text-slate-400 mb-3" />
            <p className="text-sm font-semibold text-[color:var(--text-primary)] mb-1">
              Tu Compliance Score aparecerá aquí
            </p>
            <p className="text-xs text-[color:var(--text-tertiary)] max-w-md mx-auto">
              Cuando agregues tu primer trabajador, calcularemos tu score real (0-100) según el régimen laboral,
              documentos del legajo y vencimientos próximos. Sin score inventado.
            </p>
          </section>
        </>
      )}

      {/* ALERTA SUBDECLARACIÓN — visible siempre que haya brecha detectada */}
      {subdeclarationGap !== null && subdeclarationGap > 0 && (
        <section
          className="rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 via-white to-rose-50/40 p-6 shadow-sm"
          aria-labelledby="subdeclaration-alert-title"
        >
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-rose-100 shrink-0">
              <AlertTriangle className="w-6 h-6 text-rose-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700 mb-1">
                Detección de informalidad
              </p>
              <h2
                id="subdeclaration-alert-title"
                className="text-xl sm:text-2xl font-bold text-[color:var(--text-primary)]"
              >
                Declaraste {totalWorkersDeclared} trabajadores pero solo {totalWorkers} están registrados.
              </h2>
              <p className="text-sm text-rose-900 mt-2 max-w-2xl">
                Tienes <strong>{subdeclarationGap} {subdeclarationGap === 1 ? 'trabajador' : 'trabajadores'} fuera de planilla</strong>.
                SUNAFIL multa la subdeclaración con hasta <strong>S/ {(5500 * 9.55 * subdeclarationGap).toLocaleString('es-PE')}</strong>{' '}
                (Art. 24.5 D.S. 019-2006-TR, infracción muy grave).
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Link
                  href="/dashboard/trabajadores/nuevo"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm px-5 py-2.5 transition-colors"
                >
                  Registrar trabajadores faltantes
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboard/configuracion/empresa"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-semibold text-sm px-5 py-2.5 transition-colors"
                >
                  Corregir total declarado
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* HeroPanel + ScoreNarrative + bento solo si NO es primera vez */}
      {!isFirstTime && (<>
      <HeroPanel
        score={typeof score === 'number' ? Math.round(score) : null}
        userFirstName={data.stats.ownerFirstName ?? undefined}
        orgName={data.stats.orgName ?? undefined}
        multaEvitadaSoles={data.complianceTasks?.multaEvitada ?? multaPotencial ?? 0}
        alertasCriticas={criticalAlerts}
        trabajadoresProtegidos={workersProtected}
        diasSinMulta={daysSinceOrgCreated}
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
          title={buildClosedTitle(data.recentContracts ?? [])}
          description="Revisa el detalle de alertas resueltas y contratos renovados."
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

      {/* Decisiones Laborales — Fase 2: sección destacada con wizards
          orquestadores. Reemplaza el viejo Hub IA Laboral feature-oriented
          por flujos task-oriented. Solo "Contratar" activo en Fase 2. */}
      <DecisionesLaborales />

      {/* ─── BENTO GRID — Apple-style asimétrico ──────────────────────────
       * Layout 12-col en desktop:
       *   row 1: [Compliance tasks ........ col-span-8] [UpcomingDeadlines col-span-4]
       *   row 2: [ActivityHeatmap col-span-7] [RiskLeaders col-span-5]
       *   row 3: [Radar/Placeholder col-span-12]
       * En mobile: stack vertical full width.
       *
       * Sprint 5 (T6.1): hover scale + soft shadows ya provenientes de
       * <Card> y <MomentCard> via tokens (--elevation-1, --elevation-hover).
       */}
      {/*
       * BENTO GRID — orden distinto en mobile vs desktop:
       *   Desktop (lg+): tasks + deadlines + calendar + heatmap + risk + radar
       *   Mobile: deadlines arriba (más útil en celular) → tasks → calendario →
       *   resto. Usamos `order-*` Tailwind utilities sin duplicar markup.
       */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="order-2 lg:order-none lg:col-span-8">
          <ComplianceTasksPanel
            open={data.complianceTasks?.open ?? 0}
            completed={data.complianceTasks?.completed ?? 0}
            overdue={data.complianceTasks?.overdue ?? 0}
            multaEvitable={data.complianceTasks?.multaEvitable ?? 0}
            multaEvitada={data.complianceTasks?.multaEvitada ?? 0}
            top={data.complianceTasks?.top ?? []}
          />
        </div>
        <div className="order-1 lg:order-none lg:col-span-4">
          <UpcomingDeadlines items={deadlines} />
        </div>

        {/* Calendar Widget */}
        <div className="order-3 lg:order-none lg:col-span-12">
          <CalendarWidget />
        </div>

        <div className="order-5 lg:order-none lg:col-span-7">
          <ActivityHeatmap data={heatmap} />
        </div>
        <div className="order-4 lg:order-none lg:col-span-5">
          <RiskLeaderboard workers={riskWorkers} />
        </div>

        <div className="order-6 lg:order-none lg:col-span-12">
          {sectorRadar.length > 0 ? (
            <SectorRadar data={sectorRadar} sectorLabel="Promedio sector" />
          ) : (
            <PlaceholderRadar totalWorkers={totalWorkers} />
          )}
        </div>
      </section>
      </>)}
    </div>
  )
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function inferTopRisk(breakdown?: Array<{ label: string; score: number }>): string {
  if (!breakdown?.length) return 'Sin análisis'
  const worst = [...breakdown].sort((a, b) => a.score - b.score)[0]
  return worst?.label ?? 'Sin análisis'
}

function buildClosedTitle(recentContracts: Array<{ status: string }>): string {
  const closed = recentContracts.filter((c) => c.status === 'SIGNED').length
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
            ? 'Registra trabajadores y corre un diagnóstico para empezar a comparar con tu sector.'
            : 'El benchmark se actualizará tras el próximo diagnóstico mensual.'}
        </p>
      </div>
    </div>
  )
}
