'use client'

import { useState, useMemo } from 'react'
import { calcularInteresesLegales } from '@/lib/legal-engine/calculators/intereses-legales'
import type { InteresesLegalesInput, InteresesLegalesResult } from '@/lib/legal-engine/calculators/intereses-legales'
import { Download, MessageCircle, TrendingUp, Percent, Save, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { formatSoles } from '@/lib/format/peruvian'
import { openWhatsApp } from '@/lib/whatsapp'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import { ResultadoExplicado } from './shared/resultado-explicado'
import { EstadoVacio } from './shared/ui'

const TIPOS_INTERES = [
  { value: 'laboral', label: 'Interés Legal Laboral (moneda nacional)' },
  { value: 'efectivo', label: 'Interés Legal Efectivo (moneda nacional)' },
] as const

export function InteresesLegalesCalculadora() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [input, setInput] = useState<InteresesLegalesInput>({
    capital: 0,
    fechaInicio: '',
    fechaFin: '',
    tipoInteres: 'laboral',
  })

  const result = useMemo<InteresesLegalesResult | null>(() => {
    if (input.capital <= 0 || !input.fechaInicio || !input.fechaFin || input.fechaFin < input.fechaInicio) {
      return null
    }
    try {
      return calcularInteresesLegales(input)
    } catch {
      return null
    }
  }, [input])

  const updateField = <K extends keyof InteresesLegalesInput>(
    key: K,
    value: InteresesLegalesInput[K]
  ) => {
    setInput(prev => ({ ...prev, [key]: value }))
  }

  const saveCalculation = async () => {
    if (!result) return
    setSaving(true)
    try {
      const res = await fetch('/api/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'INTERESES_LEGALES', inputs: input }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Cálculo guardado', description: 'Puedes verlo en tu historial', type: 'success' })
    } catch {
      toast({ title: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const fechasInvertidas = !!input.fechaInicio && !!input.fechaFin && input.fechaFin < input.fechaInicio

  const faltantes = [
    input.capital > 0 ? null : 'monto adeudado',
    input.fechaInicio ? null : 'fecha de inicio',
    input.fechaFin ? null : 'fecha de pago',
  ].filter((x): x is string => x !== null)

  const tipoLabel = TIPOS_INTERES.find(t => t.value === input.tipoInteres)?.label ?? input.tipoInteres

  const descargarPdf = () => {
    if (!result) return
    const content = calculationToHTML({
      title: 'Desglose de intereses legales',
      items: [
        { label: 'Capital adeudado', amount: result.capital, formula: 'Monto original de la deuda' },
        { label: `Interés (${result.diasCalculados} días)`, amount: result.interesAcumulado, formula: result.formula },
      ],
      total: result.total,
      legalRefs: [
        { norm: 'D.Ley 25920', description: 'Interés legal sobre adeudos laborales: simple, sin capitalización; tasa fijada por el BCRP' },
      ],
      metadata: {
        'Tipo de interés': tipoLabel,
        'Desde': input.fechaInicio,
        'Hasta': input.fechaFin,
        'Tasa anual usada': `${result.tasaAnual}%`,
      },
    })
    generatePDFFromHTML({
      title: 'Cálculo de intereses legales',
      filename: 'calculo-intereses-legales.pdf',
      content,
      watermark: 'COMPLY360',
    })
  }

  return (
    <div className="@container">
      <div className="grid grid-cols-1 @4xl:grid-cols-5 gap-6 @4xl:gap-8">
        {/* FORM -- Left side */}
        <div className="@4xl:col-span-2 space-y-6">
          <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Percent className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Datos de la deuda</h2>
                <p className="text-sm text-[color:var(--text-tertiary)]">El resultado se actualiza mientras escribes</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Capital Adeudado */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                  Monto adeudado
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)] font-semibold text-sm">S/</span>
                  <input
                    type="number"
                    value={input.capital || ''}
                    onChange={e => updateField('capital', Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-semibold"
                  />
                </div>
                <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                  Lo que se debió pagar y no se pagó (ej. una CTS o una remuneración atrasada).
                </p>
              </div>

              {/* Tipo de Interés */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                  Tipo de interés
                </label>
                <select
                  value={input.tipoInteres}
                  onChange={e => updateField('tipoInteres', e.target.value as InteresesLegalesInput['tipoInteres'])}
                  className="w-full px-3 py-3 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  {TIPOS_INTERES.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                  {input.tipoInteres === 'laboral'
                    ? 'Aplica a adeudos laborales: beneficios sociales, remuneraciones impagas, etc.'
                    : 'Aplica a obligaciones de pago en general entre partes.'}
                </p>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                    Fecha en que se debió pagar
                  </label>
                  <input
                    type="date"
                    value={input.fechaInicio}
                    onChange={e => updateField('fechaInicio', e.target.value)}
                    className="w-full px-3 py-3 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                    Desde aquí corren los intereses
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                    Fecha de pago
                  </label>
                  <input
                    type="date"
                    value={input.fechaFin}
                    onChange={e => updateField('fechaFin', e.target.value)}
                    className="w-full px-3 py-3 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                    Cuando se paga (o la fecha de hoy)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS -- Right side */}
        <div className="@4xl:col-span-3 space-y-6">
          {!result ? (
            fechasInvertidas ? (
              <EstadoVacio titulo="Revisa las fechas" faltantes={['una fecha de pago posterior a la fecha en que se debió pagar']} />
            ) : (
              <EstadoVacio titulo="Ingresa los datos de la deuda" faltantes={faltantes} />
            )
          ) : (
            <>
              {/* Total Card */}
              <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-white/80" />
                    <span className="text-sm font-medium text-white/80 uppercase tracking-wider">
                      Total con intereses legales
                    </span>
                  </div>
                  <span className="text-xs bg-white/15 px-2.5 py-1 rounded-full">
                    Tasa referencial {result.tasaAnual}% anual
                  </span>
                </div>
                <div className="text-4xl sm:text-5xl font-black tracking-tight mb-2 tabular-nums">
                  {formatSoles(result.total)}
                </div>
                <p className="text-white/85 text-sm">
                  Deuda {formatSoles(result.capital)} + intereses {formatSoles(result.interesAcumulado)} ({result.diasCalculados} {result.diasCalculados === 1 ? 'día' : 'días'})
                </p>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2.5 mt-6">
                  <button type="button" onClick={descargarPdf} className="flex items-center gap-2 px-4 py-2.5 bg-[#d4a853] hover:bg-[#c49a48] text-[#0f172a] rounded-xl font-bold text-sm transition-colors">
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </button>
                  <button type="button" onClick={() => openWhatsApp({ type: 'consulta', total: result.total })} className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-colors border border-white/20">
                    <MessageCircle className="w-4 h-4" />
                    Consultar por WhatsApp
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

              {/* Breakdown */}
              <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[color:var(--border-subtle)]">
                  <h3 className="text-lg font-bold text-[color:var(--text-primary)] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Desglose del cálculo
                  </h3>
                </div>

                <div className="divide-y divide-[color:var(--border-subtle)]">
                  {/* Capital */}
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full bg-slate-600 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                          Monto adeudado
                        </span>
                        <p className="text-xs text-[color:var(--text-tertiary)]">Sobre este monto se calculan los intereses</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-[color:var(--text-primary)] tabular-nums">
                      {formatSoles(result.capital)}
                    </span>
                  </div>

                  {/* Tasa Diaria */}
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full bg-slate-400 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                          Tasa por día
                        </span>
                        <p className="text-xs text-[color:var(--text-tertiary)]">
                          Tasa anual de {result.tasaAnual}% dividida entre 360 días
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-[color:var(--text-primary)] tabular-nums">
                      {(result.tasaDiaria * 100).toFixed(6)}%
                    </span>
                  </div>

                  {/* Dias Calculados */}
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full bg-slate-300 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                          Días Calculados
                        </span>
                        <p className="text-xs text-[color:var(--text-tertiary)]">Desde la fecha en que se debió pagar hasta el pago</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-[color:var(--text-primary)] tabular-nums">
                      {result.diasCalculados} {result.diasCalculados === 1 ? 'día' : 'días'}
                    </span>
                  </div>

                  {/* Interes Acumulado */}
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full bg-emerald-400 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                          Interés acumulado
                        </span>
                        <p className="text-xs text-[color:var(--text-tertiary)]">Interés simple: no se cobran intereses sobre intereses</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-emerald-600 tabular-nums">
                      + {formatSoles(result.interesAcumulado)}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="px-6 py-4 flex items-center justify-between bg-[color:var(--bg-inset)]">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full bg-primary flex-shrink-0" />
                      <div>
                        <span className="text-sm font-bold text-[color:var(--text-primary)]">
                          Total a pagar
                        </span>
                        <p className="text-xs text-[color:var(--text-tertiary)]">Deuda + intereses</p>
                      </div>
                    </div>
                    <span className="text-xl font-black text-[color:var(--text-primary)] tabular-nums">
                      {formatSoles(result.total)}
                    </span>
                  </div>
                </div>
              </div>

              <ResultadoExplicado
                resumen="La deuda original más un interés simple por cada día de atraso, con la tasa de interés legal que publica el BCRP."
                pasos={[
                  `Deuda original: ${formatSoles(result.capital)}.`,
                  `Días de atraso: ${result.diasCalculados}, desde la fecha en que se debió pagar hasta el pago.`,
                  `Tasa anual usada: ${result.tasaAnual}% (${tipoLabel.toLowerCase()}). Por día: ${result.tasaAnual}% ÷ 360.`,
                  `Interés: ${formatSoles(result.capital)} × tasa diaria × ${result.diasCalculados} días = ${formatSoles(result.interesAcumulado)}. No se cobran intereses sobre intereses.`,
                  `Total a pagar: ${formatSoles(result.total)}.`,
                ]}
                baseLegal={[
                  {
                    norma: 'D.Ley 25920',
                    enSimple:
                      'Las deudas laborales generan interés legal desde el día siguiente al incumplimiento hasta el pago. Es interés simple: no se capitaliza.',
                  },
                  {
                    norma: 'BCRP',
                    enSimple: 'El Banco Central de Reserva del Perú publica la tasa de interés legal laboral que se aplica.',
                  },
                ]}
                formulaTecnica={result.formula}
                nota="La tasa usada es referencial. Para un monto exacto (por ejemplo, en un juicio), usa los factores diarios que publica el BCRP para cada fecha."
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
