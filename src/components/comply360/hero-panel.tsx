'use client'

import { useId, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, CircleHelp, Scale, ShieldCheck, Target, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Term } from '@/components/ui/term'
import {
  NIVEL_LABEL,
  formatFechaLima,
  formatSolesRedondeado,
  nivelCumplimiento,
  type NivelCumplimiento,
} from '@/components/cockpit/cockpit-format'
import type { CockpitFocusAction } from '@/lib/cockpit/data'

export interface HeroPanelProps {
  userFirstName?: string
  orgName?: string
  /** true si la empresa ya completó al menos un diagnóstico (o simulacro). */
  hasDiagnostic: boolean
  /** Puntaje 0-100, o null si no hay datos para calcularlo. */
  score: number | null
  /** De dónde sale el puntaje: datos de los trabajadores o respuestas del diagnóstico. */
  scoreSource: 'datos' | 'diagnostico'
  /** Fecha (ISO) del último diagnóstico, para explicar el puntaje. */
  diagnosticDate?: string | null
  /** Tareas abiertas del diagnóstico + alertas abiertas, en soles. */
  multaPendiente: number
  /** Multa de las alertas abiertas; se muestra como avance cuando aún no hay diagnóstico. */
  multaAlertas: number
  /** La única acción recomendada para hoy. */
  focusAction: CockpitFocusAction | null
  totalWorkers: number
}

/**
 * Cabecera del panel principal. Responde tres preguntas, en este orden:
 * ¿Cómo estoy?, ¿Cuánto me pueden multar? y ¿Qué hago hoy?
 *
 * Si la empresa aún no hizo el diagnóstico no mostramos cifras: decimos que
 * todavía no conocemos sus riesgos y la llevamos al diagnóstico express.
 */
export function HeroPanel({
  userFirstName,
  orgName,
  hasDiagnostic,
  score,
  scoreSource,
  diagnosticDate,
  multaPendiente,
  multaAlertas,
  focusAction,
  totalWorkers,
}: HeroPanelProps) {
  const name = userFirstName?.trim()
  const org = orgName?.trim() || 'tu empresa'
  const normalizedScore = score == null || !Number.isFinite(score) ? null : Math.max(0, Math.min(100, Math.round(score)))
  const nivel = hasDiagnostic && normalizedScore != null ? nivelCumplimiento(normalizedScore) : null

  const resumen = !hasDiagnostic
    ? `Empecemos por conocer los riesgos laborales de ${org}${org.endsWith('.') ? '' : '.'}`
    : nivel === 'bien'
      ? `${org} está en buen nivel. Mantén al día lo que viene.`
      : nivel === 'en-riesgo'
        ? `${org} tiene obligaciones pendientes. Empieza por la tarea de hoy.`
        : nivel === 'critico'
          ? `${org} tiene riesgos importantes. Resuelve hoy la tarea más urgente.`
          : `Esto es lo más importante de ${org} para hoy.`

  return (
    <section
      aria-labelledby="panel-resumen-titulo"
      className="overflow-hidden rounded-2xl border border-[color:var(--border-default)] bg-white shadow-[var(--elevation-2)]"
    >
      <header className="border-b border-[color:var(--border-subtle)] px-5 py-5 sm:px-7">
        <h1 id="panel-resumen-titulo" className="text-2xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-3xl">
          {name ? `Hola, ${name}` : 'Hola'}
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">{resumen}</p>
      </header>

      <div className="grid divide-y divide-[color:var(--border-subtle)] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <Bloque pregunta="¿Cómo estoy?" icon={ShieldCheck}>
          <EstadoBloque
            hasDiagnostic={hasDiagnostic}
            score={normalizedScore}
            nivel={nivel}
            scoreSource={scoreSource}
            diagnosticDate={diagnosticDate ?? null}
          />
        </Bloque>
        <Bloque pregunta="¿Cuánto me pueden multar?" icon={Scale}>
          <MultaBloque hasDiagnostic={hasDiagnostic} multaPendiente={multaPendiente} multaAlertas={multaAlertas} />
        </Bloque>
        <Bloque pregunta="¿Qué hago hoy?" icon={Target} destacado>
          <AccionBloque hasDiagnostic={hasDiagnostic} focusAction={focusAction} totalWorkers={totalWorkers} />
        </Bloque>
      </div>
    </section>
  )
}

function Bloque({
  pregunta,
  icon: Icon,
  destacado = false,
  children,
}: {
  pregunta: string
  icon: LucideIcon
  destacado?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col p-5 sm:p-6', destacado && 'bg-blue-50/60')}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-secondary)]">
        <Icon className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
        {pregunta}
      </h2>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </div>
  )
}

type ChipTone = NivelCumplimiento | 'neutral'

const CHIP_TONE: Record<ChipTone, string> = {
  bien: 'border-green-200 bg-green-50 text-green-700',
  'en-riesgo': 'border-amber-200 bg-amber-50 text-amber-800',
  critico: 'border-rose-200 bg-rose-50 text-rose-700',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
}

const BAR_TONE: Record<NivelCumplimiento, string> = {
  bien: 'bg-green-600',
  'en-riesgo': 'bg-amber-500',
  critico: 'bg-rose-600',
}

function NivelChip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return (
    <span className={cn('inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold', CHIP_TONE[tone])}>
      {children}
    </span>
  )
}

function EstadoBloque({
  hasDiagnostic,
  score,
  nivel,
  scoreSource,
  diagnosticDate,
}: {
  hasDiagnostic: boolean
  score: number | null
  nivel: NivelCumplimiento | null
  scoreSource: 'datos' | 'diagnostico'
  diagnosticDate: string | null
}) {
  const [helpOpen, setHelpOpen] = useState(false)
  const helpId = useId()

  if (!hasDiagnostic) {
    return (
      <>
        <NivelChip tone="neutral">Sin medir</NivelChip>
        <p className="mt-3 text-xl font-bold leading-snug text-[color:var(--text-primary)]">Aún no conocemos tus riesgos</p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
          Con el diagnóstico express revisamos tus obligaciones laborales y te decimos cuáles cumples y cuáles no.
        </p>
      </>
    )
  }

  if (score == null || nivel == null) {
    return (
      <>
        <NivelChip tone="neutral">Sin calcular</NivelChip>
        <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">
          No pudimos calcular tu nivel en este momento. Vuelve a cargar la página en unos minutos.
        </p>
      </>
    )
  }

  const fecha = formatFechaLima(diagnosticDate)
  const help: ReactNode =
    scoreSource === 'datos' ? (
      <>
        Revisamos los datos de tus trabajadores: contratos, <Term id="legajo">legajos</Term>, vencimientos,
        documentos obligatorios, <Term id="sst">seguridad y salud</Term>, vacaciones y capacitaciones. Cada tema
        pesa distinto.
      </>
    ) : (
      `Sale de tus respuestas en el diagnóstico${fecha ? ` del ${fecha}` : ''}. Cuando registres a tus trabajadores lo calcularemos con sus datos reales.`
    )

  return (
    <>
      <NivelChip tone={nivel}>{NIVEL_LABEL[nivel]}</NivelChip>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-4xl font-bold tracking-tight text-[color:var(--text-primary)]">{score}</span>
        <span className="text-sm font-semibold text-[color:var(--text-tertiary)]">de 100</span>
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[color:var(--bg-inset)]" aria-hidden="true">
        <div className={cn('h-full rounded-full', BAR_TONE[nivel])} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">
        Cumples {score} de cada 100 obligaciones revisadas.
      </p>
      <button
        type="button"
        onClick={() => setHelpOpen((open) => !open)}
        aria-expanded={helpOpen}
        aria-controls={helpId}
        className="mt-2 inline-flex w-fit items-center gap-1.5 rounded text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
        ¿Qué mide esto?
      </button>
      <p
        id={helpId}
        hidden={!helpOpen}
        className="mt-2 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-inset)] p-3 text-xs leading-5 text-[color:var(--text-secondary)]"
      >
        {help} Desde 80 es un buen nivel; por debajo de 60 es crítico.
      </p>
    </>
  )
}

function MultaBloque({
  hasDiagnostic,
  multaPendiente,
  multaAlertas,
}: {
  hasDiagnostic: boolean
  multaPendiente: number
  multaAlertas: number
}) {
  if (!hasDiagnostic) {
    return (
      <>
        <p className="text-2xl font-bold tracking-tight text-[color:var(--text-tertiary)]">Por calcular</p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
          Lo calculamos con tu diagnóstico y la tabla de <Term id="multa-sunafil">multas SUNAFIL</Term> 2026.
        </p>
        {multaAlertas > 0 ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            Mientras tanto, las alertas abiertas de tus trabajadores ya suman{' '}
            <strong className="font-semibold">{formatSolesRedondeado(multaAlertas)}</strong>.
          </p>
        ) : null}
      </>
    )
  }

  const hayMulta = multaPendiente > 0
  return (
    <>
      <p className={cn('text-4xl font-bold tracking-tight', hayMulta ? 'text-rose-700' : 'text-green-700')}>
        {formatSolesRedondeado(multaPendiente)}
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
        {hayMulta ? (
          <>
            Según tu diagnóstico, las alertas de tus trabajadores y la tabla de{' '}
            <Term id="multa-sunafil">multas SUNAFIL</Term> 2026.
          </>
        ) : (
          <>
            No tienes <Term id="multa-sunafil">multas</Term> pendientes según tu diagnóstico y las alertas de tus
            trabajadores.
          </>
        )}
      </p>
      {hayMulta ? (
        <>
          <p className="mt-1 text-xs leading-5 text-[color:var(--text-tertiary)]">
            Es un estimado (las multas se calculan en <Term id="uit">UIT</Term>). Baja cada vez que{' '}
            <Term id="subsanacion">corriges</Term> un pendiente.
          </p>
          <Link
            href="/dashboard/plan-accion"
            className="mt-3 inline-flex w-fit items-center gap-1.5 rounded text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Ver de dónde sale <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </>
      ) : null}
    </>
  )
}

function AccionBloque({
  hasDiagnostic,
  focusAction,
  totalWorkers,
}: {
  hasDiagnostic: boolean
  focusAction: CockpitFocusAction | null
  totalWorkers: number
}) {
  const titleId = useId()

  if (!hasDiagnostic) {
    return (
      <>
        <p id={titleId} className="text-lg font-bold leading-snug text-[color:var(--text-primary)]">Haz tu diagnóstico express</p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
          Son preguntas de sí o no sobre tu empresa. Al terminar verás tu nivel, cuánto te pueden multar y qué corregir primero.
        </p>
        <AccionPrincipal href="/dashboard/diagnostico" describedBy={titleId}>
          Hacer el diagnóstico express
        </AccionPrincipal>
      </>
    )
  }

  if (focusAction) {
    const fecha = formatFechaLima(focusAction.dueDate)
    const multa = focusAction.multaEvitable ?? 0
    return (
      <>
        <p className="text-xs font-semibold text-blue-700">{focusAction.areaLabel}</p>
        <p id={titleId} className="mt-1 line-clamp-3 text-lg font-bold leading-snug text-[color:var(--text-primary)]">
          {focusAction.title}
        </p>
        <ul className="mt-2 space-y-1 text-sm leading-6 text-[color:var(--text-secondary)]">
          {focusAction.workerName ? <li>Trabajador: {focusAction.workerName}</li> : null}
          {fecha ? (
            <li className={focusAction.overdue ? 'font-semibold text-rose-700' : undefined}>
              {focusAction.overdue ? `Venció el ${fecha}` : `Vence el ${fecha}`}
            </li>
          ) : null}
          {multa > 0 ? (
            <li>
              Evitas una multa de hasta <strong className="font-semibold text-[color:var(--text-primary)]">{formatSolesRedondeado(multa)}</strong>
            </li>
          ) : null}
        </ul>
        <AccionPrincipal href={focusAction.href} describedBy={titleId}>
          Resolver ahora
        </AccionPrincipal>
      </>
    )
  }

  if (totalWorkers === 0) {
    return (
      <>
        <p id={titleId} className="text-lg font-bold leading-snug text-[color:var(--text-primary)]">Registra a tus trabajadores</p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
          Así vigilamos por ti sus contratos, legajos y vencimientos.
        </p>
        <AccionPrincipal href="/dashboard/trabajadores/nuevo" describedBy={titleId}>
          Agregar trabajadores
        </AccionPrincipal>
      </>
    )
  }

  return (
    <>
      <p id={titleId} className="text-lg font-bold leading-snug text-[color:var(--text-primary)]">Nada urgente por hoy</p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
        No tienes tareas del plan ni alertas graves pendientes. Revisa tus próximas fechas para seguir así.
      </p>
      <AccionPrincipal href="/dashboard/calendario" describedBy={titleId}>
        Ver mi calendario
      </AccionPrincipal>
    </>
  )
}

function AccionPrincipal({ href, describedBy, children }: { href: string; describedBy?: string; children: ReactNode }) {
  return (
    <div className="mt-auto pt-5">
      <Link
        href={href}
        aria-describedby={describedBy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(21,94,239,0.2)] transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        {children}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  )
}
