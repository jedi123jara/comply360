'use client'

import { useState, useMemo } from 'react'
import { calcularCTS } from '@/lib/legal-engine/calculators/cts'
import { openWhatsApp } from '@/lib/whatsapp'
import type { CTSInput, CTSResult } from '@/lib/legal-engine'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import {
  Calculator,
  Download,
  MessageCircle,
  Scale,
  Clock,
  TrendingUp,
  Landmark,
  Save,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { WorkerAutoFill, type WorkerData } from './worker-autofill'

export function CTSCalculadora() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null)
  const [input, setInput] = useState<CTSInput>({
    sueldoBruto: 0,
    fechaIngreso: '',
    fechaCorte: '2026-05-15',
    asignacionFamiliar: false,
    ultimaGratificacion: 0,
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

  const result = useMemo<CTSResult | null>(() => {
    if (input.sueldoBruto <= 0 || !input.fechaIngreso || !input.fechaCorte) {
      return null
    }
    try {
      return calcularCTS(input)
    } catch {
      return null
    }
  }, [input])

  const updateField = <K extends keyof CTSInput>(
    key: K,
    value: CTSInput[K]
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
        body: JSON.stringify({ type: 'CTS', inputs: input }),
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
              <Landmark className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Datos para CTS</h2>
              <p className="text-sm text-gray-500">Los campos se calculan en tiempo real</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Worker auto-fill */}
            <WorkerAutoFill
              selectedWorker={selectedWorker}
              onSelect={handleWorkerSelect}
            />

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
                  className="w-full pl-10 pr-4 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-semibold"
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
                className="w-full px-3 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* Fecha de Corte */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Fecha de Corte
              </label>
              <select
                value={input.fechaCorte}
                onChange={e => updateField('fechaCorte', e.target.value)}
                className="w-full px-3 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="2026-05-15">Mayo 2026</option>
                <option value="2026-11-15">Noviembre 2026</option>
              </select>
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

            {/* Ultima Gratificacion */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Ultima Gratificacion recibida
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">S/</span>
                <input
                  type="number"
                  value={input.ultimaGratificacion || ''}
                  onChange={e => updateField('ultimaGratificacion', Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-semibold"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Se usa 1/6 de la gratificacion como parte de la remuneracion computable
              </p>
            </div>
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
              El calculo se actualiza automaticamente en tiempo real
            </p>
          </div>
        ) : (
          <>
            {/* Total Card */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-8 text-white shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-emerald-200" />
                  <span className="text-sm font-medium text-emerald-100 uppercase tracking-wider">
                    CTS Total Estimada
                  </span>
                </div>
                <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full">
                  Base legal vigente
                </span>
              </div>
              <div className="text-5xl font-black tracking-tight mb-2">
                S/ {fmt(result.ctsTotal)}
              </div>
              <p className="text-emerald-100 text-sm">
                Compensacion por Tiempo de Servicios - deposito semestral
              </p>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const periodoLabel = input.fechaCorte === '2026-05-15' ? 'Mayo 2026' : 'Noviembre 2026'
                    const content = calculationToHTML({
                      title: 'Desglose del Calculo de CTS',
                      items: [
                        { label: 'Remuneracion Computable', amount: result.remuneracionComputable, formula: 'Sueldo + asig. familiar + 1/6 gratificacion' },
                        { label: `Meses Computables (${result.mesesComputables})`, amount: (result.remuneracionComputable / 12) * result.mesesComputables, formula: `RC / 12 x ${result.mesesComputables} meses` },
                        { label: `Dias Computables (${result.diasComputables})`, amount: (result.remuneracionComputable / 360) * result.diasComputables, formula: `RC / 360 x ${result.diasComputables} dias` },
                      ],
                      total: result.ctsTotal,
                      legalRefs: [
                        { norm: 'D.S. 001-97-TR', description: 'TUO de la Ley de Compensacion por Tiempo de Servicios' },
                      ],
                      metadata: {
                        'Sueldo Bruto': `S/ ${input.sueldoBruto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
                        'Fecha de Ingreso': input.fechaIngreso,
                        'Periodo de Deposito': periodoLabel,
                        'Asignacion Familiar': input.asignacionFamiliar ? 'Si' : 'No',
                        'Ultima Gratificacion': `S/ ${input.ultimaGratificacion.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
                        'Formula Aplicada': result.formula,
                      },
                    })
                    generatePDFFromHTML({
                      title: 'Calculo de CTS - Compensacion por Tiempo de Servicios',
                      filename: 'calculo-cts.pdf',
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
                    type: 'cts',
                    total: result.ctsTotal,
                    data: {
                      periodo: input.fechaCorte === '2026-05-15' ? 'Mayo 2026' : 'Noviembre 2026',
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
                {/* Remuneracion Computable */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-white">
                        Remuneracion Computable
                      </span>
                      <p className="text-xs text-gray-500">
                        Sueldo{input.asignacionFamiliar ? ' + asig. familiar' : ''} + 1/6 gratificacion
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-white tabular-nums">
                    S/ {fmt(result.remuneracionComputable)}
                  </span>
                </div>

                {/* Meses Computables */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-emerald-300 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-white">
                        Meses Computables
                      </span>
                      <p className="text-xs text-gray-500">Periodo semestral (maximo 6)</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-white tabular-nums">
                    {result.mesesComputables} {result.mesesComputables === 1 ? 'mes' : 'meses'}
                  </span>
                </div>

                {/* Dias Computables */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-emerald-200 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-white">
                        Dias Computables
                      </span>
                      <p className="text-xs text-gray-500">Dias adicionales al mes completo</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-white tabular-nums">
                    {result.diasComputables} {result.diasComputables === 1 ? 'dia' : 'dias'}
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
              <code className="block bg-white/[0.02] bg-white/[0.04] px-4 py-3 rounded-xl border border-white/[0.08] border-white/10 text-sm text-gray-200 font-mono leading-relaxed whitespace-pre-wrap">
                {result.formula}
              </code>
            </div>

            {/* Base Legal */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                Base Legal
              </h3>
              <div className="flex items-start gap-3 p-3 bg-white/[0.02] bg-white/[0.04] rounded-lg">
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
