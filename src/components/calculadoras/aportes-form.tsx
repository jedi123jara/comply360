'use client'

import { useState, useMemo } from 'react'
import {
  calcularAportesPrevisionales,
  compararAfpVsOnp,
} from '@/lib/legal-engine/calculators/aportes-previsionales'
import type { AportesInput, AportesResult } from '@/lib/legal-engine/calculators/aportes-previsionales'
import { openWhatsApp } from '@/lib/whatsapp'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import { formatSoles } from '@/lib/format/peruvian'
import {
  Download,
  MessageCircle,
  Shield,
  Wallet,
  Building2,
  User,
  ArrowDownRight,
  ArrowUpRight,
  Info,
  Clock,
  BarChart3,
  Save,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { ResultadoExplicado } from './shared/resultado-explicado'
import { EstadoVacio } from './shared/ui'

const AFP_OPTIONS = [
  { value: 'HABITAT', label: 'AFP Habitat' },
  { value: 'INTEGRA', label: 'AFP Integra' },
  { value: 'PRIMA', label: 'AFP Prima' },
  { value: 'PROFUTURO', label: 'AFP Profuturo' },
]

const TIPO_APORTE_OPTIONS = [
  { value: 'AFP', label: 'AFP', color: 'text-blue-700', bgLight: 'bg-blue-50', borderActive: 'border-blue-500 ring-blue-200' },
  { value: 'ONP', label: 'ONP', color: 'text-emerald-700', bgLight: 'bg-emerald-50', borderActive: 'border-emerald-500 ring-emerald-200' },
  { value: 'SIN_APORTE', label: 'Sin aporte', color: 'text-[color:var(--text-secondary)]', bgLight: 'bg-[color:var(--bg-inset)]', borderActive: 'border-[color:var(--border-strong)] ring-[color:var(--border-default)]' },
] as const

export function AportesCalculadora() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [input, setInput] = useState<AportesInput>({
    sueldoBruto: 0,
    asignacionFamiliar: false,
    tipoAporte: 'AFP',
    afpNombre: 'PRIMA',
    sctr: false,
    horasExtras: 0,
  })

  const [showComparison, setShowComparison] = useState(false)

  const result = useMemo<AportesResult | null>(() => {
    if (input.sueldoBruto <= 0) return null
    try {
      return calcularAportesPrevisionales(input)
    } catch {
      return null
    }
  }, [input])

  const comparison = useMemo(() => {
    if (input.sueldoBruto <= 0 || !showComparison) return null
    try {
      return compararAfpVsOnp({
        sueldoBruto: input.sueldoBruto,
        asignacionFamiliar: input.asignacionFamiliar,
        sctr: input.sctr,
        horasExtras: input.horasExtras,
      })
    } catch {
      return null
    }
  }, [input.sueldoBruto, input.asignacionFamiliar, input.sctr, input.horasExtras, showComparison])

  const updateField = <K extends keyof AportesInput>(key: K, value: AportesInput[K]) => {
    setInput(prev => ({ ...prev, [key]: value }))
  }

  const saveCalculation = async () => {
    if (!result) return
    setSaving(true)
    try {
      const res = await fetch('/api/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'APORTES_PREVISIONALES', inputs: input }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Cálculo guardado', description: 'Puedes verlo en tu historial', type: 'success' })
    } catch {
      toast({ title: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="@container">
      <div className="grid grid-cols-1 @4xl:grid-cols-5 gap-6 @4xl:gap-8">
        {/* FORM -- Left side */}
        <div className="@4xl:col-span-2 space-y-6">
          <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Datos del trabajador</h2>
                <p className="text-sm text-[color:var(--text-tertiary)]">El resultado se actualiza mientras escribes</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Sueldo Bruto */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                  Sueldo bruto mensual
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)] font-semibold text-sm">S/</span>
                  <input
                    type="number"
                    value={input.sueldoBruto || ''}
                    onChange={e => updateField('sueldoBruto', Number(e.target.value))}
                    placeholder="0.00"
                    min={0}
                    step={100}
                    className="w-full pl-10 pr-4 py-3 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-semibold"
                  />
                </div>
              </div>

              {/* Tipo de Aporte */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                  Sistema de pensiones
                </label>
                <p className="-mt-1 mb-2 text-xs text-[color:var(--text-tertiary)]">
                  Donde aporta el trabajador para su jubilación: una AFP (privada) o la ONP (Estado).
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {TIPO_APORTE_OPTIONS.map(tipo => (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => updateField('tipoAporte', tipo.value as AportesInput['tipoAporte'])}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        input.tipoAporte === tipo.value
                          ? `${tipo.borderActive} ${tipo.color} ${tipo.bgLight} ring-2`
                          : 'border-[color:var(--border-default)] text-[color:var(--text-tertiary)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-surface-hover)]'
                      }`}
                    >
                      <span className="text-sm font-bold">{tipo.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* AFP Selection */}
              {input.tipoAporte === 'AFP' && (
                <div>
                  <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                    AFP
                  </label>
                  <select
                    value={input.afpNombre ?? 'PRIMA'}
                    onChange={e => updateField('afpNombre', e.target.value)}
                    className="w-full px-4 py-3 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium bg-[color:var(--bg-elevated)]"
                  >
                    {AFP_OPTIONS.map(afp => (
                      <option key={afp.value} value={afp.value}>
                        {afp.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Horas Extras */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                  Pago por horas extra del mes (si hubo)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--text-tertiary)]" />
                  <input
                    type="number"
                    value={input.horasExtras || ''}
                    onChange={e => updateField('horasExtras', Number(e.target.value))}
                    placeholder="0.00"
                    min={0}
                    step={50}
                    className="w-full pl-10 pr-4 py-3 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                {/* Asignacion Familiar */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={input.asignacionFamiliar}
                        onChange={e => updateField('asignacionFamiliar', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[color:var(--neutral-300)] rounded-full peer-checked:bg-primary transition-colors" />
                      <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                    </div>
                    <span className="text-sm text-[color:var(--text-secondary)] group-hover:text-[color:var(--text-primary)] font-medium">
                      Asignación familiar (10% de la RMV)
                    </span>
                  </label>
                </div>

                {/* SCTR */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={input.sctr}
                        onChange={e => updateField('sctr', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[color:var(--neutral-300)] rounded-full peer-checked:bg-orange-500 transition-colors" />
                      <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                    </div>
                    <span className="text-sm text-[color:var(--text-secondary)] group-hover:text-[color:var(--text-primary)] font-medium">
                      SCTR (actividad de riesgo)
                    </span>
                  </label>
                  {input.sctr && (
                    <div className="mt-2 ml-14 flex items-start gap-2 p-2.5 bg-orange-50 rounded-lg border border-orange-100">
                      <Info className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-600 font-medium">
                        Se usa una tasa promedio de SCTR (~1.53%). La tasa real depende de la actividad económica y de la aseguradora.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Comparison toggle */}
              <div className="pt-3 border-t border-[color:var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowComparison(!showComparison)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-bold ${
                    showComparison
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-[color:var(--border-default)] text-[color:var(--text-tertiary)] hover:border-[color:var(--border-strong)]'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  {showComparison ? 'Ocultar comparación' : 'Comparar AFP vs ONP'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS -- Right side */}
        <div className="@4xl:col-span-3 space-y-6">
          {!result ? (
            <EstadoVacio titulo="Ingresa el sueldo bruto del trabajador" faltantes={['sueldo bruto']} />
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Sueldo Neto */}
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-white/80" />
                    <span className="text-xs font-medium text-white/80 uppercase tracking-wider">
                      Sueldo Neto
                    </span>
                  </div>
                  <div className="text-2xl font-black tracking-tight">
                    {formatSoles(result.sueldoNeto)}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-white/80 text-xs">
                    <ArrowDownRight className="w-3 h-3" />
                    <span>Recibe el trabajador</span>
                  </div>
                </div>

                {/* Descuentos Trabajador */}
                <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownRight className="w-4 h-4 text-white/80" />
                    <span className="text-xs font-medium text-white/80 uppercase tracking-wider">
                      Descuentos
                    </span>
                  </div>
                  <div className="text-2xl font-black tracking-tight">
                    {formatSoles(result.totalDescuentoTrabajador)}
                  </div>
                  <div className="text-white/80 text-xs mt-1">{result.sistema}</div>
                </div>

                {/* Costo Empleador */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-white/80" />
                    <span className="text-xs font-medium text-white/80 uppercase tracking-wider">
                      Costo Empleador
                    </span>
                  </div>
                  <div className="text-2xl font-black tracking-tight">
                    {formatSoles(result.costoTotalEmpleador)}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-white/80 text-xs">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>Total empresa</span>
                  </div>
                </div>
              </div>

              {/* Worker Deductions Breakdown */}
              <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[color:var(--border-subtle)]">
                  <h3 className="text-lg font-bold text-[color:var(--text-primary)] flex items-center gap-2">
                    <ArrowDownRight className="w-5 h-5 text-red-500" />
                    Descuentos al trabajador
                  </h3>
                </div>

                <div className="divide-y divide-[color:var(--border-subtle)]">
                  <BreakdownRow
                    label={input.tipoAporte === 'AFP' ? 'Aporte Obligatorio (10%)' : 'Aporte ONP (13%)'}
                    amount={result.aporteObligatorio}
                    percentage={result.remuneracionComputable > 0 ? (result.aporteObligatorio / result.remuneracionComputable) * 100 : 0}
                    color="red"
                  />
                  {input.tipoAporte === 'AFP' && (
                    <>
                      <BreakdownRow
                        label="Seguro de Invalidez (~1.84%)"
                        amount={result.seguroInvalidez}
                        percentage={result.remuneracionComputable > 0 ? (result.seguroInvalidez / result.remuneracionComputable) * 100 : 0}
                        color="red"
                      />
                      <BreakdownRow
                        label={`Comisión AFP ${input.afpNombre ?? 'Prima'}`}
                        amount={result.comisionAfp}
                        percentage={result.remuneracionComputable > 0 ? (result.comisionAfp / result.remuneracionComputable) * 100 : 0}
                        color="red"
                      />
                    </>
                  )}
                  {/* Total row */}
                  <div className="px-6 py-4 flex items-center justify-between bg-red-50">
                    <span className="text-sm font-bold text-red-800">Total Descuento</span>
                    <span className="text-lg font-black text-red-700 tabular-nums">
                      {formatSoles(result.totalDescuentoTrabajador)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Employer Contributions Breakdown */}
              <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[color:var(--border-subtle)]">
                  <h3 className="text-lg font-bold text-[color:var(--text-primary)] flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-blue-500" />
                    Aportes del Empleador
                  </h3>
                </div>

                <div className="divide-y divide-[color:var(--border-subtle)]">
                  <BreakdownRow
                    label="EsSalud (9%)"
                    amount={result.essalud}
                    percentage={result.remuneracionComputable > 0 ? (result.essalud / result.remuneracionComputable) * 100 : 0}
                    color="blue"
                  />
                  {input.sctr && (
                    <BreakdownRow
                      label="SCTR (~1.53%)"
                      amount={result.sctr}
                      percentage={result.remuneracionComputable > 0 ? (result.sctr / result.remuneracionComputable) * 100 : 0}
                      color="blue"
                    />
                  )}
                  {/* Total row */}
                  <div className="px-6 py-4 flex items-center justify-between bg-blue-50">
                    <span className="text-sm font-bold text-blue-800">Total Aporte Empleador</span>
                    <span className="text-lg font-black text-blue-700 tabular-nums">
                      {formatSoles(result.totalAporteEmpleador)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Remuneracion Computable */}
              <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm p-6">
                <h3 className="text-sm font-bold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Resumen
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-[color:var(--bg-inset)] rounded-xl border border-[color:var(--border-default)]">
                    <div className="w-10 h-10 rounded-lg bg-[color:var(--neutral-100)] flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-5 h-5 text-[color:var(--text-secondary)]" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-[color:var(--text-secondary)]">
                        {formatSoles(result.remuneracionComputable)}
                      </p>
                      <p className="text-xs font-medium text-[color:var(--text-tertiary)]">Remuneración computable</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-[color:var(--bg-inset)] rounded-xl border border-[color:var(--border-default)]">
                    <div className="w-10 h-10 rounded-lg bg-[color:var(--neutral-100)] flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-[color:var(--text-secondary)]" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-[color:var(--text-secondary)]">{result.sistema}</p>
                      <p className="text-xs font-medium text-[color:var(--text-tertiary)]">Sistema previsional</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparison Table */}
              {showComparison && comparison && (
                <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-[color:var(--border-subtle)]">
                    <h3 className="text-lg font-bold text-[color:var(--text-primary)] flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Comparación AFP vs ONP
                    </h3>
                    <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
                      Sueldo neto estimado por cada sistema previsional
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[color:var(--bg-inset)]">
                          <th className="text-left px-4 py-3 font-bold text-[color:var(--text-secondary)]">Sistema</th>
                          <th className="text-right px-4 py-3 font-bold text-[color:var(--text-secondary)]">Descuento</th>
                          <th className="text-right px-4 py-3 font-bold text-[color:var(--text-secondary)]">Sueldo Neto</th>
                          <th className="text-right px-4 py-3 font-bold text-[color:var(--text-secondary)]">Costo Empresa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--border-subtle)]">
                        {Object.entries(comparison.afps).map(([name, res]) => (
                          <tr key={name} className="hover:bg-[color:var(--bg-surface-hover)]">
                            <td className="px-4 py-3 font-semibold text-blue-700">AFP {name.charAt(0) + name.slice(1).toLowerCase()}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-red-600 font-medium">
                              {formatSoles(res.totalDescuentoTrabajador)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-emerald-600 font-bold">
                              {formatSoles(res.sueldoNeto)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-blue-600 font-medium">
                              {formatSoles(res.costoTotalEmpleador)}
                            </td>
                          </tr>
                        ))}
                        <tr className="hover:bg-emerald-50 bg-emerald-50/50">
                          <td className="px-4 py-3 font-semibold text-emerald-700">ONP</td>
                          <td className="px-4 py-3 text-right tabular-nums text-red-600 font-medium">
                            {formatSoles(comparison.onp.totalDescuentoTrabajador)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-emerald-600 font-bold">
                            {formatSoles(comparison.onp.sueldoNeto)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-blue-600 font-medium">
                            {formatSoles(comparison.onp.costoTotalEmpleador)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-blue-50 border-t border-blue-100">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-600">
                        La ONP descuenta 13% y no crea una cuenta personal. Las AFP descuentan alrededor de 12% a 13% (aporte + seguro + comisión) y el dinero va a una cuenta a nombre del trabajador. La comisión cambia según la AFP.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <ResultadoExplicado
                resumen="Del sueldo del trabajador se descuenta su aporte para la pensión (AFP u ONP); tú, como empleador, pagas aparte el 9% a EsSalud."
                pasos={[
                  `Remuneración computable: ${formatSoles(result.remuneracionComputable)} (sueldo${input.asignacionFamiliar ? ' + asignación familiar' : ''}${input.horasExtras ? ' + horas extra' : ''}).`,
                  input.tipoAporte === 'AFP'
                    ? `AFP ${(input.afpNombre ?? 'PRIMA').charAt(0) + (input.afpNombre ?? 'PRIMA').slice(1).toLowerCase()}: aporte a su fondo ${formatSoles(result.aporteObligatorio)}, seguro de invalidez ${formatSoles(result.seguroInvalidez)} y comisión de la AFP ${formatSoles(result.comisionAfp)}.`
                    : input.tipoAporte === 'ONP'
                      ? `ONP: se descuenta 13% del sueldo (${formatSoles(result.aporteObligatorio)}).`
                      : 'Sin sistema de pensiones: no hay descuento para la jubilación.',
                  `Total descontado al trabajador: ${formatSoles(result.totalDescuentoTrabajador)}. Recibe ${formatSoles(result.sueldoNeto)} (sin contar la renta de quinta categoría, si le corresponde).`,
                  `Tú pagas además EsSalud 9% (${formatSoles(result.essalud)})${input.sctr ? ` y SCTR (${formatSoles(result.sctr)})` : ''}. Costo total para la empresa: ${formatSoles(result.costoTotalEmpleador)}.`,
                ]}
                baseLegal={[
                  ...(input.tipoAporte === 'AFP'
                    ? [{ norma: 'D.S. 054-97-EF', enSimple: 'Sistema privado de pensiones (AFP): el trabajador aporta 10% a su fondo, más un seguro y la comisión de su AFP.' }]
                    : []),
                  ...(input.tipoAporte === 'ONP'
                    ? [{ norma: 'D.Ley 19990', enSimple: 'Sistema nacional de pensiones (ONP): el trabajador aporta 13% de su sueldo.' }]
                    : []),
                  { norma: 'Ley 26790', enSimple: 'EsSalud: el empleador aporta 9% del sueldo para el seguro de salud del trabajador.' },
                ]}
                nota="Tú retienes el aporte del sueldo y lo pagas a la AFP u ONP, junto con EsSalud, en la declaración mensual (PLAME)."
              />

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const items = [
                      { label: 'Remuneración Computable', amount: result.remuneracionComputable, formula: 'Sueldo bruto + asig. familiar + horas extras' },
                      { label: `Aporte ${result.sistema}`, amount: result.aporteObligatorio, formula: input.tipoAporte === 'AFP' ? '10% del sueldo' : '13% del sueldo' },
                    ]
                    if (input.tipoAporte === 'AFP') {
                      items.push({ label: 'Seguro Invalidez', amount: result.seguroInvalidez, formula: '~1.84% del sueldo' })
                      items.push({ label: `Comisión AFP`, amount: result.comisionAfp, formula: 'Varia por AFP' })
                    }
                    items.push(
                      { label: 'EsSalud (empleador)', amount: result.essalud, formula: '9% del sueldo' },
                    )
                    if (input.sctr) {
                      items.push({ label: 'SCTR (empleador)', amount: result.sctr, formula: '~1.53% del sueldo' })
                    }

                    const content = calculationToHTML({
                      title: 'Desglose de Aportes Previsionales',
                      items,
                      total: result.sueldoNeto,
                      warnings: [],
                      legalRefs: result.baseLegal.split('; ').map(ref => ({
                        norm: ref.split(',')[0],
                        description: ref,
                      })),
                      metadata: {
                        'Sistema Previsional': result.sistema,
                        'Sueldo Bruto': formatSoles(input.sueldoBruto),
                        'Sueldo Neto': formatSoles(result.sueldoNeto),
                        'Costo Total Empleador': formatSoles(result.costoTotalEmpleador),
                        'SCTR': input.sctr ? 'Sí' : 'No',
                      },
                    })
                    generatePDFFromHTML({
                      title: `Cálculo de Aportes Previsionales - ${result.sistema}`,
                      filename: 'calculo-aportes-previsionales.pdf',
                      content,
                      watermark: 'COMPLY360',
                    })
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </button>
                <button
                  type="button"
                  onClick={() => openWhatsApp({
                    type: 'consulta',
                    total: result.sueldoNeto,
                    data: {
                      tipo: 'Aportes Previsionales',
                      sistema: result.sistema,
                      sueldo_bruto: input.sueldoBruto,
                    },
                  })}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[color:var(--bg-elevated)] hover:bg-[color:var(--bg-surface-hover)] text-[color:var(--text-secondary)] rounded-xl font-semibold text-sm transition-colors border border-[color:var(--border-default)]"
                >
                  <MessageCircle className="w-4 h-4" />
                  Consultar por WhatsApp
                </button>
                <button
                  type="button"
                  onClick={saveCalculation}
                  disabled={saving || !result}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[color:var(--bg-elevated)] hover:bg-[color:var(--bg-surface-hover)] text-[color:var(--text-secondary)] rounded-xl font-semibold text-sm transition-colors border border-[color:var(--border-default)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================
// Breakdown Row Component
// =============================================

function BreakdownRow({
  label,
  amount,
  percentage,
  color,
}: {
  label: string
  amount: number
  percentage: number
  color: 'red' | 'blue'
}) {
  const gradientClass = color === 'red'
    ? 'from-red-500 to-red-400'
    : 'from-blue-500 to-blue-400'
  const bgClass = color === 'red' ? 'bg-red-500' : 'bg-blue-500'
  const badgeBg = color === 'red' ? 'bg-red-50' : 'bg-blue-50'
  const badgeText = color === 'red' ? 'text-red-600' : 'text-blue-600'

  return (
    <div className="px-6 py-4 flex items-center gap-4">
      <div className="w-1 h-10 rounded-full bg-[color:var(--neutral-200)] overflow-hidden flex-shrink-0">
        <div
          className={`w-full ${bgClass} rounded-full transition-all duration-700`}
          style={{ height: `${Math.min(percentage * 5, 100)}%` }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[color:var(--text-primary)]">{label}</span>
          <div className="text-right">
            <span className="text-lg font-bold text-[color:var(--text-primary)] tabular-nums">
              {formatSoles(amount)}
            </span>
            <span className={`ml-2 text-xs font-medium ${badgeText} ${badgeBg} px-2 py-0.5 rounded-full`}>
              {percentage.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 h-2 bg-[color:var(--neutral-100)] rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-700`}
              style={{ width: `${Math.min(percentage * 5, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
