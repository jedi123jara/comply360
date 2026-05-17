'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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
  FileText,
  Fingerprint,
  FolderOpen,
  GraduationCap,
  IdCard,
  Lock,
  PartyPopper,
  PenLine,
  PiggyBank,
  Plane,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { EnableNotifications } from '@/components/pwa/enable-notifications'
import { ConfettiCard } from '@/components/mi-portal/confetti-card'

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

function fmtSoles(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (!isFinite(n)) return '—'
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
  const [data, setData] = useState<PortalSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    fetch('/api/mi-portal/resumen')
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
  }, [])

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
  const topAction = pendingActions[0] ?? null
  const aniv = aniversarioProximo(worker.fechaIngreso)
  const asistenciaRatio =
    asistenciaMes.diasLaborales > 0
      ? Math.round((asistenciaMes.diasMarcados / asistenciaMes.diasLaborales) * 100)
      : 0
  const documentosDisponibles = Math.max(0, 12 - data.stats.documentosFaltantes)

  const quickActions = [
    {
      href: '/mi-portal/boletas',
      icon: PenLine,
      title: 'Firmar boletas',
      description:
        data.stats.boletasPendientes > 0
          ? `Tienes ${data.stats.boletasPendientes} ${data.stats.boletasPendientes === 1 ? 'boleta pendiente' : 'boletas pendientes'} de firma`
          : 'Todas tus boletas están al día',
      tone: 'emerald' as const,
    },
    {
      href: '/mi-portal/asistencia',
      icon: Clock3,
      title: 'Ver asistencia',
      description: `${asistenciaRatio}% registrado este mes`,
      tone: 'blue' as const,
    },
    {
      href: '/mi-portal/solicitudes/nueva',
      icon: Plane,
      title: 'Solicitar vacaciones',
      description:
        data.stats.vacacionesPendientes > 0
          ? `Tienes ${data.stats.vacacionesPendientes} días disponibles`
          : 'Solicita tus días libres',
      tone: 'amber' as const,
    },
    {
      href: '/mi-portal/documentos',
      icon: FolderOpen,
      title: 'Mis documentos',
      description: 'Accede a tus documentos',
      tone: 'violet' as const,
    },
  ]

  return (
    <div className="c360-worker-reference c360-page-enter">
      <section className="c360-ref-top-grid" aria-label="Inicio del portal trabajador">
        <div className="c360-ref-hero">
          <div className="c360-ref-hero-copy">
            <h1>
              Hola, {worker.firstName}
              <span aria-hidden="true"> 👋</span>
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

        <Link href={topAction?.href ?? '/mi-portal'} className="c360-ref-recommendation">
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

      <section className="c360-ref-main-grid">
        <div className="space-y-6">
          <section className="c360-ref-section">
            <div className="c360-ref-section-head">
              <h2>Lo importante hoy</h2>
              <Link href="/mi-portal/notificaciones">Ver todo</Link>
            </div>
            <div className="c360-ref-important-grid">
              <ImportantCard
                icon={Receipt}
                label="Boletas pendientes"
                value={`${data.stats.boletasPendientes}`}
                description={
                  data.stats.boletasPendientes > 0
                    ? `Tienes ${data.stats.boletasPendientes} ${data.stats.boletasPendientes === 1 ? 'boleta pendiente' : 'boletas pendientes'} de firma.`
                    : 'No tienes boletas por firmar.'
                }
                href="/mi-portal/boletas"
                tone="emerald"
              />
              <ImportantCard
                icon={ClipboardList}
                label="Solicitudes en trámite"
                value={`${data.stats.solicitudesPendientes}`}
                description={
                  data.stats.solicitudesPendientes > 0
                    ? `Tienes ${data.stats.solicitudesPendientes} solicitudes en proceso.`
                    : 'No tienes solicitudes activas.'
                }
                href="/mi-portal/solicitudes"
                tone="blue"
              />
            </div>
          </section>

          <section className="c360-ref-section">
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

          <section id="pendientes" className="c360-ref-section scroll-mt-24">
            <div className="c360-ref-section-head">
              <h2>Últimos movimientos</h2>
              <Link href="/mi-portal/notificaciones">Ver todos</Link>
            </div>
            {pendingActions.length > 0 ? (
              <div className="c360-ref-movement-list">
                {pendingActions.slice(0, 4).map((action) => (
                  <MovementRow key={action.id} action={action} />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section id="credencial" className="c360-ref-section scroll-mt-24">
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

          <section className="c360-ref-section">
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

      <EnableNotifications variant="inline" />

      <section className="c360-ref-section">
        <div className="c360-ref-section-head">
          <h2>Resumen adicional</h2>
          <Link href="/mi-portal/perfil">Ver perfil</Link>
        </div>
        <div className="c360-ref-extra-grid">
          <InfoTile
            icon={Wallet}
            label="Última boleta"
            value={ultimaBoleta ? `S/ ${fmtSoles(ultimaBoleta.netoPagar)}` : '—'}
            description={ultimaBoleta ? formatPeriodo(ultimaBoleta.periodo) : 'Sin emisiones'}
            href="/mi-portal/boletas"
            tone="blue"
          />
          <InfoTile
            icon={PiggyBank}
            label="CTS proyectada"
            value={ctsProjection ? `S/ ${fmtSoles(ctsProjection.ctsTotal)}` : 'No aplica'}
            description={ctsProjection ? `Corte ${formatShortDate(ctsProjection.nextCut)}` : formatRegimen(worker.regimenLaboral)}
            href="/mi-portal/perfil"
            tone="amber"
          />
          <InfoTile
            icon={Calendar}
            label="Asistencia"
            value={`${asistenciaMes.diasMarcados}/${asistenciaMes.diasLaborales}`}
            description={`${asistenciaMes.tardanzas} tardanzas · ${asistenciaMes.horasTrabajadas}h`}
            href="/mi-portal/asistencia"
            tone="emerald"
          />
        </div>
      </section>

      {proximasCapacitaciones.length > 0 ? (
        <section className="c360-ref-section">
          <div className="c360-ref-section-head">
            <h2>Capacitaciones próximas</h2>
            <Link href="/mi-portal/capacitaciones">Ver todas</Link>
          </div>
          <div className="c360-ref-movement-list">
            {proximasCapacitaciones.slice(0, 3).map((course) => (
              <Link key={course.id} href="/mi-portal/capacitaciones" className="c360-ref-movement-row c360-tone-blue">
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

function ImportantCard({
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
    <Link href={href} className={`c360-ref-important-card c360-tone-${tone}`}>
      <span className="c360-ref-important-icon">
        <Icon className="h-8 w-8" />
      </span>
      <span className="min-w-0">
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{description}</p>
        <em>Ver detalle <ArrowRight className="h-3.5 w-3.5" /></em>
      </span>
    </Link>
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
  return (
    <div className="c360-ref-credential">
      <div className="c360-ref-credential-lines" aria-hidden="true" />
      <div className="c360-ref-credential-avatar">{initial}</div>
      <div className="c360-ref-credential-body">
        <span className="c360-ref-verified">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Verificada
        </span>
        <h3>{name}</h3>
        <p>{position ?? 'Trabajador'}</p>
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
      <svg viewBox="0 0 520 330" role="img">
        <defs>
          <linearGradient id="c360Sky" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#eafffb" />
            <stop offset="100%" stopColor="#d9efff" />
          </linearGradient>
          <linearGradient id="c360Hoodie" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#12c4aa" />
            <stop offset="100%" stopColor="#058176" />
          </linearGradient>
          <linearGradient id="c360Bag" x1="0" x2="1">
            <stop offset="0%" stopColor="#0f3b6d" />
            <stop offset="100%" stopColor="#155e75" />
          </linearGradient>
        </defs>
        <rect width="520" height="330" rx="34" fill="url(#c360Sky)" />
        <g className="c360-clouds" fill="#ffffff" opacity="0.9">
          <path d="M95 73c11-24 48-22 55 4 18-6 36 7 39 24H61c3-15 17-27 34-28Z" />
          <path d="M353 89c10-18 38-18 48 1 15-3 29 7 33 22H323c3-13 15-22 30-23Z" />
          <circle cx="444" cy="70" r="23" fill="#f8d56e" opacity="0.9" />
        </g>
        <g className="c360-city" fill="#8bd2ee" opacity="0.72">
          <rect x="56" y="180" width="36" height="86" rx="4" />
          <rect x="103" y="150" width="44" height="116" rx="4" />
          <rect x="163" y="122" width="58" height="144" rx="4" />
          <rect x="233" y="160" width="44" height="106" rx="4" />
          <rect x="287" y="135" width="52" height="131" rx="4" />
          <rect x="358" y="178" width="38" height="88" rx="4" />
          <rect x="407" y="145" width="48" height="121" rx="4" />
          {Array.from({ length: 28 }).map((_, i) => (
            <rect
              key={i}
              x={68 + (i % 7) * 55}
              y={170 + Math.floor(i / 7) * 28}
              width="10"
              height="16"
              rx="2"
              fill="#dff8ff"
              opacity="0.9"
            />
          ))}
        </g>
        <g className="c360-trees">
          <path d="M31 281c26-60 73-58 102 0Z" fill="#6ed2b5" />
          <path d="M392 281c26-64 78-66 107 0Z" fill="#65c5ad" />
          <path d="M0 288h520v42H0Z" fill="#bdebdc" />
          <path d="M459 167c15 41 20 82 10 126" stroke="#159979" strokeWidth="7" strokeLinecap="round" />
          <path d="M469 207c22-14 37-33 41-56" stroke="#20a980" strokeWidth="8" strokeLinecap="round" />
          <path d="M466 230c19-4 35-14 48-31" stroke="#20a980" strokeWidth="8" strokeLinecap="round" />
        </g>
        <g className="c360-worker-person">
          <path d="M329 142c-43 9-70 50-64 100l10 82h120l14-86c9-55-26-106-80-96Z" fill="url(#c360Hoodie)" />
          <path d="M282 166c-36 24-55 61-62 112" fill="none" stroke="#087b74" strokeWidth="28" strokeLinecap="round" />
          <path d="M390 168c40 30 49 77 34 123" fill="none" stroke="#087b74" strokeWidth="30" strokeLinecap="round" />
          <path d="M292 144c9-31 56-39 77-15 11 13 13 34 2 51-15 22-51 25-70 7-12-11-15-27-9-43Z" fill="#f0aa79" />
          <path d="M286 136c9-36 62-51 91-22 8 8 11 18 10 29-26-5-44-15-55-32-10 24-25 36-46 37Z" fill="#072b48" />
          <path d="M317 153c9 9 24 8 32-2" fill="none" stroke="#7f3f2d" strokeWidth="4" strokeLinecap="round" />
          <circle cx="317" cy="137" r="3" fill="#09263d" />
          <circle cx="355" cy="137" r="3" fill="#09263d" />
          <path d="M337 139c1 11-2 18-10 20" fill="none" stroke="#c56f4f" strokeWidth="3" strokeLinecap="round" />
          <path d="M285 167c15 30 55 34 80 3" fill="none" stroke="#d8fff4" strokeWidth="8" strokeLinecap="round" opacity="0.7" />
          <path d="M252 178c-19 37-15 91 8 139" fill="none" stroke="url(#c360Bag)" strokeWidth="13" strokeLinecap="round" />
          <rect className="c360-phone" x="235" y="168" width="42" height="70" rx="9" fill="#0d345d" transform="rotate(-12 256 203)" />
          <rect className="c360-phone" x="244" y="180" width="24" height="38" rx="4" fill="#a7f3d0" opacity="0.75" transform="rotate(-12 256 203)" />
          <path className="c360-phone-hand" d="M275 219c-10-5-25-2-30 8-6 12 5 27 21 22 14-4 23-20 9-30Z" fill="#f0aa79" />
          <path d="M318 324h-54l-7-58h67Z" fill="#12264c" />
          <path d="M388 324h-55l12-58h63Z" fill="#16365f" />
        </g>
        <path className="c360-bird" d="M448 123c11-12 25-12 36 0 8-9 18-11 30-5" fill="none" stroke="#67b8d3" strokeWidth="5" strokeLinecap="round" />
      </svg>
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
