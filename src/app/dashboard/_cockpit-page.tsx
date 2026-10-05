'use client'

import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BellRing,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner-toaster'
import { useCopilot } from '@/providers/copilot-provider'
import { WelcomeTour } from '@/components/dashboard/welcome-tour'
import { HeroPanel } from '@/components/comply360/hero-panel'
import { KpiCard, KpiGrid } from '@/components/comply360/kpi-card'
import type {
  CockpitFullPayload,
  ComplianceTaskTeaser,
  ScoreSnapshot,
  UpcomingDeadlineItem,
} from '@/lib/cockpit/data'
import { formatSoles } from '@/lib/format/peruvian'

export interface CockpitClientProps {
  initialData: CockpitFullPayload
  initialScore: ScoreSnapshot
}

export default function CockpitPage({ initialData, initialScore }: CockpitClientProps) {
  const copilot = useCopilot()
  const searchParams = useSearchParams()
  const data = initialData
  const scoreData = initialScore

  useEffect(() => {
    if (typeof window === 'undefined' || searchParams?.get('welcome') !== 'trial') return
    const key = 'comply360.welcomeTrialToastShown'
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    toast.success('Trial PRO activado por 14 días', {
      description: 'Explora la plataforma, agrega tu primer trabajador y ejecuta un diagnóstico.',
    })
  }, [searchParams])

  const score = useMemo(() => {
    const value = scoreData.scoreGlobal ?? data.stats.complianceScore ?? null
    return typeof value === 'number' ? value : null
  }, [data.stats.complianceScore, scoreData.scoreGlobal])

  const totalWorkers = data.stats.totalWorkers ?? 0
  const criticalAlerts = data.stats.criticalAlerts ?? 0
  const workersProtected = data.stats.workersProtected ?? totalWorkers
  const daysWithoutFine = data.stats.daysSinceOrgCreated ?? 0
  const avoidedFine = data.complianceTasks?.multaEvitada ?? 0
  const subdeclarationGap = data.stats.subdeclarationGap ?? null
  const isFirstTime = totalWorkers === 0 && criticalAlerts === 0 && (data.stats.expiringCount ?? 0) === 0

  if (isFirstTime) {
    return (
      <div className="space-y-5">
        <WelcomeTour />
        <FirstSteps onAskAssistant={() => copilot.open()} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <WelcomeTour />

      {subdeclarationGap !== null && subdeclarationGap > 0 ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-[var(--elevation-1)]" aria-labelledby="subdeclaration-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Atención inmediata</p>
              <h2 id="subdeclaration-title" className="mt-1 text-base font-bold text-rose-950">
                Hay {subdeclarationGap} trabajador{subdeclarationGap === 1 ? '' : 'es'} fuera de la planilla registrada.
              </h2>
              <p className="mt-1 text-sm text-rose-800">Regulariza el registro para reducir exposición ante SUNAFIL.</p>
            </div>
            <Link href="/dashboard/trabajadores/nuevo" className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">
              Regularizar ahora <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      ) : null}

      <HeroPanel
        score={score}
        userFirstName={data.stats.ownerFirstName ?? undefined}
        orgName={data.stats.orgName ?? undefined}
        multaEvitadaSoles={avoidedFine}
        alertasCriticas={criticalAlerts}
        trabajadoresProtegidos={workersProtected}
        diasSinMulta={daysWithoutFine}
        onReviewAlerts={() => window.location.assign('/dashboard/plan-accion')}
        onOpenDiagnostic={() => window.location.assign('/dashboard/diagnostico')}
        onAskAssistant={() => copilot.open()}
      />

      <KpiGrid>
        <KpiCard icon={Banknote} label="Multa evitada" value={avoidedFine} formatValue={(value) => formatSoles(Math.round(value))} footer="Acumulado este mes" />
        <KpiCard icon={Users} label="Trabajadores protegidos" value={workersProtected} footer="Activos cubiertos" />
        <KpiCard icon={Clock3} label="Días sin multa" value={daysWithoutFine} footer="Racha activa" />
        <KpiCard icon={BellRing} label="Alertas críticas" value={criticalAlerts} variant={criticalAlerts > 0 ? 'crimson' : 'default'} footer={criticalAlerts > 0 ? 'Requieren atención' : 'Todo bajo control'} />
      </KpiGrid>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        <PrioritiesCard tasks={data.complianceTasks?.top ?? []} open={data.complianceTasks?.open ?? 0} />
        <NextDeadlineCard deadline={data.upcomingDeadlines?.[0] ?? null} />
      </section>

      <button
        type="button"
        onClick={() => copilot.open()}
        className="fixed bottom-6 right-6 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_12px_30px_rgba(21,94,239,0.3)] transition hover:-translate-y-0.5 hover:bg-blue-700"
        aria-label="Preguntar al asistente"
        title="Preguntar al asistente"
      >
        <Bot className="h-5 w-5" />
      </button>
    </div>
  )
}

function PrioritiesCard({ tasks, open }: { tasks: ComplianceTaskTeaser[]; open: number }) {
  return (
    <article className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5 shadow-[var(--elevation-2)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Prioridades de hoy</h2>
          <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">Las acciones con mayor impacto y urgencia.</p>
        </div>
        {open > 0 ? <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{open} abiertas</span> : null}
      </div>

      {tasks.length > 0 ? (
        <ul className="mt-5 divide-y divide-[color:var(--border-subtle)] overflow-hidden rounded-xl border border-[color:var(--border-default)]">
          {tasks.slice(0, 3).map((task) => {
            const critical = task.gravedad === 'MUY_GRAVE'
            const high = task.gravedad === 'GRAVE'
            return (
              <li key={task.id}>
                <Link href="/dashboard/plan-accion" className="flex items-center gap-3 bg-white px-4 py-3.5 transition hover:bg-blue-50/70">
                  <span className={critical
                    ? 'rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700'
                    : high
                      ? 'rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700'
                      : 'rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700'}>
                    {critical ? 'Crítica' : high ? 'Importante' : 'Por hacer'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">{task.title}</p>
                    <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">{task.area.replace(/_/g, ' ')}</p>
                  </div>
                  <span className="hidden text-xs text-[color:var(--text-tertiary)] sm:block">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-PE') : 'Sin fecha'}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-blue-600" />
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle2 className="h-5 w-5" />
          <p className="text-sm font-semibold">No hay acciones prioritarias pendientes.</p>
        </div>
      )}

      <Link href="/dashboard/plan-accion" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline">
        Ver todas <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  )
}

function NextDeadlineCard({ deadline }: { deadline: UpcomingDeadlineItem | null }) {
  return (
    <article className="flex min-h-[260px] flex-col rounded-2xl border border-[color:var(--border-default)] bg-white p-5 shadow-[var(--elevation-2)] sm:p-6">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Próximo vencimiento</h2>
        <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">La fecha que debes tener en el radar.</p>
      </div>
      {deadline ? (
        <div className="mt-5 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-inset)] p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{deadline.label}</p>
              <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                {deadline.dueIn <= 0 ? 'Vence hoy' : `Vence en ${deadline.dueIn} día${deadline.dueIn === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle2 className="h-5 w-5" />
          <p className="text-sm font-semibold">Sin vencimientos próximos.</p>
        </div>
      )}
      <Link href="/dashboard/calendario" className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
        Ver calendario <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  )
}

function FirstSteps({ onAskAssistant }: { onAskAssistant: () => void }) {
  const steps = [
    { label: 'Agrega tu primer trabajador', hint: 'Completa el legajo en menos de un minuto.', href: '/dashboard/trabajadores/nuevo' },
    { label: 'Importa tu planilla', hint: 'Carga todos los registros desde Excel.', href: '/dashboard/trabajadores?import=excel' },
    { label: 'Ejecuta el diagnóstico', hint: 'Obtén tu primer puntaje real.', href: '/dashboard/diagnostico' },
  ]
  return (
    <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-[var(--elevation-3)]">
      <div className="bg-[linear-gradient(120deg,#eff6ff_0%,#ffffff_62%)] p-7 sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700">
          <Sparkles className="h-4 w-4" /> Bienvenido a Comply360
        </span>
        <h1 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-4xl">Tu espacio de cumplimiento está listo.</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[color:var(--text-secondary)]">Completa estos tres pasos para activar el score, las alertas y el calendario de tu empresa.</p>
      </div>
      <div className="grid gap-3 border-t border-[color:var(--border-subtle)] p-5 sm:grid-cols-3 sm:p-7">
        {steps.map((step, index) => (
          <Link key={step.href} href={step.href} className="group rounded-xl border border-[color:var(--border-default)] bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[var(--elevation-hover)]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">{index + 1}</span>
            <h2 className="mt-4 text-sm font-bold text-[color:var(--text-primary)]">{step.label}</h2>
            <p className="mt-1 text-xs leading-5 text-[color:var(--text-tertiary)]">{step.hint}</p>
          </Link>
        ))}
      </div>
      <div className="flex justify-end px-7 pb-7">
        <button type="button" onClick={onAskAssistant} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
          <Bot className="h-4 w-4" /> Preguntar al asistente
        </button>
      </div>
    </section>
  )
}
