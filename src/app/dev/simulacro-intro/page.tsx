'use client'

import { useState } from 'react'
import {
  Siren,
  Shield,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  FileCheck,
  Building2,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SkeletonText } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * /dev/simulacro-intro — design spec del Simulacro SUNAFIL immersive.
 *
 * Representa el "Inspector Virtual" como chat guiado, pidiendo documentos
 * reales del legajo y clasificándolos en verde/amarillo/rojo. Al final
 * genera el Acta de Requerimiento.
 */
export default function SimulacroIntro() {
  const [phase, setPhase] = useState<'cover' | 'inspection' | 'result'>('cover')

  return (
    <main className="min-h-screen bg-[color:var(--bg-canvas)] text-[color:var(--text-primary)] relative px-4 py-8 sm:px-6 lg:px-12">

      <div className="mx-auto w-full max-w-4xl space-y-8">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-start gap-3">
          <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            <strong className="font-semibold">Spec Fase D</strong> — Simulacro SUNAFIL
            immersive. Inspector virtual tipo chat. Reemplaza el flujo actual
            (1,200+ líneas) por una experiencia secuencial tipo conversación.
            Acta de Requerimiento generada como PDF al final (R.M. 199-2016-TR).
          </span>
        </div>

        {phase === 'cover' ? <Cover onStart={() => setPhase('inspection')} /> : null}
        {phase === 'inspection' ? (
          <InspectionChat onFinish={() => setPhase('result')} />
        ) : null}
        {phase === 'result' ? <ResultCover onRestart={() => setPhase('cover')} /> : null}
      </div>
    </main>
  )
}

/* ── Cover ──────────────────────────────────────────────────────────── */

function Cover({ onStart }: { onStart: () => void }) {
  return (
    <section className="space-y-8 motion-fade-in-up">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-crimson-50 border border-crimson-200">
            <Siren className="h-5 w-5 text-crimson-700" />
          </span>
          <Badge variant="danger" size="sm" dot>
            Simulacro SUNAFIL
          </Badge>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight max-w-3xl mx-auto">
          Enfrentá una inspección sin riesgo
        </h1>
        <p className="text-lg text-[color:var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
          El inspector virtual va a pedirte los mismos documentos que pediría SUNAFIL.
          Descubrimos las brechas antes de que te multen, con descuento del 90% por
          subsanación voluntaria.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Pillar icon={Shield} title="28 documentos" description="Los mismos que SUNAFIL solicita por R.M. 199-2016-TR." />
        <Pillar icon={FileCheck} title="Verificación viva" description="Busco en tu legajo real. Verde si está, rojo si falta, naranja si venció." />
        <Pillar icon={FileText} title="Acta real" description="Al final descargás un Acta de Requerimiento formato SUNAFIL." />
      </div>

      <Card padding="md" variant="outline">
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-[color:var(--text-tertiary)] shrink-0" />
          <span className="text-sm text-[color:var(--text-secondary)]">
            Duración estimada: <strong className="text-[color:var(--text-primary)]">10–15 minutos</strong>.
            Puedes pausar y continuar después.
          </span>
        </div>
      </Card>

      <div className="flex justify-center">
        <Button
          size="lg"
          variant="danger"
          icon={<Siren className="h-4 w-4" />}
          onClick={onStart}
        >
          Iniciar simulacro
        </Button>
      </div>
    </section>
  )
}

function Pillar({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Card padding="md">
      <div className="flex flex-col items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-crimson-50 border border-crimson-200">
          <Icon className="h-4 w-4 text-crimson-700" />
        </span>
        <h3 className="text-base font-bold">{title}</h3>
        <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>
    </Card>
  )
}

/* ── Inspection chat ────────────────────────────────────────────────── */

function InspectionChat({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0)
  const conversation = [
    {
      role: 'inspector' as const,
      content: 'Buenos días. Soy el inspector virtual. Vamos a revisar los documentos obligatorios de tu empresa. Empecemos: ¿me puede mostrar el registro de asistencia del último mes?',
    },
    {
      role: 'system' as const,
      content: 'Revisando legajo digital…',
      verdict: 'verified' as const,
      detail: 'Registro de asistencia abril 2026 · Verificado el 10/04/26',
    },
    {
      role: 'inspector' as const,
      content: 'Bien. Ahora necesito ver el IPERC firmado por el comité SST para el puesto de Analista de Operaciones.',
    },
    {
      role: 'system' as const,
      content: 'Buscando IPERC por puesto…',
      verdict: 'missing' as const,
      detail: 'No se encontró IPERC firmado. Infracción GRAVE según D.S. 019-2006-TR.',
    },
    {
      role: 'inspector' as const,
      content: 'Anoto la observación. Último requerimiento: el examen médico ocupacional vigente de todos los trabajadores expuestos a riesgo.',
    },
    {
      role: 'system' as const,
      content: 'Revisando exámenes médicos…',
      verdict: 'expired' as const,
      detail: '3 exámenes médicos vencidos en los últimos 60 días. Infracción LEVE x 3.',
    },
  ]

  const visible = conversation.slice(0, step + 1)
  const done = step >= conversation.length - 1

  return (
    <section className="space-y-4 motion-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-crimson-50 border border-crimson-200">
            <Building2 className="h-3.5 w-3.5 text-crimson-700" />
          </span>
          <div>
            <p className="text-sm font-bold">Inspector virtual · Sesión 001</p>
            <p className="text-[11px] text-[color:var(--text-tertiary)]">
              Inspección preventiva · Sector Servicios
            </p>
          </div>
        </div>
        <Badge variant="critical" size="sm" dot>
          EN CURSO
        </Badge>
      </div>

      <Card padding="none" className="min-h-[420px] flex flex-col">
        <CardContent className="flex-1 space-y-3 !py-5">
          {visible.map((msg, idx) => (
            <InspectorMessage key={idx} msg={msg} />
          ))}
        </CardContent>
        <div className="px-6 py-4 border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]/40 flex items-center justify-between">
          <p className="text-xs text-[color:var(--text-tertiary)]">
            Paso {step + 1} de {conversation.length}
          </p>
          {done ? (
            <Button onClick={onFinish} iconRight={<ArrowRight className="h-3.5 w-3.5" />}>
              Ver informe
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setStep((s) => s + 1)}>
              Continuar
            </Button>
          )}
        </div>
      </Card>
    </section>
  )
}

function InspectorMessage({
  msg,
}: {
  msg:
    | { role: 'inspector'; content: string }
    | {
        role: 'system'
        content: string
        verdict: 'verified' | 'missing' | 'expired'
        detail: string
      }
}) {
  if (msg.role === 'inspector') {
    return (
      <div className="flex gap-3">
        <span className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-crimson-50 border border-crimson-200">
          <Building2 className="h-3.5 w-3.5 text-crimson-700" />
        </span>
        <Card variant="outline" padding="md" className="max-w-[75%]">
          <p className="text-sm leading-relaxed">{msg.content}</p>
        </Card>
      </div>
    )
  }
  const verdictMap = {
    verified: { color: 'emerald', icon: CheckCircle2, label: 'ENCONTRADO' },
    missing: { color: 'crimson', icon: AlertTriangle, label: 'FALTANTE' },
    expired: { color: 'amber', icon: AlertTriangle, label: 'VENCIDO' },
  } as const
  const v = verdictMap[msg.verdict]
  const VIcon = v.icon
  return (
    <div className="flex gap-3 justify-end">
      <Card
        variant={v.color === 'emerald' ? 'emerald' : v.color === 'crimson' ? 'crimson' : 'default'}
        padding="md"
        className="max-w-[75%]"
      >
        <div className="flex items-center gap-2 mb-2">
          <VIcon
            className={cn(
              'h-3.5 w-3.5',
              v.color === 'emerald'
                ? 'text-emerald-600'
                : v.color === 'crimson'
                  ? 'text-crimson-700'
                  : 'text-amber-700'
            )}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {v.label}
          </span>
        </div>
        <p className="text-xs text-[color:var(--text-tertiary)]">{msg.content}</p>
        <p className="mt-1 text-sm font-semibold">{msg.detail}</p>
      </Card>
      <span className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200">
        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
      </span>
    </div>
  )
}

/* ── Result cover ───────────────────────────────────────────────────── */

function ResultCover({ onRestart }: { onRestart: () => void }) {
  return (
    <section className="space-y-6 motion-fade-in-up">
      <div className="text-center space-y-2">
        <FileCheck className="h-10 w-10 text-emerald-600 mx-auto" />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Acta de Requerimiento generada
        </h1>
        <p className="text-[color:var(--text-secondary)] max-w-xl mx-auto">
          3 observaciones detectadas · multa potencial{' '}
          <strong className="text-crimson-700">S/ 28,800</strong>. Si subsanás antes de una
          inspección real, el descuento es del 90%.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FindingCard label="Infracciones leves" count={3} total="S/ 4,950" color="amber" />
        <FindingCard label="Infracciones graves" count={1} total="S/ 12,600" color="crimson" />
        <FindingCard label="Infracciones muy graves" count={0} total="—" color="neutral" />
      </div>

      <Card padding="lg">
        <CardHeader className="!p-0 !pb-4 !border-none">
          <div>
            <CardTitle>Vista previa del Acta</CardTitle>
            <CardDescription>
              Formato R.M. 199-2016-TR — listo para descargar como PDF
            </CardDescription>
          </div>
          <Badge variant="emerald" size="sm">
            PDF listo
          </Badge>
        </CardHeader>
        <CardContent className="!p-0">
          <SkeletonText lines={6} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 justify-center">
        <Button icon={<FileText className="h-4 w-4" />}>Descargar Acta (PDF)</Button>
        <Button variant="secondary">Generar plan de subsanación</Button>
        <Button variant="ghost" onClick={onRestart}>
          Rehacer simulacro
        </Button>
      </div>
    </section>
  )
}

function FindingCard({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: string
  color: 'amber' | 'crimson' | 'neutral'
}) {
  const BG = {
    amber: 'bg-amber-50 border-amber-200',
    crimson: 'bg-crimson-50 border-crimson-200',
    neutral: 'bg-[color:var(--neutral-100)] border-[color:var(--border-subtle)]',
  }[color]
  const TEXT = {
    amber: 'text-amber-700',
    crimson: 'text-crimson-700',
    neutral: 'text-[color:var(--text-tertiary)]',
  }[color]
  return (
    <div className={cn('rounded-xl border p-4', BG)}>
      <p className="text-[11px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
        {label}
      </p>
      <p className={cn('mt-1 text-3xl font-bold tabular-nums', TEXT)}>{count}</p>
      <p className="mt-1 text-xs text-[color:var(--text-secondary)] font-mono">{total}</p>
    </div>
  )
}
