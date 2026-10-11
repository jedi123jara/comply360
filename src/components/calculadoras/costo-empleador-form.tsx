'use client'

import { useMemo, useState } from 'react'
import { Building2, Info, TrendingUp, Users, Wallet } from 'lucide-react'
import {
  calcularCostoEmpleador,
  type CostoEmpleadorInput,
  type CostoEmpleadorResult,
} from '@/lib/legal-engine/calculators/costo-empleador'
import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'
import { formatSoles } from '@/lib/format/peruvian'
import { cn } from '@/lib/utils'
import { RegimenSelector, AvisoRegimenEspecial } from './shared/regimen-selector'
import { getRegimenInfo } from './shared/regimen'
import { ResultadoExplicado, type BaseLegalSimple } from './shared/resultado-explicado'
import { CARD, EstadoVacio, HINT, INPUT, LABEL } from './shared/ui'

const SISTEMAS: Array<{ value: CostoEmpleadorInput['tipoAporte']; label: string }> = [
  { value: 'AFP', label: 'AFP' },
  { value: 'ONP', label: 'ONP' },
  { value: 'SIN_APORTE', label: 'Sin aporte' },
]

/**
 * Costo total de un trabajador para la empresa: sueldo + aportes del
 * empleador + provisiones mensuales de beneficios, según el régimen.
 */
export function CostoEmpleadorCalculadora() {
  const [input, setInput] = useState<CostoEmpleadorInput>({
    sueldoBruto: PERU_LABOR.RMV,
    asignacionFamiliar: false,
    regimenLaboral: 'GENERAL',
    tipoAporte: 'AFP',
    sctr: false,
    essaludVida: false,
  })

  const update = <K extends keyof CostoEmpleadorInput>(field: K, value: CostoEmpleadorInput[K]) => {
    setInput(prev => ({ ...prev, [field]: value }))
  }

  const result = useMemo<CostoEmpleadorResult | null>(() => {
    if (input.sueldoBruto <= 0) return null
    try {
      return calcularCostoEmpleador(input)
    } catch {
      return null
    }
  }, [input])

  const regimen = getRegimenInfo(input.regimenLaboral)

  // ── Explicación en simple ──────────────────────────────────────────────
  const pasos: string[] = []
  const baseLegal: BaseLegalSimple[] = [
    { norma: 'Ley 26790', enSimple: 'EsSalud: la empresa aporta 9% del sueldo para el seguro de salud del trabajador.' },
  ]
  if (result) {
    pasos.push(
      `Sueldo${result.asignacionFamiliar > 0 ? ` + asignación familiar (${formatSoles(result.asignacionFamiliar)})` : ''}: ${formatSoles(result.remuneracionTotal)}.`,
    )
    const aportes = [
      `EsSalud ${formatSoles(result.essalud)}`,
      result.sctr > 0 ? `SCTR ${formatSoles(result.sctr)}` : null,
      result.seguroVida > 0 ? `Seguro Vida Ley ${formatSoles(result.seguroVida)}` : null,
    ].filter(Boolean)
    pasos.push(`Aportes que paga la empresa cada mes (no se descuentan al trabajador): ${aportes.join(', ')}.`)
    pasos.push(
      `Lo que conviene separar cada mes para los beneficios: CTS ${formatSoles(result.provisionCTS)}, gratificaciones ${formatSoles(result.provisionGratificacion)} más su bonificación ${formatSoles(result.provisionBonifExtraordinaria)} y vacaciones ${formatSoles(result.provisionVacaciones)}. No se pagan cada mes, pero llegan en mayo y noviembre (CTS), julio y diciembre (gratificaciones) y cuando sale de vacaciones.`,
    )
    if (regimen.tratamiento === 'especial') {
      pasos.push(`Régimen ${regimen.label}: el costo es solo una referencia.`)
    }
    pasos.push(
      `Costo real al mes: ${formatSoles(result.costoMensualEmpleador)}, es decir ${result.porcentajeSobreSueldo}% más que el sueldo. Al año: ${formatSoles(result.costoAnualEmpleador)}.`,
    )
    baseLegal.push(
      { norma: 'D.S. 001-97-TR', enSimple: 'CTS: medio sueldo por semestre, depositado en mayo y noviembre.' },
      { norma: 'Ley 27735', enSimple: 'Gratificaciones: un sueldo en julio y otro en diciembre.' },
      { norma: 'D.Leg. 713', enSimple: 'Vacaciones: 30 días pagados por cada año de trabajo.' },
    )
    if (input.essaludVida) {
      baseLegal.push({ norma: 'D.Leg. 688', enSimple: 'Seguro Vida Ley: la empresa lo contrata y paga desde el primer día de trabajo.' })
    }
    if (regimen.key === 'MYPE_MICRO' || regimen.key === 'MYPE_PEQUENA') {
      baseLegal.push({
        norma: PERU_LABOR.MYPE.MICRO.BASE_LEGAL,
        enSimple: 'Régimen MYPE: la microempresa no paga CTS ni gratificaciones; la pequeña paga la mitad. Ambas dan 15 días de vacaciones.',
      })
    }
  }

  const empleadorRows = result
    ? [
        { label: 'Sueldo', value: result.remuneracionTotal },
        { label: 'EsSalud', value: result.essalud },
        { label: 'SCTR', value: result.sctr },
        { label: 'Seguro Vida Ley', value: result.seguroVida },
        { label: 'Provisión de CTS', value: result.provisionCTS },
        { label: 'Provisión de gratificaciones', value: result.provisionGratificacion },
        { label: 'Bonificación extraordinaria (9%)', value: result.provisionBonifExtraordinaria },
        { label: 'Provisión de vacaciones', value: result.provisionVacaciones },
      ].filter(r => r.value > 0)
    : []

  return (
    <div className="@container">
      <div className="grid grid-cols-1 @4xl:grid-cols-5 gap-6 @4xl:gap-8">
        {/* FORMULARIO */}
        <div className="@4xl:col-span-2 space-y-6">
          <div className={`${CARD} p-6 space-y-5`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Datos del puesto</h2>
                <p className="text-sm text-[color:var(--text-tertiary)]">El resultado se actualiza mientras escribes</p>
              </div>
            </div>

            <div>
              <label htmlFor="costo-sueldo" className={LABEL}>
                Sueldo bruto mensual
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)] font-semibold text-sm">S/</span>
                <input
                  id="costo-sueldo"
                  type="number"
                  min={0}
                  step={50}
                  inputMode="decimal"
                  value={input.sueldoBruto || ''}
                  onChange={e => update('sueldoBruto', Number(e.target.value))}
                  className={`${INPUT} pl-10 text-lg font-semibold`}
                />
              </div>
              <p className={HINT}>Sueldo mínimo (RMV) vigente: {formatSoles(PERU_LABOR.RMV)}.</p>
            </div>

            <RegimenSelector
              calc="costo_empleador"
              value={input.regimenLaboral}
              onChange={v => update('regimenLaboral', v)}
            />

            <div>
              <p className={LABEL}>Sistema de pensiones del trabajador</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Sistema de pensiones">
                {SISTEMAS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={input.tipoAporte === s.value}
                    onClick={() => update('tipoAporte', s.value)}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                      input.tipoAporte === s.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-surface-hover)]',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className={HINT}>Solo cambia el neto del trabajador; no el costo de la empresa.</p>
            </div>

            <div className="space-y-3">
              {[
                { field: 'asignacionFamiliar' as const, label: `Asignación familiar (${formatSoles(PERU_LABOR.RMV * PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE)})`, desc: 'Si tiene hijos menores de 18 años o que estudian.' },
                { field: 'sctr' as const, label: 'SCTR', desc: 'Seguro obligatorio si la actividad es de riesgo (construcción, minería, industria, etc.).' },
                { field: 'essaludVida' as const, label: 'Seguro Vida Ley', desc: 'Obligatorio desde el primer día de trabajo (D.Leg. 688).' },
              ].map(({ field, label, desc }) => (
                <label key={field} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={input[field]}
                    onChange={e => update(field, e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-medium text-[color:var(--text-primary)]">{label}</span>
                    <span className="block text-xs text-[color:var(--text-tertiary)]">{desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* RESULTADO */}
        <div className="@4xl:col-span-3 space-y-6">
          {!result ? (
            <EstadoVacio titulo="Ingresa el sueldo del puesto" faltantes={['sueldo bruto']} />
          ) : (
            <>
              <AvisoRegimenEspecial regimen={input.regimenLaboral} />

              <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <span className="text-sm font-medium text-white/90 uppercase tracking-wider">
                    Costo mensual para la empresa
                  </span>
                  <span className="text-xs bg-white/15 px-2.5 py-1 rounded-full">{regimen.label}</span>
                </div>
                <p className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums">
                  {formatSoles(result.costoMensualEmpleador)}
                </p>
                <p className="mt-2 text-sm text-white/85">
                  {result.porcentajeSobreSueldo}% más que el sueldo bruto
                  {regimen.tratamiento === 'especial' ? ' · referencial' : ''}
                </p>
                <div className="mt-4 pt-4 border-t border-white/20 flex justify-between text-sm">
                  <span className="text-white/85">Costo al año</span>
                  <span className="font-semibold tabular-nums">{formatSoles(result.costoAnualEmpleador)}</span>
                </div>
              </div>

              <div className={`${CARD} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-[color:var(--border-subtle)]">
                  <h3 className="text-base font-bold text-[color:var(--text-primary)] flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Lo que paga la empresa (por mes)
                  </h3>
                </div>
                <div className="divide-y divide-[color:var(--border-subtle)]">
                  {empleadorRows.map(row => (
                    <div key={row.label} className="px-6 py-3 flex items-center justify-between gap-4">
                      <span className="text-sm text-[color:var(--text-secondary)]">{row.label}</span>
                      <span className="text-sm font-semibold text-[color:var(--text-primary)] tabular-nums">{formatSoles(row.value)}</span>
                    </div>
                  ))}
                  <div className="px-6 py-3 flex items-center justify-between gap-4 bg-[color:var(--bg-inset)]">
                    <span className="text-sm font-bold text-[color:var(--text-primary)]">Total mensual</span>
                    <span className="text-base font-black text-[color:var(--text-primary)] tabular-nums">{formatSoles(result.costoMensualEmpleador)}</span>
                  </div>
                </div>
              </div>

              <div className={`${CARD} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-[color:var(--border-subtle)]">
                  <h3 className="text-base font-bold text-[color:var(--text-primary)] flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Lo que recibe el trabajador (aproximado)
                  </h3>
                </div>
                <div className="divide-y divide-[color:var(--border-subtle)]">
                  <div className="px-6 py-3 flex items-center justify-between gap-4">
                    <span className="text-sm text-[color:var(--text-secondary)]">Sueldo bruto</span>
                    <span className="text-sm font-semibold text-[color:var(--text-primary)] tabular-nums">{formatSoles(result.remuneracionTotal)}</span>
                  </div>
                  {result.descuentoAfp > 0 && (
                    <div className="px-6 py-3 flex items-center justify-between gap-4">
                      <span className="text-sm text-[color:var(--text-secondary)]">(−) AFP (aprox. 12%)</span>
                      <span className="text-sm font-semibold text-crimson-700 tabular-nums">− {formatSoles(result.descuentoAfp)}</span>
                    </div>
                  )}
                  {result.descuentoOnp > 0 && (
                    <div className="px-6 py-3 flex items-center justify-between gap-4">
                      <span className="text-sm text-[color:var(--text-secondary)]">(−) ONP (13%)</span>
                      <span className="text-sm font-semibold text-crimson-700 tabular-nums">− {formatSoles(result.descuentoOnp)}</span>
                    </div>
                  )}
                  {result.descuentoRenta5ta > 0 && (
                    <div className="px-6 py-3 flex items-center justify-between gap-4">
                      <span className="text-sm text-[color:var(--text-secondary)]">(−) Renta de quinta (estimado)</span>
                      <span className="text-sm font-semibold text-crimson-700 tabular-nums">− {formatSoles(result.descuentoRenta5ta)}</span>
                    </div>
                  )}
                  <div className="px-6 py-3 flex items-center justify-between gap-4 bg-[color:var(--bg-inset)]">
                    <span className="text-sm font-bold text-[color:var(--text-primary)] flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-primary" aria-hidden />
                      Neto estimado
                    </span>
                    <span className="text-base font-black text-[color:var(--text-primary)] tabular-nums">{formatSoles(result.netoEstimado)}</span>
                  </div>
                </div>
              </div>

              <ResultadoExplicado
                resumen="Sueldo + aportes que paga la empresa + lo que conviene separar cada mes para CTS, gratificaciones y vacaciones."
                pasos={pasos}
                baseLegal={baseLegal}
                nota={
                  <span className="inline-flex items-start gap-1.5">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                    El neto del trabajador es aproximado: la renta de quinta categoría se estima de forma simplificada.
                  </span>
                }
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
