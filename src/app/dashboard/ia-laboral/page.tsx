'use client'

import Link from 'next/link'
import {
  Sparkles,
  FileSearch,
  Receipt,
  ShieldCheck,
  Bot,
  Calculator,
  ArrowRight,
  Workflow,
  Zap,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCopilot } from '@/providers/copilot-provider'
import { useCalculatorDrawer } from '@/components/ui/calculator-drawer'

/**
 * /dashboard/ia-laboral — hub unificado que reemplaza:
 *   /dashboard/asistente-ia
 *   /dashboard/agentes
 *   /dashboard/analizar-contrato
 *   /dashboard/calculadoras (como página hermana)
 *
 * Cada bloque abre el drawer correcto (Copilot para chat, Calculator drawer
 * para cálculos) o navega al módulo especializado.
 */
export default function IaLaboralPage() {
  const copilot = useCopilot()
  const calcDrawer = useCalculatorDrawer()

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative rounded-2xl border border-[color:var(--border-default)] bg-white p-8 shadow-[var(--elevation-3)] motion-fade-in-up overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[4px] before:bg-[image:var(--accent-bar-emerald)]">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          </span>
          <Badge variant="emerald" size="sm" dot>
            IA Laboral · Perú
          </Badge>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight text-[color:var(--text-primary)]">
          Todo el <span className="text-emerald-600">Copilot jurídico</span> en un solo lugar
        </h1>
        <p className="mt-3 text-[color:var(--text-secondary)] max-w-2xl leading-relaxed">
          Chat con RAG del corpus legal peruano, revisión de contratos,
          análisis de boletas, planes de acción y 13 calculadoras oficiales.
          Todo citando base legal.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button icon={<Sparkles className="h-4 w-4" />} onClick={() => copilot.open()}>
            Abrir Copilot
          </Button>
          <Button
            variant="secondary"
            icon={<Calculator className="h-4 w-4" />}
            onClick={() => calcDrawer.open()}
          >
            Calculadoras
          </Button>
        </div>
      </section>

      {/* Modos */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ModeCard
          title="Chat general"
          description="Preguntas sobre régimen, calendario, obligaciones — con citación de norma."
          icon={Bot}
          onClick={() => copilot.open()}
          cta="Chatear"
        />
        <ModeCard
          title="Revisión de contratos"
          description="Subí un contrato o abrí uno existente. Detecto cláusulas riesgosas y sugiero base legal."
          icon={FileSearch}
          href="/dashboard/analizar-contrato"
          cta="Analizar contrato"
        />
        <ModeCard
          title="Análisis de boletas"
          description="Detecta descuentos ilegales, aportes desalineados, bonos mal tratados."
          icon={Receipt}
          href="/dashboard/boletas?mode=audit"
          cta="Auditar boleta"
        />
        <ModeCard
          title="Plan de acción"
          description="Genero un plan priorizado tras cada diagnóstico SUNAFIL — incluye responsables y plazos."
          icon={ShieldCheck}
          href="/dashboard/diagnostico"
          cta="Iniciar diagnóstico"
          accent="amber"
        />
        <ModeCard
          title="Agentes IA (beta)"
          description="Flujos autónomos: SUNAFIL, extracción masiva de PDFs, coherencia entre contratos y boletas."
          icon={Workflow}
          href="/dashboard/agentes"
          cta="Ver agentes"
          accent="gold"
        />
        <ModeCard
          title="Calculadoras"
          description="13 calculadoras laborales oficiales con pre-fill desde trabajador o contrato activo."
          icon={Calculator}
          onClick={() => calcDrawer.open()}
          cta="Abrir drawer"
          accent="cyan"
        />
      </section>

      {/* Quick prompts */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-tertiary)] mb-3">
          Preguntas frecuentes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            {
              q: '¿Cómo calculo una liquidación para un trabajador del régimen MYPE pequeña empresa?',
              accent: 'emerald',
            },
            {
              q: 'Dame una carta de pre-aviso de despido por abandono de puesto con base legal.',
              accent: 'amber',
            },
            {
              q: '¿Qué pasa si un trabajador acumula dos períodos de vacaciones sin gozar?',
              accent: 'cyan',
            },
            {
              q: 'Estimá la multa SUNAFIL si no tengo IPERC vigente para 45 trabajadores.',
              accent: 'crimson',
            },
          ].map((p) => (
            <button
              key={p.q}
              type="button"
              onClick={() => copilot.open(p.q)}
              className="flex items-start gap-2 rounded-xl border border-[color:var(--border-default)] bg-white px-3 py-2.5 text-left hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
            >
              <Zap className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" />
              <span className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
                {p.q}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Disclaimer legal */}
      <section>
        <Card padding="md" variant="outline">
          <p className="text-xs text-[color:var(--text-tertiary)] leading-relaxed">
            <strong className="text-[color:var(--text-secondary)]">Nota legal:</strong> la IA
            Laboral es asistencia informada en normativa peruana vigente, no reemplaza
            asesoría jurídica formal. Para casos de alta complejidad, usá la derivación
            a abogado desde el chat. Las respuestas incluyen la base legal consultada.
          </p>
        </Card>
      </section>
    </div>
  )
}

function ModeCard({
  title,
  description,
  icon: Icon,
  href,
  onClick,
  cta,
  accent = 'emerald',
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  onClick?: () => void
  cta: string
  accent?: 'emerald' | 'amber' | 'gold' | 'cyan' | 'crimson'
}) {
  const ACCENT: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    gold: 'bg-amber-50 border-amber-200 text-gold-600',
    cyan: 'bg-cyan-50 border-cyan-100 text-cyan-700',
    crimson: 'bg-crimson-50 border-crimson-200 text-crimson-700',
  }
  const body = (
    <Card padding="none" interactive className="h-full">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${ACCENT[accent]}`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="!pt-0 !pb-5">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
          {cta} <ArrowRight className="h-3 w-3" />
        </span>
      </CardContent>
    </Card>
  )
  if (href) {
    return (
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded-2xl">
        {body}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className="block text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded-2xl">
      {body}
    </button>
  )
}
