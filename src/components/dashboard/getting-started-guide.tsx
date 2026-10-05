'use client'

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Flag, PartyPopper, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  buildCelebration,
  buildStartRoute,
  doneStepKeys,
  newlyCompletedSteps,
  parseCelebrated,
  serializeCelebrated,
  startRouteStorageKeys,
  type Celebration,
  type StartRoute,
  type StartRouteInput,
  type StartStep,
} from '@/components/cockpit/start-route'
import { useStoredValue, writeStoredValue } from '@/components/cockpit/local-store'
import { claimStimulus, releaseStimulus } from '@/components/cockpit/stimulus'

/**
 * GettingStartedGuide — "Tu ruta de arranque" en el panel principal.
 *
 * Cinco pasos calculados con datos reales del servidor (ver
 * `buildStartRoute`). Se queda en el panel hasta completar los cinco; recién
 * ahí (o si ya no queda ningún paso que se pueda hacer) aparece "Ya terminé
 * mis primeros pasos" para ocultarla.
 *
 * Cuando un paso pasa a "hecho" se celebra UNA vez, con el dato real que lo
 * respalda. localStorage solo guarda qué pasos ya se celebraron.
 */

export interface GettingStartedGuideProps {
  orgId: string
  input: StartRouteInput
  /** false mientras otro aviso (prueba gratis, recorrido guiado) está en pantalla. */
  celebrationsEnabled: boolean
}

export function GettingStartedGuide({ orgId, input, celebrationsEnabled }: GettingStartedGuideProps) {
  const route = useMemo(() => buildStartRoute(input), [input])
  const keys = useMemo(() => startRouteStorageKeys(orgId), [orgId])
  const hiddenRaw = useStoredValue(keys.hidden)
  const celebratedRaw = useStoredValue(keys.celebrated)
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  // Respaldo en memoria por si el navegador bloquea localStorage.
  const [hiddenNow, setHiddenNow] = useState(false)
  const hidden = hiddenNow || hiddenRaw === '1'

  const celebrated = useMemo(
    () => (celebratedRaw === undefined ? undefined : parseCelebrated(celebratedRaw)),
    [celebratedRaw]
  )
  const pendingKey = celebrated === undefined ? '' : newlyCompletedSteps(route, celebrated).join(',')

  // Primera vez en este navegador: guardamos lo que ya estaba hecho como punto
  // de partida, sin celebrarlo (no sabemos si se acaba de completar).
  useEffect(() => {
    if (celebratedRaw !== null) return
    writeStoredValue(keys.celebrated, serializeCelebrated(doneStepKeys(route)))
  }, [celebratedRaw, keys.celebrated, route])

  // Un paso nuevo hecho: lo celebramos una vez y lo marcamos como celebrado.
  useEffect(() => {
    if (hidden || !celebrationsEnabled || pendingKey === '' || !celebrated) return
    const timer = window.setTimeout(() => {
      const steps = pendingKey.split(',') as Celebration['keys']
      claimStimulus('celebration')
      setCelebration(buildCelebration(steps, route, input))
      writeStoredValue(keys.celebrated, serializeCelebrated([...celebrated, ...steps]))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [hidden, celebrationsEnabled, pendingKey, celebrated, route, input, keys.celebrated])

  useEffect(() => () => releaseStimulus('celebration'), [])

  function dismissCelebration() {
    setCelebration(null)
    releaseStimulus('celebration')
  }

  function hideGuide() {
    writeStoredValue(keys.hidden, '1')
    setHiddenNow(true)
    dismissCelebration()
  }

  const canHide = route.complete || route.nextStep === null
  // Si la ocultó, se respeta aunque después cambie algún dato.
  if (hidden) return null
  // Mientras no se lee la preferencia (servidor/hidratación) solo mostramos la
  // ruta si todavía no se puede ocultar: así no parpadea para quien la ocultó.
  if (canHide && hiddenRaw === undefined) return null

  const banner = (
    <div role="status" aria-live="polite">
      {celebration ? <CelebrationBanner celebration={celebration} onClose={dismissCelebration} /> : null}
    </div>
  )

  if (route.complete) {
    return <CompletedRoute input={input} banner={banner} onHide={hideGuide} />
  }

  return <ActiveRoute route={route} celebration={celebration} banner={banner} canHide={canHide} onHide={hideGuide} />
}

/* ── Ruta en curso ─────────────────────────────────────────────────────── */

function ActiveRoute({
  route,
  celebration,
  banner,
  canHide,
  onHide,
}: {
  route: StartRoute
  celebration: Celebration | null
  banner: ReactNode
  canHide: boolean
  onHide: () => void
}) {
  const titleId = useId()
  const pct = Math.round((route.doneCount / route.total) * 100)

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5 shadow-[var(--elevation-2)] sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Tu ruta de arranque</p>
          <h2 id={titleId} className="mt-1 text-lg font-bold text-[color:var(--text-primary)]">
            Primeros pasos en Comply360
          </h2>
          <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">
            Cinco pasos para que conozcamos tu empresa y te avisemos antes de una multa.
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-[color:var(--text-secondary)]">
          <span className="text-2xl font-bold text-[color:var(--text-primary)]">{route.doneCount}</span> de{' '}
          {route.total} pasos
        </p>
      </div>

      <div
        role="progressbar"
        aria-label="Avance de tu ruta de arranque"
        aria-valuemin={0}
        aria-valuemax={route.total}
        aria-valuenow={route.doneCount}
        aria-valuetext={`${route.doneCount} de ${route.total} pasos`}
        className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--bg-inset)]"
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {banner}

      <ol className="mt-4 space-y-2">
        {route.steps.map((step) => (
          <StepRow
            key={step.key}
            step={step}
            isNext={route.nextStep?.key === step.key}
            justDone={celebration?.keys.includes(step.key) ?? false}
          />
        ))}
      </ol>

      {canHide ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onHide}
            className="rounded-lg px-2 py-1.5 text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Ya terminé mis primeros pasos
          </button>
        </div>
      ) : null}
    </section>
  )
}

function StepRow({ step, isNext, justDone }: { step: StartStep; isNext: boolean; justDone: boolean }) {
  const actionable = !step.done && !step.blockedBy

  return (
    <li
      className={cn(
        'flex gap-3 rounded-xl border p-3.5 sm:p-4',
        isNext ? 'border-blue-200 bg-blue-50/70' : 'border-[color:var(--border-subtle)] bg-white'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
          step.done
            ? 'bg-green-600 text-white'
            : isNext
              ? 'bg-blue-600 text-white'
              : 'border border-slate-300 bg-white text-slate-500',
          justDone && 'c360-anim-bounce-in'
        )}
      >
        {step.done ? <Check className="h-4 w-4" strokeWidth={3} /> : step.number}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
            <span className="sr-only">
              Paso {step.number}, {step.done ? 'hecho' : 'pendiente'}:{' '}
            </span>
            {step.title}
            {step.done ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">Hecho</span>
            ) : isNext ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">Siguiente paso</span>
            ) : null}
          </h3>
          {step.done ? (
            step.detail ? <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">{step.detail}</p> : null
          ) : (
            <>
              <p className="mt-0.5 text-sm leading-6 text-[color:var(--text-secondary)]">{step.why}</p>
              {step.detail ? (
                <p className="mt-1 text-xs font-semibold text-[color:var(--text-primary)]">{step.detail}</p>
              ) : null}
              {step.blockedBy ? (
                <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">{step.blockedBy}</p>
              ) : null}
            </>
          )}
        </div>

        {actionable ? (
          <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
            <Link
              href={step.href}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                isNext
                  ? 'bg-blue-600 px-3.5 py-2 text-white hover:bg-blue-700'
                  : 'border border-blue-200 bg-white px-3 py-1.5 text-blue-700 hover:bg-blue-50'
              )}
            >
              {step.cta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {step.secondary ? (
              <Link
                href={step.secondary.href}
                className="text-xs font-semibold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {step.secondary.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  )
}

/* ── Ruta completa ─────────────────────────────────────────────────────── */

function CompletedRoute({
  input,
  banner,
  onHide,
}: {
  input: StartRouteInput
  banner: ReactNode
  onHide: () => void
}) {
  const titleId = useId()
  const { progress, totalWorkers } = input
  const resolved = progress.resolvedTasks + progress.resolvedAlerts

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-2xl border border-green-200 bg-white p-5 shadow-[var(--elevation-2)] sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span
          aria-hidden="true"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-green-200 bg-green-50 text-green-700"
        >
          <Flag className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Ruta de arranque: 5 de 5</p>
          <h2 id={titleId} className="mt-1 text-lg font-bold text-[color:var(--text-primary)]">
            Terminaste tus primeros pasos
          </h2>
          <p className="mt-1 text-sm leading-6 text-[color:var(--text-secondary)]">
            Ya tienes {totalWorkers} {totalWorkers === 1 ? 'trabajador registrado' : 'trabajadores registrados'},{' '}
            {progress.legajoDocs} {progress.legajoDocs === 1 ? 'documento' : 'documentos'} en legajos y {resolved}{' '}
            {resolved === 1 ? 'pendiente resuelto' : 'pendientes resueltos'}. Desde ahora, lo importante es revisar tus
            Pendientes cada semana.
          </p>
        </div>
        <button
          type="button"
          onClick={onHide}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-green-300 bg-white px-4 py-2.5 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
        >
          Ya terminé mis primeros pasos
        </button>
      </div>
      {banner}
    </section>
  )
}

/* ── Celebración ───────────────────────────────────────────────────────── */

function CelebrationBanner({ celebration, onClose }: { celebration: Celebration; onClose: () => void }) {
  return (
    <div className="c360-anim-slide-down mt-4 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
      <span
        aria-hidden="true"
        className="c360-anim-bounce-in inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-green-700 ring-1 ring-green-200"
      >
        <PartyPopper className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-green-900">{celebration.title}</p>
        {celebration.detail ? <p className="mt-0.5 text-sm leading-6 text-green-800">{celebration.detail}</p> : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar mensaje"
        className="shrink-0 rounded-md p-1 text-green-700 transition-colors hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
