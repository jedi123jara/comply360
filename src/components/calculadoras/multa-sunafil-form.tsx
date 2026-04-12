'use client'

import { useState, useMemo } from 'react'
import { calcularMultaSunafil, type RegimenMype } from '@/lib/legal-engine/calculators/multa-sunafil'
import { openWhatsApp } from '@/lib/whatsapp'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import {
  Calculator,
  Download,
  MessageCircle,
  Scale,
  Clock,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  Lightbulb,
  Users,
  Save,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface MultaSunafilInput {
  tipoInfraccion: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  numeroTrabajadores: number
  reincidente: boolean
  subsanacionVoluntaria: boolean
  regimenMype: RegimenMype
}

interface MultaSunafilResult {
  multaMinima: number
  multaMaxima: number
  multaEstimada: number
  multaConDescuento: number | null
  factorGravedad: number
  enUITs: { min: number; max: number; estimada: number }
  formula: string
  baseLegal: string
  recomendaciones: string[]
  regimenLabel: string
  mypeDescuento: number | null
}

const REGIMEN_OPTIONS: { value: RegimenMype; label: string; sublabel: string }[] = [
  { value: 'MICROEMPRESA', label: 'Microempresa', sublabel: '≤10 trab. / ≤150 UIT ventas · -50%' },
  { value: 'PEQUEÑA_EMPRESA', label: 'Pequeña Empresa', sublabel: '≤100 trab. / ≤1700 UIT ventas · -25%' },
  { value: 'GENERAL', label: 'Mediana / Gran Empresa', sublabel: 'Sin beneficio MYPE' },
]

const TIPOS_INFRACCION = [
  { value: 'LEVE', label: 'Leve', color: 'bg-yellow-400', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  { value: 'GRAVE', label: 'Grave', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  { value: 'MUY_GRAVE', label: 'Muy Grave', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
] as const

export function MultaSunafilCalculadora() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [input, setInput] = useState<MultaSunafilInput>({
    tipoInfraccion: 'GRAVE',
    numeroTrabajadores: 0,
    reincidente: false,
    subsanacionVoluntaria: false,
    regimenMype: 'GENERAL',
  })

  const result = useMemo<MultaSunafilResult | null>(() => {
    if (input.numeroTrabajadores <= 0) {
      return null
    }
    try {
      return calcularMultaSunafil(input)
    } catch {
      return null
    }
  }, [input])

  const updateField = <K extends keyof MultaSunafilInput>(
    key: K,
    value: MultaSunafilInput[K]
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
        body: JSON.stringify({ type: 'MULTA_SUNAFIL', inputs: input }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Calculo guardado', description: 'Puedes verlo en tu historial', type: 'success' })
    } catch {
      toast({ title: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const selectedTipo = TIPOS_INFRACCION.find(t => t.value === input.tipoInfraccion)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* FORM -- Left side */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Datos de la Infraccion</h2>
              <p className="text-sm text-gray-500">Los campos se calculan en tiempo real</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Tipo de Infraccion */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Tipo de Infraccion
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TIPOS_INFRACCION.map(tipo => (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => updateField('tipoInfraccion', tipo.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      input.tipoInfraccion === tipo.value
                        ? `border-current ${tipo.textColor} ${tipo.bgLight} ring-2 ring-current/20`
                        : 'border-white/[0.08] border-white/10 text-gray-500 hover:border-white/10 hover:bg-white/[0.02] hover:bg-white/[0.04] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${tipo.color}`} />
                    <span className="text-sm font-bold">{tipo.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Numero de Trabajadores */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Numero de Trabajadores Afectados
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={input.numeroTrabajadores || ''}
                  onChange={e => updateField('numeroTrabajadores', Number(e.target.value))}
                  placeholder="0"
                  min={1}
                  className="w-full pl-10 pr-4 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-semibold"
                />
              </div>
            </div>

            {/* Regimen MYPE */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Regimen Empresarial
              </label>
              <div className="space-y-2">
                {REGIMEN_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      input.regimenMype === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-white/[0.08] border-white/10 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="regimenMype"
                      value={opt.value}
                      checked={input.regimenMype === opt.value}
                      onChange={() => updateField('regimenMype', opt.value)}
                      className="sr-only"
                    />
                    <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      input.regimenMype === opt.value ? 'border-primary' : 'border-gray-300'
                    }`}>
                      {input.regimenMype === opt.value && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.sublabel}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Toggle: Reincidente */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={input.reincidente}
                      onChange={e => updateField('reincidente', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-red-500 transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-[#141824] rounded-full shadow transition-transform peer-checked:translate-x-5" />
                  </div>
                  <span className="text-sm text-gray-300 group-hover:text-white font-medium">
                    Reincidente
                  </span>
                </label>
                {input.reincidente && (
                  <div className="mt-2 ml-14 flex items-start gap-2 p-2.5 bg-red-50 rounded-lg border border-red-100">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 font-medium">
                      La reincidencia incrementa significativamente el monto de la multa conforme al D.S. 019-2006-TR.
                    </p>
                  </div>
                )}
              </div>

              {/* Toggle: Subsanacion Voluntaria */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={input.subsanacionVoluntaria}
                      onChange={e => updateField('subsanacionVoluntaria', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-green-500 transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-[#141824] rounded-full shadow transition-transform peer-checked:translate-x-5" />
                  </div>
                  <span className="text-sm text-gray-300 group-hover:text-white font-medium">
                    Subsanacion voluntaria
                  </span>
                </label>
                {input.subsanacionVoluntaria && (
                  <div className="mt-2 ml-14 flex items-start gap-2 p-2.5 bg-green-50 rounded-lg border border-green-100">
                    <Info className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-green-600 font-medium">
                      La subsanacion voluntaria permite obtener un descuento del 25% sobre la multa estimada.
                    </p>
                  </div>
                )}
              </div>
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
              Ingresa los datos de la infraccion
            </h3>
            <p className="text-sm text-gray-400">
              El calculo se actualiza automaticamente en tiempo real
            </p>
          </div>
        ) : (
          <>
            {/* Total Card -- Amber gradient */}
            <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl p-8 text-white shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-200" />
                  <span className="text-sm font-medium text-amber-100 uppercase tracking-wider">
                    Multa Estimada SUNAFIL
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    input.tipoInfraccion === 'LEVE'
                      ? 'bg-yellow-300 text-yellow-900'
                      : input.tipoInfraccion === 'GRAVE'
                      ? 'bg-orange-300 text-orange-900'
                      : 'bg-red-300 text-red-900'
                  }`}>
                    {selectedTipo?.label}
                  </span>
                </div>
              </div>
              <div className="text-5xl font-black tracking-tight mb-1">
                S/ {(result.multaConDescuento ?? result.multaEstimada).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
              {(result.multaConDescuento !== null || result.mypeDescuento !== null) && (
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-amber-200 text-sm line-through">
                    S/ {result.multaEstimada.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                  {result.mypeDescuento !== null && (
                    <span className="text-xs bg-blue-400/20 text-blue-100 px-2 py-0.5 rounded-full font-bold">
                      -{(result.mypeDescuento * 100).toFixed(0)}% MYPE
                    </span>
                  )}
                  {result.multaConDescuento !== null && (
                    <span className="text-xs bg-green-400/20 text-green-100 px-2 py-0.5 rounded-full font-bold">
                      -25% subsanacion
                    </span>
                  )}
                </div>
              )}
              <p className="text-amber-100 text-sm mt-1">
                Rango: S/ {result.multaMinima.toLocaleString('es-PE', { minimumFractionDigits: 2 })} — S/ {result.multaMaxima.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>

              {/* Visual range bar */}
              <div className="mt-4">
                <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
                  {/* Min-Max range */}
                  <div className="absolute inset-y-0 bg-white/30 rounded-full" style={{
                    left: '0%',
                    right: '0%',
                  }} />
                  {/* Estimated position */}
                  {result.multaMaxima > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 bg-[#141824] rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(((result.multaConDescuento ?? result.multaEstimada) / result.multaMaxima) * 100, 100)}%`,
                      }}
                    />
                  )}
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-amber-200">
                  <span>Min: S/ {result.multaMinima.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                  <span>Max: S/ {result.multaMaxima.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const tipoLabel = selectedTipo?.label || input.tipoInfraccion
                    const items = [
                      { label: 'Multa Minima', amount: result.multaMinima, formula: `${result.enUITs.min.toFixed(2)} UIT` },
                      { label: 'Multa Estimada', amount: result.multaEstimada, formula: `${result.enUITs.estimada.toFixed(2)} UIT` },
                      { label: 'Multa Maxima', amount: result.multaMaxima, formula: `${result.enUITs.max.toFixed(2)} UIT` },
                    ]
                    if (result.multaConDescuento !== null) {
                      items.push({ label: 'Con Subsanacion Voluntaria (-25%)', amount: result.multaConDescuento, formula: 'Multa estimada x 0.75' })
                    }
                    const content = calculationToHTML({
                      title: 'Desglose de Multa SUNAFIL',
                      items,
                      total: result.multaConDescuento ?? result.multaEstimada,
                      warnings: result.recomendaciones.map(rec => ({ message: rec })),
                      legalRefs: [
                        { norm: 'D.S. 019-2006-TR', description: 'Reglamento de la Ley General de Inspeccion del Trabajo' },
                        { norm: 'Ley 28806', description: 'Ley General de Inspeccion del Trabajo' },
                      ],
                      metadata: {
                        'Tipo de Infraccion': tipoLabel,
                        'Numero de Trabajadores Afectados': `${input.numeroTrabajadores}`,
                        'Reincidente': input.reincidente ? 'Si' : 'No',
                        'Subsanacion Voluntaria': input.subsanacionVoluntaria ? 'Si (-25% descuento)' : 'No',
                        'Factor de Gravedad': `${result.factorGravedad.toFixed(2)}`,
                        'Formula Aplicada': result.formula,
                      },
                    })
                    generatePDFFromHTML({
                      title: `Calculo de Multa SUNAFIL - Infraccion ${tipoLabel}`,
                      filename: 'calculo-multa-sunafil.pdf',
                      content,
                      watermark: 'COMPLY360',
                    })
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#141824] hover:bg-amber-50 text-amber-800 rounded-xl font-bold text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </button>
                <button
                  type="button"
                  onClick={() => openWhatsApp({
                    type: 'multa_sunafil',
                    total: result.multaConDescuento ?? result.multaEstimada,
                    data: {
                      tipo: input.tipoInfraccion,
                      trabajadores: input.numeroTrabajadores,
                    },
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

            {/* UITs Breakdown */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-white/[0.06] border-white/[0.08]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Desglose en UITs
                </h3>
              </div>

              <div className="divide-y divide-gray-100">
                {[
                  { key: 'min', label: 'Multa Minima', amount: result.multaMinima, uits: result.enUITs.min },
                  { key: 'estimada', label: 'Multa Estimada', amount: result.multaEstimada, uits: result.enUITs.estimada },
                  { key: 'max', label: 'Multa Maxima', amount: result.multaMaxima, uits: result.enUITs.max },
                ].map(item => {
                  const percentage = result.multaMaxima > 0
                    ? (item.amount / result.multaMaxima) * 100
                    : 0

                  return (
                    <div key={item.key} className="px-6 py-4 flex items-center gap-4">
                      <div className="w-1 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        <div
                          className="w-full bg-amber-500 rounded-full transition-all duration-700"
                          style={{ height: `${percentage}%` }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-white">
                            {item.label}
                          </span>
                          <div className="text-right">
                            <span className="text-lg font-bold text-white tabular-nums">
                              S/ {item.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              {item.uits.toFixed(2)} UIT
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700"
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

                {/* Descuento row */}
                {result.multaConDescuento !== null && (
                  <div className="px-6 py-4 flex items-center gap-4 bg-green-50">
                    <div className="w-1 h-10 rounded-full bg-green-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-green-800 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Con Subsanacion Voluntaria (-25%)
                        </span>
                        <span className="text-lg font-bold text-green-700 tabular-nums">
                          S/ {result.multaConDescuento.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        Ahorro de S/ {(result.multaEstimada - result.multaConDescuento).toLocaleString('es-PE', { minimumFractionDigits: 2 })} por subsanacion voluntaria
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Factor de Gravedad */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Informacion del Calculo
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Scale className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-amber-700">{result.factorGravedad.toFixed(2)}</p>
                    <p className="text-xs font-medium text-amber-600">Factor de gravedad</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-blue-700">{input.numeroTrabajadores}</p>
                    <p className="text-xs font-medium text-blue-600">Trabajadores afectados</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recomendaciones */}
            {result.recomendaciones.length > 0 && (
              <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Recomendaciones
                </h3>
                <ul className="space-y-2">
                  {result.recomendaciones.map((rec, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100/50">
                      <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-300">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Formula and Legal Basis */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Formula y Base Legal
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Formula aplicada:</span>
                  <div className="mt-1.5">
                    <code className="block bg-white/[0.02] bg-white/[0.04] px-4 py-3 rounded-xl border border-white/[0.08] border-white/10 text-sm text-gray-200 font-mono leading-relaxed">
                      {result.formula}
                    </code>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Base legal:</span>
                  <div className="mt-1.5 flex items-start gap-2 p-3 bg-white/[0.02] bg-white/[0.04] rounded-lg">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                      D.S. 019-2006-TR
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
