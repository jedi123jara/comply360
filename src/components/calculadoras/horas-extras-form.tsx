'use client'

import { useState, useMemo } from 'react'
import { calcularHorasExtras } from '@/lib/legal-engine/calculators/horas-extras'
import { openWhatsApp } from '@/lib/whatsapp'
import type { HorasExtrasInput, HorasExtrasResult } from '@/lib/legal-engine'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
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
      toast({ title: 'Calculo guardado', description: 'Puedes verlo en tu historial', type: 'success' })
    } catch {
      toast({ title: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* FORM -- Left side */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Datos del Trabajador</h2>
              <p className="text-sm text-gray-500">Los campos se calculan en tiempo real</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Sueldo Bruto */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Remuneración Mensual Bruta
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">S/</span>
                <input
                  type="number"
                  value={input.sueldoBruto || ''}
                  onChange={e => updateField('sueldoBruto', Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-semibold"
                />
              </div>
            </div>

            {/* Horas extras semanales */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Horas extras semanales
              </label>
              <input
                type="number"
                value={input.horasSemanales || ''}
                onChange={e => updateField('horasSemanales', Number(e.target.value))}
                placeholder="Ej: 10"
                min={0}
                className="w-full px-3 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <p className="text-xs text-gray-400 mt-1">
                Horas totales trabajadas por semana (las extras se calculan sobre las 48h de jornada máxima)
              </p>
            </div>

            {/* Meses acumulados */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Meses acumulados
              </label>
              <input
                type="number"
                value={input.mesesAcumulados || ''}
                onChange={e => updateField('mesesAcumulados', Math.min(Math.max(Number(e.target.value), 0), 12))}
                placeholder="1"
                min={1}
                max={12}
                className="w-full px-3 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <p className="text-xs text-gray-400 mt-1">
                Periodo de cálculo (1 a 12 meses)
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
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-primary transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-[#141824] rounded-full shadow transition-transform peer-checked:translate-x-5" />
                </div>
                <span className="text-sm text-gray-300 group-hover:text-white">
                  Incluye domingos y/o feriados
                </span>
              </label>
            </div>

            {/* Horas en domingos (condicional) */}
            {input.incluyeDomingos && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                  Horas en domingos/feriados por semana
                </label>
                <input
                  type="number"
                  value={input.horasDomingo || ''}
                  onChange={e => updateField('horasDomingo', Number(e.target.value))}
                  placeholder="Ej: 8"
                  min={0}
                  className="w-full px-3 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Horas trabajadas en domingos o feriados por semana (sobretasa 100%)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RESULTS -- Right side */}
      <div className="lg:col-span-3 space-y-6">
        {!result ? (
          <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <Calculator className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Ingresa los datos del trabajador
            </h3>
            <p className="text-sm text-gray-400">
              El cálculo se actualiza automáticamente en tiempo real
            </p>
          </div>
        ) : (
          <>
            {/* Total Card */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-8 text-white shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-orange-200" />
                  <span className="text-sm font-medium text-orange-100 uppercase tracking-wider">
                    Total Horas Extras
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full">
                    {input.mesesAcumulados} mes(es)
                  </span>
                </div>
              </div>
              <div className="text-5xl font-black tracking-tight mb-2">
                S/ {fmt(result.montoTotal)}
              </div>
              <p className="text-orange-100 text-sm">
                {result.totalHoras} horas extras acumuladas en {input.mesesAcumulados} mes(es)
              </p>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const items = [
                      { label: `Horas al 25% (${fmt(result.breakdown.horas25.cantidad)} hrs)`, amount: result.breakdown.horas25.monto, formula: `${fmt(result.breakdown.horas25.cantidad)} hrs x S/ ${fmt(result.valorHoraExtra25)}` },
                      { label: `Horas al 35% (${fmt(result.breakdown.horas35.cantidad)} hrs)`, amount: result.breakdown.horas35.monto, formula: `${fmt(result.breakdown.horas35.cantidad)} hrs x S/ ${fmt(result.valorHoraExtra35)}` },
                    ]
                    if (result.breakdown.horasDomingo.cantidad > 0) {
                      items.push({ label: `Domingos/Feriados (${fmt(result.breakdown.horasDomingo.cantidad)} hrs)`, amount: result.breakdown.horasDomingo.monto, formula: `${fmt(result.breakdown.horasDomingo.cantidad)} hrs x S/ ${fmt(result.valorHora * 2)} (sobretasa 100%)` })
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
                        'Remuneracion Mensual Bruta': `S/ ${input.sueldoBruto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
                        'Valor Hora Base': `S/ ${fmt(result.valorHora)}`,
                        'Horas Extras Semanales': `${input.horasSemanales}`,
                        'Meses Acumulados': `${input.mesesAcumulados}`,
                        'Total Horas Extras': `${result.totalHoras}`,
                        'Incluye Domingos/Feriados': input.incluyeDomingos ? 'Si' : 'No',
                        'Formula Aplicada': result.formula,
                      },
                    })
                    generatePDFFromHTML({
                      title: 'Calculo de Horas Extras',
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
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Valor hora base</p>
                    <p className="text-2xl font-black text-white">S/ {fmt(result.valorHora)}</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-xs text-gray-500">
                    <span className="font-semibold">+25%:</span> S/ {fmt(result.valorHoraExtra25)}
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="font-semibold">+35%:</span> S/ {fmt(result.valorHoraExtra35)}
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-white/[0.06] border-white/[0.08]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Desglose Detallado
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/[0.02] bg-white/[0.04] text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="text-left px-6 py-3">Concepto</th>
                      <th className="text-right px-6 py-3">Cantidad</th>
                      <th className="text-right px-6 py-3">Valor</th>
                      <th className="text-right px-6 py-3">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Horas al 25% */}
                    <tr className="hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-10 rounded-full bg-orange-400 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-white">Horas al 25%</p>
                            <p className="text-xs text-gray-500">Primeras 2h diarias</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-gray-300 tabular-nums">
                        {fmt(result.breakdown.horas25.cantidad)} hrs
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500 tabular-nums">
                        S/ {fmt(result.valorHoraExtra25)}
                      </td>
                      <td className="px-6 py-4 text-right text-lg font-bold text-white tabular-nums">
                        S/ {fmt(result.breakdown.horas25.monto)}
                      </td>
                    </tr>

                    {/* Horas al 35% */}
                    <tr className="hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-10 rounded-full bg-orange-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-white">Horas al 35%</p>
                            <p className="text-xs text-gray-500">Horas adicionales</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-gray-300 tabular-nums">
                        {fmt(result.breakdown.horas35.cantidad)} hrs
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500 tabular-nums">
                        S/ {fmt(result.valorHoraExtra35)}
                      </td>
                      <td className="px-6 py-4 text-right text-lg font-bold text-white tabular-nums">
                        S/ {fmt(result.breakdown.horas35.monto)}
                      </td>
                    </tr>

                    {/* Horas domingos (solo si aplica) */}
                    {result.breakdown.horasDomingo.cantidad > 0 && (
                      <tr className="hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-10 rounded-full bg-red-500 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-white">Domingos/Feriados</p>
                              <p className="text-xs text-gray-500">Sobretasa 100%</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-300 tabular-nums">
                          {fmt(result.breakdown.horasDomingo.cantidad)} hrs
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-500 tabular-nums">
                          S/ {fmt(result.valorHora * 2)}
                        </td>
                        <td className="px-6 py-4 text-right text-lg font-bold text-white tabular-nums">
                          S/ {fmt(result.breakdown.horasDomingo.monto)}
                        </td>
                      </tr>
                    )}

                    {/* Total row */}
                    <tr className="bg-white/[0.02] bg-white/[0.04] font-bold">
                      <td className="px-6 py-4 text-sm text-white" colSpan={2}>
                        Total ({result.totalHoras} horas)
                      </td>
                      <td className="px-6 py-4" />
                      <td className="px-6 py-4 text-right text-lg text-primary tabular-nums">
                        S/ {fmt(result.montoTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Formula and Legal Basis */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Fórmula y Base Legal
              </h3>

              {/* Formula */}
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Fórmula aplicada
                </span>
                <div className="mt-1.5 bg-white/[0.02] bg-white/[0.04] rounded-lg p-3 border border-white/[0.08] border-white/10">
                  <code className="text-xs text-gray-200 font-mono leading-relaxed break-words">
                    {result.formula}
                  </code>
                </div>
              </div>

              {/* Legal Basis */}
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Base legal
                </span>
                <div className="mt-1.5 flex items-start gap-2 p-3 bg-white/[0.02] bg-white/[0.04] rounded-lg">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                    Norma
                  </span>
                  <p className="text-xs text-gray-300">{result.baseLegal}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
