import Link from 'next/link'
import { listAgents } from '@/lib/agents/registry'
import type { AgentDefinition } from '@/lib/agents/types'
import { ShieldAlert, Sparkles, ArrowRight, Scale, Receipt, Radar } from 'lucide-react'
import type { ComponentType } from 'react'

export const metadata = {
  title: 'Agentes IA · COMPLY360',
}

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  ShieldAlert,
  Scale,
  Receipt,
  Radar,
}

/**
 * Dónde se usa hoy cada agente desde la plataforma. Si un agente no está aquí,
 * es porque no tiene pantalla todavía (solo existe el motor) y se muestra como
 * "No disponible" en lugar de prometer una fecha.
 */
const AGENT_ENTRY_POINTS: Record<string, { href: string; cta: string; where?: string }> = {
  'sunafil-analyzer': {
    href: '/dashboard/configuracion/automatizaciones/agentes/sunafil',
    cta: 'Abrir',
  },
  'risk-monitor': {
    href: '/dashboard/centro-sunafil?tab=radar',
    cta: 'Abrir en Centro SUNAFIL',
    where: 'Lo encuentras en Centro SUNAFIL, pestaña Radar.',
  },
}

const STATUS_LABEL: Record<AgentDefinition['status'], string> = {
  stable: 'Disponible',
  beta: 'En prueba',
  experimental: 'Experimental',
}

export default function AgentesPage() {
  const agents = listAgents()

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gold-500/10 p-3">
          <Sparkles className="h-7 w-7 text-gold-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Agentes IA</h1>
          <p className="text-sm text-slate-400">
            Asistentes con inteligencia artificial que revisan documentos y riesgos laborales. Aquí
            ves cuáles puedes usar hoy y dónde encontrarlos. Sus resultados son una guía: revísalos
            antes de presentarlos ante SUNAFIL.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map(agent => {
          const Icon = ICON_MAP[agent.icon] ?? Sparkles
          const entry = AGENT_ENTRY_POINTS[agent.slug]
          const isAvailable = Boolean(entry)
          const cardClass =
            'group relative overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--bg-elevated)] p-5 transition hover:border-gold-500/60'
          const content = (
            <>
              <div className="mb-3 flex items-start justify-between">
                <div className="rounded-lg bg-gold-500/10 p-2.5">
                  <Icon className="h-5 w-5 text-gold-500" />
                </div>
                <span
                  className={
                    isAvailable
                      ? 'rounded-full bg-gold-500/15 px-2 py-0.5 text-xs font-semibold text-gold-400'
                      : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600'
                  }
                >
                  {isAvailable ? STATUS_LABEL[agent.status] : 'No disponible'}
                </span>
              </div>
              <h2 className="text-base font-semibold text-white">{agent.name}</h2>
              <p className="mt-1 line-clamp-3 text-sm text-slate-400">{agent.description}</p>
              {entry?.where && <p className="mt-2 text-xs text-slate-500">{entry.where}</p>}
              <div className="mt-4 flex items-center justify-end text-xs">
                {isAvailable ? (
                  <span className="flex items-center gap-1 font-semibold text-gold-400 transition-all group-hover:gap-2">
                    {entry.cta} <ArrowRight className="h-3 w-3" />
                  </span>
                ) : (
                  <span className="text-slate-500">Aún no se puede usar desde la plataforma.</span>
                )}
              </div>
            </>
          )

          if (!entry) {
            return (
              <div
                key={agent.slug}
                className={`${cardClass} opacity-80`}
                aria-disabled="true"
              >
                {content}
              </div>
            )
          }

          return (
            <Link
              key={agent.slug}
              href={entry.href}
              prefetch={false}
              className={cardClass}
            >
              {content}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
