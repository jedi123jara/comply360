'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Copy,
  FileText,
  Fingerprint,
  FolderOpen,
  GraduationCap,
  IdCard,
  ListChecks,
  Lock,
  PartyPopper,
  PenLine,
  PiggyBank,
  Plane,
  ShieldCheck,
  Sparkles,
  Flame,
  Trophy,
  Users,
  Wallet,
  Share2,
  X,
} from 'lucide-react'
import { EnableNotifications } from '@/components/pwa/enable-notifications'
import { ConfettiCard } from '@/components/mi-portal/confetti-card'
import { formatSoles } from '@/lib/format/peruvian'

interface PortalSummary {
  worker: {
    firstName: string
    lastName: string
    dni: string
    position: string | null
    department: string | null
    fechaIngreso: string
    regimenLaboral: string
    organization: { name: string; ruc: string | null }
  }
  stats: {
    boletasPendientes: number
    solicitudesPendientes: number
    capacitacionesPendientes: number
    documentosFaltantes: number
    vacacionesPendientes: number
    vacacionesCriticas: boolean
    asistenciaMes: {
      diasMarcados: number
      diasLaborales: number
      tardanzas: number
      horasTrabajadas: number
      ultimaMarcacion: {
        clockIn: string
        clockOut: string | null
        status: string
      } | null
    }
    ctsProjection: {
      nextCut: string
      ctsTotal: number
    } | null
  }
  pulse?: {
    streakDays: number
    levelName: string
    score: number
    teamProgress: number
    percentileLabel: string
    nextActionLabel: string
    feedPreview: string[]
  }
  ultimaBoleta: { periodo: string; netoPagar: string } | null
  proximasCapacitaciones: Array<{ id: string; title: string; deadline: string | null }>
}

type PendingAction = {
  id: string
  icon: LucideIcon
  title: string
  description: string
  deadline?: string | null
  severity?: 'critical' | 'high' | 'medium' | 'info'
  href: string
}

type Tone = 'emerald' | 'blue' | 'amber' | 'violet' | 'rose'

function formatPeriodo(periodo: string): string {
  const parts = periodo.split('-')
  if (parts.length < 2) return periodo
  const [year, month] = parts
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]
  const m = parseInt(month, 10) - 1
  return `${months[m] ?? month} ${year}`
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRegimen(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase()
}

function aniversarioProximo(fechaIngresoIso: string): { years: number; daysUntil: number } | null {
  try {
    const ingreso = new Date(fechaIngresoIso)
    const today = new Date()
    const nextAnniversary = new Date(today.getFullYear(), ingreso.getMonth(), ingreso.getDate())
    if (nextAnniversary < today) {
      nextAnniversary.setFullYear(today.getFullYear() + 1)
    }
    const daysUntil = Math.ceil((nextAnniversary.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
    if (daysUntil > 30 || daysUntil < 0) return null
    const years = nextAnniversary.getFullYear() - ingreso.getFullYear()
    if (years < 1) return null
    return { years, daysUntil }
  } catch {
    return null
  }
}

export default function MiPortalHomePage() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<PortalSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isWorkerPreview =
    process.env.NODE_ENV === 'development' && searchParams.get('__workerPreview') === '1'

  function withPortalHref(href: string): string {
    if (!isWorkerPreview || href.startsWith('#') || /^https?:\/\//.test(href)) return href
    if (href.includes('__workerPreview=')) return href
    return `${href}${href.includes('?') ? '&' : '?'}__workerPreview=1`
  }

  useEffect(() => {
    let mounted = true
    fetch(`/api/mi-portal/resumen${isWorkerPreview ? '?__workerPreview=1' : ''}`)
      .then((r) => {
        if (!r.ok) throw new Error('No se pudo cargar tu información')
        return r.json()
      })
      .then((d: PortalSummary) => {
        if (mounted) setData(d)
      })
      .catch((e: Error) => {
        if (mounted) setError(e.message)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [isWorkerPreview])

  const pendingActions = useMemo<PendingAction[]>(() => {
    if (!data) return []
    const actions: PendingAction[] = []

    if (data.stats.boletasPendientes > 0) {
      actions.push({
        id: 'boletas',
        icon: PenLine,
        title:
          data.stats.boletasPendientes === 1
            ? 'Firma tu boleta pendiente'
            : `Firma ${data.stats.boletasPendientes} boletas pendientes`,
        description: 'Confirma la recepción con tu huella para que quede auditada.',
        severity: 'medium',
        href: '/mi-portal/boletas',
      })
    }

    if (data.stats.solicitudesPendientes > 0) {
      actions.push({
        id: 'solicitudes',
        icon: ClipboardList,
        title:
          data.stats.solicitudesPendientes === 1
            ? 'Tienes 1 solicitud en trámite'
            : `Tienes ${data.stats.solicitudesPendientes} solicitudes en trámite`,
        description: 'Revisa el estado y próximos pasos de tus solicitudes.',
        severity: 'info',
        href: '/mi-portal/solicitudes',
      })
    }

    if (data.stats.vacacionesPendientes > 0) {
      actions.push({
        id: 'vacaciones',
        icon: Plane,
        title:
          data.stats.vacacionesPendientes === 1
            ? 'Tienes 1 día de vacaciones disponible'
            : `Tienes ${data.stats.vacacionesPendientes} días de vacaciones disponibles`,
        description: data.stats.vacacionesCriticas
          ? 'Hay vacaciones acumuladas que conviene coordinar pronto con RRHH.'
          : 'Días acumulados que puedes disfrutar cuando lo necesites.',
        severity: data.stats.vacacionesCriticas ? 'high' : 'info',
        href: '/mi-portal/solicitudes/nueva',
      })
    }

    if (data.stats.documentosFaltantes > 0) {
      actions.push({
        id: 'docs',
        icon: FileText,
        title:
          data.stats.documentosFaltantes === 1
            ? 'Sube 1 documento faltante'
            : `Sube ${data.stats.documentosFaltantes} documentos faltantes`,
        description: 'Tu legajo está incompleto. Complétalo para cumplir con el registro laboral.',
        severity: data.stats.documentosFaltantes > 5 ? 'high' : 'medium',
        href: '/mi-portal/documentos',
      })
    }

    if (data.stats.capacitacionesPendientes > 0) {
      actions.push({
        id: 'capac',
        icon: GraduationCap,
        title:
          data.stats.capacitacionesPendientes === 1
            ? 'Tienes 1 capacitación pendiente'
            : `Tienes ${data.stats.capacitacionesPendientes} capacitaciones pendientes`,
        description: 'Completa tus cursos obligatorios y guarda tu constancia en el portal.',
        deadline: data.proximasCapacitaciones[0]?.deadline ?? null,
        href: '/mi-portal/capacitaciones',
      })
    }

    return actions
  }, [data])

  if (loading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={error} />

  const { worker, ultimaBoleta, proximasCapacitaciones } = data
  const { asistenciaMes, ctsProjection } = data.stats
  const fullName = `${worker.firstName} ${worker.lastName}`.trim()
  const initial = worker.firstName.charAt(0).toUpperCase()
  const idCardCode = `C360-${worker.dni.slice(-4)}`
  const portalPendingActions = pendingActions.map((action) => ({
    ...action,
    href: withPortalHref(action.href),
  }))
  const topAction = portalPendingActions[0] ?? null
  const aniv = aniversarioProximo(worker.fechaIngreso)
  const asistenciaRatio =
    asistenciaMes.diasLaborales > 0
      ? Math.round((asistenciaMes.diasMarcados / asistenciaMes.diasLaborales) * 100)
      : 0
  const documentosDisponibles = Math.max(0, 12 - data.stats.documentosFaltantes)
  const pulseHref = withPortalHref('/mi-portal/pulse')

  const quickActions = [
    {
      href: withPortalHref('/mi-portal/boletas'),
      icon: PenLine,
      title: 'Firmar boletas',
      description:
        data.stats.boletasPendientes > 0
          ? `Tienes ${data.stats.boletasPendientes} ${data.stats.boletasPendientes === 1 ? 'boleta pendiente' : 'boletas pendientes'} de firma`
          : 'Todas tus boletas están al día',
      tone: 'emerald' as const,
    },
    {
      href: withPortalHref('/mi-portal/asistencia'),
      icon: Clock3,
      title: 'Ver asistencia',
      description: `${asistenciaRatio}% registrado este mes`,
      tone: 'blue' as const,
    },
    {
      href: withPortalHref('/mi-portal/solicitudes/nueva'),
      icon: Plane,
      title: 'Solicitar vacaciones',
      description:
        data.stats.vacacionesPendientes > 0
          ? `Tienes ${data.stats.vacacionesPendientes} días disponibles`
          : 'Solicita tus días libres',
      tone: 'amber' as const,
    },
    {
      href: withPortalHref('/mi-portal/documentos'),
      icon: FolderOpen,
      title: 'Mis documentos',
      description: 'Accede a tus documentos',
      tone: 'violet' as const,
    },
  ]

  return (
    <div className="c360-worker-reference c360-worker-premium c360-page-enter">
      <section className="c360-ref-top-grid" aria-label="Inicio del portal trabajador">
        <div className="c360-ref-hero">
          <div className="c360-premium-hero-ribbons" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="c360-hero-dot-grid c360-hero-dots" aria-hidden="true" />
          <span className="c360-hero-check-bubble" aria-hidden="true">
            <CheckCircle2 className="h-9 w-9" />
          </span>
          <span className="c360-hero-live-badge" aria-hidden="true">
            <ShieldCheck className="h-4 w-4" />
            Verificado
          </span>
          <div className="c360-ref-hero-copy">
            <h1>
              Hola, {worker.firstName}
              <span className="c360-wave-emoji" aria-hidden="true">👋</span>
            </h1>
            <p>Todo lo que necesitas de tu relación laboral, en un solo lugar.</p>
            <div className="c360-ref-hero-actions">
              <Link href="#pendientes" className="c360-ref-primary">
                <CheckCircle2 className="h-5 w-5" />
                Resolver pendientes
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="#credencial" className="c360-ref-secondary">
                <IdCard className="h-5 w-5" />
                Ver mi credencial
              </Link>
            </div>
          </div>
          <WorkerHeroIllustration />
        </div>

        <Link href={topAction?.href ?? withPortalHref('/mi-portal')} className="c360-ref-recommendation">
          <div>
            <span className="c360-ref-pill">
              <Sparkles className="h-3.5 w-3.5" />
              Recomendado para ti
            </span>
            <h2>{topAction ? topAction.title : 'Tu portal está al día'}</h2>
            <p>
              {topAction
                ? topAction.description
                : 'No hay acciones urgentes. Puedes revisar tu credencial o tus movimientos.'}
            </p>
            <span className="c360-ref-small-button">
              Resolver ahora
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
          <FingerprintDocGraphic />
        </Link>
      </section>

      <section className="c360-ref-section" aria-label="Accesos rápidos">
        <h2>Accesos rápidos</h2>
        <div className="c360-ref-quick-grid">
          {quickActions.map((item) => (
            <QuickCard key={item.href} {...item} />
          ))}
        </div>
      </section>

      {data.pulse ? (
        <PulseHomeModule pulse={data.pulse} href={pulseHref} />
      ) : null}

      <section className="c360-ref-main-grid">
        <div className="c360-ref-left-column space-y-6">
          <TodayCommand
            actions={portalPendingActions}
            notificationsHref={withPortalHref('/mi-portal/notificaciones')}
          />

          <section className="c360-ref-section c360-ref-metrics-section">
            <h2>Tus métricas personales</h2>
            <div className="c360-ref-metric-grid">
              <MetricTile
                icon={CheckCircle2}
                label="Última marca"
                value={formatTime(asistenciaMes.ultimaMarcacion?.clockIn)}
                description={
                  asistenciaMes.ultimaMarcacion
                    ? `Hoy · ${formatShortDate(asistenciaMes.ultimaMarcacion.clockIn)}`
                    : 'Sin marca reciente'
                }
                badge={asistenciaMes.ultimaMarcacion ? 'A tiempo' : undefined}
                tone="emerald"
              />
              <MetricTile
                icon={PenLine}
                label="Firmas pendientes"
                value={`${data.stats.boletasPendientes}`}
                description="Boletas por firmar"
                tone="blue"
              />
              <MetricTile
                icon={FolderOpen}
                label="Documentos disponibles"
                value={`${documentosDisponibles}`}
                description="Documentos listos para descargar"
                tone="violet"
              />
            </div>
          </section>

          <section id="pendientes" className="c360-ref-section c360-ref-movements-section scroll-mt-24">
            <div className="c360-ref-section-head">
              <h2>Últimos movimientos</h2>
              <Link href={withPortalHref('/mi-portal/notificaciones')}>Ver todos</Link>
            </div>
            {portalPendingActions.length > 0 ? (
              <div className="c360-ref-movement-list">
                {portalPendingActions.slice(0, 4).map((action) => (
                  <MovementRow key={action.id} action={action} />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </section>
        </div>

        <aside className="c360-ref-side-column space-y-6">
          <section id="credencial" className="c360-ref-section c360-ref-credential-section scroll-mt-24">
            <h2>Mi credencial digital</h2>
            <ReferenceCredential
              name={fullName}
              position={worker.position}
              dni={worker.dni}
              code={idCardCode}
              organization={worker.organization.name}
              initial={initial}
            />
          </section>

          <section className="c360-ref-section c360-ref-status-section">
            <h2>Tu estado laboral</h2>
            <div className="c360-ref-status-grid">
              <StatusCard
                icon={ShieldCheck}
                title={data.stats.documentosFaltantes > 0 ? 'Legajo pendiente' : 'Legajo completo'}
                description={
                  data.stats.documentosFaltantes > 0
                    ? `${data.stats.documentosFaltantes} documentos por completar`
                    : 'Toda tu información está al día'
                }
                tone="emerald"
              />
              <StatusCard
                icon={BadgeCheck}
                title="Cuenta verificada"
                description="Tu identidad ha sido verificada"
                tone="blue"
              />
              <StatusCard
                icon={Lock}
                title="Datos protegidos"
                description="Tu información está segura con nosotros"
                tone="emerald"
              />
              <StatusCard
                icon={IdCard}
                title="Credencial activa"
                description="Tu credencial digital está activa"
                tone="violet"
              />
            </div>
          </section>
        </aside>
      </section>

      {isWorkerPreview ? null : <EnableNotifications variant="inline" context="worker" />}

      <section className="c360-ref-section">
        <div className="c360-ref-section-head">
          <h2>Resumen adicional</h2>
          <Link href={withPortalHref('/mi-portal/perfil')}>Ver perfil</Link>
        </div>
        <div className="c360-ref-extra-grid">
          <InfoTile
            icon={Wallet}
            label="Última boleta"
            value={ultimaBoleta ? formatSoles(ultimaBoleta.netoPagar) : '—'}
            description={ultimaBoleta ? formatPeriodo(ultimaBoleta.periodo) : 'Sin emisiones'}
            href={withPortalHref('/mi-portal/boletas')}
            tone="blue"
          />
          <InfoTile
            icon={PiggyBank}
            label="CTS proyectada"
            value={ctsProjection ? formatSoles(ctsProjection.ctsTotal) : 'No aplica'}
            description={ctsProjection ? `Corte ${formatShortDate(ctsProjection.nextCut)}` : formatRegimen(worker.regimenLaboral)}
            href={withPortalHref('/mi-portal/perfil')}
            tone="amber"
          />
          <InfoTile
            icon={Calendar}
            label="Asistencia"
            value={`${asistenciaMes.diasMarcados}/${asistenciaMes.diasLaborales}`}
            description={`Mes en curso · ${asistenciaMes.horasTrabajadas}h registradas`}
            href={withPortalHref('/mi-portal/asistencia')}
            tone="emerald"
          />
        </div>
      </section>

      {proximasCapacitaciones.length > 0 ? (
        <section className="c360-ref-section">
          <div className="c360-ref-section-head">
            <h2>Capacitaciones próximas</h2>
            <Link href={withPortalHref('/mi-portal/capacitaciones')}>Ver todas</Link>
          </div>
          <div className="c360-ref-movement-list">
            {proximasCapacitaciones.slice(0, 3).map((course) => (
              <Link key={course.id} href={withPortalHref('/mi-portal/capacitaciones')} className="c360-ref-movement-row c360-tone-blue">
                <span className="c360-ref-movement-icon">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong>{course.title}</strong>
                  <small>{course.deadline ? `Hasta ${formatShortDate(course.deadline)}` : 'Sin fecha límite'}</small>
                </span>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {aniv ? (
        <ConfettiCard
          icon={PartyPopper}
          eyebrow="Aniversario"
          title={`¡${aniv.years} ${aniv.years === 1 ? 'año' : 'años'}, buen avance!`}
          titleEmText="buen avance"
          sub={
            aniv.daysUntil === 0
              ? 'Tu aniversario es hoy. Revisa con RRHH el beneficio disponible.'
              : `Tu aniversario es en ${aniv.daysUntil} ${aniv.daysUntil === 1 ? 'día' : 'días'}.`
          }
        />
      ) : null}
    </div>
  )
}

function PulseHomeModule({
  pulse,
  href,
}: {
  pulse: NonNullable<PortalSummary['pulse']>
  href: string
}) {
  return (
    <section className="c360-pulse-home-module" aria-label="Pulse Laboral">
      <div className="c360-pulse-home-copy">
        <span className="c360-pulse-eyebrow">
          <Sparkles className="h-4 w-4" />
          Pulse Laboral
        </span>
        <h2>Tu ritmo, tus logros y el avance del equipo</h2>
        <p>
          Revisa qué toca hoy, celebra progreso real y reconoce a compañeros por su aporte diario.
        </p>
        <Link href={href} className="c360-pulse-home-action">
          Abrir Pulse
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="c360-pulse-home-stats">
        <div className="c360-pulse-home-score">
          <span>{pulse.score}</span>
          <small>{pulse.levelName}</small>
        </div>
        <div className="c360-pulse-home-microgrid">
          <span>
            <Flame className="h-4 w-4" />
            {pulse.streakDays} días de racha
          </span>
          <span>
            <Trophy className="h-4 w-4" />
            {pulse.percentileLabel}
          </span>
          <span>
            <Users className="h-4 w-4" />
            Equipo al {pulse.teamProgress}%
          </span>
          <span>
            <CheckCircle2 className="h-4 w-4" />
            {pulse.nextActionLabel}
          </span>
        </div>
      </div>

      <div className="c360-pulse-home-feed">
        {pulse.feedPreview.slice(0, 2).map((item) => (
          <span key={item}>
            <BadgeCheck className="h-4 w-4" />
            {item}
          </span>
        ))}
      </div>
    </section>
  )
}

function QuickCard({
  href,
  icon: Icon,
  title,
  description,
  tone,
}: {
  href: string
  icon: LucideIcon
  title: string
  description: string
  tone: Tone
}) {
  return (
    <Link href={href} className={`c360-ref-quick-card c360-tone-${tone}`}>
      <span className="c360-ref-card-icon">
        <Icon className="h-8 w-8" />
      </span>
      <span className="min-w-0 flex-1">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="c360-ref-arrow">
        <ChevronRight className="h-5 w-5" />
      </span>
    </Link>
  )
}

function TodayCommand({
  actions,
  notificationsHref,
}: {
  actions: PendingAction[]
  notificationsHref: string
}) {
  const firstAction = actions[0] ?? null
  const importantCount = actions.filter((action) => action.severity === 'high' || action.severity === 'medium').length
  const estimatedMinutes = actions.length === 0 ? 0 : Math.min(8, Math.max(2, actions.length * 2))
  const headline = actions.length === 0 ? 'Todo al día' : `${actions.length} ${actions.length === 1 ? 'pendiente' : 'pendientes'}`
  const focusLabel =
    actions.length === 0
      ? 'Sin pendientes'
      : importantCount > 0
        ? `${importantCount} ${importantCount === 1 ? 'prioritario' : 'prioritarios'}`
        : 'Sin urgencias'

  return (
    <section className="c360-ref-section c360-today-command-section">
      <div className="c360-ref-section-head c360-today-command-head">
        <span>
          <small>Plan diario</small>
          <h2>Tu día en 2 minutos</h2>
        </span>
        <Link href={notificationsHref}>Ver todo</Link>
      </div>

      <div className="c360-today-command">
        <div className="c360-today-command-summary">
          <span className="c360-today-command-orb">
            {actions.length === 0 ? <CheckCircle2 className="h-7 w-7" /> : <ListChecks className="h-7 w-7" />}
          </span>
          <div>
            <strong>{headline}</strong>
            <p>
              {actions.length === 0
                ? 'Tu portal no tiene acciones pendientes ahora mismo.'
                : `Ordenamos tus acciones para que empieces por lo más útil.`}
            </p>
          </div>
        </div>

        <div className="c360-today-command-metrics" aria-label="Resumen del día">
          <span>
            <strong>{focusLabel}</strong>
            <small>prioridad</small>
          </span>
          <span>
            <strong>{estimatedMinutes || 'OK'}</strong>
            <small>{estimatedMinutes ? 'min estimados' : 'sin tareas'}</small>
          </span>
          <span>
            <strong>{actions.length > 0 ? '1 paso' : 'Listo'}</strong>
            <small>siguiente</small>
          </span>
        </div>

        {firstAction ? (
          <Link href={firstAction.href} className="c360-today-command-primary">
            <span>
              <small>Empieza por</small>
              <strong>{firstAction.title}</strong>
            </span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        ) : (
          <Link href="#credencial" className="c360-today-command-primary is-calm">
            <span>
              <small>Siguiente recomendado</small>
              <strong>Ten tu credencial lista</strong>
            </span>
            <IdCard className="h-5 w-5" />
          </Link>
        )}

        <div className="c360-today-command-list">
          {(actions.length > 0 ? actions.slice(0, 3) : [
            {
              id: 'done-portal',
              icon: ShieldCheck,
              title: 'Portal al día',
              description: 'Sin acciones laborales pendientes.',
              href: '#credencial',
            },
            {
              id: 'done-credential',
              icon: IdCard,
              title: 'Credencial activa',
              description: 'Lista para mostrar cuando la necesites.',
              href: '#credencial',
            },
          ]).map((action, index) => {
            const Icon = action.icon
            return (
              <Link key={action.id} href={action.href} className="c360-today-command-item">
                <span className="c360-today-command-step">{index + 1}</span>
                <span className="c360-today-command-item-icon">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <strong>{action.title}</strong>
                  <small>{action.description}</small>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function MetricTile({
  icon: Icon,
  label,
  value,
  description,
  badge,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  description: string
  badge?: string
  tone: Tone
}) {
  return (
    <div className={`c360-ref-metric c360-tone-${tone}`}>
      <span className="c360-ref-metric-icon">
        <Icon className="h-6 w-6" />
      </span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{description}</p>
        {badge ? <em>{badge}</em> : null}
      </span>
    </div>
  )
}

function MovementRow({ action }: { action: PendingAction }) {
  const Icon = action.icon
  const tone = action.id === 'vacaciones' ? 'amber' : action.id === 'solicitudes' ? 'violet' : 'blue'
  return (
    <Link href={action.href} className={`c360-ref-movement-row c360-tone-${tone}`}>
      <span className="c360-ref-movement-icon">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <strong>{action.title}</strong>
        <small>{action.description}</small>
      </span>
      <span className="c360-ref-movement-arrow">
        <ArrowRight className="h-5 w-5" />
      </span>
    </Link>
  )
}

function StatusCard({
  icon: Icon,
  title,
  description,
  tone,
}: {
  icon: LucideIcon
  title: string
  description: string
  tone: Tone
}) {
  return (
    <div className={`c360-ref-status-card c360-tone-${tone}`}>
      <span className="c360-ref-status-check">
        <CheckCircle2 className="h-4 w-4" />
      </span>
      <span className="c360-ref-status-icon">
        <Icon className="h-7 w-7" />
      </span>
      <strong>{title}</strong>
      <small>{description}</small>
    </div>
  )
}

function InfoTile({
  icon: Icon,
  label,
  value,
  description,
  href,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  description: string
  href: string
  tone: Tone
}) {
  return (
    <Link href={href} className={`c360-ref-info-tile c360-tone-${tone}`}>
      <span className="c360-ref-metric-icon">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{description}</p>
      </span>
      <ChevronRight className="ml-auto h-5 w-5 text-slate-400" />
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="c360-ref-empty">
      <ShieldCheck className="h-8 w-8" />
      <strong>Todo al día</strong>
      <p>No tienes acciones pendientes en este momento.</p>
    </div>
  )
}

function ReferenceCredential({
  name,
  position,
  dni,
  code,
  organization,
  initial,
}: {
  name: string
  position: string | null
  dni: string
  code: string
  organization: string
  initial: string
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [feedback, setFeedback] = useState<'idle' | 'copied' | 'shared'>('idle')
  const safePosition = position ?? 'Trabajador'
  const maskedDni = dni.length > 4 ? `••••${dni.slice(-4)}` : dni
  const verificationText = `Credencial interna Comply360: ${name} · ${safePosition} · ${organization} · Código ${code}`

  async function copyText(text: string, nextFeedback: 'copied' | 'shared') {
    try {
      await navigator.clipboard.writeText(text)
      setFeedback(nextFeedback)
    } catch {
      setFeedback('copied')
    }
  }

  async function copyCode() {
    await copyText(code, 'copied')
  }

  async function shareCredential() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'Credencial interna Comply360',
          text: verificationText,
        })
        setFeedback('shared')
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }

    await copyText(verificationText, 'shared')
  }

  return (
    <>
      <CredentialCard
        name={name}
        position={safePosition}
        dni={dni}
        code={code}
        organization={organization}
        initial={initial}
      />
      <div className="c360-credential-actions" aria-label="Acciones de credencial">
        <button type="button" onClick={() => setModalOpen(true)}>
          <IdCard className="h-4 w-4" />
          Mostrar credencial
        </button>
        <button type="button" onClick={copyCode}>
          <Copy className="h-4 w-4" />
          {feedback === 'copied' ? 'Código copiado' : 'Copiar código'}
        </button>
        <button type="button" onClick={shareCredential}>
          <Share2 className="h-4 w-4" />
          {feedback === 'shared' ? 'Verificación lista' : 'Compartir verificación'}
        </button>
      </div>
      {feedback !== 'idle' ? (
        <p className="c360-credential-feedback" role="status">
          {feedback === 'shared'
            ? 'Texto seguro de verificación listo. No incluye tu DNI completo.'
            : 'Código interno copiado al portapapeles.'}
        </p>
      ) : null}

      {modalOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="c360-credential-modal" role="dialog" aria-modal="true" aria-label="Credencial digital ampliada">
              <button
                type="button"
                className="c360-credential-modal-backdrop"
                aria-label="Cerrar credencial"
                onClick={() => setModalOpen(false)}
              />
              <div className="c360-credential-modal-panel">
                <div className="c360-credential-modal-head">
                  <span>
                    <small>Credencial interna</small>
                    <strong>{code}</strong>
                  </span>
                  <button type="button" onClick={() => setModalOpen(false)} aria-label="Cerrar">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <CredentialCard
                  name={name}
                  position={safePosition}
                  dni={maskedDni}
                  code={code}
                  organization={organization}
                  initial={initial}
                  large
                />
                <div className="c360-credential-modal-actions">
                  <button type="button" onClick={copyCode}>
                    <Copy className="h-4 w-4" />
                    Copiar código
                  </button>
                  <button type="button" onClick={shareCredential}>
                    <Share2 className="h-4 w-4" />
                    Compartir verificación
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function CredentialCard({
  name,
  position,
  dni,
  code,
  organization,
  initial,
  large = false,
}: {
  name: string
  position: string
  dni: string
  code: string
  organization: string
  initial: string
  large?: boolean
}) {
  return (
    <div className={`c360-ref-credential ${large ? 'is-large' : ''}`}>
      <div className="c360-ref-credential-holo" aria-hidden="true" />
      <div className="c360-ref-credential-lines" aria-hidden="true" />
      <div className="c360-ref-credential-chip" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="c360-ref-credential-avatar">{initial}</div>
      <div className="c360-ref-credential-body">
        <span className="c360-ref-verified">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Verificada
        </span>
        <h3>{name}</h3>
        <p>{position}</p>
        <div className="c360-ref-credential-data">
          <span>
            <small>DNI</small>
            <strong>{dni}</strong>
          </span>
          <span>
            <small>Código</small>
            <strong>{code}</strong>
          </span>
        </div>
      </div>
      <div className="c360-ref-qr" aria-label="QR visual de verificación">
        <QrPattern />
      </div>
      <div className="c360-ref-credential-footer">
        <ShieldCheck className="h-5 w-5" />
        <span>Verificado por</span>
          <strong>{organization}</strong>
      </div>
    </div>
  )
}

function QrPattern() {
  return (
    <svg viewBox="0 0 29 29" role="img" aria-hidden="true">
      {Array.from({ length: 29 }).map((_, y) =>
        Array.from({ length: 29 }).map((__, x) => {
          const finder =
            ((x < 7 && y < 7) || (x > 21 && y < 7) || (x < 7 && y > 21)) &&
            (x === 0 || x === 6 || y === 0 || y === 6 || (x > 1 && x < 5 && y > 1 && y < 5))
          const seed = (x * 13 + y * 7 + x * y) % 9
          return finder || seed < 3 ? (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
          ) : null
        }),
      )}
    </svg>
  )
}

function FingerprintDocGraphic() {
  return (
    <div className="c360-fingerprint-graphic" aria-hidden="true">
      <div className="c360-fingerprint-paper">
        <span />
        <span />
        <span />
      </div>
      <div className="c360-fingerprint-mark">
        <Fingerprint className="h-12 w-12" />
      </div>
    </div>
  )
}

function WorkerHeroIllustration() {
  return (
    <div className="c360-worker-illustration" aria-hidden="true">
      <Image
        src="/worker-portal/worker-hero-ronald-reference.png"
        alt=""
        fill
        className="c360-worker-hero-asset"
        draggable={false}
        priority
        sizes="(max-width: 760px) 342px, 500px"
      />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="c360-worker-reference animate-pulse">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="h-72 rounded-[30px] bg-white/80" />
        <div className="h-72 rounded-[30px] bg-white/80" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-[26px] bg-white/80" />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string | null }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
        <div>
          <h3 className="font-bold text-red-900">No pudimos cargar tu información</h3>
          <p className="mt-1 text-sm text-red-800">
            {message || 'Contacta al área de RRHH si el problema persiste.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  )
}
