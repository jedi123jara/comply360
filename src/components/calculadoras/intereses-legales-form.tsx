'use client'

import { useState, useMemo } from 'react'
import { calcularInteresesLegales } from '@/lib/legal-engine/calculators/intereses-legales'
import type { InteresesLegalesInput, InteresesLegalesResult } from '@/lib/legal-engine/calculators/intereses-legales'
import { Calculator, Download, MessageCircle, Scale, TrendingUp, Percent, Save, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

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
    if (input.capital <= 0 || !input.fechaInicio || !input.fechaFin) {
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

  const fmt = (n: number) =>
    n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
              <Percent className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Datos del Adeudo</h2>
              <p className="text-sm text-gray-500">Los campos se calculan en tiempo real</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Capital Adeudado */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Capital Adeudado (Monto)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">S/</span>
                <input
                  type="number"
                  value={input.capital || ''}
                  onChange={e => updateField('capital', Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 border border-white/10 border-white/10 bg-[color:var(--neutral-100)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-semibold"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Monto total adeudado por el empleador sobre el que se calculan los intereses
              </p>
            </div>

            {/* Tipo de Interés */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Tipo de Interés
              </label>
              <select
                value={input.tipoInteres}
                onChange={e => updateField('tipoInteres', e.target.value as InteresesLegalesInput['tipoInteres'])}
                className="w-full px-3 py-3 border border-white/10 border-white/10 bg-[color:var(--neutral-100)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                {TIPOS_INTERES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                {input.tipoInteres === 'laboral'
                  ? 'Aplica a adeudos laborales: beneficios sociales, remuneraciones impagas, etc.'
                  : 'Aplica a obligaciones de pago en general entre partes.'}
              </p>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  value={input.fechaInicio}
                  onChange={e => updateField('fechaInicio', e.target.value)}
                  className="w-full px-3 py-3 border border-white/10 border-white/10 bg-[color:var(--neutral-100)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Desde el incumplimiento
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                  Fecha de Fin
                </label>
                <input
                  type="date"
                  value={input.fechaFin}
                  onChange={e => updateField('fechaFin', e.target.value)}
                  className="w-full px-3 py-3 border border-white/10 border-white/10 bg-[color:var(--neutral-100)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Hasta el pago efectivo
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RESULTS -- Right side */}
      <div className="lg:col-span-3 space-y-6">
        {!result ? (
          <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[color:var(--neutral-100)] bg-[color:var(--neutral-100)] flex items-center justify-center mx-auto mb-4">
              <Calculator className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Ingresa los datos del adeudo laboral
            </h3>
            <p className="text-sm text-gray-400">
              El calculo se actualiza automaticamente en tiempo real
            </p>
          </div>
        ) : (
          <>
            {/* Total Card */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-8 text-white shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-emerald-700" />
                  <span className="text-sm font-medium text-slate-200 uppercase tracking-wider">
                    Total con Intereses Legales
                  </span>
                </div>
                <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full">
                  Base legal vigente
                </span>
              </div>
              <div className="text-5xl font-black tracking-tight mb-2">
                S/ {fmt(result.total)}
              </div>
              <p className="text-slate-300 text-sm">
                Capital S/ {fmt(result.capital)} + Intereses S/ {fmt(result.interesAcumulado)} ({result.diasCalculados} dias)
              </p>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <button type="button" className="flex items-center gap-2 px-5 py-2.5 bg-[#d4a853] hover:bg-[#c49a48] text-[#0f172a] rounded-xl font-bold text-sm transition-colors">
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </button>
                <button type="button" className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-colors border border-white/20">
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
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-white/[0.06] border-white/[0.08]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Desglose del Calculo
                </h3>
              </div>

              <div className="divide-y divide-gray-100">
                {/* Capital */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-slate-600 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-white">
                        Capital Adeudado
                      </span>
                      <p className="text-xs text-gray-500">Monto base sobre el que se calculan intereses</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-white tabular-nums">
                    S/ {fmt(result.capital)}
                  </span>
                </div>

                {/* Tasa Diaria */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-slate-400 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-white">
                        Tasa Diaria
                      </span>
                      <p className="text-xs text-gray-500">
                        Tasa anual {result.tasaAnual}% convertida a factor diario (base 360)
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-white tabular-nums">
                    {(result.tasaDiaria * 100).toFixed(6)}%
                  </span>
                </div>

                {/* Dias Calculados */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-slate-300 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-white">
                        Dias Calculados
                      </span>
                      <p className="text-xs text-gray-500">Desde la fecha de incumplimiento hasta la fecha de pago</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-white tabular-nums">
                    {result.diasCalculados} {result.diasCalculados === 1 ? 'dia' : 'dias'}
                  </span>
                </div>

                {/* Interes Acumulado */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-white">
                        Interes Acumulado
                      </span>
                      <p className="text-xs text-gray-500">Capitalizacion diaria sobre el monto adeudado</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-emerald-600 tabular-nums">
                    + S/ {fmt(result.interesAcumulado)}
                  </span>
                </div>

                {/* Total */}
                <div className="px-6 py-4 flex items-center justify-between bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)]">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-primary flex-shrink-0" />
                    <div>
                      <span className="text-sm font-bold text-white">
                        Total a Pagar
                      </span>
                      <p className="text-xs text-gray-500">Capital + intereses devengados</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-white tabular-nums">
                    S/ {fmt(result.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Formula */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                Formula Aplicada
              </h3>
              <code className="block bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)] px-4 py-3 rounded-xl border border-white/[0.08] border-white/10 text-sm text-gray-200 font-mono leading-relaxed whitespace-pre-wrap">
                {result.formula}
              </code>
            </div>

            {/* Base Legal */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                Base Legal Aplicada
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)] rounded-lg">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                    D. Ley 25920
                  </span>
                  <div>
                    <span className="text-xs font-medium text-gray-300">Art. 3</span>
                    <p className="text-xs text-gray-500">
                      Intereses sobre adeudos laborales con tasa fijada por el BCRP
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)] rounded-lg">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                    D. Ley 25920
                  </span>
                  <div>
                    <span className="text-xs font-medium text-gray-300">Art. 1</span>
                    <p className="text-xs text-gray-500">
                      Aplicable a adeudos de naturaleza laboral: remuneraciones y beneficios sociales
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)] rounded-lg">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                    BCRP
                  </span>
                  <div>
                    <span className="text-xs font-medium text-gray-300">Circular</span>
                    <p className="text-xs text-gray-500">
                      Tasa de interes legal laboral y efectiva publicada diariamente por el Banco Central de Reserva
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
