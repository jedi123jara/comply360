'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  ClipboardList,
  Sparkles,
  Users,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner-toaster'
import { useCopilot } from '@/providers/copilot-provider'
import { WelcomeTour } from '@/components/dashboard/welcome-tour'
import { HeroPanel } from '@/components/comply360/hero-panel'
import { KpiCard, KpiGrid } from '@/components/comply360/kpi-card'
import { formatFechaLima, formatSolesRedondeado } from '@/components/cockpit/cockpit-format'
import type {
  CockpitFullPayload,
  ComplianceTaskTeaser,
  ScoreSnapshot,
  UpcomingDeadlineItem,
} from '@/lib/cockpit/data'

export interface CockpitClientProps {
  initialData: CockpitFullPayload
  initialScore: ScoreSnapshot
}

const PLAN_ACCION_HREF = '/dashboard/plan-accion'
const DIAGNOSTICO_HREF = '/dashboard/diagnostico'
const TRIAL_TOAST_KEY = 'comply360.welcomeTrialToastShown'

export default function CockpitPage({ initialData, initialScore }: CockpitClientProps) {
  const copilot = useCopilot()
  const searchParams = useSearchParams()
  const data = initialData
  const scoreData = initialScore

  // ── Bienvenida de a un estímulo por vez ─────────────────────────────────
  // Al llegar con ?welcome=trial primero sale el aviso de la prueba gratis y,
  // recién cuando se cierra (solo o a mano), se permite el tour. Si el aviso
  // ya se vio en esta sesión, el tour puede salir directo. Nunca los dos juntos.
  const wantsTrialWelcome = searchParams?.get('welcome') === 'trial'
  const [tourAllowed, setTourAllowed] = useState(false)
  const welcomeStartedRef = useRef(false)

  useEffect(() => {
    if (!wantsTrialWelcome || welcomeStartedRef.current) return
    welcomeStartedRef.current = true

    let alreadyShown = false
    try {
      alreadyShown = sessionStorage.getItem(TRIAL_TOAST_KEY) === '1'
    } catch {
      /* almacenamiento bloqueado: seguimos sin recordar */
    }
    if (alreadyShown) {
      window.setTimeout(() => setTourAllowed(true), 0)
      return
    }

    try {
      sessionStorage.setItem(TRIAL_TOAST_KEY, '1')
    } catch {
      /* almacenamiento bloqueado */
    }
    const allowTour = () => setTourAllowed(true)
    toast.success('Tu prueba gratis del plan PRO está activa por 14 días', {
      description: 'Agrega a tu primer trabajador y haz el diagnóstico para conocer tus riesgos.',
      onAutoClose: allowTour,
      onDismiss: allowTour,
    })
  }, [wantsTrialWelcome])

  const tour = tourAllowed ? <WelcomeTour /> : null

  const score = useMemo(() => {
    const value = scoreData.scoreGlobal ?? data.stats.complianceScore ?? null
    return typeof value === 'number' ? value : null
  }, [data.stats.complianceScore, scoreData.scoreGlobal])

  const totalWorkers = data.stats.totalWorkers ?? 0
  const criticalAlerts = data.stats.criticalAlerts ?? 0
  const workersProtected = data.stats.workersProtected ?? totalWorkers
  const subdeclarationGap = data.stats.subdeclarationGap ?? null
  const tasks = data.complianceTasks
  const openTasks = tasks?.open ?? 0
  const avoidedFine = tasks?.multaEvitada ?? 0
  const avoidedFineSince = formatFechaLima(tasks?.multaEvitadaDesde)
  const risk = data.riskSummary
  const latestDiagnostic = risk?.latestDiagnostic ?? null
  const hasDiagnostic = latestDiagnostic !== null
  const focusAction = risk?.focusAction ?? null
  // Sin diagnóstico la cabecera pide hacerlo y no muestra la acción del día.
  const heroFocusTaskId = hasDiagnostic && focusAction?.kind === 'task' ? focusAction.id : null

  // Sin trabajadores el cálculo en vivo devuelve 0 por falta de datos: en ese
  // caso mostramos el puntaje del último diagnóstico (sus respuestas reales).
  const useLiveScore = totalWorkers > 0 && score !== null
  const heroScore = useLiveScore ? score : (latestDiagnostic?.scoreGlobal ?? null)

  const isFirstTime =
    totalWorkers === 0 &&
    !hasDiagnostic &&
    openTasks === 0 &&
    criticalAlerts === 0 &&
    (data.stats.expiringCount ?? 0) === 0

  if (isFirstTime) {
    return (
      <div className="space-y-5">
        {tour}
        <FirstSteps onAskAssistant={() => copilot.open()} />
      </div>
    )
  }

  // La acción del día ya está arriba: la lista muestra las que siguen.
  const nextTasks = (tasks?.top ?? []).filter((task) => task.id !== heroFocusTaskId).slice(0, 3)

  return (
    <div className="space-y-5">
      {tour}

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
        userFirstName={data.stats.ownerFirstName ?? undefined}
        orgName={data.stats.orgName ?? undefined}
        hasDiagnostic={hasDiagnostic}
        score={heroScore}
        scoreSource={useLiveScore ? 'datos' : 'diagnostico'}
        diagnosticDate={latestDiagnostic?.completedAt ?? null}
        multaPendiente={risk?.multaPendiente ?? 0}
        multaAlertas={risk?.multaAlertasAbiertas ?? 0}
        focusAction={focusAction}
        totalWorkers={totalWorkers}
      />

      <KpiGrid>
        <KpiCard
          icon={Banknote}
          label="Multa evitada este mes"
          value={avoidedFine}
          formatValue={(value) => formatSolesRedondeado(value)}
          footer={
            avoidedFine > 0
              ? `Tareas resueltas desde el ${avoidedFineSince ?? '1 de este mes'}`
              : 'Sube cada vez que resuelves una tarea del plan'
          }
        />
        <KpiCard
          icon={Users}
          label="Trabajadores protegidos"
          value={workersProtected}
          footer={totalWorkers > 0 ? `De ${totalWorkers} trabajadores activos` : 'Aún no registras trabajadores'}
        />
        <KpiCard
          icon={BellRing}
          label="Alertas críticas"
          value={criticalAlerts}
          variant={criticalAlerts > 0 ? 'crimson' : 'default'}
          footer={
            criticalAlerts > 0
              ? 'Requieren atención'
              : totalWorkers > 0
                ? 'Sin alertas graves abiertas'
                : 'Se activan al registrar trabajadores'
          }
        />
      </KpiGrid>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        <PrioritiesCard
          tasks={nextTasks}
          open={openTasks}
          hasDiagnostic={hasDiagnostic}
          criticalAlerts={criticalAlerts}
          focusIsTask={heroFocusTaskId !== null}
        />
        <NextDeadlineCard deadline={data.upcomingDeadlines?.[0] ?? null} totalWorkers={totalWorkers} />
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

const GRAVEDAD_CHIP: Record<ComplianceTaskTeaser['gravedad'], { label: string; tone: string }> = {
  MUY_GRAVE: { label: 'Crítica', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
  GRAVE: { label: 'Importante', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  LEVE: { label: 'Por hacer', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
}

/** Respaldo por si el área llega sin nombre legible: "contratos_registro" → "Contratos registro". */
function fallbackAreaLabel(area: string): string {
  const text = area.replace(/[_-]+/g, ' ').trim().toLowerCase()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'General'
}

function PrioritiesCard({
  tasks,
  open,
  hasDiagnostic,
  criticalAlerts,
  focusIsTask,
}: {
  tasks: ComplianceTaskTeaser[]
  open: number
  hasDiagnostic: boolean
  criticalAlerts: number
  focusIsTask: boolean
}) {
  return (
    <article className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5 shadow-[var(--elevation-2)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Próximas acciones</h2>
          <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">Lo que sigue en tu plan, ordenado por impacto y urgencia.</p>
        </div>
        {open > 0 ? <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{open} abierta{open === 1 ? '' : 's'}</span> : null}
      </div>

      {tasks.length > 0 ? (
        <ul className="mt-5 divide-y divide-[color:var(--border-subtle)] overflow-hidden rounded-xl border border-[color:var(--border-default)]">
          {tasks.map((task) => {
            const chip = GRAVEDAD_CHIP[task.gravedad] ?? GRAVEDAD_CHIP.LEVE
            const fecha = formatFechaLima(task.dueDate)
            const multa = task.multaEvitable ?? 0
            return (
              <li key={task.id}>
                <Link href={task.href || PLAN_ACCION_HREF} className="flex items-center gap-3 bg-white px-4 py-3.5 transition hover:bg-blue-50/70">
                  <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${chip.tone}`}>{chip.label}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">{task.title}</p>
                    <p className="mt-0.5 truncate text-xs text-[color:var(--text-tertiary)]">
                      {task.areaLabel || fallbackAreaLabel(task.area)}
                      {multa > 0 ? ` · Evitas hasta ${formatSolesRedondeado(multa)}` : ''}
                    </p>
                  </div>
                  <span className={`hidden shrink-0 text-xs sm:block ${task.overdue ? 'font-semibold text-rose-700' : 'text-[color:var(--text-tertiary)]'}`}>
                    {fecha ? (task.overdue ? `Venció el ${fecha}` : `Vence el ${fecha}`) : 'Sin fecha'}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <PrioritiesEmpty open={open} hasDiagnostic={hasDiagnostic} criticalAlerts={criticalAlerts} focusIsTask={focusIsTask} />
      )}

      <Link href={PLAN_ACCION_HREF} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline">
        Ver todo el plan de acción <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  )
}

/**
 * Estado vacío honesto: solo es "todo al día" (verde) si hay diagnóstico y no
 * queda nada abierto. Sin diagnóstico no hay plan que evaluar, así que es neutro.
 */
function PrioritiesEmpty({
  open,
  hasDiagnostic,
  criticalAlerts,
  focusIsTask,
}: {
  open: number
  hasDiagnostic: boolean
  criticalAlerts: number
  focusIsTask: boolean
}) {
  if (open > 0 && focusIsTask) {
    return (
      <div className="mt-5 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-inset)] p-4 text-sm text-[color:var(--text-secondary)]">
        Por ahora, la tarea de hoy es la única pendiente en tu plan.
      </div>
    )
  }

  if (!hasDiagnostic) {
    return (
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-inset)] p-4">
        <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--text-tertiary)]" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Aún no tienes un plan de acción.</p>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Se arma con el diagnóstico: te decimos qué corregir y en qué orden.
          </p>
          <Link href={DIAGNOSTICO_HREF} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline">
            Hacer el diagnóstico express <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  if (criticalAlerts > 0) {
    return (
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-amber-900">No tienes tareas pendientes del diagnóstico.</p>
          <p className="mt-1 text-sm text-amber-800">
            Pero hay {criticalAlerts} alerta{criticalAlerts === 1 ? '' : 's'} crítica{criticalAlerts === 1 ? '' : 's'} de tus trabajadores por revisar.
          </p>
          <Link href="/dashboard/alertas" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-900 hover:underline">
            Ver alertas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
      <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="text-sm font-semibold">Todo al día: no tienes acciones pendientes.</p>
    </div>
  )
}

function NextDeadlineCard({ deadline, totalWorkers }: { deadline: UpcomingDeadlineItem | null; totalWorkers: number }) {
  return (
    <article className="flex min-h-[260px] flex-col rounded-2xl border border-[color:var(--border-default)] bg-white p-5 shadow-[var(--elevation-2)] sm:p-6">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Próximo vencimiento</h2>
        <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">La fecha que debes tener en el radar.</p>
      </div>
      {deadline ? (
        <Link
          href={deadline.href || '/dashboard/calendario'}
          className="mt-5 block rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-inset)] p-4 transition hover:border-blue-300"
        >
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{deadline.label}</p>
              <p className={`mt-1 text-xs ${deadline.dueIn < 0 ? 'font-semibold text-rose-700' : 'text-[color:var(--text-tertiary)]'}`}>
                {deadline.dueIn < 0
                  ? `Venció hace ${Math.abs(deadline.dueIn)} día${Math.abs(deadline.dueIn) === 1 ? '' : 's'}`
                  : deadline.dueIn === 0
                    ? 'Vence hoy'
                    : `Vence en ${deadline.dueIn} día${deadline.dueIn === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
        </Link>
      ) : totalWorkers > 0 ? (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-semibold">Sin vencimientos próximos.</p>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-inset)] p-4 text-sm text-[color:var(--text-secondary)]">
          Aún no hay fechas que vigilar. Se calculan con tus trabajadores y contratos.
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
    { label: 'Haz el diagnóstico express', hint: 'Toma unos minutos. Sabrás qué te pueden multar y qué corregir primero.', href: DIAGNOSTICO_HREF },
    { label: 'Agrega a tu primer trabajador', hint: 'Completa su legajo en menos de un minuto.', href: '/dashboard/trabajadores/nuevo' },
    { label: 'Importa tu planilla', hint: 'Carga a todos tus trabajadores desde Excel.', href: '/dashboard/trabajadores?import=excel' },
  ]
  return (
    <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-[var(--elevation-3)]">
      <div className="bg-[linear-gradient(120deg,#eff6ff_0%,#ffffff_62%)] p-7 sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700">
          <Sparkles className="h-4 w-4" /> Te damos la bienvenida a Comply360
        </span>
        <h1 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-4xl">Aún no conocemos tus riesgos laborales.</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[color:var(--text-secondary)]">
          Empieza por el diagnóstico y luego registra a tus trabajadores. Con eso verás tu nivel de cumplimiento, tus alertas y tu calendario.
        </p>
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
