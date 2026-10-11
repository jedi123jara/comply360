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
  Sparkles,
  ArrowRight,
  Target,
  Building2,
  ClipboardCheck,
  Vote,
  ScrollText,
  FileText,
  Gauge,
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
 *
 * Al final, "Más herramientas de SST" enlaza las páginas de SST que no están
 * en el menú lateral (`hidden` en NAV_HUBS): sedes, visitas, elecciones del
 * comité, memoria anual, procedimientos PETS/PETAR/ATS y puntaje SST.
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
          <Overview summary={summary ?? FALLBACK} onAskCopilot={() => copilot.open('Dame el plan priorizado para mejorar mi puntaje de seguridad y salud en el trabajo (SST) hoy')} />
        </TabsContent>
        <TabsContent value="politica">
          <TabBody
            icon={BookOpen}
            title="Política de SST"
            description="Documento obligatorio en el que tu empresa se compromete a cuidar la seguridad y la salud de su personal (Ley 29783, art. 22). Lo generamos con tus datos, listo para que lo firmes."
            actionLabel="Generar política"
            actionHref="/dashboard/generadores/politica-sst"
          />
        </TabsContent>
        <TabsContent value="iperc">
          <TabBody
            icon={ShieldAlert}
            title="Riesgos por puesto (IPERC)"
            description="IPERC: identificación de peligros, evaluación de riesgos y medidas de control. Anotas los peligros de cada puesto y el sistema calcula qué tan grave es cada riesgo, en el formato oficial (R.M. 050-2013-TR)."
            actionLabel="Abrir IPERC"
            actionHref="/dashboard/sst/iperc"
          />
        </TabsContent>
        <TabsContent value="capacitaciones">
          <TabBody
            icon={GraduationCap}
            title="Capacitaciones de SST"
            description="Al menos 4 capacitaciones de seguridad y salud al año, con asistencia, evaluación y certificado. El botón te lleva a Capacitaciones (en Mi personal) mostrando solo las de SST."
            actionLabel="Ver capacitaciones SST"
            actionHref="/dashboard/capacitaciones?category=SST"
          />
        </TabsContent>
        <TabsContent value="accidentes">
          <TabBody
            icon={Activity}
            title="Accidentes e incidentes"
            description="Registra cada accidente o incidente, avisa a tiempo al Ministerio de Trabajo y sigue su investigación y las medidas para que no se repita."
            actionLabel="Registrar accidente"
            actionHref="/dashboard/sst/accidentes/nuevo"
          />
        </TabsContent>
        <TabsContent value="comite">
          <TabBody
            icon={Users2}
            title="Comité o supervisor de SST"
            description="Miembros, elecciones, reuniones mensuales y actas. Con 20 trabajadores o más necesitas un comité; con menos, basta un supervisor de SST."
            actionLabel="Gestionar Comité"
            actionHref="/dashboard/sst/comite"
          />
        </TabsContent>
        <TabsContent value="examenes">
          <TabBody
            icon={ClipboardList}
            title="Exámenes médicos ocupacionales"
            description="Exámenes médicos al ingresar, periódicos y al salir de la empresa. Te avisamos 30, 15 y 7 días antes de que venzan."
            actionLabel="Ver exámenes"
            actionHref="/dashboard/sst/emo"
          />
        </TabsContent>
        <TabsContent value="epp">
          <TabBody
            icon={HardHat}
            title="Entrega de equipos de protección (EPP)"
            description="Registra qué equipos (casco, guantes, lentes…) entregas a cada trabajador, con su firma, y cuándo toca reponerlos."
            actionLabel="Registrar entrega"
            actionHref="/dashboard/sst/epp"
          />
        </TabsContent>
      </Tabs>

      <MoreSstTools />
    </div>
  )
}

/* ── Subcomponents ──────────────────────────────────────────────────── */

function Header() {
  return (
    <PageHeader
      eyebrow="SST"
      title="Seguridad y salud <em>al día</em>."
      subtitle="Seguridad y salud en el trabajo (SST, Ley 29783): política, riesgos por puesto, capacitaciones, comité, accidentes, exámenes médicos y equipos de protección. Todo lo que SUNAFIL revisa en una inspección."
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
      label: 'Política de SST',
      value: summary.politicaVigente ? 'Vigente' : 'Pendiente',
      variant: summary.politicaVigente ? ('success' as const) : ('danger' as const),
    },
    {
      label: 'IPERC completos',
      value: `${summary.ipercCount - summary.ipercPendiente} / ${summary.ipercCount}`,
      variant: summary.ipercPendiente === 0 ? ('success' as const) : ('warning' as const),
    },
    {
      label: 'Capacitaciones este año',
      value: `${summary.capacitacionesEsteAnio} / 4`,
      variant: summary.capacitacionesEsteAnio >= 4 ? ('success' as const) : ('warning' as const),
    },
    {
      label: 'Accidentes (últimos 30 días)',
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
            {s.variant === 'success' ? 'Al día' : s.variant === 'danger' ? 'Urgente' : 'Por atender'}
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
            puntaje SST
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
              pendientes. Resolverlos sube tu puntaje SST unos 15 puntos.
            </>
          ) : summary.ipercPendiente > 0 ? (
            <>Tienes {summary.ipercPendiente} IPERC por completar. Priorízalos esta semana.</>
          ) : (
            <>Sin observaciones críticas activas. Mantén las capacitaciones al día.</>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={onAskCopilot}>
            Plan priorizado con IA
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard/plan-accion">
              <Target className="h-3.5 w-3.5" />
              Ver pendientes
            </Link>
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
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Páginas de SST que no están en el menú lateral. Cada una con una línea que
 * explica para qué sirve (y qué significan sus siglas).
 */
const MORE_SST_TOOLS: ReadonlyArray<{
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}> = [
  {
    href: '/dashboard/sst/sedes',
    icon: Building2,
    title: 'Sedes de trabajo',
    description: 'Registra tus locales, los puestos de trabajo de cada uno y su mapa de riesgos.',
  },
  {
    href: '/dashboard/sst/visitas',
    icon: ClipboardCheck,
    title: 'Visitas de verificación',
    description: 'Visitas a tus sedes para revisar las condiciones de seguridad y anotar lo que hay que corregir.',
  },
  {
    href: '/dashboard/sst/comite/elecciones',
    icon: Vote,
    title: 'Elecciones del comité',
    description: 'Organiza la votación en la que tus trabajadores eligen a sus representantes en el comité de SST.',
  },
  {
    href: '/dashboard/sst/memoria-anual',
    icon: ScrollText,
    title: 'Memoria anual',
    description: 'Informe de cierre de año: lo que se hizo en seguridad y salud, qué se cumplió del plan y qué mejorar.',
  },
  {
    href: '/dashboard/sst/pets-petar-ats',
    icon: FileText,
    title: 'Procedimientos de trabajo seguro (PETS, PETAR, ATS)',
    description:
      'PETS: los pasos escritos para hacer una tarea sin riesgo. PETAR: el permiso para trabajos de alto riesgo, como en altura. ATS: la revisión rápida de riesgos antes de empezar una tarea.',
  },
  {
    href: '/dashboard/sst/score',
    icon: Gauge,
    title: 'Puntaje de SST',
    description: 'Qué tan completa está tu seguridad y salud en el trabajo, qué te falta y cuánto arriesgas en multas.',
  },
]

function MoreSstTools() {
  return (
    <section aria-labelledby="mas-herramientas-sst" className="space-y-3">
      <div>
        <h2 id="mas-herramientas-sst" className="text-lg font-bold tracking-tight">
          Más herramientas de SST
        </h2>
        <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">
          Otras páginas de seguridad y salud que usarás en algún momento del año.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MORE_SST_TOOLS.map(({ href, icon: Icon, title, description }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full items-start gap-3 rounded-xl border border-[color:var(--border-default)] bg-white p-4 transition-colors hover:border-amber-300 hover:bg-[color:var(--bg-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start gap-1.5 text-sm font-semibold text-[color:var(--text-primary)]">
                  <span>{title}</span>
                  <ArrowRight
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--text-tertiary)] transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-[color:var(--text-secondary)]">
                  {description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
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
              Configura tu sistema de seguridad y salud en {status.total - status.completados}{' '}
              {status.total - status.completados === 1 ? 'paso' : 'pasos'} más
            </p>
            <p className="text-xs text-emerald-800">
              Registra tu sede, sus puestos y sus riesgos (IPERC) con ayuda de la IA. Te toma menos de 10 minutos.
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
