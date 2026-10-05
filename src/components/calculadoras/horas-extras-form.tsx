'use client'

import { useState, useMemo } from 'react'
import { calcularHorasExtras } from '@/lib/legal-engine/calculators/horas-extras'
import { openWhatsApp } from '@/lib/whatsapp'
import type { HorasExtrasInput, HorasExtrasResult } from '@/lib/legal-engine'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import { formatSoles } from '@/lib/format/peruvian'
import {
  Calculator,
  Download,
  MessageCircle,
  Scale,
  Clock,
  TrendingUp,
  Save,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'
import { ResultadoExplicado } from './shared/resultado-explicado'
import { EstadoVacio } from './shared/ui'

export function HorasExtrasCalculadora() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [input, setInput] = useState<HorasExtrasInput>({
    sueldoBruto: 0,
    horasSemanales: 0,
    mesesAcumulados: 1,
    incluyeDomingos: false,
    horasDomingo: 0,
  })

  const result = useMemo<HorasExtrasResult | null>(() => {
    if (input.sueldoBruto <= 0 || input.horasSemanales <= 0 || input.mesesAcumulados <= 0) {
      return null
    }
    try {
      return calcularHorasExtras(input)
    } catch {
      return null
    }
  }, [input])

  const updateField = <K extends keyof HorasExtrasInput>(
    key: K,
    value: HorasExtrasInput[K]
  ) => {
    setInput(prev => ({ ...prev, [key]: value }))
  }

  const JORNADA = PERU_LABOR.HORAS_EXTRAS.JORNADA_MAXIMA_SEMANAL
  const extrasSemana = Math.max(input.horasSemanales - JORNADA, 0)

  const faltantes = [
    input.sueldoBruto > 0 ? null : 'sueldo',
    input.horasSemanales > 0 ? null : 'horas trabajadas por semana',
    input.mesesAcumulados > 0 ? null : 'meses a calcular',
  ].filter((x): x is string => x !== null)

  const fmt = (n: number) =>
    n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const saveCalculation = async () => {
    if (!result) return
    setSaving(true)
    try {
      const res = await fetch('/api/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'HORAS_EXTRAS', inputs: input }),
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
                <Calculator className="w-5 h-5 text-primary" />
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
                    className="w-full pl-10 pr-4 py-3 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-semibold"
                  />
                </div>
              </div>

              {/* Horas extras semanales */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                  Horas trabajadas por semana (en total)
                </label>
                <input
                  type="number"
                  value={input.horasSemanales || ''}
                  onChange={e => updateField('horasSemanales', Number(e.target.value))}
                  placeholder="Ej: 56"
                  min={0}
                  className="w-full px-3 py-3 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <p className="text-xs text-[color:var(--text-tertiary)] mt-1">
                  Escribe todas las horas que trabaja en la semana. La jornada máxima es de {JORNADA} horas; lo que pase de eso son horas extra.
                </p>
                {input.horasSemanales > 0 && (
                  <p className="text-xs font-semibold text-[color:var(--text-secondary)] mt-1">
                    {extrasSemana > 0
                      ? `Son ${extrasSemana} horas extra por semana.`
                      : `No hay horas extra: no pasa de ${JORNADA} horas.`}
                  </p>
                )}
              </div>

              {/* Meses acumulados */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                  ¿Cuántos meses quieres calcular?
                </label>
                <input
                  type="number"
                  value={input.mesesAcumulados || ''}
                  onChange={e => updateField('mesesAcumulados', Math.min(Math.max(Number(e.target.value), 0), 12))}
                  placeholder="1"
                  min={1}
                  max={12}
                  className="w-full px-3 py-3 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <p className="text-xs text-[color:var(--text-tertiary)] mt-1">
                  De 1 a 12 meses con el mismo horario.
                </p>
              </div>

              {/* Toggle domingos */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={input.incluyeDomingos}
                      onChange={e => {
                        updateField('incluyeDomingos', e.target.checked)
                        if (!e.target.checked) {
                          updateField('horasDomingo', 0)
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[color:var(--neutral-300)] rounded-full peer-checked:bg-primary transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                  </div>
                  <span className="text-sm text-[color:var(--text-secondary)] group-hover:text-[color:var(--text-primary)]">
                    Incluye domingos y/o feriados
                  </span>
                </label>
              </div>

              {/* Horas en domingos (condicional) */}
              {input.incluyeDomingos && (
                <div>
                  <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                    Horas en domingos/feriados por semana
                  </label>
                  <input
                    type="number"
                    value={input.horasDomingo || ''}
                    onChange={e => updateField('horasDomingo', Number(e.target.value))}
                    placeholder="Ej: 8"
                    min={0}
                    className="w-full px-3 py-3 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <p className="text-xs text-[color:var(--text-tertiary)] mt-1">
                    Horas trabajadas en domingos o feriados por semana (sobretasa 100%)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RESULTS -- Right side */}
        <div className="@4xl:col-span-3 space-y-6">
          {!result ? (
            <EstadoVacio titulo="Ingresa los datos del trabajador" faltantes={faltantes} />
          ) : (
            <>
              {/* Total Card */}
              <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-white/80" />
                    <span className="text-sm font-medium text-white/80 uppercase tracking-wider">
                      Total por horas extra
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full">
                      {input.mesesAcumulados} {input.mesesAcumulados === 1 ? 'mes' : 'meses'}
                    </span>
                  </div>
                </div>
                <div className="text-4xl sm:text-5xl font-black tracking-tight mb-2 tabular-nums">
                  {formatSoles(result.montoTotal)}
                </div>
                <p className="text-white/80 text-sm">
                  {fmt(result.totalHoras)} horas extra en {input.mesesAcumulados} {input.mesesAcumulados === 1 ? 'mes' : 'meses'}
                </p>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2.5 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      const items = [
                        { label: `Horas al 25% (${fmt(result.breakdown.horas25.cantidad)} hrs)`, amount: result.breakdown.horas25.monto, formula: `${fmt(result.breakdown.horas25.cantidad)} hrs x ${formatSoles(result.valorHoraExtra25)}` },
                        { label: `Horas al 35% (${fmt(result.breakdown.horas35.cantidad)} hrs)`, amount: result.breakdown.horas35.monto, formula: `${fmt(result.breakdown.horas35.cantidad)} hrs x ${formatSoles(result.valorHoraExtra35)}` },
                      ]
                      if (result.breakdown.horasDomingo.cantidad > 0) {
                        items.push({ label: `Domingos/Feriados (${fmt(result.breakdown.horasDomingo.cantidad)} hrs)`, amount: result.breakdown.horasDomingo.monto, formula: `${fmt(result.breakdown.horasDomingo.cantidad)} hrs x ${formatSoles(result.valorHora * 2)} (sobretasa 100%)` })
                      }
                      const content = calculationToHTML({
                        title: 'Desglose de Horas Extras',
                        items,
                        total: result.montoTotal,
                        legalRefs: [
                          { norm: 'D.S. 007-2002-TR', description: 'TUO de la Ley de Jornada de Trabajo, Horario y Trabajo en Sobretiempo' },
                          { norm: 'D.Leg. 854', description: 'Ley de Jornada de Trabajo - sobretasa por horas extras (25% y 35%)' },
                        ],
                        metadata: {
                          'Remuneración Mensual Bruta': formatSoles(input.sueldoBruto),
                          'Valor Hora Base': formatSoles(result.valorHora),
                          'Horas Extras Semanales': `${input.horasSemanales}`,
                          'Meses Acumulados': `${input.mesesAcumulados}`,
                          'Total Horas Extras': `${result.totalHoras}`,
                          'Incluye Domingos/Feriados': input.incluyeDomingos ? 'Sí' : 'No',
                          'Fórmula Aplicada': result.formula,
                        },
                      })
                      generatePDFFromHTML({
                        title: 'Cálculo de Horas Extras',
                        filename: 'calculo-horas-extras.pdf',
                        content,
                        watermark: 'COMPLY360',
                      })
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-sm transition-colors border border-white/20"
                  >
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => openWhatsApp({
                      type: 'horas_extras',
                      total: result.montoTotal,
                      data: {
                        horas: result.totalHoras,
                      },
                    })}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-colors border border-white/20"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Consultar abogado
                  </button>
                  <button
                    type="button"
                    onClick={saveCalculation}
                    disabled={saving || !result}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-colors border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar
                  </button>
                </div>
              </div>

              {/* Valor hora base */}
              <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--text-tertiary)]">Valor hora base</p>
                      <p className="text-2xl font-black text-[color:var(--text-primary)]">{formatSoles(result.valorHora)}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xs text-[color:var(--text-tertiary)]">
                      <span className="font-semibold">+25%:</span> {formatSoles(result.valorHoraExtra25)}
                    </div>
                    <div className="text-xs text-[color:var(--text-tertiary)]">
                      <span className="font-semibold">+35%:</span> {formatSoles(result.valorHoraExtra35)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[color:var(--border-subtle)]">
                  <h3 className="text-lg font-bold text-[color:var(--text-primary)] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Desglose detallado
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[color:var(--bg-inset)] text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">
                        <th className="text-left px-6 py-3">Concepto</th>
                        <th className="text-right px-6 py-3">Cantidad</th>
                        <th className="text-right px-6 py-3">Valor</th>
                        <th className="text-right px-6 py-3">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--border-subtle)]">
                      {/* Horas al 25% */}
                      <tr className="hover:bg-[color:var(--bg-surface-hover)] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-10 rounded-full bg-orange-400 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Horas al 25%</p>
                              <p className="text-xs text-[color:var(--text-tertiary)]">Primeras 2h diarias</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-[color:var(--text-secondary)] tabular-nums">
                          {fmt(result.breakdown.horas25.cantidad)} hrs
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-[color:var(--text-tertiary)] tabular-nums">
                          {formatSoles(result.valorHoraExtra25)}
                        </td>
                        <td className="px-6 py-4 text-right text-lg font-bold text-[color:var(--text-primary)] tabular-nums">
                          {formatSoles(result.breakdown.horas25.monto)}
                        </td>
                      </tr>

                      {/* Horas al 35% */}
                      <tr className="hover:bg-[color:var(--bg-surface-hover)] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-10 rounded-full bg-orange-600 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Horas al 35%</p>
                              <p className="text-xs text-[color:var(--text-tertiary)]">Horas adicionales</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-[color:var(--text-secondary)] tabular-nums">
                          {fmt(result.breakdown.horas35.cantidad)} hrs
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-[color:var(--text-tertiary)] tabular-nums">
                          {formatSoles(result.valorHoraExtra35)}
                        </td>
                        <td className="px-6 py-4 text-right text-lg font-bold text-[color:var(--text-primary)] tabular-nums">
                          {formatSoles(result.breakdown.horas35.monto)}
                        </td>
                      </tr>

                      {/* Horas domingos (solo si aplica) */}
                      {result.breakdown.horasDomingo.cantidad > 0 && (
                        <tr className="hover:bg-[color:var(--bg-surface-hover)] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-10 rounded-full bg-red-500 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-[color:var(--text-primary)]">Domingos/Feriados</p>
                                <p className="text-xs text-[color:var(--text-tertiary)]">Sobretasa 100%</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-semibold text-[color:var(--text-secondary)] tabular-nums">
                            {fmt(result.breakdown.horasDomingo.cantidad)} hrs
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-[color:var(--text-tertiary)] tabular-nums">
                            {formatSoles(result.valorHora * 2)}
                          </td>
                          <td className="px-6 py-4 text-right text-lg font-bold text-[color:var(--text-primary)] tabular-nums">
                            {formatSoles(result.breakdown.horasDomingo.monto)}
                          </td>
                        </tr>
                      )}

                      {/* Total row */}
                      <tr className="bg-[color:var(--bg-inset)] font-bold">
                        <td className="px-6 py-4 text-sm text-[color:var(--text-primary)]" colSpan={2}>
                          Total ({fmt(result.totalHoras)} horas)
                        </td>
                        <td className="px-6 py-4" />
                        <td className="px-6 py-4 text-right text-lg text-primary tabular-nums">
                          {formatSoles(result.montoTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <ResultadoExplicado
                resumen={`Valor de la hora (sueldo ÷ ${PERU_LABOR.HORAS_EXTRAS.HORAS_MENSUALES}) con un recargo de 25% por las 2 primeras horas extra de cada día y 35% por las siguientes.`}
                pasos={[
                  `Valor de la hora: sueldo ${formatSoles(input.sueldoBruto)} ÷ ${PERU_LABOR.HORAS_EXTRAS.HORAS_MENSUALES} horas al mes = ${formatSoles(result.valorHora)}.`,
                  `Horas extra por semana: ${input.horasSemanales} − ${JORNADA} = ${extrasSemana}. Hasta 12 por semana (2 por día) se pagan con 25% de recargo (${formatSoles(result.valorHoraExtra25)} cada una) y el resto con 35% (${formatSoles(result.valorHoraExtra35)} cada una).`,
                  ...(result.breakdown.horasDomingo.cantidad > 0
                    ? [`Las horas en domingo o feriado se pagan con 100% de recargo (${formatSoles(result.valorHora * 2)} cada una).`]
                    : []),
                  `Por ${input.mesesAcumulados} ${input.mesesAcumulados === 1 ? 'mes' : 'meses'} (unas 4.33 semanas por mes) suman ${fmt(result.totalHoras)} horas extra.`,
                  `Total a pagar: ${formatSoles(result.montoTotal)}.`,
                ]}
                baseLegal={[
                  {
                    norma: 'D.S. 007-2002-TR',
                    enSimple:
                      'La jornada máxima es de 8 horas diarias o 48 semanales. El sobretiempo es voluntario y se paga con un recargo mínimo de 25% las dos primeras horas y 35% las siguientes.',
                  },
                  ...(result.breakdown.horasDomingo.cantidad > 0
                    ? [{
                        norma: 'D.Leg. 713',
                        enSimple: 'Si se trabaja en el día de descanso o en feriado sin darle otro día libre, se paga con 100% de recargo.',
                      }]
                    : []),
                ]}
                formulaTecnica={result.formula}
                nota="El cálculo supone que las horas extra se reparten en varios días (hasta 2 por día al 25%). Si se concentran en pocos días, más horas van al 35% y el monto sube. Las horas extra pagan AFP/ONP y EsSalud como cualquier remuneración."
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
