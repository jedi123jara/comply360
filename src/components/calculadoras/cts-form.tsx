'use client'

import { useState, useMemo } from 'react'
import { calcularCTS } from '@/lib/legal-engine/calculators/cts'
import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'
import { openWhatsApp } from '@/lib/whatsapp'
import type { CTSInput, CTSResult } from '@/lib/legal-engine'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import { formatSoles } from '@/lib/format/peruvian'
import {
  Download,
  MessageCircle,
  TrendingUp,
  Landmark,
  Save,
  Loader2,
  CalendarClock,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { WorkerAutoFill, type WorkerData } from './worker-autofill'
import { RegimenSelector, AvisoRegimenEspecial } from './shared/regimen-selector'
import { getRegimenInfo, normalizarRegimen } from './shared/regimen'
import { ResultadoExplicado, type BaseLegalSimple } from './shared/resultado-explicado'
import {
  etiquetaCorteCTS,
  opcionesCorteCTS,
  periodoCTS,
  proximoCorteCTS,
} from './shared/fechas'
import { CARD, EstadoVacio, HERO_BTN, HINT, INPUT, LABEL } from './shared/ui'

interface CTSCalculadoraProps {
  /** DNI del trabajador para precargar sus datos (incluido su régimen). */
  prefillDni?: string
}

export function CTSCalculadora({ prefillDni }: CTSCalculadoraProps = {}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null)
  // Fechas calculadas una vez al abrir: por defecto el PRÓXIMO depósito.
  const [opcionesCorte] = useState(() => opcionesCorteCTS())
  const [input, setInput] = useState<CTSInput>(() => ({
    sueldoBruto: 0,
    fechaIngreso: '',
    fechaCorte: proximoCorteCTS(),
    asignacionFamiliar: false,
    ultimaGratificacion: 0,
    regimenLaboral: 'GENERAL',
  }))

  function handleWorkerSelect(w: WorkerData | null) {
    setSelectedWorker(w)
    if (w) {
      setInput(prev => ({
        ...prev,
        sueldoBruto: w.sueldoBruto,
        fechaIngreso: w.fechaIngreso,
        asignacionFamiliar: w.asignacionFamiliar,
        regimenLaboral: normalizarRegimen(w.regimenLaboral),
      }))
    }
  }

  // El semestre termina el día 1 del mes de depósito (1-may / 1-nov).
  const finSemestre = `${input.fechaCorte.slice(0, 8)}01`
  const ingresoPosterior = !!input.fechaIngreso && input.fechaIngreso >= finSemestre

  const result = useMemo<CTSResult | null>(() => {
    if (input.sueldoBruto <= 0 || !input.fechaIngreso || !input.fechaCorte || ingresoPosterior) {
      return null
    }
    try {
      return calcularCTS(input)
    } catch {
      return null
    }
  }, [input, ingresoPosterior])

  const updateField = <K extends keyof CTSInput>(key: K, value: CTSInput[K]) => {
    setInput(prev => ({ ...prev, [key]: value }))
  }

  const regimen = getRegimenInfo(input.regimenLaboral)
  const asignacion = input.asignacionFamiliar
    ? PERU_LABOR.RMV * PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE
    : 0
  const remBase = input.sueldoBruto + asignacion
  const corteLabel = etiquetaCorteCTS(input.fechaCorte)

  /** Estimado de la última gratificación si el usuario no la recuerda. */
  function usarGratiEstimada() {
    const factor =
      regimen.key === 'MYPE_MICRO' ? 0 : regimen.key === 'MYPE_PEQUENA' ? 0.5 : 1
    updateField('ultimaGratificacion', Math.round(remBase * factor * 100) / 100)
  }

  const faltantes = [
    input.sueldoBruto > 0 ? null : 'sueldo',
    input.fechaIngreso ? null : 'fecha de ingreso',
  ].filter((x): x is string => x !== null)

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
      toast({ title: 'Cálculo guardado', description: 'Puedes verlo en tu historial', type: 'success' })
    } catch {
      toast({ title: 'No se pudo guardar', description: 'Inténtalo de nuevo en un momento', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const descargarPdf = () => {
    if (!result) return
    const content = calculationToHTML({
      title: 'Desglose del cálculo de CTS',
      items: [
        { label: 'Remuneración computable', amount: result.remuneracionComputable, formula: 'Sueldo + asignación familiar + 1/6 de la gratificación' },
        { label: `Meses computables (${result.mesesComputables})`, amount: (result.remuneracionComputable / 12) * result.mesesComputables, formula: `RC / 12 x ${result.mesesComputables} meses` },
        { label: `Días computables (${result.diasComputables})`, amount: (result.remuneracionComputable / 360) * result.diasComputables, formula: `RC / 360 x ${result.diasComputables} días` },
      ],
      total: result.ctsTotal,
      warnings: regimen.tratamiento === 'especial'
        ? [{ message: `Régimen ${regimen.label}: resultado referencial, consúltalo con tu asesor.` }]
        : [],
      legalRefs: [
        { norm: 'D.S. 001-97-TR', description: 'TUO de la Ley de Compensación por Tiempo de Servicios' },
      ],
      metadata: {
        'Régimen laboral': regimen.label,
        'Sueldo bruto': formatSoles(input.sueldoBruto),
        'Fecha de ingreso': input.fechaIngreso,
        'Depósito': `${corteLabel} (semestre ${periodoCTS(input.fechaCorte)})`,
        'Asignación familiar': input.asignacionFamiliar ? 'Sí' : 'No',
        'Última gratificación': formatSoles(input.ultimaGratificacion),
        'Fórmula aplicada': result.formula,
      },
    })
    generatePDFFromHTML({
      title: 'Cálculo de CTS - Compensación por Tiempo de Servicios',
      filename: 'calculo-cts.pdf',
      content,
      watermark: 'COMPLY360',
    })
  }

  // ── Explicación en simple ──────────────────────────────────────────────
  const pasos: string[] = []
  const baseLegal: BaseLegalSimple[] = [
    {
      norma: 'D.S. 001-97-TR',
      enSimple:
        'La CTS es un ahorro para cuando el trabajador deje la empresa. El empleador la deposita dos veces al año, en mayo y en noviembre.',
    },
  ]
  if (result) {
    const sexto = input.ultimaGratificacion / 6
    pasos.push(
      `Remuneración computable: sueldo ${formatSoles(input.sueldoBruto)}` +
        (asignacion > 0 ? ` + asignación familiar ${formatSoles(asignacion)}` : '') +
        ` + 1/6 de la última gratificación (${formatSoles(sexto)}) = ${formatSoles(result.remuneracionComputable)}.`,
    )
    pasos.push(
      `En el semestre de ${periodoCTS(input.fechaCorte)} cuenta ${result.mesesComputables} ${result.mesesComputables === 1 ? 'mes completo' : 'meses completos'} y ${result.diasComputables} ${result.diasComputables === 1 ? 'día' : 'días'}.`,
    )
    pasos.push(
      `Por cada mes se suma 1/12 de la remuneración computable (${formatSoles(result.remuneracionComputable / 12)}) y por cada día, 1/360 (${formatSoles(result.remuneracionComputable / 360)}).`,
    )
    if (regimen.key === 'MYPE_MICRO') {
      pasos.push('Como es microempresa, no corresponde CTS: el monto final es cero.')
    } else if (regimen.key === 'MYPE_PEQUENA') {
      pasos.push(`Como es pequeña empresa, se paga la mitad: ${formatSoles(result.ctsTotal)}.`)
    } else if (regimen.tratamiento === 'especial') {
      pasos.push(`Régimen ${regimen.label}: el monto se calculó con las reglas generales y es solo una referencia.`)
    }
    pasos.push(`Debes depositarla hasta el ${corteLabel} en la cuenta CTS que eligió el trabajador.`)
    if (regimen.key === 'MYPE_MICRO' || regimen.key === 'MYPE_PEQUENA') {
      baseLegal.push({
        norma: PERU_LABOR.MYPE.MICRO.BASE_LEGAL,
        enSimple: 'Régimen MYPE: la microempresa no paga CTS y la pequeña empresa paga la mitad.',
      })
    }
  }

  return (
    <div className="@container">
      <div className="grid grid-cols-1 @4xl:grid-cols-5 gap-6 @4xl:gap-8">
        {/* FORMULARIO */}
        <div className="@4xl:col-span-2 space-y-6">
          <div className={`${CARD} p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Landmark className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Datos para la CTS</h2>
                <p className="text-sm text-[color:var(--text-tertiary)]">El resultado se actualiza mientras escribes</p>
              </div>
            </div>

            <div className="space-y-5">
              <WorkerAutoFill
                selectedWorker={selectedWorker}
                onSelect={handleWorkerSelect}
                prefillDni={prefillDni}
              />

              <RegimenSelector
                calc="cts"
                value={input.regimenLaboral}
                onChange={v => updateField('regimenLaboral', v)}
                origenTrabajador={
                  selectedWorker && normalizarRegimen(selectedWorker.regimenLaboral) === input.regimenLaboral
                    ? `${selectedWorker.firstName} ${selectedWorker.lastName}`
                    : null
                }
              />

              {/* Depósito */}
              <div>
                <label htmlFor="cts-corte" className={LABEL}>
                  ¿Qué depósito quieres calcular?
                </label>
                <select
                  id="cts-corte"
                  value={input.fechaCorte}
                  onChange={e => updateField('fechaCorte', e.target.value)}
                  className={INPUT}
                >
                  {opcionesCorte.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className={HINT}>Cubre lo trabajado de {periodoCTS(input.fechaCorte)}.</p>
              </div>

              {/* Sueldo */}
              <div>
                <label htmlFor="cts-sueldo" className={LABEL}>
                  Sueldo bruto mensual
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)] font-semibold text-sm">S/</span>
                  <input
                    id="cts-sueldo"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={input.sueldoBruto || ''}
                    onChange={e => updateField('sueldoBruto', Number(e.target.value))}
                    placeholder="0.00"
                    className={`${INPUT} pl-10 text-lg font-semibold`}
                  />
                </div>
                <p className={HINT}>El sueldo antes de descuentos (AFP/ONP).</p>
              </div>

              {/* Fecha de ingreso */}
              <div>
                <label htmlFor="cts-ingreso" className={LABEL}>
                  Fecha de ingreso
                </label>
                <input
                  id="cts-ingreso"
                  type="date"
                  value={input.fechaIngreso}
                  onChange={e => updateField('fechaIngreso', e.target.value)}
                  className={INPUT}
                />
              </div>

              {/* Asignación familiar */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={input.asignacionFamiliar}
                    onChange={e => updateField('asignacionFamiliar', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[color:var(--neutral-300)] rounded-full peer-checked:bg-primary transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                </div>
                <span className="text-sm text-[color:var(--text-secondary)] group-hover:text-[color:var(--text-primary)]">
                  Recibe asignación familiar ({formatSoles(PERU_LABOR.RMV * PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE)})
                  <span className="block text-xs text-[color:var(--text-tertiary)]">Si tiene hijos menores de 18 años o que estudian.</span>
                </span>
              </label>

              {/* Última gratificación */}
              <div>
                <label htmlFor="cts-grati" className={LABEL}>
                  Última gratificación recibida
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)] font-semibold text-sm">S/</span>
                  <input
                    id="cts-grati"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={input.ultimaGratificacion || ''}
                    onChange={e => updateField('ultimaGratificacion', Number(e.target.value))}
                    placeholder="0.00"
                    className={`${INPUT} pl-10 text-lg font-semibold`}
                  />
                </div>
                <p className={HINT}>
                  Para el depósito de mayo es la gratificación de diciembre; para el de noviembre, la de julio.
                  Se suma 1/6 de ese monto.
                </p>
                {input.sueldoBruto > 0 && (
                  <button
                    type="button"
                    onClick={usarGratiEstimada}
                    className="mt-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    ¿No la recuerdas? Usar el monto estimado
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RESULTADO */}
        <div className="@4xl:col-span-3 space-y-6">
          {!result ? (
            ingresoPosterior ? (
              <div className={`${CARD} p-8 text-center`}>
                <CalendarClock className="w-8 h-8 text-[color:var(--text-tertiary)] mx-auto mb-3" aria-hidden />
                <h3 className="text-base font-semibold text-[color:var(--text-primary)]">
                  Todavía no corresponde CTS en este depósito
                </h3>
                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                  El trabajador ingresó después del semestre de {periodoCTS(input.fechaCorte)}. Elige el depósito siguiente.
                </p>
              </div>
            ) : (
              <EstadoVacio titulo="Ingresa los datos del trabajador" faltantes={faltantes} />
            )
          ) : (
            <>
              <AvisoRegimenEspecial regimen={input.regimenLaboral} />

              {/* Total */}
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-white/80" />
                    <span className="text-sm font-medium text-white/90 uppercase tracking-wider">
                      CTS a depositar
                    </span>
                  </div>
                  <span className="text-xs bg-white/15 px-2.5 py-1 rounded-full">
                    {regimen.label}
                  </span>
                </div>
                <div className="text-4xl sm:text-5xl font-black tracking-tight mb-2 tabular-nums">
                  {formatSoles(result.ctsTotal)}
                </div>
                <p className="text-white/85 text-sm">
                  Depósito hasta el {corteLabel} · semestre {periodoCTS(input.fechaCorte)}
                  {regimen.tratamiento === 'especial' ? ' · referencial' : ''}
                </p>

                <div className="flex flex-wrap gap-2.5 mt-6">
                  <button
                    type="button"
                    onClick={descargarPdf}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#d4a853] hover:bg-[#c49a48] text-[#0f172a] rounded-xl font-bold text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => openWhatsApp({
                      type: 'cts',
                      total: result.ctsTotal,
                      data: { periodo: corteLabel },
                    })}
                    className={HERO_BTN}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Consultar por WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={saveCalculation}
                    disabled={saving}
                    className={HERO_BTN}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar
                  </button>
                </div>
              </div>

              {/* Desglose */}
              <div className={`${CARD} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-[color:var(--border-subtle)]">
                  <h3 className="text-base font-bold text-[color:var(--text-primary)] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Desglose del cálculo
                  </h3>
                </div>
                <div className="divide-y divide-[color:var(--border-subtle)]">
                  {[
                    {
                      label: 'Remuneración computable',
                      hint: `Sueldo${input.asignacionFamiliar ? ' + asignación familiar' : ''} + 1/6 de la gratificación`,
                      value: formatSoles(result.remuneracionComputable),
                    },
                    {
                      label: 'Meses computables',
                      hint: 'Meses completos del semestre (máximo 6)',
                      value: `${result.mesesComputables} ${result.mesesComputables === 1 ? 'mes' : 'meses'}`,
                    },
                    {
                      label: 'Días computables',
                      hint: 'Días sueltos además de los meses completos',
                      value: `${result.diasComputables} ${result.diasComputables === 1 ? 'día' : 'días'}`,
                    },
                  ].map(row => (
                    <div key={row.label} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{row.label}</p>
                        <p className="text-xs text-[color:var(--text-tertiary)]">{row.hint}</p>
                      </div>
                      <span className="text-lg font-bold text-[color:var(--text-primary)] tabular-nums text-right">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <ResultadoExplicado
                resumen="Sueldo + 1/6 de la gratificación, por los meses y días trabajados en el semestre."
                pasos={pasos}
                baseLegal={baseLegal}
                formulaTecnica={result.formula}
                nota="Si el trabajador deja la empresa antes del depósito, la CTS pendiente se paga en su liquidación."
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
