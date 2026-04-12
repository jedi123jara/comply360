'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CheckCircle,
  Users,
  FileText,
  Calculator,
  Building2,
  ArrowRight,
  Rocket,
  X,
  Sparkles,
  PartyPopper,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProgressData {
  hasOrg: boolean
  hasWorker: boolean
  hasContract: boolean
  hasCalculation: boolean
  counts: {
    workers: number
    contracts: number
    calculations: number
  }
}

interface Step {
  key: 'hasOrg' | 'hasWorker' | 'hasContract' | 'hasCalculation'
  title: string
  description: string
  doneDescription: (counts: ProgressData['counts']) => string
  icon: typeof Building2
  href: string
  cta: string
  motivation: string
}

const STEPS: Step[] = [
  {
    key: 'hasOrg',
    title: 'Datos de tu empresa',
    description: 'RUC, razon social, sector y regimen laboral',
    doneDescription: () => 'Empresa configurada',
    icon: Building2,
    href: '/dashboard/configuracion',
    cta: 'Editar datos',
    motivation: 'La base esta lista',
  },
  {
    key: 'hasWorker',
    title: 'Registra tu primer trabajador',
    description: 'Agrega un trabajador para activar todas las funciones de cumplimiento',
    doneDescription: (c) => `${c.workers} trabajador${c.workers === 1 ? '' : 'es'} registrado${c.workers === 1 ? '' : 's'}`,
    icon: Users,
    href: '/dashboard/trabajadores/nuevo',
    cta: 'Registrar trabajador',
    motivation: 'Sin trabajadores, COMPLY360 no puede calcular tu compliance score ni alertar de vencimientos',
  },
  {
    key: 'hasContract',
    title: 'Crea su contrato laboral',
    description: 'Genera un contrato legal desde plantilla o con IA',
    doneDescription: (c) => `${c.contracts} contrato${c.contracts === 1 ? '' : 's'} creado${c.contracts === 1 ? '' : 's'}`,
    icon: FileText,
    href: '/dashboard/contratos/nuevo',
    cta: 'Crear contrato',
    motivation: 'Formaliza la relacion laboral con un contrato valido segun el regimen de tu empresa',
  },
  {
    key: 'hasCalculation',
    title: 'Calcula su CTS',
    description: 'Verifica que estas pagando correctamente los beneficios sociales',
    doneDescription: (c) => `${c.calculations} calculo${c.calculations === 1 ? '' : 's'} realizado${c.calculations === 1 ? '' : 's'}`,
    icon: Calculator,
    href: '/dashboard/calculadoras/cts',
    cta: 'Calcular CTS',
    motivation: 'Asegura que tus depositos cumplen con la ley y evita multas SUNAFIL',
  },
]

const DISMISS_KEY = 'comply360:gettingStartedDismissed'

export function GettingStartedGuide() {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Check dismiss state in localStorage
    if (typeof window !== 'undefined') {
      const d = localStorage.getItem(DISMISS_KEY)
      if (d === 'true') {
        setDismissed(true)
        setLoading(false)
        return
      }
    }

    fetch('/api/onboarding/progress')
      .then(res => res.json())
      .then((data: ProgressData & { error?: string }) => {
        if (data.error) {
          setProgress(null)
          return
        }
        // Only show if onboarding is completed (hasOrg = true)
        if (!data.hasOrg) {
          setProgress(null)
          return
        }
        setProgress(data)
        setShow(true)
      })
      .catch(() => setProgress(null))
      .finally(() => setLoading(false))
  }, [])

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, 'true')
    }
    setDismissed(true)
  }

  if (loading || !show || dismissed || !progress) return null

  const completedCount = STEPS.filter(s => progress[s.key]).length
  const totalSteps = STEPS.length
  const progressPct = Math.round((completedCount / totalSteps) * 100)
  const allDone = completedCount === totalSteps
  const nextStepIndex = STEPS.findIndex(s => !progress[s.key])

  // ─────────────────────────────────────────────────────────────
  // CELEBRATION STATE — todos los pasos completados
  // ─────────────────────────────────────────────────────────────
  if (allDone) {
    return (
      <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 rounded-2xl p-6 text-white overflow-hidden shadow-xl">
        <div className="pointer-events-none absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-48 h-48 bg-yellow-300/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shrink-0">
            <Trophy className="w-8 h-8 text-yellow-300" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">Configuracion completada</h3>
              <PartyPopper className="w-5 h-5 text-yellow-300" />
            </div>
            <p className="text-sm text-white/85 mt-0.5">
              Has completado los 4 pasos iniciales. COMPLY360 esta listo para protegerte de multas y mantener tu cumplimiento laboral al dia.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold transition-all shrink-0"
          >
            Entendido
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // ACTIVE STATE — guia con pasos pendientes
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="relative bg-gradient-to-br from-primary via-primary-light to-primary rounded-2xl p-6 text-white overflow-hidden shadow-xl">
      {/* Decorative blurred circles — pointer-events-none CRITICO para no bloquear clicks */}
      <div className="pointer-events-none absolute top-0 right-0 w-72 h-72 bg-gold/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

      <div className="relative z-10">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-5 gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/20 shrink-0">
              <Rocket className="w-5 h-5 text-gold" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold flex items-center gap-2">
                Primeros pasos en COMPLY360
                <Sparkles className="w-4 h-4 text-gold shrink-0" />
              </h3>
              <p className="text-sm text-white/70 mt-0.5">
                Sigue esta guia para configurar tu plataforma en menos de 10 minutos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Ocultar guia"
            title="Ocultar guia"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Progress bar ── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white/80">
              {completedCount} de {totalSteps} pasos completados
            </span>
            <span className="text-xs font-bold text-gold">{progressPct}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-700 ease-out rounded-full shadow-lg shadow-gold/30"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* ── Steps list ── */}
        <div className="space-y-2.5">
          {STEPS.map((step, idx) => {
            const isCompleted = progress[step.key]
            const isActive = idx === nextStepIndex
            const isFuture = !isCompleted && !isActive
            const Icon = step.icon

            return (
              <div
                key={step.key}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl p-3.5 transition-all border',
                  isCompleted && 'bg-emerald-500/15 border-emerald-400/40',
                  isActive && 'bg-gold/15 border-gold/50 shadow-lg shadow-gold/10',
                  isFuture && 'bg-white/5 border-white/10 opacity-55'
                )}
              >
                {/* Icono del paso */}
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg shrink-0 transition-all',
                    isCompleted && 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40',
                    isActive && 'bg-gold text-primary shadow-md shadow-gold/40 animate-pulse-soft',
                    isFuture && 'bg-white/10 text-white/50'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn(
                      'text-sm font-bold',
                      isCompleted && 'text-emerald-100',
                      isActive && 'text-white',
                      isFuture && 'text-white/60'
                    )}>
                      {idx + 1}. {step.title}
                    </p>
                    {isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-gold text-primary rounded-full uppercase tracking-wide">
                        Empezar aqui
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/30 text-emerald-200 rounded-full uppercase tracking-wide">
                        Listo
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    'text-xs mt-1',
                    isCompleted ? 'text-emerald-200/80' : isActive ? 'text-white/80' : 'text-white/50'
                  )}>
                    {isCompleted
                      ? step.doneDescription(progress.counts)
                      : isActive
                        ? step.motivation
                        : step.description}
                  </p>
                </div>

                {/* CTA — solo en el paso activo */}
                {isActive && (
                  <Link
                    href={step.href}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gold hover:bg-gold-light text-primary text-xs font-bold shadow-lg shadow-gold/30 transition-all shrink-0 whitespace-nowrap hover:scale-105"
                  >
                    {step.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Footer hint ── */}
        <p className="text-[11px] text-white/50 mt-4 text-center">
          Cada paso desbloquea nuevas funciones. Cuando completes los 4, tu cumplimiento estara protegido.
        </p>
      </div>
    </div>
  )
}
