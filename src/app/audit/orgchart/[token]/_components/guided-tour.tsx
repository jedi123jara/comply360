/**
 * Modo Inspector SUNAFIL — tour guiado en el Auditor Link público.
 *
 * Lleva al inspector paso a paso por las áreas críticas de cumplimiento:
 * Comité SST, Hostigamiento, DPO, Brigadas, otros roles legales y MOF.
 *
 * Cada step:
 *   - Muestra título institucional + base legal
 *   - Status (ok / atención / pendiente) con color
 *   - Resumen ejecutivo
 *   - Personas involucradas
 *   - Lista de evidencias verificables
 *   - Plan de acción (si hay observación)
 *
 * Trackea entrada/salida de cada step contra `/track` para que el cliente
 * tenga registro de qué inspeccionó realmente el visitante.
 */
'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  ShieldCheck,
  Users,
  Sparkles,
  Calendar,
} from 'lucide-react'

import type { GuidedTour, TourStep, TourStepStatus } from '@/lib/orgchart/public-link/guided-tour'

const STATUS_CONFIG: Record<
  TourStepStatus,
  { label: string; color: string; bg: string; border: string; Icon: typeof CheckCircle2 }
> = {
  ok: {
    label: 'En regla',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    Icon: CheckCircle2,
  },
  attention: {
    label: 'Atención',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    Icon: AlertTriangle,
  },
  pending: {
    label: 'Pendiente',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-300',
    Icon: AlertCircle,
  },
}

export interface GuidedTourProps {
  tour: GuidedTour
  org: { name: string; ruc: string | null }
  hashShort: string
  takenAt: string
  /** Token del auditor link — usado para tracking. */
  token: string
}

export function GuidedTourClient({ tour, org, hashShort, takenAt, token }: GuidedTourProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const totalSteps = tour.totalSteps
  const currentStep = tour.steps[currentIndex]

  // Tracking: tour-started al montar, tour-completed al llegar al último.
  useEffect(() => {
    track(token, 'tour-started', 'tour')
  }, [token])

  // Tracking: enter/leave por step
  useEffect(() => {
    if (!currentStep) return
    track(token, 'enter', currentStep.key)
    return () => {
      track(token, 'leave', currentStep.key)
    }
  }, [currentStep, token])

  const isLast = currentIndex === totalSteps - 1
  const isFirst = currentIndex === 0

  const statsByStatus = useMemo(() => {
    return tour.steps.reduce(
      (acc, s) => {
        acc[s.status] = (acc[s.status] ?? 0) + 1
        return acc
      },
      { ok: 0, attention: 0, pending: 0 } as Record<TourStepStatus, number>,
    )
  }, [tour.steps])

  if (!currentStep) return null
  const cfg = STATUS_CONFIG[currentStep.status]
  const Icon = cfg.Icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <Sparkles className="h-3 w-3" />
                Modo Inspector SUNAFIL
              </div>
              <h1 className="text-base font-semibold">{org.name}</h1>
              {org.ruc && <div className="text-[11px] text-slate-500">RUC {org.ruc}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Calendar className="h-3 w-3 text-slate-400" />
            <span className="text-slate-500">
              {new Date(takenAt).toLocaleDateString('es-PE')}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-600">
              #{hashShort}
            </span>
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl overflow-x-auto px-6 py-3">
          <div className="flex items-center gap-2">
            {tour.steps.map((step, i) => {
              const sCfg = STATUS_CONFIG[step.status]
              const SCIcon = sCfg.Icon
              const isCurrent = i === currentIndex
              const isPast = i < currentIndex
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`group flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    isCurrent
                      ? `${sCfg.border} ${sCfg.bg} ${sCfg.color} shadow-sm`
                      : isPast
                        ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  }`}
                >
                  <SCIcon className={`h-3 w-3 ${isCurrent ? sCfg.color : ''}`} />
                  <span className="text-[10px] tabular-nums opacity-70">{i + 1}.</span>
                  <span className="hidden md:inline">{stepShortLabel(step)}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step body */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.article
            key={currentStep.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            {/* Top bar coloreado por status */}
            <div
              className={`flex items-center gap-2 border-b ${cfg.border} ${cfg.bg} px-6 py-3`}
            >
              <Icon className={`h-4 w-4 ${cfg.color}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${cfg.color}`}>
                {cfg.label}
              </span>
              <span className="ml-auto text-[10px] text-slate-500">
                Paso {currentStep.order} de {totalSteps}
              </span>
            </div>

            <div className="px-6 pb-6 pt-5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                {currentStep.baseLegal}
              </div>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                {currentStep.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {currentStep.summary}
              </p>

              {/* Personas */}
              {currentStep.highlightPeople.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                    <Users className="h-3.5 w-3.5" />
                    Personas designadas
                  </h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    {currentStep.highlightPeople.map((p, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="text-sm font-medium text-slate-900">
                          {p.name}
                          {p.isInterim && (
                            <span className="ml-1 text-[10px] font-normal text-amber-600">
                              (interino)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{p.role}</div>
                        {p.endsAt && (
                          <div className="mt-0.5 text-[10px] text-slate-400">
                            Vigente hasta {new Date(p.endsAt).toLocaleDateString('es-PE')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidencias verificables */}
              <div className="mt-5">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  <ScrollText className="h-3.5 w-3.5" />
                  Evidencias verificables
                </h3>
                <ul className="space-y-1.5">
                  {currentStep.evidence.map((e, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recomendación */}
              {currentStep.recommendation && (
                <div
                  className={`mt-5 rounded-lg border-l-4 ${cfg.border} ${cfg.bg} p-3`}
                >
                  <div
                    className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color} mb-1`}
                  >
                    Plan de acción sugerido
                  </div>
                  <p className="text-sm text-slate-800">{currentStep.recommendation}</p>
                </div>
              )}
            </div>
          </motion.article>
        </AnimatePresence>

        {/* Navegación */}
        <nav className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={isFirst}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={() => track(token, 'tour-completed', 'tour')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Finalizar inspección
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.min(totalSteps - 1, i + 1))}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </nav>

        {/* Resumen final si es último step */}
        {isLast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.25 }}
            className="mt-8 grid gap-3 md:grid-cols-3"
          >
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <div className="text-2xl font-bold text-emerald-700">{statsByStatus.ok}</div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-emerald-600">
                Áreas en regla
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">
                {statsByStatus.attention}
              </div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-amber-600">
                Áreas en atención
              </div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
              <div className="text-2xl font-bold text-rose-700">{statsByStatus.pending}</div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-rose-600">
                Áreas pendientes
              </div>
            </div>
          </motion.div>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
          Tour generado por <strong className="text-emerald-700">Comply360</strong>{' '}
          basado en snapshot firmado SHA-256.{' '}
          <span className="font-mono">{hashShort}</span> · entregable a SUNAFIL como
          evidencia de gobernanza.
        </footer>
      </main>
    </div>
  )
}

function stepShortLabel(step: TourStep): string {
  switch (step.key) {
    case 'sst-committee':
      return 'Comité SST'
    case 'hostigamiento-committee':
      return 'Hostigamiento'
    case 'dpo':
      return 'DPO'
    case 'brigada-emergencia':
      return 'Brigadas'
    case 'other-legal-roles':
      return 'Otros roles'
    case 'mof-coverage':
      return 'MOF'
    default:
      return step.title
  }
}

/**
 * Fire-and-forget tracking del paso actual. No bloquea la UX.
 */
function track(
  token: string,
  action: 'enter' | 'leave' | 'tour-completed' | 'tour-started',
  stepKey: string,
): void {
  if (typeof window === 'undefined') return
  // Usamos sendBeacon si está disponible (mejor para `leave`/`unload`).
  const body = JSON.stringify({ stepKey, action })
  const url = `/api/public/orgchart/${encodeURIComponent(token)}/track`
  if (action === 'leave' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
      return
    } catch {
      /* fallback abajo */
    }
  }
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    /* no-op */
  })
}
