'use client'

import { useState, useMemo } from 'react'
import { calcularIndemnizacion } from '@/lib/legal-engine/calculators/indemnizacion'
import { PERU_LABOR, calcularPeriodoLaboral } from '@/lib/legal-engine/peru-labor'
import { openWhatsApp } from '@/lib/whatsapp'
import type { IndemnizacionInput, IndemnizacionResult } from '@/lib/legal-engine'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import { formatSoles } from '@/lib/format/peruvian'
import {
  AlertTriangle,
  Download,
  MessageCircle,
  Scale,
  Briefcase,
  Save,
  Loader2,
  Info,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { WorkerAutoFill, type WorkerData } from './worker-autofill'
import { RegimenSelector, AvisoRegimenEspecial } from './shared/regimen-selector'
import { getRegimenInfo, normalizarRegimen } from './shared/regimen'
import { ResultadoExplicado, type BaseLegalSimple } from './shared/resultado-explicado'
import { CARD, EstadoVacio, HERO_BTN, HINT, INPUT, LABEL } from './shared/ui'

const TIPOS_CONTRATO = [
  { value: 'indefinido', label: 'Plazo indeterminado (sin fecha de fin)' },
  { value: 'plazo_fijo', label: 'Plazo fijo (con fecha de fin)' },
] as const

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

interface IndemnizacionCalculadoraProps {
  /** DNI del trabajador para precargar sus datos (incluido su régimen). */
  prefillDni?: string
}

export function IndemnizacionCalculadora({ prefillDni }: IndemnizacionCalculadoraProps = {}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null)
  const [input, setInput] = useState<IndemnizacionInput>({
    sueldoBruto: 0,
    fechaIngreso: '',
    fechaDespido: '',
    tipoContrato: 'indefinido',
    fechaFinContrato: '',
    regimenLaboral: 'GENERAL',
  })

  const result = useMemo<IndemnizacionResult | null>(() => {
    if (input.sueldoBruto <= 0 || !input.fechaIngreso || !input.fechaDespido) {
      return null
    }
    if (input.fechaDespido < input.fechaIngreso) return null
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
        regimenLaboral: normalizarRegimen(w.regimenLaboral),
        tipoContrato: w.tipoContrato === 'INDEFINIDO' || w.tipoContrato === 'TIEMPO_PARCIAL' ? 'indefinido' : 'plazo_fijo',
      }))
    }
  }

  const updateField = <K extends keyof IndemnizacionInput>(key: K, value: IndemnizacionInput[K]) => {
    setInput(prev => ({ ...prev, [key]: value }))
  }

  const regimen = getRegimenInfo(input.regimenLaboral)
  const esMype = regimen.key === 'MYPE_MICRO' || regimen.key === 'MYPE_PEQUENA'
  const cfgMype = regimen.key === 'MYPE_MICRO' ? PERU_LABOR.MYPE.MICRO : PERU_LABOR.MYPE.PEQUENA
  const esIndefinido = input.tipoContrato === 'indefinido'
  const usaReglaMype = esMype && esIndefinido
  const tipoLabel = esIndefinido ? 'Plazo indeterminado' : 'Plazo fijo'
  const topeLabel = usaReglaMype
    ? `Tope máximo (${cfgMype.INDEMNIZACION_TOPE_DIARIO} remuneraciones diarias)`
    : 'Tope máximo (12 remuneraciones)'

  const faltantes = [
    input.sueldoBruto > 0 ? null : 'sueldo',
    input.fechaIngreso ? null : 'fecha de ingreso',
    input.fechaDespido ? null : 'fecha de despido',
    input.tipoContrato === 'plazo_fijo' && !input.fechaFinContrato ? 'fecha de fin del contrato' : null,
  ].filter((x): x is string => x !== null)

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
      toast({ title: 'Cálculo guardado', description: 'Puedes verlo en tu historial', type: 'success' })
    } catch {
      toast({ title: 'No se pudo guardar', description: 'Inténtalo de nuevo en un momento', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const descargarPdf = () => {
    if (!result) return
    const warnings: Array<{ message: string }> = []
    if (result.topeAplicado) {
      warnings.push({ message: `Tope legal aplicado: la indemnización calculada supera el máximo (${formatSoles(result.topeMaximo)}).` })
    }
    if (result.legalWarning) warnings.push({ message: result.legalWarning })
    if (regimen.tratamiento === 'especial') {
      warnings.push({ message: `Régimen ${regimen.label}: resultado referencial, consúltalo con tu asesor.` })
    }
    const content = calculationToHTML({
      title: 'Desglose de indemnización por despido arbitrario',
      items: [
        { label: 'Indemnización', amount: result.indemnizacion, formula: result.formula, baseLegal: result.baseLegal },
      ],
      total: result.indemnizacion,
      warnings,
      legalRefs: [
        { norm: 'D.S. 003-97-TR', description: 'TUO del D.Leg. 728 - Ley de Productividad y Competitividad Laboral. Indemnización por despido arbitrario.' },
      ],
      metadata: {
        'Régimen laboral': regimen.label,
        'Remuneración mensual bruta': formatSoles(input.sueldoBruto),
        'Fecha de ingreso': input.fechaIngreso,
        'Fecha de despido': input.fechaDespido,
        'Tipo de contrato': tipoLabel,
        ...(input.tipoContrato === 'plazo_fijo' && input.fechaFinContrato ? { 'Fecha de fin del contrato': input.fechaFinContrato } : {}),
        [topeLabel]: formatSoles(result.topeMaximo),
        'Fórmula aplicada': result.formula,
      },
    })
    generatePDFFromHTML({
      title: 'Cálculo de indemnización por despido arbitrario',
      filename: 'calculo-indemnizacion.pdf',
      content,
      watermark: 'COMPLY360',
    })
  }

  // ── Explicación en simple ──────────────────────────────────────────────
  const pasos: string[] = []
  const baseLegal: BaseLegalSimple[] = []
  let resumen = ''
  if (result) {
    const periodo = calcularPeriodoLaboral(input.fechaIngreso, input.fechaDespido)
    pasos.push(`Remuneración mensual: ${formatSoles(input.sueldoBruto)}.`)
    pasos.push(
      `Tiempo de servicio: ${plural(periodo.anos, 'año', 'años')}, ${plural(periodo.meses, 'mes', 'meses')} y ${plural(periodo.dias, 'día', 'días')}.`,
    )
    if (usaReglaMype) {
      const remDiaria = input.sueldoBruto / 30
      resumen = `${cfgMype.INDEMNIZACION_FACTOR_DIARIO} remuneraciones diarias por cada año trabajado, con un tope de ${cfgMype.INDEMNIZACION_TOPE_DIARIO}.`
      pasos.push(
        `Remuneración diaria: sueldo ÷ 30 = ${formatSoles(remDiaria)}. Por cada año se pagan ${cfgMype.INDEMNIZACION_FACTOR_DIARIO} remuneraciones diarias (${formatSoles(remDiaria * cfgMype.INDEMNIZACION_FACTOR_DIARIO)}); los meses y días se pagan en proporción.`,
      )
    } else if (esIndefinido) {
      resumen = '1.5 sueldos por cada año trabajado (y la parte proporcional por meses y días), con un tope de 12 sueldos.'
      pasos.push(
        `Por cada año se paga 1.5 sueldos (${formatSoles(input.sueldoBruto * 1.5)}); los meses y días se pagan en proporción.`,
      )
    } else {
      const restante = input.fechaFinContrato
        ? calcularPeriodoLaboral(input.fechaDespido, input.fechaFinContrato)
        : null
      const mesesRestantes = restante ? restante.totalMeses + (restante.dias > 0 ? 1 : 0) : 0
      resumen = '1.5 sueldos por cada mes que faltaba para que termine el contrato, con un tope de 12 sueldos.'
      pasos.push(
        `Faltaban ${plural(mesesRestantes, 'mes', 'meses')} para el fin del contrato (una fracción de mes se cuenta como mes completo). Por cada uno se paga 1.5 sueldos (${formatSoles(input.sueldoBruto * 1.5)}).`,
      )
    }
    pasos.push(
      result.topeAplicado
        ? `El resultado supera el tope (${formatSoles(result.topeMaximo)}), así que se paga el tope.`
        : `No supera el tope máximo (${formatSoles(result.topeMaximo)}).`,
    )
    if (regimen.tratamiento === 'especial') {
      pasos.push(`Régimen ${regimen.label}: el monto es solo una referencia.`)
    }
    pasos.push(`Indemnización: ${formatSoles(result.indemnizacion)}.`)

    baseLegal.push(
      esIndefinido
        ? {
            norma: 'D.S. 003-97-TR, Art. 34 y 38',
            enSimple:
              'Si despides a un trabajador sin una causa justa que puedas probar, debes pagarle una indemnización de 1.5 sueldos por año, hasta 12 sueldos.',
          }
        : {
            norma: 'D.S. 003-97-TR, Art. 76',
            enSimple:
              'Si terminas un contrato a plazo fijo antes de tiempo y sin causa justa, pagas 1.5 sueldos por cada mes que faltaba, hasta 12 sueldos.',
          },
    )
    if (esMype) {
      baseLegal.push({
        norma: cfgMype.BASE_LEGAL,
        enSimple: `Régimen MYPE: la indemnización se cuenta en remuneraciones diarias: ${PERU_LABOR.MYPE.MICRO.INDEMNIZACION_FACTOR_DIARIO} por año en microempresa (máximo ${PERU_LABOR.MYPE.MICRO.INDEMNIZACION_TOPE_DIARIO}) y ${PERU_LABOR.MYPE.PEQUENA.INDEMNIZACION_FACTOR_DIARIO} por año en pequeña empresa (máximo ${PERU_LABOR.MYPE.PEQUENA.INDEMNIZACION_TOPE_DIARIO}).`,
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
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Datos del caso</h2>
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
                calc="indemnizacion"
                value={input.regimenLaboral}
                onChange={v => updateField('regimenLaboral', v)}
                origenTrabajador={
                  selectedWorker && normalizarRegimen(selectedWorker.regimenLaboral) === input.regimenLaboral
                    ? `${selectedWorker.firstName} ${selectedWorker.lastName}`
                    : null
                }
              />

              {/* Sueldo */}
              <div>
                <label htmlFor="indem-sueldo" className={LABEL}>
                  Remuneración mensual bruta
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)] font-semibold text-sm">S/</span>
                  <input
                    id="indem-sueldo"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={input.sueldoBruto || ''}
                    onChange={e => updateField('sueldoBruto', Number(e.target.value))}
                    placeholder="0.00"
                    className={`${INPUT} pl-10 text-lg font-semibold`}
                  />
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="indem-ingreso" className={LABEL}>
                    Fecha de ingreso
                  </label>
                  <input
                    id="indem-ingreso"
                    type="date"
                    value={input.fechaIngreso}
                    onChange={e => updateField('fechaIngreso', e.target.value)}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor="indem-despido" className={LABEL}>
                    Fecha de despido
                  </label>
                  <input
                    id="indem-despido"
                    type="date"
                    value={input.fechaDespido}
                    onChange={e => updateField('fechaDespido', e.target.value)}
                    className={INPUT}
                  />
                </div>
              </div>
              {input.fechaIngreso && input.fechaDespido && input.fechaDespido < input.fechaIngreso && (
                <p className="-mt-3 text-xs font-medium text-crimson-700" role="alert">
                  La fecha de despido no puede ser anterior a la de ingreso.
                </p>
              )}

              {/* Tipo de contrato */}
              <div>
                <label htmlFor="indem-tipo" className={LABEL}>
                  Tipo de contrato
                </label>
                <select
                  id="indem-tipo"
                  value={input.tipoContrato}
                  onChange={e => updateField('tipoContrato', e.target.value as IndemnizacionInput['tipoContrato'])}
                  className={INPUT}
                >
                  {TIPOS_CONTRATO.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {selectedWorker?.tipoContrato === 'TIEMPO_PARCIAL' && (
                  <p className="mt-1.5 text-xs text-amber-700">
                    Ojo: quien trabaja menos de 4 horas diarias no tiene derecho a indemnización por despido arbitrario.
                  </p>
                )}
              </div>

              {input.tipoContrato === 'plazo_fijo' && (
                <div>
                  <label htmlFor="indem-fin" className={LABEL}>
                    Fecha de fin del contrato
                  </label>
                  <input
                    id="indem-fin"
                    type="date"
                    value={input.fechaFinContrato || ''}
                    onChange={e => updateField('fechaFinContrato', e.target.value)}
                    className={INPUT}
                  />
                  <p className={HINT}>La fecha en que el contrato iba a terminar.</p>
                </div>
              )}

              {esMype && !esIndefinido && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-amber-800">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                  <p className="text-xs leading-relaxed">
                    Para contratos a plazo fijo el cálculo usa la regla general (1.5 sueldos por mes faltante).
                    En el régimen MYPE el monto puede ser distinto: consúltalo con tu asesor.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RESULTADO */}
        <div className="@4xl:col-span-3 space-y-6">
          {!result ? (
            <EstadoVacio titulo="Ingresa los datos del caso" faltantes={faltantes} />
          ) : (
            <>
              <AvisoRegimenEspecial regimen={input.regimenLaboral} />

              {/* Total */}
              <div className="bg-gradient-to-br from-red-700 to-red-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-white/80" />
                    <span className="text-sm font-medium text-white/90 uppercase tracking-wider">
                      Indemnización estimada
                    </span>
                  </div>
                  <span className="text-xs bg-white/15 px-2.5 py-1 rounded-full">
                    {tipoLabel} · {regimen.label}
                  </span>
                </div>
                <div className="text-4xl sm:text-5xl font-black tracking-tight mb-2 tabular-nums">
                  {formatSoles(result.indemnizacion)}
                </div>
                <p className="text-white/85 text-sm">
                  Monto bruto si el despido es sin causa justa
                  {regimen.tratamiento === 'especial' ? ' · referencial' : ''}
                </p>

                <div className="flex flex-wrap gap-2.5 mt-6">
                  <button
                    type="button"
                    onClick={descargarPdf}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-sm transition-colors border border-white/20"
                  >
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => openWhatsApp({
                      type: 'indemnizacion',
                      total: result.indemnizacion,
                      data: { tipoContrato: tipoLabel, anos: result.anosServicio },
                    })}
                    className={HERO_BTN}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Consultar abogado
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

              {result.topeAplicado && (
                <div className="flex items-start gap-3 p-4 rounded-xl border bg-amber-50 border-amber-200 text-amber-800">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold">Se aplicó el tope legal</p>
                    <p className="text-sm">
                      El cálculo superaba el máximo que permite la ley ({formatSoles(result.topeMaximo)}), así que se paga ese tope.
                    </p>
                  </div>
                </div>
              )}

              {result.legalWarning && (
                <div className="p-4 rounded-xl border bg-amber-50 border-amber-200 text-amber-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">Ojo: los jueces no siempre aplican el 1.5</p>
                      <p className="text-sm">
                        Algunos juzgados han ordenado pagar 1 sueldo (no 1.5) por cada mes faltante, o contar solo la parte
                        proporcional del último mes. Antes de pagar, consulta el criterio del juzgado que te corresponde.
                      </p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold">Ver el detalle técnico</summary>
                        <p className="mt-1 text-xs text-amber-700">{result.legalWarning}</p>
                      </details>
                    </div>
                  </div>
                </div>
              )}

              {/* Desglose */}
              <div className={`${CARD} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-[color:var(--border-subtle)]">
                  <h3 className="text-base font-bold text-[color:var(--text-primary)] flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    Desglose del cálculo
                  </h3>
                </div>
                <div className="divide-y divide-[color:var(--border-subtle)]">
                  {[
                    { label: 'Años de servicio', value: plural(result.anosServicio, 'año', 'años'), muted: false },
                    { label: 'Meses adicionales', value: plural(result.mesesFraccion, 'mes', 'meses'), muted: false },
                    { label: 'Indemnización calculada', value: formatSoles(result.indemnizacion), muted: false },
                    { label: topeLabel, value: formatSoles(result.topeMaximo), muted: true },
                  ].map(row => (
                    <div key={row.label} className="px-6 py-4 flex items-center justify-between gap-4">
                      <span className={`text-sm font-semibold ${row.muted ? 'text-[color:var(--text-tertiary)]' : 'text-[color:var(--text-primary)]'}`}>
                        {row.label}
                      </span>
                      <span className={`text-lg font-bold tabular-nums ${row.muted ? 'text-[color:var(--text-tertiary)]' : 'text-[color:var(--text-primary)]'}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <ResultadoExplicado
                resumen={resumen}
                pasos={pasos}
                baseLegal={baseLegal}
                formulaTecnica={result.formula}
                nota="La indemnización solo corresponde si el despido es sin causa justa. No incluye CTS, vacaciones ni gratificación truncas: esos montos se calculan en la Liquidación."
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
