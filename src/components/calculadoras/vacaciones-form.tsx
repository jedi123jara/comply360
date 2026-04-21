'use client'

import { useState, useMemo } from 'react'
import { calcularVacaciones } from '@/lib/legal-engine/calculators/vacaciones'
import { openWhatsApp } from '@/lib/whatsapp'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import {
  Calculator,
  Download,
  MessageCircle,
  Scale,
  Clock,
  TrendingUp,
  CalendarDays,
  Info,
  Save,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { WorkerAutoFill, type WorkerData } from './worker-autofill'

interface VacacionesInput {
  sueldoBruto: number
  fechaIngreso: string
  fechaCese: string
  diasGozados: number
  asignacionFamiliar: boolean
}

interface VacacionesResult {
  vacacionesTruncas: number
  vacacionesNoGozadas: number
  indemnizacionVacacional: number
  total: number
  diasTruncosComputables: number
  periodosNoGozados: number
  formula: string
  baseLegal: string
}

export function VacacionesCalculadora() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null)
  const [input, setInput] = useState<VacacionesInput>({
    sueldoBruto: 0,
    fechaIngreso: '',
    fechaCese: '',
    diasGozados: 0,
    asignacionFamiliar: false,
  })

  const result = useMemo<VacacionesResult | null>(() => {
    if (input.sueldoBruto <= 0 || !input.fechaIngreso || !input.fechaCese) {
      return null
    }
    try {
      return calcularVacaciones(input)
    } catch {
      return null
    }
  }, [input])

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

  const updateField = <K extends keyof VacacionesInput>(
    key: K,
    value: VacacionesInput[K]
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
        body: JSON.stringify({ type: 'VACACIONES', inputs: input }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Calculo guardado', description: 'Puedes verlo en tu historial', type: 'success' })
    } catch {
      toast({ title: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const breakdownItems = result
    ? [
        { key: 'truncas', label: 'Vacaciones Truncas', amount: result.vacacionesTruncas },
        { key: 'noGozadas', label: 'Vacaciones No Gozadas', amount: result.vacacionesNoGozadas },
        { key: 'indemnizacion', label: 'Indemnización Vacacional', amount: result.indemnizacionVacacional },
      ]
    : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* FORM -- Left side */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Datos del Trabajador</h2>
              <p className="text-sm text-gray-500">Los campos se calculan en tiempo real</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Worker autofill */}
            <WorkerAutoFill selectedWorker={selectedWorker} onSelect={handleWorkerSelect} />

            {/* Sueldo Bruto */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Sueldo Bruto Mensual
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

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                  Fecha de Cese
                </label>
                <input
                  type="date"
                  value={input.fechaCese}
                  onChange={e => updateField('fechaCese', e.target.value)}
                  className="w-full px-3 py-3 border border-white/10 border-white/10 bg-[color:var(--neutral-100)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Dias Gozados */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Dias de vacaciones gozados
              </label>
              <input
                type="number"
                value={input.diasGozados || ''}
                onChange={e => updateField('diasGozados', Number(e.target.value))}
                placeholder="0"
                min={0}
                className="w-full px-3 py-3 border border-white/10 border-white/10 bg-[color:var(--neutral-100)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-semibold"
              />
            </div>

            {/* Toggle: Asignacion Familiar */}
            <div className="space-y-3 pt-2">
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
            {/* Total Card -- Cyan gradient */}
            <div className="bg-gradient-to-br from-cyan-600 to-cyan-800 rounded-2xl p-8 text-white shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-cyan-200" />
                  <span className="text-sm font-medium text-cyan-100 uppercase tracking-wider">
                    Total Vacaciones
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full">
                    D.Leg. 713
                  </span>
                </div>
              </div>
              <div className="text-5xl font-black tracking-tight mb-2">
                S/ {result.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-cyan-100 text-sm">
                Monto total por concepto de vacaciones truncas, no gozadas e indemnizacion
              </p>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const items = [
                      { label: 'Vacaciones Truncas', amount: result.vacacionesTruncas, formula: `${result.diasTruncosComputables} dias truncos computables` },
                      { label: 'Vacaciones No Gozadas', amount: result.vacacionesNoGozadas, formula: `${result.periodosNoGozados} periodo(s) no gozados` },
                      { label: 'Indemnizacion Vacacional', amount: result.indemnizacionVacacional, formula: 'Remuneracion equivalente por falta de descanso' },
                    ].filter(item => item.amount > 0)
                    const content = calculationToHTML({
                      title: 'Desglose de Vacaciones',
                      items,
                      total: result.total,
                      legalRefs: [
                        { norm: 'D.Leg. 713', description: 'Ley de Descansos Remunerados - regulacion de vacaciones anuales, truncas, no gozadas e indemnizacion vacacional' },
                      ],
                      metadata: {
                        'Sueldo Bruto Mensual': `S/ ${input.sueldoBruto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
                        'Fecha de Ingreso': input.fechaIngreso,
                        'Fecha de Cese': input.fechaCese,
                        'Dias de Vacaciones Gozados': `${input.diasGozados}`,
                        'Asignacion Familiar': input.asignacionFamiliar ? 'Si' : 'No',
                        'Dias Truncos Computables': `${result.diasTruncosComputables}`,
                        'Periodos No Gozados': `${result.periodosNoGozados}`,
                        'Formula Aplicada': result.formula,
                      },
                    })
                    generatePDFFromHTML({
                      title: 'Calculo de Vacaciones',
                      filename: 'calculo-vacaciones.pdf',
                      content,
                      watermark: 'COMPLY360',
                    })
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#141824] hover:bg-cyan-50 text-cyan-800 rounded-xl font-bold text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </button>
                <button
                  type="button"
                  onClick={() => openWhatsApp({
                    type: 'vacaciones',
                    total: result.total,
                  })}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-colors border border-white/20"
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar por WhatsApp
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
                  Desglose Detallado
                </h3>
              </div>

              <div className="divide-y divide-gray-100">
                {breakdownItems.map(item => {
                  if (item.amount === 0) return null
                  const percentage = result.total > 0
                    ? (item.amount / result.total) * 100
                    : 0

                  return (
                    <div key={item.key} className="px-6 py-4 flex items-center gap-4">
                      {/* Progress bar mini */}
                      <div className="w-1 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        <div
                          className="w-full bg-cyan-500 rounded-full transition-all duration-700"
                          style={{ height: `${percentage}%` }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-white">
                            {item.label}
                          </span>
                          <span className="text-lg font-bold text-white tabular-nums">
                            S/ {item.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {/* Percentage bar */}
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[color:var(--neutral-100)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-700"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-500 w-10 text-right tabular-nums">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Info: dias truncos and periodos no gozados */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Informacion Adicional
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-cyan-50 rounded-xl border border-cyan-100">
                  <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-cyan-700">{result.diasTruncosComputables}</p>
                    <p className="text-xs font-medium text-cyan-600">Dias truncos computables</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-amber-700">{result.periodosNoGozados}</p>
                    <p className="text-xs font-medium text-amber-600">Periodos no gozados</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Formula and Legal Basis */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                Formula y Base Legal
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Formula aplicada:</span>
                  <div className="mt-1.5">
                    <code className="block bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)] px-4 py-3 rounded-xl border border-white/[0.08] border-white/10 text-sm text-gray-200 font-mono leading-relaxed">
                      {result.formula}
                    </code>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Base legal:</span>
                  <div className="mt-1.5 flex items-start gap-2 p-3 bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)] rounded-lg">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                      D.Leg. 713
                    </span>
                    <p className="text-xs text-gray-600">{result.baseLegal}</p>
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
