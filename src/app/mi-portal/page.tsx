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
} from 'lucide-react'
import { PendingActionCard } from '@/components/comply360/pending-action-card'
import { EnableNotifications } from '@/components/pwa/enable-notifications'

/**
 * /mi-portal — Home del Portal del Trabajador (Emerald Light, mobile-first).
 *
 * Secciones (ordenadas por impacto):
 *  1. Hero editorial con saludo personalizado + chip de organización
 *  2. Alerta push (banner opt-in si no está subscrito)
 *  3. Acciones pendientes (PendingActionCard con deadline por severity)
 *  4. Resumen financiero (KPI strip: última boleta, CTS proyectada, días libres)
 *  5. Próximas capacitaciones (hasta 3, con fecha tope)
 *  6. Atajos rápidos (6 actions comunes)
 *
 * Reusa el endpoint `/api/mi-portal/resumen` ya existente (no altera contrato API).
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
  // `periodo` viene como "2026-04" o similar
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
   * Prioriza por severity + orden: docs > capacitaciones > solicitudes > boletas.
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
        description: 'Tu legajo está incompleto. Completalo para cumplir con el registro laboral.',
        severity: data.stats.documentosFaltantes > 5 ? 'high' : 'medium',
        href: '/mi-portal/documentos',
      })
    }

    if (data.stats.capacitacionesPendientes > 0) {
      // Usa el deadline de la primera capacitación si está disponible
      const firstDeadline = data.proximasCapacitaciones[0]?.deadline ?? null
      actions.push({
        id: 'capac',
        icon: GraduationCap,
        title:
          data.stats.capacitacionesPendientes === 1
            ? 'Tenés 1 capacitación pendiente'
            : `Tenés ${data.stats.capacitacionesPendientes} capacitaciones pendientes`,
        description:
          'Ley 29783 exige capacitaciones obligatorias. Completalas para mantener tu SST al día.',
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
            ? 'Firmá tu boleta de pago'
            : `Firmá ${data.stats.boletasPendientes} boletas pendientes`,
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
            ? 'Tenés 1 solicitud en trámite'
            : `Tenés ${data.stats.solicitudesPendientes} solicitudes en trámite`,
        description: 'Revisa el estado y próximos pasos de tus solicitudes.',
        severity: 'info',
        href: '/mi-portal/solicitudes',
      })
    }

    return actions
  }, [data])

  if (loading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={error} />

  const { worker, ultimaBoleta, proximasCapacitaciones } = data

  return (
    <div className="space-y-7">
      {/* ─── 1. Hero editorial ─────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-2xl p-5 lg:p-7"
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.96) 100%), linear-gradient(135deg, #ecfdf5 0%, #f8fafc 55%, #fefce8 100%)',
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
            dangerouslySetInnerHTML={{
              __html: `Hola, <em style="color: var(--emerald-700); font-style: italic">${worker.firstName}</em>.`,
            }}
          />

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[color:var(--text-secondary)]">
            {worker.position ? (
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-emerald-600" />
                {worker.position}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-emerald-600" />
              {worker.organization.name}
            </span>
          </div>

          {/* DNI pill subtle */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"
               style={{
                 background: 'rgba(255,255,255,0.7)',
                 backdropFilter: 'blur(8px)',
                 border: '0.5px solid var(--border-subtle)',
               }}>
            <span className="text-[color:var(--text-tertiary)] font-medium">DNI</span>
            <span className="font-mono font-bold tracking-wider text-[color:var(--text-primary)]">
              {worker.dni}
            </span>
          </div>
        </div>
      </section>

      {/* ─── 2. Push opt-in banner (conditional inside component) ──────── */}
      <EnableNotifications variant="inline" />

      {/* ─── 3. Acciones pendientes ────────────────────────────────────── */}
      {pendingActions.length > 0 ? (
        <section>
          <div className="flex items-baseline justify-between mb-3 px-1">
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 20,
                fontWeight: 400,
                letterSpacing: '-0.015em',
                color: 'var(--text-primary)',
              }}
            >
              Necesitan tu atención
            </h2>
            <span className="text-xs font-semibold text-[color:var(--text-tertiary)]">
              {pendingActions.length} pendientes
            </span>
          </div>
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
            background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)',
            border: '0.5px solid rgba(16,185,129,0.2)',
          }}
        >
          <div
            className="inline-flex items-center justify-center rounded-2xl mb-3"
            style={{
              width: 48,
              height: 48,
              background: 'linear-gradient(165deg, #10b981 0%, #047857 100%)',
              boxShadow: '0 8px 20px -6px rgba(4,120,87,0.45)',
            }}
          >
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              fontWeight: 400,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              marginBottom: 4,
            }}
          >
            Todo al día — <em style={{ color: 'var(--emerald-700)', fontStyle: 'italic' }}>excelente</em>
          </h3>
          <p className="text-sm text-[color:var(--text-secondary)] max-w-sm mx-auto">
            No tenés acciones pendientes. Seguí manteniendo tu información actualizada.
          </p>
        </section>
      )}

      {/* ─── 4. Resumen financiero ─────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-3 px-1">
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              fontWeight: 400,
              letterSpacing: '-0.015em',
              color: 'var(--text-primary)',
            }}
          >
            Mi resumen
          </h2>
          <Link
            href="/mi-portal/perfil"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
          >
            Ver detalle <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div
          style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          }}
        >
          <InfoTile
            icon={Wallet}
            label="Última boleta"
            value={ultimaBoleta ? `S/ ${fmtSoles(ultimaBoleta.netoPagar)}` : '—'}
            sub={ultimaBoleta ? formatPeriodo(ultimaBoleta.periodo) : 'Sin emisiones'}
            href="/mi-portal/boletas"
            variant="accent"
          />
          <InfoTile
            icon={PiggyBank}
            label="CTS estimada"
            value="—"
            sub="Próximo corte 15 may"
            href="/mi-portal/perfil"
          />
          <InfoTile
            icon={Plane}
            label="Vacaciones"
            value="20 días"
            sub="Pendientes de goce"
            href="/mi-portal/solicitudes"
          />
          <InfoTile
            icon={Calendar}
            label="Días trabajados"
            value="18/22"
            sub="Este mes"
            href="/mi-portal/perfil"
          />
        </div>
      </section>

      {/* ─── 5. Próximas capacitaciones (si hay) ────────────────────────── */}
      {proximasCapacitaciones.length > 0 ? (
        <section>
          <div className="flex items-baseline justify-between mb-3 px-1">
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 20,
                fontWeight: 400,
                letterSpacing: '-0.015em',
                color: 'var(--text-primary)',
              }}
            >
              Próximas capacitaciones
            </h2>
            <Link
              href="/mi-portal/capacitaciones"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
            >
              Ver todas <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'white', border: '0.5px solid var(--border-default)' }}
          >
            <ul className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {proximasCapacitaciones.slice(0, 3).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/mi-portal/capacitaciones`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[color:var(--neutral-50)] transition-colors"
                  >
                    <div
                      className="flex items-center justify-center rounded-lg flex-shrink-0"
                      style={{
                        width: 36,
                        height: 36,
                        background: 'var(--emerald-50)',
                        color: 'var(--emerald-700)',
                      }}
                    >
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[color:var(--text-primary)] truncate">
                        {c.title}
                      </p>
                      {c.deadline ? (
                        <p className="mt-0.5 text-[11px] text-[color:var(--text-tertiary)] inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Hasta {new Date(c.deadline).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)]" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ─── 6. Atajos rápidos ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-3 px-1">
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              fontWeight: 400,
              letterSpacing: '-0.015em',
              color: 'var(--text-primary)',
            }}
          >
            Atajos rápidos
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          <QuickAction
            href="/mi-portal/solicitudes/nueva"
            icon={Plane}
            label="Solicitar vacaciones"
          />
          <QuickAction
            href="/mi-portal/solicitudes/nueva"
            icon={FileText}
            label="Pedir constancia"
          />
          <QuickAction
            href="/mi-portal/documentos/subir"
            icon={Upload}
            label="Subir documento"
          />
          <QuickAction
            href="/mi-portal/perfil"
            icon={Briefcase}
            label="Actualizar datos"
          />
          <QuickAction
            href="/mi-portal/reglamento"
            icon={ShieldCheck}
            label="Ver el RIT"
          />
          <QuickAction
            href="/mi-portal/denuncias"
            icon={Sparkles}
            label="Reportar incidente"
          />
        </div>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function InfoTile({
  icon: Icon,
  label,
  value,
  sub,
  href,
  variant = 'default',
}: {
  icon: typeof Wallet
  label: string
  value: string
  sub: string
  href: string
  variant?: 'default' | 'accent'
}) {
  const isAccent = variant === 'accent'
  return (
    <Link
      href={href}
      className="group block rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-lift,0_8px_16px_-4px_rgba(15,23,42,0.08))]"
      style={{
        background: isAccent
          ? 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0))'
          : 'white',
        border: isAccent
          ? '0.5px solid rgba(16,185,129,0.22)'
          : '0.5px solid var(--border-default)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5" style={{ color: 'var(--emerald-600)' }} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)]">
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          fontWeight: 400,
          color: 'var(--text-primary)',
          letterSpacing: '-0.015em',
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)]">{sub}</p>
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
      className="group flex flex-col items-start gap-2 rounded-xl p-3.5 transition-all hover:border-emerald-500/60 hover:bg-emerald-50/50"
      style={{
        background: 'white',
        border: '0.5px solid var(--border-default)',
      }}
    >
      <div
        className="flex items-center justify-center rounded-lg transition-colors"
        style={{
          width: 32,
          height: 32,
          background: 'var(--emerald-50)',
          color: 'var(--emerald-700)',
        }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs font-semibold text-[color:var(--text-primary)] leading-tight">
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
      <div
        style={{
          display: 'grid',
          gap: 10,
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
            {message || 'Contactá al área de RRHH si el problema persiste.'}
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
