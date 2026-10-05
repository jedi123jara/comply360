'use client'

import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'

export interface HeroPanelProps {
  score: number | null
  userFirstName?: string
  orgName?: string
  multaEvitadaSoles: number
  alertasCriticas?: number
  trabajadoresProtegidos: number
  diasSinMulta: number
  onReviewAlerts?: () => void
  onOpenDiagnostic?: () => void
  onAskAssistant?: () => void
}

/** Overview hero for the blue-and-white workspace. */
export function HeroPanel({
  score,
  userFirstName,
  orgName,
  alertasCriticas = 0,
  onReviewAlerts,
  onOpenDiagnostic,
  onAskAssistant,
}: HeroPanelProps) {
  const safeName = userFirstName?.trim() || 'equipo'
  const safeOrg = orgName?.trim() || 'tu empresa'
  const normalizedScore = score == null ? 0 : Math.max(0, Math.min(100, Math.round(score)))
  const pending = score == null
  const healthy = !pending && normalizedScore >= 75
  const status = pending ? 'Diagnóstico pendiente' : healthy ? 'Buen nivel' : 'Necesita atención'
  const primaryAction = alertasCriticas > 0 ? onReviewAlerts : onOpenDiagnostic

  return (
    <section className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]" aria-label="Resumen de cumplimiento">
      <article className="relative min-h-[280px] overflow-hidden rounded-2xl border border-[color:var(--border-default)] bg-white p-6 shadow-[var(--elevation-2)] sm:p-8">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] lg:block">
          <div className="absolute inset-0 bg-[linear-gradient(145deg,transparent_8%,#eff6ff_8%,#dbeafe_100%)]" />
          <div className="absolute left-[18%] top-[22%] h-40 w-52 rounded-2xl border border-blue-200 bg-white/90 p-4 shadow-[var(--elevation-2)]">
            <div className="flex items-center justify-between">
              <span className="h-3 w-20 rounded-full bg-blue-100" />
              <ShieldCheck className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-5 space-y-3">
              {[72, 88, 60].map((width) => (
                <div key={width} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  <span className="h-2 rounded-full bg-blue-100" style={{ width: `${width}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-xl lg:max-w-[58%]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
            <Sparkles className="h-3.5 w-3.5" />
            Resumen del día
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-4xl">
            Hola, {safeName}
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
            {pending
              ? `Completa el diagnóstico para conocer el estado real de ${safeOrg}.`
              : healthy
                ? `${safeOrg} mantiene un buen nivel de cumplimiento. Revisa lo próximo para conservarlo.`
                : `${safeOrg} tiene acciones importantes pendientes. Empecemos por la de mayor impacto.`}
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={primaryAction}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(21,94,239,0.2)] transition hover:bg-blue-700"
            >
              Completar plan de acción
              <ArrowRight className="h-4 w-4" />
            </button>
            {onAskAssistant ? (
              <button
                type="button"
                onClick={onAskAssistant}
                className="inline-flex items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--text-secondary)] transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                Preguntar al asistente
              </button>
            ) : null}
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-[color:var(--border-default)] bg-white p-6 shadow-[var(--elevation-2)] sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Tu cumplimiento hoy</p>
            <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">Estado general de la empresa</p>
          </div>
          <span className={healthy
            ? 'rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700'
            : pending
              ? 'rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700'
              : 'rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700'}>
            {status}
          </span>
        </div>

        <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
          <div className="relative grid h-40 w-40 shrink-0 place-items-center">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e8eef7" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="#155eef" strokeWidth="10" strokeLinecap="round" pathLength="100" strokeDasharray={`${pending ? 0 : normalizedScore} 100`} />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <span className="text-4xl font-bold tracking-tight text-[color:var(--text-primary)]">{pending ? '—' : normalizedScore}</span>
                {!pending ? <span className="text-xl font-semibold text-blue-600">%</span> : null}
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-tertiary)]">Cumplimiento</span>
              </div>
            </div>
          </div>
          <div className="max-w-[220px] text-center sm:text-left">
            <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
              {pending
                ? 'Aún no existe una medición completa.'
                : alertasCriticas > 0
                  ? `Hay ${alertasCriticas} alerta${alertasCriticas === 1 ? '' : 's'} crítica${alertasCriticas === 1 ? '' : 's'} por revisar.`
                  : 'No tienes alertas críticas pendientes.'}
            </p>
            <button type="button" onClick={onOpenDiagnostic} className="mt-3 text-sm font-semibold text-blue-700 hover:underline">
              Ver diagnóstico completo →
            </button>
          </div>
        </div>
      </article>
    </section>
  )
}
