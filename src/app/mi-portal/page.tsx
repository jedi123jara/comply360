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
  ArrowRight,
  CheckCircle2,
  Fingerprint,
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
  const totalPending = pendingActions.length
  const asistenciaRatio =
    asistenciaMes.diasLaborales > 0
      ? Math.round((asistenciaMes.diasMarcados / asistenciaMes.diasLaborales) * 100)
      : 0
  const topAction = pendingActions[0] ?? null

  return (
    <div className="space-y-7 c360-page-enter">
      {/* ─── 1. Hero editorial ─────────────────────────────────────────── */}
      <section className="c360-worker-home-hero">
        <div className="relative z-[1] grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl text-blue-800 shadow-xl shadow-slate-950/20 ring-1 ring-white/70">
                <span className="font-serif">{initial}</span>
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold uppercase text-cyan-100 ring-1 ring-white/18">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-lime-300"
                    style={{ boxShadow: '0 0 0 4px rgba(190,242,100,0.18)' }}
                  />
                  <span>{greet()} · Portal personal</span>
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-cyan-50/75">
                  {fullName}
                </p>
              </div>
            </div>

            <h1 className="mt-5 max-w-2xl font-serif text-[2.35rem] font-normal leading-[1.02] text-white sm:text-[3.1rem] lg:text-[3.7rem]">
              Tu portal laboral, listo para avanzar.
            </h1>

            <p className="mt-4 max-w-xl text-[14px] leading-6 text-cyan-50/88 sm:text-[15px] sm:leading-7">
              Firma lo pendiente, revisa tus pagos y mantén tu legajo al día sin entrar al
              panel de la empresa.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="#acciones" className="c360-worker-primary-cta">
                Resolver pendientes
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#credencial" className="c360-worker-secondary-cta">
                Ver mi credencial
              </Link>
            </div>

            {topAction ? (
              <Link href={topAction.href} className="c360-worker-mobile-priority md:hidden">
                <span className="text-[10px] font-black uppercase text-lime-200">
                  Primero resuelve esto
                </span>
                <span className="mt-1 block text-sm font-black text-white">{topAction.title}</span>
                <span className="mt-1 block text-xs leading-5 text-cyan-50/78">
                  {topAction.description}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-lime-200">
                  Ir ahora <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-2 md:hidden">
              <div className="rounded-2xl bg-white/14 px-3 py-2 ring-1 ring-white/16">
                <p className="text-[10px] font-bold uppercase text-cyan-100/80">Hoy</p>
                <p className="mt-1 font-serif text-3xl leading-none text-white">{totalPending}</p>
                <p className="text-[11px] font-semibold text-cyan-50/75">acciones</p>
              </div>
              <div className="rounded-2xl bg-lime-300 px-3 py-2 text-slate-950">
                <p className="text-[10px] font-black uppercase">Asistencia</p>
                <p className="mt-1 font-mono text-2xl font-black">{asistenciaRatio}%</p>
                <p className="text-[11px] font-bold">este mes</p>
              </div>
            </div>

            <div className="mt-5 hidden flex-wrap gap-2.5 sm:mt-6 sm:flex">
              <HeroPill icon={Briefcase} label={worker.position ?? 'Trabajador'} />
              <HeroPill icon={Building2} label={worker.organization.name} />
              <HeroPill icon={ShieldCheck} label={`DNI ${worker.dni}`} mono />
            </div>

            <div className="mt-5 hidden flex-wrap gap-2 sm:flex">
              <HeroTrust icon={Fingerprint} label="Firma con huella" />
              <HeroTrust icon={CheckCircle2} label="Datos protegidos" />
              <HeroTrust icon={ShieldCheck} label="Cuenta verificada" />
            </div>
          </div>

          <div className="c360-worker-hero-panel hidden md:block">
            {topAction ? (
              <Link href={topAction.href} className="c360-worker-priority-card">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-300 px-2.5 py-1 text-[10px] font-black uppercase text-slate-950">
                  <Sparkles className="h-3 w-3" />
                  Acción recomendada
                </span>
                <h2 className="mt-3 text-xl font-black leading-tight text-white">
                  {topAction.title}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-cyan-50/78">
                  {topAction.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-black text-blue-800 shadow-lg shadow-slate-950/20">
                  Resolver ahora <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ) : null}

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase text-cyan-100/80">
                  Prioridades de hoy
                </p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="font-serif text-[4rem] leading-none text-white">
                    {totalPending}
                  </span>
                  <span className="pb-2 text-sm font-semibold text-cyan-100">
                    {totalPending === 1 ? 'acción' : 'acciones'}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl bg-lime-300 px-3 py-2 text-right text-slate-950 shadow-lg shadow-lime-950/20">
                <p className="text-[10px] font-black uppercase">Asistencia</p>
                <p className="font-mono text-lg font-black">{asistenciaRatio}%</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <HeroMetric
                icon={FileText}
                label="Legajo"
                value={data.stats.documentosFaltantes > 0 ? `${data.stats.documentosFaltantes}` : 'OK'}
                sub={data.stats.documentosFaltantes > 0 ? 'docs faltantes' : 'completo'}
                tone="blue"
              />
              <HeroMetric
                icon={Receipt}
                label="Boleta"
                value={data.stats.boletasPendientes > 0 ? `${data.stats.boletasPendientes}` : 'OK'}
                sub={data.stats.boletasPendientes > 0 ? 'por firmar' : 'firmadas'}
                tone="amber"
              />
              <HeroMetric
                icon={Plane}
                label="Vacaciones"
                value={`${data.stats.vacacionesPendientes}`}
                sub="días disponibles"
                tone="green"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. Push opt-in banner (conditional) ───────────────────────── */}
      <EnableNotifications variant="inline" />

      {/* ─── 3. Acciones pendientes ────────────────────────────────────── */}
      {pendingActions.length > 0 ? (
        <section id="acciones" className="scroll-mt-24">
          <SectionHead
            title="Tu siguiente"
            emPart="movimiento"
            link={{
              label: `${pendingActions.length} ${pendingActions.length === 1 ? 'pendiente' : 'pendientes'}`,
            }}
          />
          <div className="grid gap-3 lg:grid-cols-2">
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
      <section id="credencial" className="scroll-mt-24">
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

function HeroPill({
  icon: Icon,
  label,
  mono,
}: {
  icon: typeof Briefcase
  label: string
  mono?: boolean
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/16 backdrop-blur">
      <Icon className="h-3.5 w-3.5 shrink-0 text-lime-200" />
      <span className={mono ? 'truncate font-mono' : 'truncate'}>{label}</span>
    </span>
  )
}

function HeroTrust({
  icon: Icon,
  label,
}: {
  icon: typeof Fingerprint
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/28 px-3 py-1.5 text-[11px] font-bold text-cyan-50/82 ring-1 ring-white/12 backdrop-blur">
      <Icon className="h-3.5 w-3.5 text-lime-200" />
      {label}
    </span>
  )
}

function HeroMetric({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof FileText
  label: string
  value: string
  sub: string
  tone: 'blue' | 'amber' | 'green'
}) {
  const colors = {
    blue: { bg: 'rgba(96, 165, 250, 0.18)', icon: '#bfdbfe', accent: '#60a5fa' },
    amber: { bg: 'rgba(251, 191, 36, 0.2)', icon: '#fde68a', accent: '#fbbf24' },
    green: { bg: 'rgba(52, 211, 153, 0.2)', icon: '#bbf7d0', accent: '#34d399' },
  }[tone]

  return (
    <div className="c360-worker-hero-metric">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: colors.bg, color: colors.icon }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase text-cyan-100/70">{label}</p>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="font-serif text-2xl leading-none text-white">{value}</span>
          <span className="truncate text-[11px] font-semibold text-cyan-50/75">{sub}</span>
        </div>
      </div>
      <span
        aria-hidden="true"
        className="absolute inset-x-3 bottom-0 h-[2px] rounded-full"
        style={{ background: colors.accent }}
      />
    </div>
  )
}

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
      className="group relative block overflow-hidden rounded-2xl p-4 transition-all hover:-translate-y-0.5"
      style={{
        background: accent
          ? 'linear-gradient(135deg, rgba(204,251,241,0.86), white 58%, rgba(219,234,254,0.58))'
          : 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
        border: accent
          ? '1px solid rgba(20,184,166,0.3)'
          : '1px solid var(--border-default)',
        boxShadow:
          '0 18px 32px -28px rgba(15,23,42,0.34), inset 0 1px 0 rgba(255,255,255,0.8)',
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{
          background: accent
            ? 'linear-gradient(90deg, #10b981, #22d3ee, #60a5fa)'
            : 'linear-gradient(90deg, #60a5fa, #a78bfa)',
        }}
      />
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{
            background: accent ? '#ccfbf1' : '#eff6ff',
            color: '#1d4ed8',
          }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span
          className="font-bold uppercase"
          style={{
            fontSize: 10,
            letterSpacing: 0,
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
          letterSpacing: 0,
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
      className="group flex min-h-[106px] flex-col items-start justify-between gap-3 rounded-2xl p-4 transition-all hover:-translate-y-0.5"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 16px 30px -26px rgba(15,23,42,0.28)',
      }}
    >
      <div
        className="flex items-center justify-center rounded-xl transition-transform group-hover:scale-105"
        style={{
          width: 38,
          height: 38,
          background: 'linear-gradient(135deg, #dbeafe, #ccfbf1)',
          color: '#1d4ed8',
        }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span
        className="leading-tight"
        style={{
          fontSize: 11,
          fontWeight: 800,
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
