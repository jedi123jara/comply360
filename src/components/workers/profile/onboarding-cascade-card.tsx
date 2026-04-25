'use client'

import { useState } from 'react'
import { Send, Sparkles, CheckCircle2, Clock, RotateCw, AlertTriangle, Info, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner-toaster'

/**
 * OnboardingCascadeCard — control admin para disparar la cascada de onboarding.
 *
 * La cascada:
 *   1. Crea solicitudes (WorkerRequest) para los documentos que el trabajador
 *      debe subir (CV, DNI, examen médico, etc.)
 *   2. Envía email al trabajador con el resumen
 *   3. Registra en AuditLog
 *
 * Muestra estado en vivo, permite forzar re-envío y deshabilita opciones si el
 * worker no tiene email registrado.
 */

export interface OnboardingCascadeCardProps {
  workerId: string
  workerFirstName: string
  hasEmail: boolean
  /** Si true, ya se ejecutó antes — el botón cambia a "re-enviar". */
  alreadyExecuted?: boolean
  /** Callback opcional tras ejecución exitosa (para recargar datos del perfil). */
  onExecuted?: () => void
}

interface ExecutionResult {
  documentsPublished: number
  requestsCreated: number
  emailSent: boolean
  skipped: boolean
  skipReason?: string
}

export function OnboardingCascadeCard({
  workerId,
  workerFirstName,
  hasEmail,
  alreadyExecuted = false,
  onExecuted,
}: OnboardingCascadeCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [sendEmail, setSendEmail] = useState(hasEmail)
  const [force, setForce] = useState(alreadyExecuted)
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null)

  const execute = async () => {
    setExecuting(true)
    setLastResult(null)
    try {
      const res = await fetch(`/api/workers/${workerId}/onboarding-cascade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          force,
          sendEmail: hasEmail && sendEmail,
          requestLegajo: true,
        }),
      })
      const body = (await res.json()) as {
        data?: ExecutionResult
        message?: string
        error?: string
      }

      if (!res.ok) {
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      if (body.data) setLastResult(body.data)

      if (body.data?.skipped) {
        toast.info(body.data.skipReason ?? 'Onboarding ya ejecutada')
      } else {
        toast.success(body.message ?? 'Onboarding disparado correctamente')
        onExecuted?.()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al ejecutar onboarding')
    } finally {
      setExecuting(false)
    }
  }

  const isReRun = alreadyExecuted || (lastResult != null && !lastResult.skipped)

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white p-5 shadow-[0_1px_2px_rgba(4,120,87,0.04)]"
    >
      {/* Halo decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.12), transparent 70%)',
        }}
      />

      <div className="relative flex items-start gap-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_4px_10px_rgba(4,120,87,0.25)]"
          style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}
        >
          <Sparkles className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
              Cascada de onboarding
            </h3>
            {isReRun ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                <CheckCircle2 className="h-3 w-3" /> Ejecutada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                <Clock className="h-3 w-3" /> Pendiente
              </span>
            )}
          </div>
          <p
            className="mt-1 text-lg leading-snug text-[color:var(--text-primary)]"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
          >
            {isReRun
              ? `Re-enviar documentos y solicitudes a ${workerFirstName}`
              : `Envía los documentos de la empresa a ${workerFirstName} y pídele su legajo`}
          </p>
          <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
            Publica RIT, políticas SST y resto de docs de la empresa en su portal, crea solicitudes
            para los documentos obligatorios de su legajo y le envía un email de bienvenida.
          </p>

          {/* Expanded options */}
          {expanded ? (
            <div className="mt-4 space-y-2 rounded-xl border border-[color:var(--border-default)] bg-white p-3">
              <OptionRow
                label="Enviar email al trabajador"
                checked={hasEmail && sendEmail}
                onChange={setSendEmail}
                disabled={!hasEmail}
                hint={hasEmail ? undefined : 'El trabajador no tiene email registrado'}
              />
              <OptionRow
                label="Forzar re-ejecución"
                checked={force}
                onChange={setForce}
                hint="Correrá aunque ya haya sido ejecutada antes. Útil tras agregar políticas nuevas."
              />
            </div>
          ) : null}

          {/* Last result */}
          {lastResult ? (
            <div
              className={`mt-3 rounded-xl border px-3 py-2.5 text-xs ${
                lastResult.skipped
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}
            >
              {lastResult.skipped ? (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{lastResult.skipReason ?? 'Ejecución omitida'}</span>
                </div>
              ) : (
                <div className="grid gap-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Cascada completada
                  </div>
                  <ul className="ml-5 list-disc space-y-0.5 text-[11px]">
                    <li>
                      <strong>{lastResult.documentsPublished}</strong> documento(s) de la empresa
                      disponibles en el portal
                    </li>
                    <li>
                      <strong>{lastResult.requestsCreated}</strong> solicitud(es) creada(s) para el
                      trabajador
                    </li>
                    <li>
                      Email {lastResult.emailSent ? 'enviado' : 'no enviado'}
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={execute}
              loading={executing}
              disabled={executing}
              icon={isReRun ? <RotateCw className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
              size="sm"
            >
              {isReRun ? 'Re-enviar onboarding' : 'Iniciar onboarding'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              icon={<ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />}
            >
              {expanded ? 'Ocultar opciones' : 'Opciones'}
            </Button>
          </div>

          {!hasEmail ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-amber-700">
              <Info className="h-3 w-3" />
              El trabajador no tiene email — igual se crean las solicitudes, pero no recibirá aviso.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function OptionRow({
  label,
  checked,
  onChange,
  disabled,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  hint?: string
}) {
  return (
    <label
      className={`flex items-start gap-2.5 text-xs ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-emerald-600"
      />
      <span className="flex-1">
        <span className="font-medium text-[color:var(--text-primary)]">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[11px] text-[color:var(--text-tertiary)]">{hint}</span>
        ) : null}
      </span>
    </label>
  )
}
