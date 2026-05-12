import Link from 'next/link'
import { listAgents } from '@/lib/agents/registry'
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
            Agentes especializados en legislación laboral peruana. Las invocaciones
            contextuales (revisar contrato, auditar boleta) viven en cada módulo
            de dominio. Esta vista es para administrar y probar los agentes.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map(agent => {
          const Icon = ICON_MAP[agent.icon] ?? Sparkles
          const isAvailable = agent.slug === 'sunafil-analyzer'
          const cardClass =
            'group relative overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--bg-elevated)] p-5 transition hover:border-gold-500/60'
          const content = (
            <>
              <div className="mb-3 flex items-start justify-between">
                <div className="rounded-lg bg-gold-500/10 p-2.5">
                  <Icon className="h-5 w-5 text-gold-500" />
                </div>
                <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-gold-400">
                  {isAvailable ? agent.status : 'Próximo'}
                </span>
              </div>
              <h2 className="text-base font-semibold text-white">{agent.name}</h2>
              <p className="mt-1 line-clamp-3 text-sm text-slate-400">{agent.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>~{agent.estimatedTokens.toLocaleString('es-PE')} tokens</span>
                <span className="flex items-center gap-1 text-gold-400 group-hover:gap-2 transition-all">
                  {isAvailable ? 'Abrir' : 'En cola'} {isAvailable && <ArrowRight className="h-3 w-3" />}
                </span>
              </div>
            </>
          )

          if (!isAvailable) {
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
              href="/dashboard/configuracion/automatizaciones/agentes/sunafil"
              prefetch={false}
              className={cardClass}
            >
              {content}
            </Link>
          )
        })}
      </div>

      <div className="rounded-xl border border-dashed border-slate-700 bg-white/30 p-6 text-center">
        <p className="text-sm text-slate-400">
          Próximamente: Generador de descargos, Auditor de boletas, Monitor de riesgo proactivo.
        </p>
      </div>
    </div>
  )
}
