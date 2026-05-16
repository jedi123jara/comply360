'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Receipt,
  ClipboardList,
  GraduationCap,
  FileText,
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  Wallet,
  PiggyBank,
  Plane,
  Upload,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  PartyPopper,
} from 'lucide-react'
import { PendingActionCard } from '@/components/comply360/pending-action-card'
import { EnableNotifications } from '@/components/pwa/enable-notifications'
import { DigitalIdCard } from '@/components/mi-portal/digital-id-card'
import { ConfettiCard } from '@/components/mi-portal/confetti-card'
import { SectionHead } from '@/components/mi-portal/section-head'

/**
 * /mi-portal — Home del Portal del Trabajador.
 *
 * Diseño aplicado del handoff Claude Design 2026-04-28 (portal-worker/index.html):
 * Aesthetic "Emerald Light editorial" — Geist + Instrument Serif.
 *
 * Secciones (mobile-first, scroll vertical):
 *  1. Hero greet — emerald gradient, name italic, DNI pill + streak pill
 *  2. Push opt-in banner (conditional)
 *  3. Acciones pendientes (PendingActionCard con accent-bar por severity)
 *  4. Mi credencial — DigitalIdCard (tarjeta ID estilo "credencial física" oscura)
 *  5. Mi resumen — KPI grid 2x2 con Instrument Serif para los valores
 *  6. Próximas capacitaciones — list-card minimal
 *  7. Atajos rápidos — grid 2x3 con icon tiles emerald
 *  8. ConfettiCard milestone — aniversario / cumpleaños / capacitación cerrada
 *
 * Reusa el endpoint `/api/mi-portal/resumen` ya existente.
 */

// ─────────────────────────────────────────────────────────────────────────────
//  Types (matching /api/mi-portal/resumen response)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

function greet(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatPeriodo(periodo: string): string {
  const parts = periodo.split('-')
  if (parts.length < 2) return periodo
  const [year, month] = parts
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
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

function formatRegimen(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase()
}

/**
 * Calcula años + meses transcurridos desde fechaIngreso.
 * Devuelve aniversario formateado si está cerca (<30 días) — sino null.
 */
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

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────

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

  /**
   * Genera la lista de acciones pendientes dinámicamente según los `stats`.
   */
  const pendingActions = useMemo(() => {
    if (!data) return []
    const actions: Array<{
      id: string
      icon: typeof FileText
      title: string
      description: string
      deadline?: string | null
      severity?: 'critical' | 'high' | 'medium' | 'info'
      href: string
    }> = []

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
      const firstDeadline = data.proximasCapacitaciones[0]?.deadline ?? null
      actions.push({
        id: 'capac',
        icon: GraduationCap,
        title:
          data.stats.capacitacionesPendientes === 1
            ? 'Tienes 1 capacitación pendiente'
            : `Tienes ${data.stats.capacitacionesPendientes} capacitaciones pendientes`,
        description:
          'Ley 29783 exige capacitaciones obligatorias. Complétalas para mantener tu SST al día.',
        deadline: firstDeadline,
        href: '/mi-portal/capacitaciones',
      })
    }

    if (data.stats.boletasPendientes > 0) {
      actions.push({
        id: 'boletas',
        icon: Receipt,
        title:
          data.stats.boletasPendientes === 1
            ? 'Firma tu boleta de pago'
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
          : 'Puedes solicitar fechas de descanso desde tu portal.',
        severity: data.stats.vacacionesCriticas ? 'high' : 'info',
        href: '/mi-portal/solicitudes/nueva',
      })
    }

    return actions
  }, [data])

  if (loading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={error} />

  const { worker, ultimaBoleta, proximasCapacitaciones } = data
  const { asistenciaMes, ctsProjection } = data.stats
  const aniv = aniversarioProximo(worker.fechaIngreso)
  const initial = worker.firstName.charAt(0).toUpperCase()
  const fullName = `${worker.firstName} ${worker.lastName}`.trim()
  const idCardCode = `C360-${worker.dni.slice(-4)}`

  return (
    <div className="space-y-7 c360-page-enter">
      {/* ─── 1. Hero editorial ─────────────────────────────────────────── */}
      <section
        className="c360-anim-slide-up relative overflow-hidden rounded-2xl p-5 lg:p-7"
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.96) 100%), linear-gradient(135deg, #eff6ff 0%, #f8fafc 55%, #fefce8 100%)',
          border: '0.5px solid rgba(16,185,129,0.2)',
        }}
      >
        {/* Halo emerald */}
        <div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            top: '-30%',
            right: '-15%',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)',
          }}
        />

        <div className="relative">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-700 mb-3">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              style={{ boxShadow: '0 0 0 3px rgba(16,185,129,0.15)' }}
            />
            <span>{greet()}</span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            Hola, <em style={{ color: '#1e40af', fontStyle: 'italic' }}>{worker.firstName}</em>.
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[color:var(--text-secondary)]">
            {worker.position && (
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-emerald-600" />
                {worker.position}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-emerald-600" />
              {worker.organization.name}
            </span>
          </div>

          {/* Pills row: DNI + (opcional) racha de asistencia */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"
              style={{
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(8px)',
                border: '0.5px solid var(--border-subtle)',
              }}
            >
              <span
                className="font-medium"
                style={{
                  color: 'var(--text-tertiary)',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                DNI
              </span>
              <span
                className="font-bold tracking-wider text-[color:var(--text-primary)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {worker.dni}
              </span>
            </div>

            {/* Streak pill — placeholder hasta que /api/mi-portal/resumen exponga la racha real */}
            {/*
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold"
              style={{
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                border: '0.5px solid rgba(217,119,6,0.25)',
                color: '#b45309',
              }}
            >
              <Flame className="h-3 w-3" />
              <span>12 días puntual</span>
            </div>
            */}
          </div>
        </div>
      </section>

      {/* ─── 2. Push opt-in banner (conditional) ───────────────────────── */}
      <EnableNotifications variant="inline" />

      {/* ─── 3. Acciones pendientes ────────────────────────────────────── */}
      {pendingActions.length > 0 ? (
        <section>
          <SectionHead
            title="Necesitan tu"
            emPart="atención"
            link={{
              label: `${pendingActions.length} ${pendingActions.length === 1 ? 'pendiente' : 'pendientes'}`,
            }}
          />
          <div className="space-y-2.5">
            {pendingActions.map((a) => (
              <PendingActionCard
                key={a.id}
                icon={a.icon}
                title={a.title}
                description={a.description}
                deadline={a.deadline}
                severity={a.severity}
                href={a.href}
              />
            ))}
          </div>
        </section>
      ) : (
        <section
          className="rounded-2xl p-6 text-center"
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
            border: '0.5px solid rgba(16,185,129,0.2)',
          }}
        >
          <div
            className="inline-flex items-center justify-center rounded-2xl mb-3"
            style={{
              width: 48,
              height: 48,
              background: 'linear-gradient(165deg, #2563eb 0%, #1e40af 100%)',
              boxShadow: '0 8px 20px -6px rgba(4,120,87,0.45)',
            }}
          >
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 400,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              marginBottom: 4,
            }}
          >
            Todo al día — <em style={{ color: '#1e40af', fontStyle: 'italic' }}>excelente</em>
          </h3>
          <p className="text-sm text-[color:var(--text-secondary)] max-w-sm mx-auto">
            No tienes acciones pendientes. Sigue manteniendo tu información actualizada.
          </p>
        </section>
      )}

      {/* ─── 4. Mi credencial (DigitalIdCard) ──────────────────────────── */}
      <section>
        <SectionHead
          title="Mi"
          emPart="credencial"
          link={{ label: 'Compartir', href: '/mi-portal/perfil' }}
        />
        <DigitalIdCard
          name={fullName}
          position={worker.position}
          dni={worker.dni}
          code={idCardCode}
          org={worker.organization.name}
          initial={initial}
        />
      </section>

      {/* ─── 5. Resumen financiero (KPI grid) ──────────────────────────── */}
      <section>
        <SectionHead
          title="Mi"
          emPart="resumen"
          link={{ label: 'Ver detalle', href: '/mi-portal/perfil' }}
        />
        <div
          style={{
            display: 'grid',
            gap: 8,
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          }}
        >
          <KpiTile
            icon={Wallet}
            label="Última boleta"
            value={ultimaBoleta ? `S/ ${fmtSoles(ultimaBoleta.netoPagar)}` : '—'}
            sub={ultimaBoleta ? formatPeriodo(ultimaBoleta.periodo) : 'Sin emisiones'}
            href="/mi-portal/boletas"
            accent
          />
          <KpiTile
            icon={PiggyBank}
            label="CTS proyectada"
            value={ctsProjection ? `S/ ${fmtSoles(ctsProjection.ctsTotal)}` : 'No aplica'}
            sub={ctsProjection ? `Corte ${formatShortDate(ctsProjection.nextCut)}` : formatRegimen(worker.regimenLaboral)}
            href="/mi-portal/perfil"
          />
          <KpiTile
            icon={Plane}
            label="Vacaciones"
            value={`${data.stats.vacacionesPendientes} ${data.stats.vacacionesPendientes === 1 ? 'día' : 'días'}`}
            sub={data.stats.vacacionesCriticas ? 'Coordinar pronto' : data.stats.vacacionesPendientes > 0 ? 'Pendientes de goce' : 'Al día'}
            href="/mi-portal/solicitudes"
          />
          <KpiTile
            icon={Calendar}
            label="Asistencia"
            value={`${asistenciaMes.diasMarcados}/${asistenciaMes.diasLaborales}`}
            sub={`${asistenciaMes.tardanzas} ${asistenciaMes.tardanzas === 1 ? 'tardanza' : 'tardanzas'} · ${asistenciaMes.horasTrabajadas}h`}
            href="/mi-portal/asistencia"
          />
        </div>
      </section>

      {/* ─── 6. Próximas capacitaciones ────────────────────────────────── */}
      {proximasCapacitaciones.length > 0 && (
        <section>
          <SectionHead
            title="Próximas"
            emPart="capacitaciones"
            link={{ label: 'Ver todas', href: '/mi-portal/capacitaciones' }}
          />
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'white', border: '0.5px solid var(--border-default)' }}
          >
            <ul className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {proximasCapacitaciones.slice(0, 3).map((c) => (
                <li key={c.id}>
                  <Link
                    href="/mi-portal/capacitaciones"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[color:var(--neutral-50)] transition-colors"
                  >
                    <div
                      className="flex items-center justify-center rounded-lg flex-shrink-0"
                      style={{
                        width: 36,
                        height: 36,
                        background: '#eff6ff',
                        color: '#1e40af',
                      }}
                    >
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[color:var(--text-primary)] truncate">
                        {c.title}
                      </p>
                      {c.deadline && (
                        <p className="mt-0.5 text-[11px] text-[color:var(--text-tertiary)] inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Hasta {new Date(c.deadline).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)]" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ─── 7. Atajos rápidos (grid) ──────────────────────────────────── */}
      <section>
        <SectionHead title="Atajos" emPart="rápidos" link={null} />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          <QuickAction href="/mi-portal/solicitudes/nueva" icon={Plane} label="Solicitar vacaciones" />
          <QuickAction href="/mi-portal/solicitudes/nueva" icon={FileText} label="Pedir constancia" />
          <QuickAction href="/mi-portal/documentos" icon={Upload} label="Subir documento" />
          <QuickAction href="/mi-portal/perfil" icon={Briefcase} label="Actualizar datos" />
          <QuickAction href="/mi-portal/reglamento" icon={ShieldCheck} label="Ver el RIT" />
          <QuickAction href="/mi-portal/denuncias" icon={Sparkles} label="Reportar incidente" />
        </div>
      </section>

      {/* ─── 8. Confetti milestone (aniversario) ────────────────────────── */}
      {aniv && (
        <ConfettiCard
          icon={PartyPopper}
          eyebrow="Aniversario"
          title={`¡${aniv.years} ${aniv.years === 1 ? 'año' : 'años'}, chamba dura!`}
          titleEmText="chamba dura"
          sub={
            aniv.daysUntil === 0
              ? 'Tu aniversario es HOY. Te toca día de descanso opcional.'
              : `Tu aniversario es en ${aniv.daysUntil} ${aniv.daysUntil === 1 ? 'día' : 'días'}. Te toca día de descanso opcional.`
          }
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-components inline
// ─────────────────────────────────────────────────────────────────────────────

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  href,
  accent,
}: {
  icon: typeof Wallet
  label: string
  value: string
  sub: string
  href: string
  accent?: boolean
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl p-3.5 transition-all hover:-translate-y-0.5"
      style={{
        background: accent
          ? 'linear-gradient(135deg, rgba(16,185,129,0.06), white)'
          : 'white',
        border: accent
          ? '0.5px solid rgba(16,185,129,0.22)'
          : '0.5px solid var(--border-default)',
        boxShadow:
          '0 1px 2px rgba(15,23,42,0.05), 0 2px 4px rgba(15,23,42,0.04), 0 0 0 0.5px rgba(15,23,42,0.05)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3 w-3" style={{ color: '#1d4ed8' }} />
        <span
          className="font-bold uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.1em',
            color: 'var(--text-tertiary)',
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 26,
          fontWeight: 400,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <p
        className="mt-1.5"
        style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
      >
        {sub}
      </p>
    </Link>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: typeof Plane
  label: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-start gap-2 rounded-xl p-3 transition-all hover:-translate-y-0.5"
      style={{
        background: 'white',
        border: '0.5px solid var(--border-default)',
      }}
    >
      <div
        className="flex items-center justify-center rounded-lg transition-colors group-hover:scale-105"
        style={{
          width: 32,
          height: 32,
          background: '#eff6ff',
          color: '#1e40af',
        }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span
        className="leading-tight"
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        {label}
      </span>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Loading + Error states
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-7 animate-pulse">
      <div className="rounded-2xl h-48 bg-emerald-50/40" />
      <div className="space-y-2.5">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl h-24 bg-[color:var(--neutral-100)]" />
        ))}
      </div>
      <div className="rounded-2xl h-52 bg-slate-900/10" />
      <div
        style={{
          display: 'grid',
          gap: 8,
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl h-24 bg-[color:var(--neutral-100)]" />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string | null }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: '#fef2f2', border: '0.5px solid rgba(239,68,68,0.25)' }}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-red-900">No pudimos cargar tu información</h3>
          <p className="text-sm text-red-800 mt-1">
            {message || 'Contacta al área de RRHH si el problema persiste.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  )
}
