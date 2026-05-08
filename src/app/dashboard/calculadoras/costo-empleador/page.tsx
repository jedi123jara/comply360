'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, Users, Building2, Info, Calculator } from 'lucide-react'
import { calcularCostoEmpleador, type CostoEmpleadorInput, type CostoEmpleadorResult } from '@/lib/legal-engine/calculators/costo-empleador'
import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'

const REGIMENES = [
  { value: 'GENERAL', label: 'General (D.Leg. 728)' },
  { value: 'MYPE_MICRO', label: 'MYPE Micro (hasta 10 trabajadores)' },
  { value: 'MYPE_PEQUENA', label: 'MYPE Pequena (hasta 100 trabajadores)' },
  { value: 'AGRARIO', label: 'Agrario (Ley 31110)' },
  { value: 'CONSTRUCCION_CIVIL', label: 'Construccion Civil' },
]

export default function CostoEmpleadorPage() {
  const [input, setInput] = useState<CostoEmpleadorInput>({
    sueldoBruto: PERU_LABOR.RMV,
    asignacionFamiliar: false,
    regimenLaboral: 'GENERAL',
    tipoAporte: 'AFP',
    sctr: false,
    essaludVida: false,
  })
  const [result, setResult] = useState<CostoEmpleadorResult | null>(null)

  function handleCalculate() {
    const res = calcularCostoEmpleador(input)
    setResult(res)
  }

  function handleInputChange(field: keyof CostoEmpleadorInput, value: unknown) {
    setInput(prev => ({ ...prev, [field]: value }))
    setResult(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
          <span>Calculadoras</span>
          <span>/</span>
          <span className="text-gold font-medium">Costo Total Empleador</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Calculadora de Costo Total Empleador
        </h1>
        <p className="text-text-secondary mt-1">
          Calcula el costo REAL de tener un trabajador. Incluye sueldo, EsSalud, CTS, gratificaciones,
          vacaciones, SCTR y todas las provisiones obligatorias segun regimen laboral.
        </p>
      </div>

      {/* Formulario + Resultados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FORM */}
        <div className="bg-surface/75 backdrop-blur-xl rounded-2xl border border-glass-border p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calculator className="h-5 w-5 text-gold" />
            Datos del puesto
          </h2>

          {/* Sueldo Bruto */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Sueldo Bruto Mensual (S/)
            </label>
            <input
              type="number"
              value={input.sueldoBruto}
              onChange={e => handleInputChange('sueldoBruto', Number(e.target.value))}
              className="w-full rounded-lg bg-surface/50 border border-glass-border px-3 py-2 text-white focus:ring-2 focus:ring-gold/20 focus:border-gold/40"
              min={0}
              step={50}
            />
            <p className="text-xs text-text-tertiary mt-1">RMV 2026: S/ {PERU_LABOR.RMV.toLocaleString()}</p>
          </div>

          {/* Regimen */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Regimen Laboral
            </label>
            <select
              value={input.regimenLaboral}
              onChange={e => handleInputChange('regimenLaboral', e.target.value)}
              className="w-full rounded-lg bg-surface/50 border border-glass-border px-3 py-2 text-white focus:ring-2 focus:ring-gold/20 focus:border-gold/40"
            >
              {REGIMENES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Tipo Aporte */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Sistema Previsional
            </label>
            <div className="flex gap-3">
              {(['AFP', 'ONP', 'SIN_APORTE'] as const).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => handleInputChange('tipoAporte', tipo)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    input.tipoAporte === tipo
                      ? 'border-gold/50 bg-gold/10 text-gold'
                      : 'border-glass-border text-text-secondary hover:border-glass-border-hover'
                  }`}
                >
                  {tipo === 'SIN_APORTE' ? 'Sin aporte' : tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            {[
              { field: 'asignacionFamiliar' as const, label: 'Asignacion familiar (10% RMV)', desc: 'Si tiene hijos menores o estudiantes' },
              { field: 'sctr' as const, label: 'SCTR', desc: 'Seguro Complementario de Trabajo de Riesgo' },
              { field: 'essaludVida' as const, label: 'Seguro Vida Ley', desc: 'D.Leg. 688 — obligatorio desde 4 anos' },
            ].map(({ field, label, desc }) => (
              <label key={field} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={input[field] as boolean}
                  onChange={e => handleInputChange(field, e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-glass-border bg-surface/50 text-gold focus:ring-gold/30"
                />
                <div>
                  <span className="text-sm text-white group-hover:text-gold transition-colors">{label}</span>
                  <p className="text-xs text-text-tertiary">{desc}</p>
                </div>
              </label>
            ))}
          </div>

          <button
            onClick={handleCalculate}
            className="w-full rounded-xl bg-gold text-black font-semibold py-3 hover:bg-gold/90 transition-all active:scale-[0.97]"
          >
            Calcular Costo Total
          </button>
        </div>

        {/* RESULTADOS */}
        <div className="space-y-4">
          {!result ? (
            <div className="bg-surface/75 backdrop-blur-xl rounded-2xl border border-glass-border p-8 text-center">
              <DollarSign className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary">
                Ingresa los datos y presiona calcular para ver el costo total real
              </p>
            </div>
          ) : (
            <>
              {/* KPI Principal */}
              <div className="bg-gradient-to-br from-gold/20 via-surface/75 to-surface/75 backdrop-blur-xl rounded-2xl border border-gold/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-text-secondary">Costo Mensual del Empleador</h3>
                  <TrendingUp className="h-5 w-5 text-gold" />
                </div>
                <p className="text-3xl font-bold text-white">
                  S/ {result.costoMensualEmpleador.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gold mt-1">
                  +{result.porcentajeSobreSueldo}% sobre el sueldo bruto
                </p>
                <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-sm">
                  <span className="text-text-secondary">Costo anual</span>
                  <span className="text-white font-semibold">
                    S/ {result.costoAnualEmpleador.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Desglose Empleador */}
              <div className="bg-surface/75 backdrop-blur-xl rounded-2xl border border-glass-border p-6">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gold" />
                  Desglose Costo Empleador (mensual)
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'Remuneracion bruta', value: result.remuneracionTotal, color: 'text-white' },
                    ...(result.asignacionFamiliar > 0 ? [{ label: '  Asignacion familiar incluida', value: result.asignacionFamiliar, color: 'text-text-tertiary' }] : []),
                    { label: 'EsSalud (9%)', value: result.essalud, color: 'text-emerald-600' },
                    ...(result.sctr > 0 ? [{ label: 'SCTR', value: result.sctr, color: 'text-amber-400' }] : []),
                    ...(result.seguroVida > 0 ? [{ label: 'Seguro Vida Ley', value: result.seguroVida, color: 'text-purple-400' }] : []),
                    { label: 'Provision CTS', value: result.provisionCTS, color: 'text-emerald-600' },
                    { label: 'Provision Gratificacion', value: result.provisionGratificacion, color: 'text-green-400' },
                    { label: 'Bonificacion Extraordinaria (9%)', value: result.provisionBonifExtraordinaria, color: 'text-sky-400' },
                    { label: 'Provision Vacaciones', value: result.provisionVacaciones, color: 'text-cyan-400' },
                  ].filter(item => item.value > 0).map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-1">
                      <span className="text-sm text-text-secondary">{item.label}</span>
                      <span className={`text-sm font-medium ${item.color}`}>
                        S/ {item.value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-white/10 pt-2 mt-2 flex justify-between items-center">
                    <span className="text-sm font-semibold text-white">TOTAL MENSUAL</span>
                    <span className="text-sm font-bold text-gold">
                      S/ {result.costoMensualEmpleador.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desglose Trabajador */}
              <div className="bg-surface/75 backdrop-blur-xl rounded-2xl border border-glass-border p-6">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-gold" />
                  Desglose del Trabajador (estimado)
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-1">
                    <span className="text-sm text-text-secondary">Remuneracion bruta</span>
                    <span className="text-sm text-white">S/ {result.remuneracionTotal.toFixed(2)}</span>
                  </div>
                  {result.descuentoAfp > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-sm text-text-secondary">(-) AFP (~12.34%)</span>
                      <span className="text-sm text-red-400">- S/ {result.descuentoAfp.toFixed(2)}</span>
                    </div>
                  )}
                  {result.descuentoOnp > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-sm text-text-secondary">(-) ONP (13%)</span>
                      <span className="text-sm text-red-400">- S/ {result.descuentoOnp.toFixed(2)}</span>
                    </div>
                  )}
                  {result.descuentoRenta5ta > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-sm text-text-secondary">(-) Renta 5ta (estimado)</span>
                      <span className="text-sm text-red-400">- S/ {result.descuentoRenta5ta.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-2 mt-2 flex justify-between items-center">
                    <span className="text-sm font-semibold text-white">NETO ESTIMADO</span>
                    <span className="text-sm font-bold text-emerald-600">
                      S/ {result.netoEstimado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Base Legal */}
              <div className="bg-surface/50 rounded-xl border border-glass-border p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-text-tertiary mt-0.5 shrink-0" />
                  <div className="text-xs text-text-tertiary space-y-0.5">
                    <p className="font-medium text-text-secondary mb-1">Base legal aplicada:</p>
                    {result.baseLegal.map((law, i) => (
                      <p key={i}>{law}</p>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* History */}
      <CalculationHistory type="COSTO_EMPLEADOR" />
    </div>
  )
}
