'use client'

import { useState, useMemo } from 'react'
import { calcularMultaSunafil, type RegimenMype } from '@/lib/legal-engine/calculators/multa-sunafil'
import { openWhatsApp } from '@/lib/whatsapp'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import { formatSoles } from '@/lib/format/peruvian'
import {
  Download,
  MessageCircle,
  Scale,
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
import type { MultaSunafilInput, MultaSunafilResult } from '@/lib/legal-engine'
import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'
import { ResultadoExplicado } from './shared/resultado-explicado'
import { EstadoVacio } from './shared/ui'

type Subsanacion = 'no' | 'antes' | 'durante'

const SUBSANACION_OPTIONS: { value: Subsanacion; label: string; hint: string }[] = [
  { value: 'no', label: 'No la he corregido', hint: 'Se calcula la multa completa.' },
  { value: 'antes', label: 'La corregí antes de la inspección', hint: 'Si corriges la falta antes de que SUNAFIL te notifique, la multa baja 90%.' },
  { value: 'durante', label: 'La corregiré durante la inspección', hint: 'Si la corriges dentro del plazo que te da el inspector, la multa baja 70%.' },
]

const REGIMEN_OPTIONS: { value: RegimenMype; label: string; sublabel: string }[] = [
  { value: 'MICROEMPRESA', label: 'Microempresa (REMYPE)', sublabel: 'Ventas de hasta 150 UIT al año · tabla de multas reducida' },
  { value: 'PEQUEÑA_EMPRESA', label: 'Pequeña empresa (REMYPE)', sublabel: 'Ventas de hasta 1700 UIT al año · tabla de multas reducida' },
  { value: 'GENERAL', label: 'Mediana o gran empresa', sublabel: 'No inscrita en el REMYPE · tabla general' },
]

const TIPOS_INFRACCION = [
  { value: 'LEVE', label: 'Leve', color: 'bg-yellow-400', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  { value: 'GRAVE', label: 'Grave', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  { value: 'MUY_GRAVE', label: 'Muy grave', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
] as const

export function MultaSunafilCalculadora() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [input, setInput] = useState<MultaSunafilInput>({
    tipoInfraccion: 'GRAVE',
    numeroTrabajadores: 0,
    reincidente: false,
    subsanacionVoluntaria: false,
    subsanacionDuranteInspeccion: false,
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
      toast({ title: 'Cálculo guardado', description: 'Puedes verlo en tu historial', type: 'success' })
    } catch {
      toast({ title: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const selectedTipo = TIPOS_INFRACCION.find(t => t.value === input.tipoInfraccion)
  const subsanacion: Subsanacion = input.subsanacionVoluntaria
    ? 'antes'
    : input.subsanacionDuranteInspeccion
      ? 'durante'
      : 'no'
  const setSubsanacion = (v: Subsanacion) =>
    setInput(prev => ({
      ...prev,
      subsanacionVoluntaria: v === 'antes',
      subsanacionDuranteInspeccion: v === 'durante',
    }))
  const descuentoLabel = result?.descuentoTipo === 'voluntaria_90'
    ? '−90% por corregir antes de la inspección'
    : result?.descuentoTipo === 'durante_inspeccion_70'
      ? '−70% por corregir durante la inspección'
      : null
  const regimenLabel = REGIMEN_OPTIONS.find(o => o.value === input.regimenMype)?.label ?? 'Mediana o gran empresa'
  const faltantes = input.numeroTrabajadores > 0 ? [] : ['número de trabajadores afectados']

  return (
    <div className="@container">
      <div className="grid grid-cols-1 @4xl:grid-cols-5 gap-6 @4xl:gap-8">
        {/* FORM -- Left side */}
        <div className="@4xl:col-span-2 space-y-6">
          <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Datos de la falta</h2>
                <p className="text-sm text-[color:var(--text-tertiary)]">El resultado se actualiza mientras escribes</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Tipo de Infraccion */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                  ¿Qué tan grave es la falta?
                </label>
                <p className="-mt-1 mb-2 text-xs text-[color:var(--text-tertiary)]">
                  Leve: temas formales (ej. no exhibir un documento). Grave: no pagar beneficios o no tener contratos en regla. Muy grave: afecta derechos fundamentales o la seguridad de las personas.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS_INFRACCION.map(tipo => (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => updateField('tipoInfraccion', tipo.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        input.tipoInfraccion === tipo.value
                          ? `border-current ${tipo.textColor} ${tipo.bgLight} ring-2 ring-current/20`
                          : 'border-[color:var(--border-default)] text-[color:var(--text-tertiary)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-surface-hover)]'
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
                <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                  Trabajadores afectados
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--text-tertiary)]" />
                  <input
                    type="number"
                    value={input.numeroTrabajadores || ''}
                    onChange={e => updateField('numeroTrabajadores', Number(e.target.value))}
                    placeholder="0"
                    min={1}
                    className="w-full pl-10 pr-4 py-3 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-semibold"
                  />
                </div>
              </div>

              {/* Regimen MYPE */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                  Tamaño de tu empresa
                </label>
                <div className="space-y-2">
                  {REGIMEN_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        input.regimenMype === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-[color:var(--border-default)] hover:border-[color:var(--border-strong)]'
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
                        input.regimenMype === opt.value ? 'border-primary' : 'border-[color:var(--border-strong)]'
                      }`}>
                        {input.regimenMype === opt.value && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{opt.label}</p>
                        <p className="text-xs text-[color:var(--text-tertiary)]">{opt.sublabel}</p>
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
                      <div className="w-11 h-6 bg-[color:var(--neutral-300)] rounded-full peer-checked:bg-red-500 transition-colors" />
                      <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                    </div>
                    <span className="text-sm text-[color:var(--text-secondary)] group-hover:text-[color:var(--text-primary)] font-medium">
                      Ya me sancionaron antes por la misma falta
                    </span>
                  </label>
                  {input.reincidente && (
                    <div className="mt-2 ml-14 flex items-start gap-2 p-2.5 bg-red-50 rounded-lg border border-red-100">
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600 font-medium">
                        Es reincidencia: la multa sube 50%.
                      </p>
                    </div>
                  )}
                </div>

                {/* Subsanación */}
                <fieldset className="pt-2">
                  <legend className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                    ¿Corregiste la falta?
                  </legend>
                  <div className="space-y-2">
                    {SUBSANACION_OPTIONS.map(opt => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          subsanacion === opt.value
                            ? 'border-primary bg-primary/5'
                            : 'border-[color:var(--border-default)] hover:border-[color:var(--border-strong)]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="subsanacion"
                          value={opt.value}
                          checked={subsanacion === opt.value}
                          onChange={() => setSubsanacion(opt.value)}
                          className="mt-0.5 h-4 w-4 flex-shrink-0 accent-primary"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-[color:var(--text-primary)]">{opt.label}</span>
                          <span className="block text-xs text-[color:var(--text-tertiary)]">{opt.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS -- Right side */}
        <div className="@4xl:col-span-3 space-y-6">
          {!result ? (
            <EstadoVacio titulo="Ingresa los datos de la falta" faltantes={faltantes} />
          ) : (
            <>
              {/* Total Card -- Amber gradient */}
              <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-white/80" />
                    <span className="text-sm font-medium text-white/80 uppercase tracking-wider">
                      Multa estimada de SUNAFIL
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
                <div className="text-4xl sm:text-5xl font-black tracking-tight mb-1 tabular-nums">
                  {formatSoles(result.multaConDescuento ?? result.multaEstimada)}
                </div>
                {(result.multaConDescuento !== null || result.mypeDescuento !== null) && (
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {result.multaConDescuento !== null && (
                      <span className="text-white/75 text-sm line-through">
                        {formatSoles(result.multaEstimada)}
                      </span>
                    )}
                    {result.mypeDescuento !== null && (
                      <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
                        Tabla MYPE
                      </span>
                    )}
                    {descuentoLabel && (
                      <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
                        {descuentoLabel}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-white/80 text-sm mt-1">
                  Rango para una falta {selectedTipo?.label.toLowerCase()}: {formatSoles(result.multaMinima)} a {formatSoles(result.multaMaxima)}
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
                        className="absolute inset-y-0 left-0 bg-white rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(((result.multaConDescuento ?? result.multaEstimada) / result.multaMaxima) * 100, 100)}%`,
                        }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-white/80">
                    <span>Mín.: {formatSoles(result.multaMinima)}</span>
                    <span>Máx.: {formatSoles(result.multaMaxima)}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2.5 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      const tipoLabel = selectedTipo?.label || input.tipoInfraccion
                      const items = [
                        { label: 'Multa Mínima', amount: result.multaMinima, formula: `${result.enUITs.min.toFixed(2)} UIT` },
                        { label: 'Multa Estimada', amount: result.multaEstimada, formula: `${result.enUITs.estimada.toFixed(2)} UIT` },
                        { label: 'Multa Máxima', amount: result.multaMaxima, formula: `${result.enUITs.max.toFixed(2)} UIT` },
                      ]
                      if (result.multaConDescuento !== null) {
                        items.push({
                          label: `Con descuento (${descuentoLabel ?? 'subsanación'})`,
                          amount: result.multaConDescuento,
                          formula: result.descuentoTipo === 'voluntaria_90' ? 'Multa estimada x 0.10' : 'Multa estimada x 0.30',
                        })
                      }
                      const content = calculationToHTML({
                        title: 'Desglose de Multa SUNAFIL',
                        items,
                        total: result.multaConDescuento ?? result.multaEstimada,
                        warnings: result.recomendaciones.map(rec => ({ message: rec })),
                        legalRefs: [
                          { norm: 'D.S. 019-2006-TR', description: 'Reglamento de la Ley General de Inspección del Trabajo' },
                          { norm: 'Ley 28806', description: 'Ley General de Inspección del Trabajo' },
                        ],
                        metadata: {
                          'Tipo de Infracción': tipoLabel,
                          'Número de Trabajadores Afectados': `${input.numeroTrabajadores}`,
                          'Reincidente': input.reincidente ? 'Sí' : 'No',
                          'Tamaño de la empresa': regimenLabel,
                          'Subsanación': descuentoLabel ?? 'No',
                          'Fórmula Aplicada': result.formula,
                        },
                      })
                      generatePDFFromHTML({
                        title: `Cálculo de Multa SUNAFIL - Infracción ${tipoLabel}`,
                        filename: 'calculo-multa-sunafil.pdf',
                        content,
                        watermark: 'COMPLY360',
                      })
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-amber-50 text-amber-800 rounded-xl font-bold text-sm transition-colors"
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
              <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[color:var(--border-subtle)]">
                  <h3 className="text-lg font-bold text-[color:var(--text-primary)] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Desglose en UIT
                  </h3>
                </div>

                <div className="divide-y divide-[color:var(--border-subtle)]">
                  {[
                    { key: 'min', label: 'Multa mínima del rango', amount: result.multaMinima, uits: result.enUITs.min },
                    { key: 'estimada', label: 'Multa para tu caso', amount: result.multaEstimada, uits: result.enUITs.estimada },
                    { key: 'max', label: 'Multa máxima del rango', amount: result.multaMaxima, uits: result.enUITs.max },
                  ].map(item => {
                    const percentage = result.multaMaxima > 0
                      ? (item.amount / result.multaMaxima) * 100
                      : 0

                    return (
                      <div key={item.key} className="px-6 py-4 flex items-center gap-4">
                        <div className="w-1 h-10 rounded-full bg-[color:var(--neutral-200)] overflow-hidden flex-shrink-0">
                          <div
                            className="w-full bg-amber-500 rounded-full transition-all duration-700"
                            style={{ height: `${percentage}%` }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                              {item.label}
                            </span>
                            <div className="text-right">
                              <span className="text-lg font-bold text-[color:var(--text-primary)] tabular-nums">
                                {formatSoles(item.amount)}
                              </span>
                              <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                {item.uits.toFixed(2)} UIT
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex-1 h-2 bg-[color:var(--neutral-100)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-[color:var(--text-tertiary)] w-10 text-right tabular-nums">
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
                            Con descuento: {descuentoLabel}
                          </span>
                          <span className="text-lg font-bold text-green-700 tabular-nums">
                            {formatSoles(result.multaConDescuento)}
                          </span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          Ahorras {formatSoles(result.multaEstimada - result.multaConDescuento)} por corregir la falta
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Factor de Gravedad */}
              <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm p-6">
                <h3 className="text-sm font-bold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Datos del cálculo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Scale className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-amber-700">{result.enUITs.estimada.toFixed(2)} UIT</p>
                      <p className="text-xs font-medium text-amber-600">1 UIT = {formatSoles(PERU_LABOR.UIT)}</p>
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
                <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm p-6">
                  <h3 className="text-sm font-bold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Recomendaciones
                  </h3>
                  <ul className="space-y-2">
                    {result.recomendaciones.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100/50">
                        <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-[color:var(--text-secondary)]">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <ResultadoExplicado
                resumen="SUNAFIL usa una tabla oficial: el monto depende de qué tan grave es la falta, del tamaño de tu empresa y de cuántos trabajadores fueron afectados. Se expresa en UIT."
                pasos={[
                  `Falta ${selectedTipo?.label.toLowerCase() ?? ''} que afecta a ${input.numeroTrabajadores} ${input.numeroTrabajadores === 1 ? 'trabajador' : 'trabajadores'}, en una empresa ${regimenLabel.toLowerCase()}.`,
                  `Según la tabla oficial corresponden ${result.enUITs.estimada.toFixed(2)} UIT × ${formatSoles(PERU_LABOR.UIT)} = ${formatSoles(result.multaEstimada)}${input.reincidente ? ' (incluye +50% por reincidencia)' : ''}.`,
                  ...(result.multaConDescuento !== null && descuentoLabel
                    ? [`Como corriges la falta, se aplica ${descuentoLabel}: queda en ${formatSoles(result.multaConDescuento)}.`]
                    : []),
                  `Para una falta ${selectedTipo?.label.toLowerCase() ?? ''} el rango posible va de ${formatSoles(result.multaMinima)} a ${formatSoles(result.multaMaxima)}.`,
                ]}
                baseLegal={[
                  {
                    norma: 'Ley 28806',
                    enSimple:
                      'Ley General de Inspección del Trabajo: SUNAFIL puede multar por incumplir normas laborales, y corregir la falta a tiempo reduce la multa.',
                  },
                  {
                    norma: 'D.S. 019-2006-TR',
                    enSimple:
                      'Reglamento: clasifica las faltas en leves, graves y muy graves, y fija la tabla de multas en UIT según el tamaño de la empresa.',
                  },
                ]}
                formulaTecnica={result.formula}
                nota="Es una estimación. El monto final lo fija SUNAFIL en su resolución."
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
