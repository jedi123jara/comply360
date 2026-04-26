'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, X, Sparkles, Users, Bot } from 'lucide-react'

/**
 * WelcomeTour — tour guiado mínimo para usuarios recién terminaron onboarding.
 *
 * Activación:
 *  - Solo se muestra si `?welcome=trial` está en URL Y `localStorage.tourCompleted` no está seteado
 *  - 3 pasos secuenciales con CTA "Siguiente" / "Saltar"
 *  - Al terminar, marca `tourCompleted` para no reaparecer
 *
 * Implementación intencionalmente minimalista (sin Tippy.js / intro.js):
 *  - Modal centrado con descripción del feature y un "ir a la sección"
 *  - No hay highlight de DOM elements (eso requiere positioning complejo y
 *    rompe en mobile). En su lugar, cada paso explica + lleva a la sección.
 *
 * Para una versión más rica con highlights/spotlight, ver Sprint 5+.
 */

const STORAGE_KEY = 'comply360.tourCompleted'

interface TourStep {
  icon: typeof Sparkles
  title: string
  description: string
  ctaLabel: string
  ctaHref?: string
}

const STEPS: TourStep[] = [
  {
    icon: Sparkles,
    title: 'Tu cockpit de compliance',
    description:
      'Acá vas a ver tu score de compliance, alertas críticas, vencimientos próximos y top de trabajadores en riesgo. Todo en una pantalla.',
    ctaLabel: 'Siguiente: agregar trabajadores',
  },
  {
    icon: Users,
    title: 'Empieza por tus trabajadores',
    description:
      'El motor de Comply360 funciona alrededor de tu planilla. Sube uno manualmente o importa de Excel — toma 30 segundos por trabajador.',
    ctaLabel: 'Ir a Trabajadores',
    ctaHref: '/dashboard/trabajadores/nuevo',
  },
  {
    icon: Bot,
    title: 'Asistente IA laboral peruano',
    description:
      'Pulsa Ctrl+I (Cmd+I en Mac) en cualquier pantalla para abrir el Asistente IA. Conoce las 75+ normas laborales peruanas y entiende el contexto de tu empresa.',
    ctaLabel: 'Listo, empezar',
  },
]

export function WelcomeTour() {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const isWelcome = params.get('welcome') === 'trial'
    if (!isWelcome) return
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return
    } catch {
      /* ignore */
    }
    // Pequeño delay para que el toast de "Trial activado" aparezca primero
    const timer = setTimeout(() => setActive(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setActive(false)
  }, [])

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      finish()
    }
  }, [step, finish])

  if (!active) return null

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <div
      role="dialog"
      aria-labelledby="welcome-tour-title"
      aria-modal="true"
      className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-emerald-200 overflow-hidden motion-fade-in-up">
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100">
                <Icon className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                  Tour rápido · Paso {step + 1} de {STEPS.length}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={finish}
              aria-label="Cerrar tour"
              className="p-1.5 rounded-lg text-[color:var(--text-tertiary)] hover:bg-[color:var(--neutral-100)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h2
            id="welcome-tour-title"
            className="text-xl font-bold text-[color:var(--text-primary)]"
          >
            {current.title}
          </h2>
          <p className="text-sm text-[color:var(--text-secondary)] mt-2 leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 px-6 py-3 bg-white">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? 'bg-emerald-600 w-8'
                  : i < step
                    ? 'bg-emerald-300 w-2'
                    : 'bg-[color:var(--neutral-200)] w-2'
              }`}
              aria-hidden
            />
          ))}
        </div>

        <div className="px-6 pb-6 pt-2 flex items-center justify-between gap-3 bg-white">
          <button
            type="button"
            onClick={finish}
            className="text-sm text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] font-medium transition-colors"
          >
            Saltar tour
          </button>
          {current.ctaHref ? (
            <a
              href={current.ctaHref}
              onClick={() => {
                try {
                  localStorage.setItem(STORAGE_KEY, '1')
                } catch {
                  /* ignore */
                }
              }}
              className="group inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 transition-colors"
            >
              {current.ctaLabel}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
          ) : (
            <button
              type="button"
              onClick={next}
              className="group inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 transition-colors"
            >
              {current.ctaLabel}
              {!isLast && (
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
