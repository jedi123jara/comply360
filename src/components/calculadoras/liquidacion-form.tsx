'use client'

import { useState, useMemo } from 'react'
import { calcularLiquidacion } from '@/lib/legal-engine'
import { openWhatsApp } from '@/lib/whatsapp'
import type { LiquidacionInput, LiquidacionResult, BreakdownItem } from '@/lib/legal-engine'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import {
  Calculator,
  AlertTriangle,
  Download,
  MessageCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Scale,
  Clock,
  TrendingUp,
  Save,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { WorkerAutoFill, type WorkerData } from './worker-autofill'

const MOTIVOS_CESE = [
  { value: 'despido_arbitrario', label: 'Despido arbitrario (sin causa justa)', icon: '🔴' },
  { value: 'renuncia', label: 'Renuncia voluntaria', icon: '🟢' },
  { value: 'mutuo_acuerdo', label: 'Mutuo acuerdo', icon: '🟡' },
  { value: 'fin_contrato', label: 'Fin de contrato a plazo fijo', icon: '🔵' },
  { value: 'despido_nulo', label: 'Despido nulo (discriminación, embarazo, etc.)', icon: '🔴' },
  { value: 'hostilidad', label: 'Cese por hostilidad del empleador', icon: '🟠' },
] as const

export function LiquidacionCalculadora() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null)
  const [input, setInput] = useState<LiquidacionInput>({
    sueldoBruto: 0,
    fechaIngreso: '',
    fechaCese: '',
    motivoCese: 'despido_arbitrario',
    asignacionFamiliar: false,
    gratificacionesPendientes: false,
    vacacionesNoGozadas: 0,
    horasExtrasPendientes: 0,
    ultimaGratificacion: 0,
    comisionesPromedio: 0,
  })

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const result = useMemo<LiquidacionResult | null>(() => {
    if (input.sueldoBruto <= 0 || !input.fechaIngreso || !input.fechaCese) {
      return null
    }
    try {
      return calcularLiquidacion(input)
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

  const updateField = <K extends keyof LiquidacionInput>(
    key: K,
    value: LiquidacionInput[K]
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
        body: JSON.stringify({ type: 'LIQUIDACION', inputs: input }),
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
      {/* FORM — Left side */}
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

          {/* Sueldo */}
          <div className="space-y-4">
            {/* Worker autofill */}
            <WorkerAutoFill selectedWorker={selectedWorker} onSelect={handleWorkerSelect} />

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
                  Fecha de Cese
                </label>
                <input
                  type="date"
                  value={input.fechaCese}
                  onChange={e => updateField('fechaCese', e.target.value)}
                  className="w-full px-3 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Motivo de Cese */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Motivo de Cese
              </label>
              <select
                value={input.motivoCese}
                onChange={e => updateField('motivoCese', e.target.value as LiquidacionInput['motivoCese'])}
                className="w-full px-3 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                {MOTIVOS_CESE.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.icon} {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggles */}
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
                  Percibe asignación familiar (10% RMV)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={input.gratificacionesPendientes}
                    onChange={e => updateField('gratificacionesPendientes', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-primary transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-[#141824] rounded-full shadow transition-transform peer-checked:translate-x-5" />
                </div>
                <span className="text-sm text-gray-300 group-hover:text-white">
                  Tiene gratificaciones pendientes
                </span>
              </label>
            </div>
          </div>

          {/* Advanced Options */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 mt-6 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Opciones avanzadas
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 pt-4 border-t border-white/[0.06] border-white/[0.08]">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Días de vacaciones no gozadas
                </label>
                <input
                  type="number"
                  value={input.vacacionesNoGozadas || ''}
                  onChange={e => updateField('vacacionesNoGozadas', Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Horas extras pendientes de pago
                </label>
                <input
                  type="number"
                  value={input.horasExtrasPendientes || ''}
                  onChange={e => updateField('horasExtrasPendientes', Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Comisiones promedio mensual
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">S/</span>
                  <input
                    type="number"
                    value={input.comisionesPromedio || ''}
                    onChange={e => updateField('comisionesPromedio', Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2.5 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Warnings */}
        {result && result.warnings.length > 0 && (
          <div className="space-y-2">
            {result.warnings.map((w, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-4 rounded-xl border ${
                  w.type === 'urgente'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : w.type === 'riesgo'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                {w.type === 'urgente' ? (
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm font-medium">{w.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RESULTS — Right side */}
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
            <div className="bg-gradient-to-br from-[#1e3a6e] to-[#0f2548] rounded-2xl p-8 text-white shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#d4a853]" />
                  <span className="text-sm font-medium text-blue-200 uppercase tracking-wider">
                    Liquidación Total Estimada
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full">
                    Base legal vigente
                  </span>
                </div>
              </div>
              <div className="text-5xl font-black tracking-tight mb-2">
                S/ {result.totalBruto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-blue-200 text-sm">
                Monto bruto total (los beneficios sociales no están sujetos a retención de renta de 5ta categoría)
              </p>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const motivoLabel = MOTIVOS_CESE.find(m => m.value === input.motivoCese)?.label || input.motivoCese
                    const breakdownItems = Object.values(result.breakdown)
                      .filter((item): item is BreakdownItem => item !== null && item.amount > 0)
                      .map(item => ({
                        label: item.label,
                        amount: item.amount,
                        formula: item.formula,
                        baseLegal: item.baseLegal,
                      }))
                    const content = calculationToHTML({
                      title: 'Desglose de Liquidacion',
                      items: breakdownItems,
                      total: result.totalBruto,
                      warnings: result.warnings.map(w => ({ message: w.message })),
                      legalRefs: result.legalBasis.map(ref => ({
                        norm: ref.norm,
                        description: `${ref.article} - ${ref.description}`,
                      })),
                      metadata: {
                        'Remuneracion Mensual Bruta': `S/ ${input.sueldoBruto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
                        'Fecha de Ingreso': input.fechaIngreso,
                        'Fecha de Cese': input.fechaCese,
                        'Motivo de Cese': motivoLabel,
                        'Asignacion Familiar': input.asignacionFamiliar ? 'Si' : 'No',
                      },
                    })
                    generatePDFFromHTML({
                      title: 'Liquidacion de Beneficios Sociales',
                      filename: 'liquidacion-beneficios-sociales.pdf',
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
                    type: 'liquidacion',
                    total: result.totalBruto,
                    data: {
                      sueldo: input.sueldoBruto,
                      fechaIngreso: input.fechaIngreso,
                      fechaCese: input.fechaCese,
                      motivo: MOTIVOS_CESE.find(m => m.value === input.motivoCese)?.label || input.motivoCese,
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

            {/* Breakdown */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-white/[0.06] border-white/[0.08]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Desglose Detallado
                </h3>
              </div>

              <div className="divide-y divide-gray-100">
                {Object.entries(result.breakdown).map(([key, item]) => {
                  if (!item || item.amount === 0) return null
                  const percentage = result.totalBruto > 0
                    ? (item.amount / result.totalBruto) * 100
                    : 0
                  const isExpanded = expandedItem === key

                  return (
                    <div key={key} className="group">
                      <button
                        type="button"
                        onClick={() => setExpandedItem(isExpanded ? null : key)}
                        className="w-full px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
                      >
                        {/* Progress bar mini */}
                        <div className="w-1 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                          <div
                            className="w-full bg-primary rounded-full transition-all duration-700"
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
                            <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-500 w-10 text-right tabular-nums">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-6 pb-4 bg-white/[0.02] bg-white/[0.04]/50 border-t border-white/[0.06] border-white/[0.08]">
                          <div className="ml-5 space-y-3 pt-3">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold text-gray-500 uppercase tracking-wider">Fórmula:</span>
                              <code className="bg-[#141824] px-2 py-1 rounded border border-white/[0.08] text-gray-200 font-mono">
                                {item.formula}
                              </code>
                            </div>
                            <div className="text-xs text-gray-600">
                              <span className="font-semibold text-gray-500">Detalle:</span>{' '}
                              {item.details}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-primary/70">
                              <Scale className="w-3 h-3" />
                              <span className="font-medium">{item.baseLegal}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Legal References */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Base Legal Aplicada
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.legalBasis.map((ref, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-3 bg-white/[0.02] bg-white/[0.04] rounded-lg"
                  >
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                      {ref.norm}
                    </span>
                    <div>
                      <span className="text-xs font-medium text-gray-300">{ref.article}</span>
                      <p className="text-xs text-gray-500">{ref.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
