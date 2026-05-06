'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  HardHat,
  ShieldAlert,
  ClipboardList,
  GraduationCap,
  Activity,
  Users2,
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProgressRing } from '@/components/ui/progress-ring'
import { SkeletonStats } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/comply360/editorial-title'
import { useCopilot } from '@/providers/copilot-provider'

/**
 * SST Hub — Fase D Sprint 3.
 *
 * Reemplaza la página monstruo de 1,327 líneas (preservada como
 * `.page-legacy.tsx.bak`) por un hub con 7 tabs temáticos:
 *   Política SST · IPERC · Capacitaciones · Accidentes · Comité SST ·
 *   Exámenes médicos · EPP.
 *
 * Cada tab muestra un panorama + CTA al módulo especializado o al formulario
 * correspondiente. La integración profunda de cada tab se hará por sprints
 * — lo que importa ahora es la arquitectura clara y la identidad visual.
 */

interface SstSummary {
  politicaVigente: boolean
  ipercCount: number
  ipercPendiente: number
  capacitacionesEsteAnio: number
  accidentesUlt30d: number
  examenesVencidos: number
  eppPendientes: number
  scoreSst: number
}

const FALLBACK: SstSummary = {
  politicaVigente: false,
  ipercCount: 0,
  ipercPendiente: 0,
  capacitacionesEsteAnio: 0,
  accidentesUlt30d: 0,
  examenesVencidos: 0,
  eppPendientes: 0,
  scoreSst: 0,
}

export default function SstHub() {
  const copilot = useCopilot()
  const [summary, setSummary] = useState<SstSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetch('/api/sst/summary')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!mounted) return
        setSummary((d?.data ?? d ?? FALLBACK) as SstSummary)
        setLoading(false)
      })
      .catch(() => {
        if (mounted) {
          setSummary(FALLBACK)
          setLoading(false)
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <Header />
      <OnboardingBanner />
      {loading ? <SkeletonStats count={4} /> : <StatsRow summary={summary ?? FALLBACK} />}

      <Tabs defaultValue="overview">
        <TabsList variant="underline" fullWidth className="overflow-x-auto">
          <TabsTrigger variant="underline" value="overview">
            <ShieldCheck className="h-3.5 w-3.5" /> Panorama
          </TabsTrigger>
          <TabsTrigger variant="underline" value="politica">
            <BookOpen className="h-3.5 w-3.5" /> Política
          </TabsTrigger>
          <TabsTrigger variant="underline" value="iperc">
            <ShieldAlert className="h-3.5 w-3.5" /> IPERC
          </TabsTrigger>
          <TabsTrigger variant="underline" value="capacitaciones">
            <GraduationCap className="h-3.5 w-3.5" /> Capacitaciones
          </TabsTrigger>
          <TabsTrigger variant="underline" value="accidentes">
            <Activity className="h-3.5 w-3.5" /> Accidentes
          </TabsTrigger>
          <TabsTrigger variant="underline" value="comite">
            <Users2 className="h-3.5 w-3.5" /> Comité
          </TabsTrigger>
          <TabsTrigger variant="underline" value="examenes">
            <ClipboardList className="h-3.5 w-3.5" /> Exámenes
          </TabsTrigger>
          <TabsTrigger variant="underline" value="epp">
            <HardHat className="h-3.5 w-3.5" /> EPP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Overview summary={summary ?? FALLBACK} onAskCopilot={() => copilot.open('Dame el plan priorizado para mejorar mi score SST hoy')} />
        </TabsContent>
        <TabsContent value="politica">
          <TabBody
            icon={BookOpen}
            title="Política SST"
            description="Documento obligatorio con los 8 elementos del Art. 22 Ley 29783. Generador con firma del empleador."
            actionLabel="Generar política"
            actionHref="/dashboard/sst/politica"
          />
        </TabsContent>
        <TabsContent value="iperc">
          <TabBody
            icon={ShieldAlert}
            title="IPERC — Identificación de Peligros y Evaluación de Riesgos"
            description="Matriz formato R.M. 050-2013-TR con biblioteca de 500+ peligros por sector. Cálculo A × B automático."
            actionLabel="Abrir IPERC"
            actionHref="/dashboard/sst/iperc"
          />
        </TabsContent>
        <TabsContent value="capacitaciones">
          <TabBody
            icon={GraduationCap}
            title="Capacitaciones SST"
            description="4 capacitaciones obligatorias por año. Registro de asistencia, evaluación y certificado con QR. El módulo de Capacitaciones vive en hub Equipo; este enlace filtra solo categoría SST."
            actionLabel="Ver capacitaciones SST"
            actionHref="/dashboard/capacitaciones?category=SST"
          />
        </TabsContent>
        <TabsContent value="accidentes">
          <TabBody
            icon={Activity}
            title="Accidentes e incidentes"
            description="Formato SUNAFIL con notificación 24h al MTPE. Línea de tiempo con investigaciones y medidas."
            actionLabel="Registrar accidente"
            actionHref="/dashboard/sst/accidentes/nuevo"
          />
        </TabsContent>
        <TabsContent value="comite">
          <TabBody
            icon={Users2}
            title="Comité / Supervisor SST"
            description="Gestión electoral bianual, actas mensuales, mandato y estructura según tamaño de empresa."
            actionLabel="Gestionar Comité"
            actionHref="/dashboard/sst/comite"
          />
        </TabsContent>
        <TabsContent value="examenes">
          <TabBody
            icon={ClipboardList}
            title="Exámenes médicos ocupacionales"
            description="Control de vencimientos pre-ocupacional, anual y de retiro. Alertas 30/15/7 días antes."
            actionLabel="Ver exámenes"
            actionHref="/dashboard/sst/examenes"
          />
        </TabsContent>
        <TabsContent value="epp">
          <TabBody
            icon={HardHat}
            title="Entrega de EPP"
            description="Registro de entrega por trabajador con firma digital. Inventario, vida útil y reposición."
            actionLabel="Registrar entrega"
            actionHref="/dashboard/sst/epp"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ── Subcomponents ──────────────────────────────────────────────────── */

function Header() {
  return (
    <PageHeader
      eyebrow="SST"
      title="Seguridad y salud <em>al día</em>."
      subtitle="Hub de compliance SST: política, IPERC, capacitaciones, comité, accidentes, exámenes médicos y EPP. Todo lo que SUNAFIL revisa en una inspección."
      actions={
        <Link
          href="/dashboard/simulacro?mode=sst"
          className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white hover:bg-[color:var(--neutral-50)] text-[color:var(--text-primary)] px-3.5 py-2 text-xs font-semibold transition-colors"
        >
          Simulacro SST
        </Link>
      }
    />
  )
}

function StatsRow({ summary }: { summary: SstSummary }) {
  const stats = [
    {
      label: 'Política SST',
      value: summary.politicaVigente ? 'Vigente' : 'Pendiente',
      variant: summary.politicaVigente ? ('success' as const) : ('danger' as const),
    },
    {
      label: 'IPERC completos',
      value: `${summary.ipercCount - summary.ipercPendiente} / ${summary.ipercCount}`,
      variant: summary.ipercPendiente === 0 ? ('success' as const) : ('warning' as const),
    },
    {
      label: 'Capacitaciones año',
      value: `${summary.capacitacionesEsteAnio} / 4`,
      variant: summary.capacitacionesEsteAnio >= 4 ? ('success' as const) : ('warning' as const),
    },
    {
      label: 'Accidentes 30d',
      value: summary.accidentesUlt30d,
      variant: summary.accidentesUlt30d === 0 ? ('success' as const) : ('danger' as const),
    },
  ]
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <Card key={s.label} padding="md">
          <p className="text-[11px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
            {s.label}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{s.value}</p>
          <Badge variant={s.variant} size="xs" className="mt-2">
            {s.variant === 'success' ? 'OK' : s.variant === 'danger' ? 'Crítico' : 'Atender'}
          </Badge>
        </Card>
      ))}
    </section>
  )
}

function Overview({
  summary,
  onAskCopilot,
}: {
  summary: SstSummary
  onAskCopilot: () => void
}) {
  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-center rounded-2xl border border-[color:var(--border-default)] bg-white shadow-[var(--elevation-3)] p-6 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[4px] before:bg-[image:var(--accent-bar-amber)]">
      <ProgressRing value={summary.scoreSst} size={160} stroke={12}>
        <div className="text-center">
          <div className="text-4xl font-bold tracking-tight">{summary.scoreSst}</div>
          <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] mt-0.5">
            score SST
          </div>
        </div>
      </ProgressRing>
      <div className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">
          {summary.scoreSst >= 80 ? 'SST en buena forma' : summary.scoreSst >= 60 ? 'Mejorable' : 'Requiere acción urgente'}
        </h2>
        <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed max-w-xl">
          {summary.examenesVencidos > 0 ? (
            <>
              Tienes <strong className="text-crimson-700">{summary.examenesVencidos}</strong>{' '}
              exámenes médicos vencidos y{' '}
              <strong className="text-amber-700">{summary.ipercPendiente}</strong> IPERC
              pendientes. Resolverlos sube tu score SST ~15 puntos.
            </>
          ) : summary.ipercPendiente > 0 ? (
            <>Tienes {summary.ipercPendiente} IPERC por completar. Priorizalos esta semana.</>
          ) : (
            <>Sin observaciones críticas activas. Mantén las capacitaciones al día.</>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={onAskCopilot}>
            Plan IA priorizado
          </Button>
          <Button asChild>
            <Link href="/dashboard/diagnostico">
              Diagnóstico completo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          {/* Acceso filtrado a capacitaciones SST: el módulo vive en hub Equipo,
              pero desde SST es prioritario verlas pre-filtradas por la Ley 29783. */}
          <Button variant="secondary" asChild>
            <Link href="/dashboard/capacitaciones?category=SST">
              <GraduationCap className="h-3.5 w-3.5" />
              Capacitaciones SST
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function TabBody({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  actionLabel: string
  actionHref: string
}) {
  return (
    <Card padding="lg">
      <CardHeader className="!p-0 !border-none !pb-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 border border-amber-200">
            <Icon className="h-5 w-5 text-amber-600" />
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="!p-0 !pt-2">
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={actionHref}>
              {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard/sst?legacy=1">Ver módulo completo</Link>
          </Button>
        </div>
        <Card variant="outline" padding="md" className="mt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
            <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">
              Esta pestaña delega a su módulo especializado. La integración inline
              (formularios, listados con filtros) está planificada para sprints
              siguientes — mientras tanto el CTA te lleva al flujo completo.
            </p>
          </div>
        </Card>
      </CardContent>
    </Card>
  )
}

/**
 * Banner de onboarding SST Premium (Fase 5).
 *
 * Solo se muestra si el onboarding está incompleto. Carga el estado en
 * background (no bloquea el render del hub) y se oculta silenciosamente si
 * el endpoint falla — el hub debe seguir siendo usable aunque /sst/onboarding
 * tenga un problema.
 */
function OnboardingBanner() {
  const [status, setStatus] = useState<{
    completo: boolean
    completados: number
    total: number
    porcentaje: number
  } | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/sst/onboarding/status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j) setStatus(j)
      })
      .catch(() => {
        // silent fail — el banner es opcional
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!status || status.completo || dismissed) return null

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-50/40">
      <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              Configura tu SGSST en {status.total - status.completados}{' '}
              {status.total - status.completados === 1 ? 'paso' : 'pasos'} más
            </p>
            <p className="text-xs text-emerald-800">
              Sede → Puesto → IPERC con IA. Listo en menos de 10 minutos.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-emerald-200/60">
                <div className="h-full bg-emerald-600" style={{ width: `${status.porcentaje}%` }} />
              </div>
              <span className="text-[10px] font-medium text-emerald-800">
                {status.porcentaje}%
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/dashboard/sst/onboarding">
              {status.completados === 0 ? 'Empezar' : 'Continuar'}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs text-emerald-800 hover:text-emerald-900"
          >
            Ahora no
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
