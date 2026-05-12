'use client'

/**
 * OnboardingCascadeCard — Invitar al trabajador a su portal personal.
 *
 * Refactor 2026-04-27: la card original decía "Cascada de onboarding" y
 * tenía botón "Iniciar onboarding" — copy técnico que no comunicaba que la
 * acción es ENVIAR UN EMAIL DE INVITACIÓN al trabajador.
 *
 * Ahora muestra estado real (consultando AuditLog vía /onboarding-status):
 *   - no_email          → "Worker no tiene email registrado — agrega email primero"
 *   - not_invited       → CTA primario "Enviar invitación a {nombre}"
 *   - invited_waiting   → "Invitación enviada el X. Esperando que entre"
 *   - logged_in_pending → "Ya entró pero falta completar legajo (X%)"
 *   - completed         → "Trabajador con perfil completo ✓"
 *
 * Cada estado tiene su CTA apropiado (re-enviar, recordar, etc.).
 */

import { useEffect, useState, useCallback } from 'react'
import {
  Send, Sparkles, CheckCircle2, Clock, RotateCw, AlertTriangle, Mail,
  ChevronDown, UserCheck, FileQuestion, Inbox,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner-toaster'
import { cn } from '@/lib/utils'

export interface OnboardingCascadeCardProps {
  workerId: string
  workerFirstName: string
  hasEmail: boolean
  /** @deprecated — el componente ahora consulta AuditLog directamente */
  alreadyExecuted?: boolean
  /** Callback opcional tras invitación exitosa. */
  onExecuted?: () => void
}

type CascadeStatus =
  | 'no_email'
  | 'not_invited'
  | 'invited_waiting'
  | 'logged_in_pending'
  | 'completed'
  | 'loading'

interface OnboardingStatus {
  email: string | null
  invitationSentAt: string | null
  workerHasLoggedIn: boolean
  workerLastLogin: string | null
  legajoCompleteness: number
  documentsRequested: number
  status: Exclude<CascadeStatus, 'loading'>
}

interface ExecutionResult {
  documentsPublished: number
  requestsCreated: number
  emailSent: boolean
  emailError?: string
  skipped: boolean
  skipReason?: string
}

export function OnboardingCascadeCard({
  workerId,
  workerFirstName,
  hasEmail,
  onExecuted,
}: OnboardingCascadeCardProps) {
  const [status, setStatus] = useState<CascadeStatus>('loading')
  const [statusData, setStatusData] = useState<OnboardingStatus | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [forceReExecute, setForceReExecute] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/workers/${workerId}/onboarding-status`)
      if (!res.ok) {
        // Fallback: si el endpoint falla, asumir not_invited
        setStatus(hasEmail ? 'not_invited' : 'no_email')
        return
      }
      const data = (await res.json()) as OnboardingStatus
      setStatusData(data)
      setStatus(data.status)
    } catch {
      setStatus(hasEmail ? 'not_invited' : 'no_email')
    }
  }, [workerId, hasEmail])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  async function execute() {
    setExecuting(true)
    try {
      const res = await fetch(`/api/workers/${workerId}/onboarding-cascade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          force: forceReExecute,
          sendEmail: hasEmail && sendEmail,
          requestLegajo: true,
        }),
      })
      const body = (await res.json()) as {
        data?: ExecutionResult
        message?: string
        error?: string
      }

      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)

      if (body.data?.skipped) {
        toast.info(body.data.skipReason ?? `Ya le habías enviado la invitación. Usa "Reenviar" si quieres mandarla otra vez.`)
      } else if (body.data && !body.data.emailSent && body.data.emailError) {
        // Cascada se ejecutó pero el EMAIL falló — caso típico de RESEND_API_KEY no configurado
        toast.error(
          `Preparamos los documentos pero el correo NO le llegó a ${workerFirstName}. ` +
          `Detalle: ${body.data.emailError}`,
          { duration: 8000 },
        )
        onExecuted?.()
      } else {
        toast.success(`Invitación enviada a ${workerFirstName} ✓`)
        onExecuted?.()
      }
      // Refrescar estado tras ejecución
      await fetchStatus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pudimos enviar la invitación. Intenta de nuevo.')
    } finally {
      setExecuting(false)
    }
  }

  // ─── Render por estado ───────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
        <div className="h-5 w-48 bg-slate-100 rounded mb-3" />
        <div className="h-3 w-full bg-slate-100 rounded mb-2" />
        <div className="h-3 w-3/4 bg-slate-100 rounded" />
      </section>
    )
  }

  // Caso especial: sin email
  if (status === 'no_email') {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 text-sm">
              Falta el email de {workerFirstName}
            </h3>
            <p className="mt-1 text-sm text-amber-800">
              Para invitarle a su portal personal necesitas registrar su email primero.
              Edítalo en la sección de "Datos personales" arriba.
            </p>
          </div>
        </div>
      </section>
    )
  }

  // Estados con email — header visual unificado
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5 shadow-sm',
        cfg.cardBg,
        cfg.cardBorder,
      )}
    >
      {/* Halo decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-50"
        style={{ background: cfg.haloColor }}
      />

      <div className="relative flex items-start gap-4">
        {/* Icon badge */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
          style={{ background: cfg.iconBg }}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          {/* Tag uppercase + badge estado */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={cn('text-[11px] font-bold uppercase tracking-widest', cfg.tagColor)}>
              Portal del trabajador
            </h3>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                cfg.badgeBg,
                cfg.badgeText,
              )}
            >
              {cfg.badgeIcon} {cfg.badgeLabel}
            </span>
          </div>

          {/* Title (Instrument Serif para "drama") */}
          <p
            className="mt-1.5 text-lg leading-snug text-slate-900"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
          >
            {cfg.title(workerFirstName)}
          </p>

          {/* Description con estado real */}
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
            {cfg.description({
              workerFirstName,
              email: statusData?.email ?? '',
              invitationSentAt: statusData?.invitationSentAt,
              legajoCompleteness: statusData?.legajoCompleteness ?? 0,
              documentsRequested: statusData?.documentsRequested ?? 0,
            })}
          </p>

          {/* Email destinatario destacado (estado not_invited) */}
          {status === 'not_invited' && statusData?.email && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
              <Mail className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-500">Se enviará a:</span>
              <span className="text-sm font-mono font-semibold text-slate-900">{statusData.email}</span>
            </div>
          )}

          {/* Opciones expandibles (re-ejecutar, etc.) */}
          {showOptions && (
            <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasEmail && sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  disabled={!hasEmail}
                  className="h-4 w-4 rounded text-emerald-600"
                />
                <span className={cn(!hasEmail && 'text-slate-400')}>
                  Avisarle por email
                  {!hasEmail && (
                    <span className="ml-2 text-xs text-amber-600">(no hay email)</span>
                  )}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceReExecute}
                  onChange={(e) => setForceReExecute(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600"
                />
                <span>Mandar de nuevo aunque ya le llegó antes</span>
              </label>
              <p className="text-xs text-slate-500 pl-6">
                Marca esta opción si agregaste documentos o políticas nuevas que necesita firmar.
              </p>
            </div>
          )}

          {/* CTAs */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={execute}
              loading={executing}
              disabled={executing}
              icon={<Send className="h-3.5 w-3.5" />}
              size="sm"
              variant={cfg.primaryButtonVariant}
            >
              {cfg.primaryButtonLabel(workerFirstName)}
            </Button>
            {(status === 'invited_waiting' || status === 'logged_in_pending' || status === 'completed') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowOptions((v) => !v)}
                icon={
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform', showOptions && 'rotate-180')}
                  />
                }
              >
                {showOptions ? 'Cerrar' : 'Más opciones'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchStatus}
              icon={<RotateCw className="h-3.5 w-3.5" />}
            >
              Actualizar
            </Button>
          </div>

          {/* Mini-stats si ya se invitó */}
          {statusData && statusData.documentsRequested > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MiniStat
                icon={<Inbox className="h-3.5 w-3.5" />}
                label="Docs solicitados"
                value={String(statusData.documentsRequested)}
                color="indigo"
              />
              <MiniStat
                icon={<FileQuestion className="h-3.5 w-3.5" />}
                label="Legajo completo"
                value={`${statusData.legajoCompleteness}%`}
                color={
                  statusData.legajoCompleteness >= 80
                    ? 'emerald'
                    : statusData.legajoCompleteness >= 40
                      ? 'amber'
                      : 'rose'
                }
              />
              {statusData.workerHasLoggedIn && (
                <MiniStat
                  icon={<UserCheck className="h-3.5 w-3.5" />}
                  label="Estado"
                  value="Activo"
                  color="emerald"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── MiniStat sub-component ──────────────────────────────────────────────────
function MiniStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: 'indigo' | 'emerald' | 'amber' | 'rose'
}) {
  const colorMap = {
    indigo: 'text-indigo-700 ring-indigo-200 bg-indigo-50',
    emerald: 'text-emerald-700 ring-emerald-200 bg-emerald-50',
    amber: 'text-amber-700 ring-amber-200 bg-amber-50',
    rose: 'text-rose-700 ring-rose-200 bg-rose-50',
  }
  return (
    <div className={cn('rounded-lg p-2 ring-1', colorMap[color])}>
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide opacity-80">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  )
}

// ─── Configuración visual por estado ─────────────────────────────────────────
/**
 * Args unificados para el callback `description` de cada estado. TypeScript
 * narrowing del Record literal exige que TODAS las funciones acepten el mismo
 * tipo. Cada estado solo USA un subset, los demás los ignora.
 */
interface DescriptionArgs {
  workerFirstName: string
  email: string
  invitationSentAt: string | null | undefined
  legajoCompleteness: number
  documentsRequested: number
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'hace un instante'
  if (min < 60) return `hace ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `hace ${hr} h`
  const days = Math.floor(hr / 24)
  if (days < 30) return `hace ${days} ${days === 1 ? 'día' : 'días'}`
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_CONFIG = {
  not_invited: {
    icon: Sparkles,
    iconBg: 'linear-gradient(135deg, #2563eb, #1e40af)',
    haloColor: 'radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%)',
    cardBg: 'bg-gradient-to-br from-emerald-50/60 via-white to-white',
    cardBorder: 'border-emerald-200',
    tagColor: 'text-emerald-700',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    badgeIcon: <Clock className="h-3 w-3" />,
    badgeLabel: 'Sin invitar',
    title: (n: string) => `Invita a ${n} a su portal personal`,
    description: () =>
      'Le enviaremos un email con un enlace para crear su cuenta, completar sus datos personales (foto, dirección) y subir los documentos del legajo. Tú no tendrás que hacer nada — el trabajador lo hace solo desde su celular.',
    primaryButtonLabel: (n: string) => `Enviar invitación a ${n}`,
    primaryButtonVariant: 'primary' as const,
  },
  invited_waiting: {
    icon: Mail,
    iconBg: 'linear-gradient(135deg, #6366f1, #4338ca)',
    haloColor: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)',
    cardBg: 'bg-gradient-to-br from-indigo-50/60 via-white to-white',
    cardBorder: 'border-indigo-200',
    tagColor: 'text-indigo-700',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    badgeIcon: <Mail className="h-3 w-3" />,
    badgeLabel: 'Invitación enviada',
    title: (n: string) => `${n} todavía no ha entrado al portal`,
    description: (a: DescriptionArgs) =>
      `La invitación se envió ${relativeTime(a.invitationSentAt)} pero todavía no abre el enlace. Si ya pasaron varios días, vuelve a enviarle el correo o llámale por teléfono para recordarle.`,
    primaryButtonLabel: (n: string) => `Reenviar invitación a ${n}`,
    primaryButtonVariant: 'secondary' as const,
  },
  logged_in_pending: {
    icon: UserCheck,
    iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
    haloColor: 'radial-gradient(circle, rgba(245,158,11,0.15), transparent 70%)',
    cardBg: 'bg-gradient-to-br from-amber-50/60 via-white to-white',
    cardBorder: 'border-amber-200',
    tagColor: 'text-amber-700',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    badgeIcon: <UserCheck className="h-3 w-3" />,
    badgeLabel: 'Ya entró — falta legajo',
    title: (n: string) => `${n} entró pero falta completar legajo`,
    description: (a: DescriptionArgs) =>
      `Su legajo está al ${a.legajoCompleteness}%. Hay ${a.documentsRequested} documentos pendientes que ya le pedimos. Puedes recordárselo enviando otro email.`,
    primaryButtonLabel: () => `Recordar documentos pendientes`,
    primaryButtonVariant: 'secondary' as const,
  },
  completed: {
    icon: CheckCircle2,
    iconBg: 'linear-gradient(135deg, #2563eb, #1e40af)',
    haloColor: 'radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%)',
    cardBg: 'bg-gradient-to-br from-emerald-50/60 via-white to-white',
    cardBorder: 'border-emerald-200',
    tagColor: 'text-emerald-700',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    badgeIcon: <CheckCircle2 className="h-3 w-3" />,
    badgeLabel: 'Completado',
    title: (n: string) => `${n} tiene su perfil completo`,
    description: () =>
      'El trabajador entró a su portal y completó el legajo. Sigue activo gestionando sus boletas, vacaciones y solicitudes desde su /mi-portal.',
    primaryButtonLabel: () => `Reenviar comunicado`,
    primaryButtonVariant: 'ghost' as const,
  },
} as const
