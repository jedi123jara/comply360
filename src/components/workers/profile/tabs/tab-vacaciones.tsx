'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  CalendarCheck,
  CalendarClock,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Hourglass,
  Loader2,
  Plus,
} from 'lucide-react'

/**
 * Estado de goce de cada período: palabra + ícono, el color solo refuerza
 * (WCAG 1.4.1). `bar` es el color vivo de la barra; `ink` es la tinta de
 * texto (≥ 4,5:1 sobre blanco — amber-500 se queda en 2,1:1).
 */
type GoceTone = 'completo' | 'parcial' | 'sinGoce'

const GOCE_TONE: Record<
  GoceTone,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    bar: string
    ink: string
    bg: string
    border: string
  }
> = {
  completo: {
    label: 'Gozado completo',
    icon: CheckCircle2,
    bar: 'var(--success-green-500)',
    ink: 'var(--color-success-text)',
    bg: 'var(--color-success-bg)',
    border: 'var(--color-success-border)',
  },
  parcial: {
    label: 'Goce parcial',
    icon: Hourglass,
    bar: 'var(--amber-500)',
    ink: 'var(--color-warning-text)',
    bg: 'var(--color-warning-bg)',
    border: 'var(--color-warning-border)',
  },
  sinGoce: {
    label: 'Sin goce',
    icon: AlertOctagon,
    bar: 'var(--crimson-500, #ef4444)',
    ink: 'var(--color-danger-text)',
    bg: 'var(--color-danger-bg)',
    border: 'var(--color-danger-border)',
  },
}

/**
 * TabVacaciones — periodos vacacionales del trabajador.
 *
 * Consume `/api/workers/[id]/vacaciones`. Muestra:
 *  - KPI premium: días pendientes, periodos no gozados, años de servicio
 *  - Warning crimson si 2+ periodos sin goce (triple vacacional)
 *  - Lista de periodos con días gozados/pendientes
 */

interface VacationRecord {
  id: string
  periodoInicio: string
  periodoFin: string
  diasCorresponden: number
  diasGozados: number
  diasPendientes: number
  fechaGoce: string | null
  esDoble: boolean
}

interface VacacionesPayload {
  worker: {
    id: string
    firstName: string
    lastName: string
    fechaIngreso: string
    regimenLaboral: string
    anosServicio: number
    diasPorAnio: number
  }
  records: VacationRecord[]
  summary: {
    totalPeriodos: number
    totalDiasPendientes: number
    periodosSinGoce: number
    tieneRiesgoDoble: boolean
    periodosEsperados: number
    periodsWithoutRecord: number
  }
}

interface TabVacacionesProps {
  workerId: string
  workerFirstName: string
}

export function TabVacaciones({ workerId, workerFirstName }: TabVacacionesProps) {
  const [data, setData] = useState<VacacionesPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch pattern estándar; migrar a useApiQuery en refactor futuro.
    setLoading(true)
    fetch(`/api/workers/${workerId}/vacaciones`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`status ${r.status}`)
        return r.json()
      })
      .then((json: VacacionesPayload) => {
        if (!mounted) return
        setData(json)
      })
      .catch((e: Error) => {
        if (!mounted) return
        setError(e.message || 'Error al cargar vacaciones')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [workerId])

  if (loading) {
    return (
      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-10 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-600 mx-auto mb-2" />
        <p className="text-sm text-[color:var(--text-tertiary)]">Cargando vacaciones…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-10 text-center">
        <p className="text-sm text-red-700">{error ?? 'No se pudo cargar el calendario.'}</p>
      </div>
    )
  }

  const { records, summary, worker } = data
  const riesgoDoble = summary.tieneRiesgoDoble
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(
      new Date(iso),
    )

  return (
    <div className="space-y-6">
      {/* Header editorial */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700 mb-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              style={{ boxShadow: '0 0 0 3px rgba(16,185,129,0.15)' }}
            />
            <span>
              {worker.anosServicio} año{worker.anosServicio === 1 ? '' : 's'} de servicio · {worker.diasPorAnio}d/año
            </span>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
          >
            {/* Texto escapado por React: el nombre viene de datos del usuario. */}
            Vacaciones y descansos de <span style={{ color: 'var(--brand-primary-text, #2563eb)' }}>{workerFirstName}</span>.
          </h2>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1 max-w-2xl">
            Cada período anual genera <b>{worker.diasPorAnio} días</b> según el régimen{' '}
            <b>{worker.regimenLaboral}</b>. Si acumula 2 períodos sin goce, corresponde triple vacacional.
          </p>
        </div>
        <Link
          href={`/dashboard/vacaciones?workerId=${workerId}`}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors"
          style={{ boxShadow: '0 1px 2px rgba(4,120,87,0.18), inset 0 1px 0 rgba(255,255,255,0.12)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Registrar goce
        </Link>
      </div>

      {/* Warning crimson si triple vacacional aplicable */}
      {riesgoDoble ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl p-4"
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '0.5px solid rgba(239,68,68,0.25)',
          }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 bg-red-100 text-red-700">
            <AlertOctagon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-800">
              Triple vacacional aplicable — {summary.periodosSinGoce} períodos sin goce
            </p>
            <p className="mt-0.5 text-xs text-red-700">
              Corresponde pagar: una remuneración por el trabajo realizado, otra por el descanso
              no gozado, más una indemnización equivalente. Base: Art. 23 D.Leg. 713.
            </p>
          </div>
        </div>
      ) : summary.periodosSinGoce === 1 ? (
        /* Aviso preventivo: un período sin goce → riesgo de acumular el segundo. */
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border p-4"
          style={{
            background: GOCE_TONE.parcial.bg,
            borderColor: GOCE_TONE.parcial.border,
          }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
            style={{ background: 'var(--amber-100)', color: GOCE_TONE.parcial.ink }}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: GOCE_TONE.parcial.ink }}>
              Riesgo de acumular 2 períodos — hay 1 período sin goce
            </p>
            <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
              Programa el descanso antes de que se sume un segundo período sin gozar: en ese
              caso corresponde la triple vacacional (Art. 23 D.Leg. 713).
            </p>
          </div>
        </div>
      ) : null}

      {/* KPIs premium */}
      <section
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        <div className="c360-kpi accent">
          <div className="c360-kpi-head">
            <span className="dot" />
            <CalendarClock size={12} strokeWidth={2.2} />
            <span>Días pendientes</span>
          </div>
          <div className="c360-kpi-value">{summary.totalDiasPendientes}</div>
          <div className="c360-kpi-foot">Acumulados sin gozar</div>
        </div>
        <div
          className={`c360-kpi${riesgoDoble ? ' crimson' : summary.periodosSinGoce === 1 ? ' amber' : ''}`}
        >
          <div className="c360-kpi-head">
            <span className="dot" />
            <AlertOctagon size={12} strokeWidth={2.2} />
            <span>Períodos sin goce</span>
          </div>
          <div className="c360-kpi-value">{summary.periodosSinGoce}</div>
          <div className="c360-kpi-foot">
            {riesgoDoble
              ? 'Triple vacacional activo'
              : summary.periodosSinGoce === 1
                ? 'Programa el descanso pronto'
                : 'Sin riesgo inmediato'}
          </div>
        </div>
        <div className="c360-kpi">
          <div className="c360-kpi-head">
            <span className="dot" />
            <CalendarCheck size={12} strokeWidth={2.2} />
            <span>Períodos registrados</span>
          </div>
          <div className="c360-kpi-value">{summary.totalPeriodos}</div>
          <div className="c360-kpi-foot">
            {summary.periodosEsperados > 0
              ? `De ${summary.periodosEsperados} esperados`
              : 'Histórico en el legajo'}
          </div>
        </div>
      </section>

      {/* Period timeline */}
      {records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border-default)] bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 mb-3">
            <Calendar className="h-5 w-5" />
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}
          >
            Todavía no hay períodos registrados
          </h3>
          <p className="text-sm text-[color:var(--text-tertiary)] max-w-md mx-auto">
            Registra el primer período anual y el sistema calculará automáticamente
            el riesgo de doble/triple vacacional.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {records.map((r) => {
            const pct = r.diasCorresponden > 0 ? (r.diasGozados / r.diasCorresponden) * 100 : 0
            const complete = r.diasPendientes === 0
            const sinGoce = r.diasGozados === 0
            const tone = GOCE_TONE[complete ? 'completo' : sinGoce ? 'sinGoce' : 'parcial']
            const ToneIcon = tone.icon
            return (
              <div
                key={r.id}
                className="rounded-xl border border-[color:var(--border-subtle)] bg-white px-5 py-4"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                      Período {fmtDate(r.periodoInicio)} → {fmtDate(r.periodoFin)}
                    </p>
                    <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
                      Corresponden {r.diasCorresponden} días · Gozados {r.diasGozados} · Pendientes {r.diasPendientes}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                        style={{ color: tone.ink, background: tone.bg, borderColor: tone.border }}
                      >
                        <ToneIcon className="h-3.5 w-3.5" />
                        {tone.label}
                      </span>
                      {r.esDoble ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                          style={{
                            color: GOCE_TONE.sinGoce.ink,
                            background: GOCE_TONE.sinGoce.bg,
                            borderColor: GOCE_TONE.sinGoce.border,
                          }}
                        >
                          <AlertOctagon className="h-3.5 w-3.5" />
                          Doble período
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 22,
                        color: tone.ink,
                        lineHeight: 1,
                      }}
                    >
                      {Math.round(pct)}%
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
                      gozado
                    </div>
                  </div>
                </div>
                {/* Barra de goce: el texto de arriba ya da los días, la barra lo refuerza */}
                <div
                  className="mt-3 h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'var(--neutral-100)' }}
                  role="progressbar"
                  aria-label="Días gozados del período"
                  aria-valuemin={0}
                  aria-valuemax={r.diasCorresponden}
                  aria-valuenow={Math.min(r.diasGozados, r.diasCorresponden)}
                  aria-valuetext={`${r.diasGozados} de ${r.diasCorresponden} días gozados · ${r.diasPendientes} pendientes · ${tone.label}`}
                >
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      background: tone.bar,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
