'use client'

import { useState, useMemo } from 'react'
import { calcularIndemnizacion } from '@/lib/legal-engine/calculators/indemnizacion'
import { openWhatsApp } from '@/lib/whatsapp'
import type { IndemnizacionInput, IndemnizacionResult } from '@/lib/legal-engine'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import {
  Calculator,
  AlertTriangle,
  Download,
  MessageCircle,
  Scale,
  Clock,
  Briefcase,
  Save,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { WorkerAutoFill, type WorkerData } from './worker-autofill'

const TIPOS_CONTRATO = [
  { value: 'indefinido', label: 'Plazo Indeterminado' },
  { value: 'plazo_fijo', label: 'Plazo Fijo' },
] as const

export function IndemnizacionCalculadora() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null)
  const [input, setInput] = useState<IndemnizacionInput>({
    sueldoBruto: 0,
    fechaIngreso: '',
    fechaDespido: '',
    tipoContrato: 'indefinido',
    fechaFinContrato: '',
  })

  const result = useMemo<IndemnizacionResult | null>(() => {
    if (input.sueldoBruto <= 0 || !input.fechaIngreso || !input.fechaDespido) {
      return null
    }
    if (input.tipoContrato === 'plazo_fijo' && !input.fechaFinContrato) {
      return null
    }
    try {
      return calcularIndemnizacion(input)
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
      }))
    }
  }

  const updateField = <K extends keyof IndemnizacionInput>(
    key: K,
    value: IndemnizacionInput[K]
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
        body: JSON.stringify({ type: 'INDEMNIZACION', inputs: input }),
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
              <h2 className="text-lg font-bold text-white">Datos del Caso</h2>
              <p className="text-sm text-gray-500">Los campos se calculan en tiempo real</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Worker autofill */}
            <WorkerAutoFill selectedWorker={selectedWorker} onSelect={handleWorkerSelect} />

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
                  className="w-full px-3 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                  Fecha de Despido
                </label>
                <input
                  type="date"
                  value={input.fechaDespido}
                  onChange={e => updateField('fechaDespido', e.target.value)}
                  className="w-full px-3 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Tipo de Contrato */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Tipo de Contrato
              </label>
              <select
                value={input.tipoContrato}
                onChange={e => updateField('tipoContrato', e.target.value as IndemnizacionInput['tipoContrato'])}
                className="w-full px-3 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                {TIPOS_CONTRATO.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha Fin Contrato (solo plazo fijo) */}
            {input.tipoContrato === 'plazo_fijo' && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                  Fecha Fin de Contrato
                </label>
                <input
                  type="date"
                  value={input.fechaFinContrato || ''}
                  onChange={e => updateField('fechaFinContrato', e.target.value)}
                  className="w-full px-3 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Fecha pactada de finalización del contrato a plazo fijo
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
              Ingresa los datos del caso
            </h3>
            <p className="text-sm text-gray-400">
              El cálculo se actualiza automáticamente en tiempo real
            </p>
          </div>
        ) : (
          <>
            {/* Total Card */}
            <div className="bg-gradient-to-br from-red-700 to-red-900 rounded-2xl p-8 text-white shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-red-200" />
                  <span className="text-sm font-medium text-red-200 uppercase tracking-wider">
                    Indemnización Estimada
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full">
                    {input.tipoContrato === 'indefinido' ? 'Plazo Indeterminado' : 'Plazo Fijo'}
                  </span>
                </div>
              </div>
              <div className="text-5xl font-black tracking-tight mb-2">
                S/ {result.indemnizacion.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-red-200 text-sm">
                Monto bruto por indemnización de despido arbitrario
              </p>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const tipoLabel = input.tipoContrato === 'indefinido' ? 'Plazo Indeterminado' : 'Plazo Fijo'
                    const content = calculationToHTML({
                      title: 'Desglose de Indemnizacion por Despido Arbitrario',
                      items: [
                        { label: `Anos de servicio: ${result.anosServicio}`, amount: input.sueldoBruto * 1.5 * result.anosServicio, formula: `S/ ${input.sueldoBruto} x 1.5 x ${result.anosServicio} anos` },
                        { label: `Meses de fraccion: ${result.mesesFraccion}`, amount: input.sueldoBruto * 1.5 * (result.mesesFraccion / 12), formula: `S/ ${input.sueldoBruto} x 1.5 x ${result.mesesFraccion}/12` },
                      ],
                      total: result.indemnizacion,
                      warnings: result.topeAplicado ? [{ message: `Tope legal aplicado: La indemnizacion calculada supera el maximo de 12 remuneraciones (S/ ${result.topeMaximo.toLocaleString('es-PE', { minimumFractionDigits: 2 })}).` }] : [],
                      legalRefs: [
                        { norm: 'D.S. 003-97-TR', description: 'TUO del D.Leg. 728 - Ley de Productividad y Competitividad Laboral. Indemnizacion por despido arbitrario.' },
                      ],
                      metadata: {
                        'Remuneracion Mensual Bruta': `S/ ${input.sueldoBruto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
                        'Fecha de Ingreso': input.fechaIngreso,
                        'Fecha de Despido': input.fechaDespido,
                        'Tipo de Contrato': tipoLabel,
                        ...(input.tipoContrato === 'plazo_fijo' && input.fechaFinContrato ? { 'Fecha Fin de Contrato': input.fechaFinContrato } : {}),
                        'Tope Maximo (12 remuneraciones)': `S/ ${result.topeMaximo.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
                        'Formula Aplicada': result.formula,
                      },
                    })
                    generatePDFFromHTML({
                      title: 'Calculo de Indemnizacion por Despido Arbitrario',
                      filename: 'calculo-indemnizacion.pdf',
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
                    type: 'indemnizacion',
                    total: result.indemnizacion,
                    data: {
                      tipoContrato: input.tipoContrato === 'indefinido' ? 'Plazo Indeterminado' : 'Plazo Fijo',
                      anos: result.anosServicio,
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

            {/* Tope Warning */}
            {result.topeAplicado && (
              <div className="flex items-start gap-3 p-4 rounded-xl border bg-amber-50 border-amber-200 text-amber-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">Tope legal aplicado</p>
                  <p className="text-sm">
                    La indemnización calculada supera el tope máximo de 12 remuneraciones
                    (S/ {result.topeMaximo.toLocaleString('es-PE', { minimumFractionDigits: 2 })}).
                    Se aplica el monto tope conforme a ley.
                  </p>
                </div>
              </div>
            )}

            {/* Breakdown */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-white/[0.06] border-white/[0.08]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Desglose del Cálculo
                </h3>
              </div>

              <div className="divide-y divide-gray-100">
                {/* Años de servicio */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-sm font-semibold text-white">Años de servicio</span>
                  </div>
                  <span className="text-lg font-bold text-white tabular-nums">
                    {result.anosServicio} año(s)
                  </span>
                </div>

                {/* Meses de fracción */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-primary/60 flex-shrink-0" />
                    <span className="text-sm font-semibold text-white">Meses de fracción</span>
                  </div>
                  <span className="text-lg font-bold text-white tabular-nums">
                    {result.mesesFraccion} mes(es)
                  </span>
                </div>

                {/* Indemnización calculada */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-white">Indemnización calculada</span>
                  </div>
                  <span className="text-lg font-bold text-white tabular-nums">
                    S/ {result.indemnizacion.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Tope máximo */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-gray-300 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-500">Tope máximo (12 remuneraciones)</span>
                  </div>
                  <span className="text-lg font-bold text-gray-500 tabular-nums">
                    S/ {result.topeMaximo.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
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
