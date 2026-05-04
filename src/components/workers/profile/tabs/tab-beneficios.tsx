'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  Banknote,
  Calendar,
  PiggyBank,
  AlertOctagon,
  FileText,
  Info,
} from 'lucide-react'
import { calcularCTS } from '@/lib/legal-engine/calculators/cts'
import { calcularGratificacion } from '@/lib/legal-engine/calculators/gratificacion'
import { calcularVacaciones } from '@/lib/legal-engine/calculators/vacaciones'
import { calcularIndemnizacion } from '@/lib/legal-engine/calculators/indemnizacion'
import type { WorkerSummary } from '../worker-profile-header'

/**
 * TabBeneficios — cálculos laborales en vivo del trabajador.
 *
 * Consume las 4 calculadoras del legal-engine con los datos del perfil:
 *  - CTS al próximo corte (mayo 15 o noviembre 15)
 *  - Gratificación próxima (julio o diciembre)
 *  - Vacaciones acumuladas / truncas
 *  - Indemnización por despido arbitrario (si aplica)
 *
 * Cada card muestra: valor serif 34px, fórmula, base legal.
 */

interface TabBeneficiosProps {
  worker: WorkerSummary
  /**
   * Resumen real de vacaciones del trabajador (Ola 2 — 2026-05).
   * Si se provee, se usa para `diasGozados` en lugar del default 0.
   * Lo carga la página server-side desde `VacationRecord`.
   */
  vacationsSummary?: {
    diasGozados: number
    periodosNoGozados?: number
  }
}

export function TabBeneficios({ worker, vacationsSummary }: TabBeneficiosProps) {
  const sueldo = worker.sueldoBruto ?? 0
  const fechaIngreso = worker.fechaIngreso ?? null
  // Días reales gozados de VacationRecord (cae a 0 si no hay datos)
  const diasGozadosReales = vacationsSummary?.diasGozados ?? 0

  // ── Cálculos (DEBEN declararse ANTES de cualquier early return para cumplir rules-of-hooks) ──
  // `hasData` gobierna si los cálculos son significativos. Los hooks igual corren siempre.
  const hasData = Boolean(sueldo && fechaIngreso)

  // Timestamp estable para "ahora" — se recalcula una sola vez por mount
  // (evita que cada render haga new Date() y cambie las deps de useMemo).
  const now = useMemo(() => new Date(), [])
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  // CTS — próximo corte (15 mayo o 15 noviembre)
  const nextCtsCutoff = useMemo(() => {
    const mayCutoff = new Date(year, 4, 15)
    const novCutoff = new Date(year, 10, 15)
    if (now <= mayCutoff) return mayCutoff
    if (now <= novCutoff) return novCutoff
    return new Date(year + 1, 4, 15)
  }, [year, now])

  const cts = useMemo(() => {
    if (!hasData || !fechaIngreso) return null
    try {
      return calcularCTS({
        sueldoBruto: sueldo,
        fechaIngreso,
        fechaCorte: nextCtsCutoff.toISOString().slice(0, 10),
        asignacionFamiliar: false,
        ultimaGratificacion: sueldo, // Estimación: última grati = 1 sueldo
      })
    } catch {
      return null
    }
  }, [hasData, sueldo, fechaIngreso, nextCtsCutoff])

  // Gratificación — próximo periodo
  const nextGratiPeriodo: 'julio' | 'diciembre' = month < 7 ? 'julio' : 'diciembre'
  const mesesParaGrati =
    nextGratiPeriodo === 'julio' ? Math.min(6, month + 1) : Math.min(6, month - 6 + 1)

  const grati = useMemo(() => {
    if (!hasData || !fechaIngreso) return null
    try {
      return calcularGratificacion({
        sueldoBruto: sueldo,
        fechaIngreso,
        periodo: nextGratiPeriodo,
        mesesTrabajados: Math.max(1, mesesParaGrati),
        asignacionFamiliar: false,
      })
    } catch {
      return null
    }
  }, [hasData, sueldo, fechaIngreso, nextGratiPeriodo, mesesParaGrati])

  // Vacaciones — estado actual (si cesara hoy).
  // `diasGozados` viene de `VacationRecord` agregados (Ola 2). Si la página
  // padre aún no los carga, cae a 0 sin romper.
  const vacaciones = useMemo(() => {
    if (!hasData || !fechaIngreso) return null
    try {
      return calcularVacaciones({
        sueldoBruto: sueldo,
        fechaIngreso,
        fechaCese: now.toISOString().slice(0, 10),
        diasGozados: diasGozadosReales,
        asignacionFamiliar: false,
      })
    } catch {
      return null
    }
  }, [hasData, sueldo, fechaIngreso, now, diasGozadosReales])

  // Indemnización — si fuera despido arbitrario hoy
  const indemnizacion = useMemo(() => {
    if (!hasData || !fechaIngreso) return null
    try {
      return calcularIndemnizacion({
        sueldoBruto: sueldo,
        fechaIngreso,
        fechaDespido: now.toISOString().slice(0, 10),
        tipoContrato: 'indefinido',
      })
    } catch {
      return null
    }
  }, [hasData, sueldo, fechaIngreso, now])

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }).format(d)

  // ── Empty state: declarado DESPUÉS de todos los hooks (rules-of-hooks) ──
  if (!hasData) {
    return (
      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 mb-3">
          <Info className="h-5 w-5" />
        </div>
        <h3
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: '-0.015em',
            color: 'var(--text-primary)',
            marginBottom: 4,
          }}
        >
          Faltan datos para calcular beneficios
        </h3>
        <p className="text-sm text-[color:var(--text-tertiary)] mb-5 max-w-md mx-auto">
          Completa el sueldo bruto y la fecha de ingreso en la pestaña Información para
          ver CTS, gratificación, vacaciones e indemnización calculados en vivo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Eyebrow + explicación */}
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700 mb-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            style={{ boxShadow: '0 0 0 3px rgba(16,185,129,0.15)' }}
          />
          <span>Beneficios calculados en vivo</span>
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            lineHeight: 1.2,
            marginBottom: 6,
          }}
        >
          Cuánto le corresponde a <em style={{ color: 'var(--emerald-700)', fontStyle: 'italic' }}>
            {worker.firstName}
          </em> hoy.
        </h2>
        <p className="text-sm text-[color:var(--text-secondary)] max-w-2xl">
          Proyección en base a sueldo bruto <b>S/ {sueldo.toLocaleString('es-PE')}</b> e ingreso el{' '}
          <b>{fechaIngreso ? new Date(fechaIngreso).toLocaleDateString('es-PE') : '—'}</b>.
          Fórmulas y base legal citadas en cada card — usa el drawer de calculadoras para
          escenarios alternativos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cts ? (
          <BenefitCard
            icon={<PiggyBank size={14} />}
            label="CTS al próximo corte"
            value={cts.ctsTotal}
            meta={`Corte ${fmtDate(nextCtsCutoff)} · ${cts.mesesComputables}m ${cts.diasComputables}d computables`}
            formula={cts.formula}
            baseLegal={cts.baseLegal}
          />
        ) : null}
        {grati ? (
          <BenefitCard
            icon={<Banknote size={14} />}
            label={`Gratificación de ${nextGratiPeriodo}`}
            value={grati.totalNeto}
            meta={`Bruto S/ ${grati.gratificacionBruta.toLocaleString('es-PE', { maximumFractionDigits: 2 })} + bono extraordinario ${grati.bonificacionExtraordinaria > 0 ? `S/ ${grati.bonificacionExtraordinaria.toLocaleString('es-PE', { maximumFractionDigits: 2 })}` : 'no aplica'}`}
            formula={grati.formula}
            baseLegal={grati.baseLegal}
          />
        ) : null}
        {vacaciones ? (
          <BenefitCard
            icon={<Calendar size={14} />}
            label="Vacaciones acumuladas"
            value={vacaciones.total}
            meta={`${vacaciones.diasTruncosComputables}d truncos · ${vacaciones.periodosNoGozados} periodo${vacaciones.periodosNoGozados === 1 ? '' : 's'} no gozados`}
            formula={vacaciones.formula}
            baseLegal={vacaciones.baseLegal}
            variant={vacaciones.periodosNoGozados >= 2 ? 'crimson' : 'default'}
            warningText={
              vacaciones.periodosNoGozados >= 2
                ? '⚠ Triple vacacional aplicable — riesgo alto de multa SUNAFIL'
                : undefined
            }
          />
        ) : null}
        {indemnizacion ? (
          <BenefitCard
            icon={<AlertOctagon size={14} />}
            label="Indemnización si despido arbitrario"
            value={indemnizacion.indemnizacion}
            meta={`${indemnizacion.anosServicio} años + ${indemnizacion.mesesFraccion}m fracción · ${indemnizacion.topeAplicado ? 'Tope aplicado' : 'Sin tope'}`}
            formula={indemnizacion.formula}
            baseLegal={indemnizacion.baseLegal}
            variant="amber"
            warningText="Proyección hipotética si hoy fuera despido sin causa (Art. 34 D.Leg. 728)"
          />
        ) : null}
      </div>

      {/* Link al historial completo */}
      <div className="flex items-center justify-between rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)] px-5 py-3">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-lg bg-white border border-[color:var(--border-default)] flex items-center justify-center text-[color:var(--text-secondary)]"
          >
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">
              ¿Necesitas escenarios alternativos?
            </p>
            <p className="text-xs text-[color:var(--text-tertiary)]">
              Usa el drawer de calculadoras con el pre-fill de este trabajador (Cmd+K → &ldquo;Calcular&rdquo;).
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/calculadoras?workerId=${worker.id}`}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap"
        >
          Abrir calculadoras →
        </Link>
      </div>
    </div>
  )
}

/* ── BenefitCard ───────────────────────────────────────────────────────── */

interface BenefitCardProps {
  icon: React.ReactNode
  label: string
  value: number
  meta: string
  formula: string
  baseLegal: string
  variant?: 'default' | 'amber' | 'crimson'
  warningText?: string
}

function BenefitCard({
  icon,
  label,
  value,
  meta,
  formula,
  baseLegal,
  variant = 'default',
  warningText,
}: BenefitCardProps) {
  const variantClass =
    variant === 'crimson' ? ' crimson' : variant === 'amber' ? ' amber' : ''

  return (
    <div className={`c360-kpi${variantClass}`} style={{ padding: 20 }}>
      <div className="c360-kpi-head">
        <span className="dot" aria-hidden="true" />
        {icon}
        <span>{label}</span>
      </div>
      <div className="c360-kpi-value">
        <span style={{ fontSize: '0.55em', marginRight: 2, opacity: 0.7 }}>S/</span>
        {value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <p className="text-xs text-[color:var(--text-secondary)]" style={{ marginTop: 4 }}>
        {meta}
      </p>
      {warningText ? (
        <div
          className="text-xs font-semibold"
          style={{
            padding: '6px 10px',
            marginTop: 8,
            background:
              variant === 'crimson' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
            color: variant === 'crimson' ? 'var(--crimson-700, #b91c1c)' : 'var(--amber-700, #b45309)',
            borderRadius: 6,
          }}
        >
          {warningText}
        </div>
      ) : null}
      <details
        className="mt-3 text-xs"
        style={{ borderTop: '0.5px solid var(--border-subtle)', paddingTop: 10 }}
      >
        <summary
          className="cursor-pointer text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] font-medium"
          style={{ userSelect: 'none' }}
        >
          Ver fórmula y base legal
        </summary>
        <div className="mt-2 space-y-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] mb-0.5 font-bold">
              Fórmula
            </div>
            <code
              className="block text-[11px] p-2 rounded font-mono"
              style={{
                background: 'var(--neutral-50)',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {formula}
            </code>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] mb-0.5 font-bold">
              Base legal
            </div>
            <p className="text-[11px] text-[color:var(--text-secondary)]">{baseLegal}</p>
          </div>
        </div>
      </details>
    </div>
  )
}
