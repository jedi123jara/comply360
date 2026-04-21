'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  CalendarCheck,
  CalendarClock,
  AlertOctagon,
  Loader2,
  Plus,
} from 'lucide-react'

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
              fontFamily: 'var(--font-serif)',
              fontSize: 26,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
            dangerouslySetInnerHTML={{
              __html: `Vacaciones y descansos de <em style="color: var(--emerald-700); font-style: italic">${workerFirstName}</em>.`,
            }}
          />
          <p className="text-sm text-[color:var(--text-secondary)] mt-1 max-w-2xl">
            Cada periodo anual genera <b>{worker.diasPorAnio} días</b> según el régimen{' '}
            <b>{worker.regimenLaboral}</b>. Si acumula 2 periodos sin goce, corresponde triple vacacional.
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
              Triple vacacional aplicable — {summary.periodosSinGoce} periodos sin goce
            </p>
            <p className="mt-0.5 text-xs text-red-700">
              Corresponde pagar: una remuneración por el trabajo realizado, otra por el descanso
              no gozado, más una indemnización equivalente. Base: Art. 23 D.Leg. 713.
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
        <div className={`c360-kpi${riesgoDoble ? ' crimson' : ''}`}>
          <div className="c360-kpi-head">
            <span className="dot" />
            <AlertOctagon size={12} strokeWidth={2.2} />
            <span>Periodos sin goce</span>
          </div>
          <div className="c360-kpi-value">{summary.periodosSinGoce}</div>
          <div className="c360-kpi-foot">
            {riesgoDoble ? 'Triple vacacional activo' : 'Sin riesgo inmediato'}
          </div>
        </div>
        <div className="c360-kpi">
          <div className="c360-kpi-head">
            <span className="dot" />
            <CalendarCheck size={12} strokeWidth={2.2} />
            <span>Periodos registrados</span>
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
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 400,
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}
          >
            Todavía no hay periodos registrados
          </h3>
          <p className="text-sm text-[color:var(--text-tertiary)] max-w-md mx-auto">
            Registra el primer periodo anual y el sistema calculará automáticamente
            el riesgo de doble/triple vacacional.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {records.map((r) => {
            const pct = r.diasCorresponden > 0 ? (r.diasGozados / r.diasCorresponden) * 100 : 0
            const complete = r.diasPendientes === 0
            const sinGoce = r.diasGozados === 0
            const color = complete
              ? 'var(--emerald-500)'
              : sinGoce
                ? 'var(--crimson-500, #ef4444)'
                : 'var(--amber-500)'
            return (
              <div
                key={r.id}
                className="rounded-xl border border-[color:var(--border-subtle)] bg-white px-5 py-4"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                      Periodo {fmtDate(r.periodoInicio)} → {fmtDate(r.periodoFin)}
                    </p>
                    <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
                      Corresponden {r.diasCorresponden} días · Gozados {r.diasGozados} · Pendientes {r.diasPendientes}
                      {r.esDoble ? ' · 🚨 Doble' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 22,
                        color,
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
                {/* Progress bar */}
                <div
                  className="mt-3 h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'var(--neutral-100)' }}
                >
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      background: color,
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
