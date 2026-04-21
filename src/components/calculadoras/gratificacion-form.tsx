'use client'

import { useState, useMemo } from 'react'
import { calcularGratificacion } from '@/lib/legal-engine/calculators/gratificacion'
import { openWhatsApp } from '@/lib/whatsapp'
import type { GratificacionInput, GratificacionResult } from '@/lib/legal-engine'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import {
  Calculator,
  Download,
  MessageCircle,
  Scale,
  Clock,
  TrendingUp,
  Gift,
  Info,
  Save,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { WorkerAutoFill, type WorkerData } from './worker-autofill'

export function GratificacionCalculadora() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null)
  const [input, setInput] = useState<GratificacionInput>({
    sueldoBruto: 0,
    fechaIngreso: '',
    periodo: 'julio',
    mesesTrabajados: 6,
    asignacionFamiliar: false,
  })

  function handleWorkerSelect(w: WorkerData | null) {
    setSelectedWorker(w)
    if (w) {
      setInput(prev => ({
        ...prev,
        sueldoBruto: w.sueldoBruto,
        fechaIngreso: w.fechaIngreso,
        asignacionFamiliar: w.asignacionFamiliar,
      }))
    }
  }

  const result = useMemo<GratificacionResult | null>(() => {
    if (input.sueldoBruto <= 0 || !input.fechaIngreso || input.mesesTrabajados <= 0) {
      return null
    }
    try {
      return calcularGratificacion(input)
    } catch {
      return null
    }
  }, [input])

  const updateField = <K extends keyof GratificacionInput>(
    key: K,
    value: GratificacionInput[K]
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
        body: JSON.stringify({ type: 'GRATIFICACION', inputs: input }),
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
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Datos para Gratificacion</h2>
              <p className="text-sm text-gray-500">Los campos se calculan en tiempo real</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Worker autofill */}
            <WorkerAutoFill selectedWorker={selectedWorker} onSelect={handleWorkerSelect} />

            {/* Sueldo Bruto */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Sueldo Bruto
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">S/</span>
                <input
                  type="number"
                  value={input.sueldoBruto || ''}
                  onChange={e => updateField('sueldoBruto', Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 border border-white/10 border-white/10 bg-[color:var(--neutral-100)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-semibold"
                />
              </div>
            </div>

            {/* Fecha de Ingreso */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Fecha de Ingreso
              </label>
              <input
                type="date"
                value={input.fechaIngreso}
                onChange={e => updateField('fechaIngreso', e.target.value)}
                className="w-full px-3 py-3 border border-white/10 border-white/10 bg-[color:var(--neutral-100)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* Periodo */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Periodo
              </label>
              <select
                value={input.periodo}
                onChange={e => updateField('periodo', e.target.value as 'julio' | 'diciembre')}
                className="w-full px-3 py-3 border border-white/10 border-white/10 bg-[color:var(--neutral-100)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="julio">Julio 2026</option>
                <option value="diciembre">Diciembre 2026</option>
              </select>
            </div>

            {/* Meses Trabajados */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Meses trabajados en el semestre
              </label>
              <input
                type="number"
                min={1}
                max={6}
                value={input.mesesTrabajados || ''}
                onChange={e => updateField('mesesTrabajados', Number(e.target.value))}
                placeholder="6"
                className="w-full px-3 py-3 border border-white/10 border-white/10 bg-[color:var(--neutral-100)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-semibold"
              />
              <p className="mt-1 text-xs text-gray-400">
                De 1 a 6 meses. Si trabajo los 6 meses, recibe la gratificacion completa.
              </p>
            </div>

            {/* Asignacion Familiar toggle */}
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={input.asignacionFamiliar}
                    onChange={e => updateField('asignacionFamiliar', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-primary transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-[#141824] rounded-full shadow transition-transform peer-checked:translate-x-5" />
                </div>
                <span className="text-sm text-gray-300 group-hover:text-white">
                  Percibe asignacion familiar (10% RMV)
                </span>
              </label>
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
              Ingresa los datos del trabajador
            </h3>
            <p className="text-sm text-gray-400">
              El calculo se actualiza automaticamente en tiempo real
            </p>
          </div>
        ) : (
          <>
            {/* Total Card */}
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-8 text-white shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-200" />
                  <span className="text-sm font-medium text-purple-100 uppercase tracking-wider">
                    Gratificacion Total Neta
                  </span>
                </div>
                <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full">
                  Base legal vigente
                </span>
              </div>
              <div className="text-5xl font-black tracking-tight mb-2">
                S/ {fmt(result.totalNeto)}
              </div>
              <p className="text-purple-100 text-sm">
                Gratificacion{' '}
                {input.periodo === 'julio' ? 'Fiestas Patrias (julio)' : 'Navidad (diciembre)'}
                {' '}- incluye bonificacion extraordinaria del 9%
              </p>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const periodoLabel = input.periodo === 'julio' ? 'Fiestas Patrias (Julio)' : 'Navidad (Diciembre)'
                    const content = calculationToHTML({
                      title: 'Desglose de Gratificacion',
                      items: [
                        { label: 'Gratificacion Bruta', amount: result.gratificacionBruta, formula: input.mesesTrabajados >= 6 ? 'Remuneracion computable completa' : `Proporcional: ${input.mesesTrabajados}/6 de la remuneracion` },
                        { label: 'Bonificacion Extraordinaria 9%', amount: result.bonificacionExtraordinaria, formula: 'Gratificacion bruta x 9% (Ley 30334)', baseLegal: 'Ley 30334' },
                      ],
                      total: result.totalNeto,
                      legalRefs: [
                        { norm: 'Ley 27735', description: 'Ley que regula el otorgamiento de las gratificaciones para los trabajadores del regimen de la actividad privada' },
                        { norm: 'Ley 30334', description: 'Ley que establece medidas para dinamizar la economia - exoneracion de aportes y bonificacion extraordinaria del 9%' },
                      ],
                      metadata: {
                        'Sueldo Bruto': `S/ ${input.sueldoBruto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
                        'Fecha de Ingreso': input.fechaIngreso,
                        'Periodo': periodoLabel,
                        'Meses Trabajados en el Semestre': `${input.mesesTrabajados}`,
                        'Asignacion Familiar': input.asignacionFamiliar ? 'Si' : 'No',
                        'Formula Aplicada': result.formula,
                      },
                    })
                    generatePDFFromHTML({
                      title: `Calculo de Gratificacion - ${periodoLabel}`,
                      filename: 'calculo-gratificacion.pdf',
                      content,
                      watermark: 'COMPLY360',
                    })
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#d4a853] hover:bg-[#c49a48] text-[#0f172a] rounded-xl font-bold text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </button>
                <button
                  type="button"
                  onClick={() => openWhatsApp({
                    type: 'gratificacion',
                    total: result.totalNeto,
                    data: {
                      periodo: input.periodo === 'julio' ? 'Fiestas Patrias (Julio 2026)' : 'Navidad (Diciembre 2026)',
                    },
                  })}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-colors border border-white/20"
                >
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
                {/* Gratificacion Bruta */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-purple-400 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-white">
                        Gratificacion Bruta
                      </span>
                      <p className="text-xs text-gray-500">
                        {input.mesesTrabajados >= 6
                          ? 'Remuneracion computable completa'
                          : `Proporcional: ${input.mesesTrabajados}/6 de la remuneracion`}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-white tabular-nums">
                    S/ {fmt(result.gratificacionBruta)}
                  </span>
                </div>

                {/* Bonificacion Extraordinaria */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-purple-300 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-white">
                        Bonificacion Extraordinaria 9%
                      </span>
                      <p className="text-xs text-gray-500">
                        Equivalente al aporte de EsSalud (Ley 30334)
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-white tabular-nums">
                    S/ {fmt(result.bonificacionExtraordinaria)}
                  </span>
                </div>

                {/* Total Neto */}
                <div className="px-6 py-4 flex items-center justify-between bg-purple-50">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-purple-600 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-bold text-purple-900">
                        Total Neto
                      </span>
                      <p className="text-xs text-purple-600">Monto final a recibir</p>
                    </div>
                  </div>
                  <span className="text-lg font-black text-purple-900 tabular-nums">
                    S/ {fmt(result.totalNeto)}
                  </span>
                </div>
              </div>
            </div>

            {/* Exoneration notice */}
            <div className="flex items-start gap-3 p-4 rounded-xl border bg-amber-50 border-amber-200 text-amber-800">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Exonerado de IR y aportes (Ley 30334)</p>
                <p className="text-xs mt-1 text-amber-700">
                  Las gratificaciones estan exoneradas del Impuesto a la Renta de 5ta categoria
                  y de los aportes a EsSalud, ONP y AFP. La bonificacion extraordinaria del 9%
                  compensa el aporte del empleador a EsSalud.
                </p>
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
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                Base Legal
              </h3>
              <div className="flex items-start gap-3 p-3 bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)] rounded-lg">
                <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300">{result.baseLegal}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
