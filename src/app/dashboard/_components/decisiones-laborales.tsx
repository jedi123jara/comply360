'use client'

import Link from 'next/link'
import {
  UserPlus,
  RefreshCcw,
  UserMinus,
  ClipboardCheck,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * DecisionesLaborales — sección destacada del cockpit (Fase 2).
 *
 * Reemplaza el viejo "Hub IA Laboral" feature-oriented por una sección
 * task-oriented organizada por momento del usuario:
 *   - Contratar trabajador (Fase 2 — wizard activo)
 *   - Renovar contrato (Fase 3 — próximamente)
 *   - Cesar trabajador (Fase 3 — próximamente)
 *   - Auditar nómina (Fase 3 — próximamente)
 *   - Prepararse SUNAFIL (Fase 3 — próximamente)
 *
 * Cada card es un wizard orquestador que reusa funciones existentes,
 * NO duplica lógica. Solo "Contratar" está habilitado en Fase 2.
 */

interface DecisionCard {
  key: string
  title: string
  description: string
  icon: typeof UserPlus
  href: string | null
  status: 'active' | 'soon'
  accent: 'emerald' | 'blue' | 'amber' | 'purple' | 'crimson'
}

const CARDS: DecisionCard[] = [
  {
    key: 'contratar',
    title: 'Contratar trabajador',
    description:
      'Costo total empleador, régimen recomendado, capacitaciones obligatorias y alta del trabajador en un solo flujo.',
    icon: UserPlus,
    href: '/dashboard/decisiones/contratar',
    status: 'active',
    accent: 'emerald',
  },
  {
    key: 'renovar',
    title: 'Renovar contrato',
    description:
      'Análisis de desnaturalización, recomendación de modalidad y registro de la decisión con tarea de seguimiento.',
    icon: RefreshCcw,
    href: '/dashboard/decisiones/renovar',
    status: 'active',
    accent: 'blue',
  },
  {
    key: 'cesar',
    title: 'Cesar trabajador',
    description:
      'Cálculo de liquidación estimada, evaluación de riesgo legal y planificación del proceso de cese.',
    icon: UserMinus,
    href: '/dashboard/decisiones/cesar',
    status: 'active',
    accent: 'amber',
  },
  {
    key: 'auditar',
    title: 'Auditar nómina',
    description:
      'Detección automática de inconsistencias en boletas (aportes, descuentos, RMV) con plan correctivo.',
    icon: ClipboardCheck,
    href: '/dashboard/decisiones/auditar',
    status: 'active',
    accent: 'purple',
  },
  {
    key: 'sunafil',
    title: 'Prepararse SUNAFIL',
    description:
      'Snapshot del estado actual, plan priorizado por multa potencial y links a simulacro y evidencia.',
    icon: ShieldAlert,
    href: '/dashboard/decisiones/sunafil',
    status: 'active',
    accent: 'crimson',
  },
]

const ACCENT_BG: Record<DecisionCard['accent'], string> = {
  emerald: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-blue-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-700',
  purple: 'bg-purple-50 text-purple-700',
  crimson: 'bg-red-50 text-red-700',
}

export function DecisionesLaborales() {
  return (
    <section className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5 md:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              Decisiones Laborales
            </span>
          </div>
          <h2 className="text-lg font-bold text-[color:var(--text-primary)]">
            Flujos guiados por momento clave
          </h2>
          <p className="mt-0.5 text-sm text-[color:var(--text-tertiary)] max-w-2xl">
            Wizards que orquestan cálculo, IA y documentos en un solo proceso. Cada flujo reúne lo
            que necesitas para tomar una decisión laboral con certeza.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {CARDS.map((card) => (
          <DecisionCardItem key={card.key} card={card} />
        ))}
      </div>
    </section>
  )
}

function DecisionCardItem({ card }: { card: DecisionCard }) {
  const Icon = card.icon
  const isActive = card.status === 'active' && card.href

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className={cn('rounded-lg p-2 shrink-0', ACCENT_BG[card.accent])}>
          <Icon className="h-4 w-4" />
        </div>
        {!isActive && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[color:var(--text-tertiary)]">
            <Lock className="h-2.5 w-2.5" />
            Próximamente
          </span>
        )}
      </div>
      <h3 className="text-sm font-bold text-[color:var(--text-primary)] leading-tight">{card.title}</h3>
      <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)] leading-relaxed line-clamp-3">
        {card.description}
      </p>
      {isActive && (
        <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
          Iniciar wizard
          <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </>
  )

  if (isActive && card.href) {
    return (
      <Link
        href={card.href}
        className="group rounded-xl border border-[color:var(--border-default)] bg-white p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer"
      >
        {inner}
      </Link>
    )
  }

  return (
    <div
      aria-disabled
      className="rounded-xl border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)]/50 p-3 opacity-70 cursor-not-allowed"
    >
      {inner}
    </div>
  )
}
