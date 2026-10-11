'use client'

import { useState, useMemo } from 'react'
import { calcularVacaciones } from '@/lib/legal-engine/calculators/vacaciones'
import {
  PERU_LABOR,
  calcularPeriodoLaboral,
  getDiasVacacionesPorRegimen,
} from '@/lib/legal-engine/peru-labor'
import type { VacacionesInput, VacacionesResult } from '@/lib/legal-engine'
import { openWhatsApp } from '@/lib/whatsapp'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import { formatSoles } from '@/lib/format/peruvian'
import {
  Download,
  MessageCircle,
  TrendingUp,
  CalendarDays,
  Save,
  Loader2,
  Scale,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { WorkerAutoFill, type WorkerData } from './worker-autofill'
import { RegimenSelector, AvisoRegimenEspecial } from './shared/regimen-selector'
import { getRegimenInfo, normalizarRegimen } from './shared/regimen'
import { ResultadoExplicado, type BaseLegalSimple } from './shared/resultado-explicado'
import { hoyLimaIso } from './shared/fechas'
import { CARD, EstadoVacio, HERO_BTN, HINT, INPUT, LABEL } from './shared/ui'

interface VacacionesCalculadoraProps {
  /** DNI del trabajador para precargar sus datos (incluido su régimen). */
  prefillDni?: string
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export function VacacionesCalculadora({ prefillDni }: VacacionesCalculadoraProps = {}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null)
  const [input, setInput] = useState<VacacionesInput>({
    sueldoBruto: 0,
    fechaIngreso: '',
    fechaCese: '',
    diasGozados: 0,
    asignacionFamiliar: false,
    regimenLaboral: 'GENERAL',
  })

  const fechasInvertidas = !!input.fechaIngreso && !!input.fechaCese && input.fechaCese < input.fechaIngreso

  const result = useMemo<VacacionesResult | null>(() => {
    if (input.sueldoBruto <= 0 || !input.fechaIngreso || !input.fechaCese || fechasInvertidas) {
      return null
    }
    try {
      return calcularVacaciones(input)
    } catch {
      return null
    }
  }, [input, fechasInvertidas])

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

  const updateField = <K extends keyof VacacionesInput>(key: K, value: VacacionesInput[K]) => {
    setInput(prev => ({ ...prev, [key]: value }))
  }

  const regimen = getRegimenInfo(input.regimenLaboral)
  const diasPorAno = getDiasVacacionesPorRegimen(input.regimenLaboral)

  const faltantes = [
    input.sueldoBruto > 0 ? null : 'sueldo',
    input.fechaIngreso ? null : 'fecha de ingreso',
    input.fechaCese ? null : 'fecha de cese o de corte',
  ].filter((x): x is string => x !== null)

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
      toast({ title: 'Cálculo guardado', description: 'Puedes verlo en tu historial', type: 'success' })
    } catch {
      toast({ title: 'No se pudo guardar', description: 'Inténtalo de nuevo en un momento', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const breakdownItems = result
    ? [
        { key: 'truncas', label: 'Vacaciones truncas', hint: 'Por el año que no llegó a completar', amount: result.vacacionesTruncas },
        { key: 'noGozadas', label: 'Vacaciones no gozadas', hint: 'Días que ganó y no tomó', amount: result.vacacionesNoGozadas },
        { key: 'indemnizacion', label: 'Indemnización vacacional', hint: 'Una remuneración más por cada año no tomado a tiempo', amount: result.indemnizacionVacacional },
      ]
    : []

  const descargarPdf = () => {
    if (!result) return
    const items = [
      { label: 'Vacaciones truncas', amount: result.vacacionesTruncas, formula: `${result.diasTruncosComputables} días truncos computables` },
      { label: 'Vacaciones no gozadas', amount: result.vacacionesNoGozadas, formula: `${result.periodosNoGozados} periodo(s) no gozados` },
      { label: 'Indemnización vacacional', amount: result.indemnizacionVacacional, formula: 'Remuneración adicional por no gozar a tiempo' },
    ].filter(item => item.amount > 0)
    const content = calculationToHTML({
      title: 'Desglose de vacaciones',
      items,
      total: result.total,
      warnings: regimen.tratamiento === 'especial'
        ? [{ message: `Régimen ${regimen.label}: resultado referencial, consúltalo con tu asesor.` }]
        : [],
      legalRefs: [
        { norm: 'D.Leg. 713', description: 'Ley de descansos remunerados: vacaciones anuales, truncas, no gozadas e indemnización vacacional' },
      ],
      metadata: {
        'Régimen laboral': regimen.label,
        'Sueldo bruto mensual': formatSoles(input.sueldoBruto),
        'Fecha de ingreso': input.fechaIngreso,
        'Fecha de cese o corte': input.fechaCese,
        'Días de vacaciones gozados': `${input.diasGozados}`,
        'Asignación familiar': input.asignacionFamiliar ? 'Sí' : 'No',
        'Días truncos computables': `${result.diasTruncosComputables}`,
        'Periodos no gozados': `${result.periodosNoGozados}`,
        'Fórmula aplicada': result.formula,
      },
    })
    generatePDFFromHTML({
      title: 'Cálculo de vacaciones',
      filename: 'calculo-vacaciones.pdf',
      content,
      watermark: 'COMPLY360',
    })
  }

  // ── Explicación en simple ──────────────────────────────────────────────
  const pasos: string[] = []
  const baseLegal: BaseLegalSimple[] = [
    {
      norma: 'D.Leg. 713',
      enSimple:
        'Cada año completo de trabajo da derecho a 30 días de descanso pagado. Si no se toman dentro del año siguiente, se paga una remuneración más como indemnización.',
    },
  ]
  if (result) {
    const asignacion = input.asignacionFamiliar
      ? PERU_LABOR.RMV * PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE
      : 0
    const remComputable = input.sueldoBruto + asignacion
    const periodo = calcularPeriodoLaboral(input.fechaIngreso, input.fechaCese)
    pasos.push(
      `Remuneración computable: sueldo ${formatSoles(input.sueldoBruto)}` +
        (asignacion > 0 ? ` + asignación familiar ${formatSoles(asignacion)}` : '') +
        ` = ${formatSoles(remComputable)}.`,
    )
    pasos.push(
      `Tiempo de servicio: ${plural(periodo.anos, 'año', 'años')}, ${plural(periodo.meses, 'mes', 'meses')} y ${plural(periodo.dias, 'día', 'días')}. ` +
        `En este régimen corresponden ${diasPorAno} días de vacaciones por año.`,
    )
    if (result.vacacionesTruncas > 0) {
      pasos.push(
        `Vacaciones truncas: por el año incompleto se paga 1/12 de la remuneración por cada mes y 1/360 por cada día` +
          (diasPorAno > 0 && diasPorAno < 30 ? `, a la mitad porque en este régimen son ${diasPorAno} días por año` : '') +
          ` = ${formatSoles(result.vacacionesTruncas)}.`,
      )
    }
    if (result.vacacionesNoGozadas > 0) {
      const diasNoGozados = Math.max(periodo.anos * diasPorAno - input.diasGozados, 0)
      pasos.push(
        `Vacaciones no gozadas: ${plural(diasNoGozados, 'día ganado que no tomó', 'días ganados que no tomó')} = ${formatSoles(result.vacacionesNoGozadas)}.`,
      )
    }
    if (result.indemnizacionVacacional > 0) {
      pasos.push(
        `Indemnización vacacional: ${plural(result.periodosNoGozados, 'año de vacaciones no tomado', 'años de vacaciones no tomados')} × una remuneración = ${formatSoles(result.indemnizacionVacacional)}.`,
      )
    }
    if (regimen.tratamiento === 'especial') {
      pasos.push(`Régimen ${regimen.label}: el monto es solo una referencia.`)
    }
    pasos.push(`Total: ${formatSoles(result.total)}.`)
    if (regimen.key === 'MYPE_MICRO' || regimen.key === 'MYPE_PEQUENA') {
      baseLegal.push({
        norma: PERU_LABOR.MYPE.MICRO.BASE_LEGAL,
        enSimple: 'Régimen MYPE: en micro y pequeña empresa corresponden 15 días de vacaciones por año.',
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
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Datos del trabajador</h2>
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
                calc="vacaciones"
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
                <label htmlFor="vac-sueldo" className={LABEL}>
                  Sueldo bruto mensual
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)] font-semibold text-sm">S/</span>
                  <input
                    id="vac-sueldo"
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
                  <label htmlFor="vac-ingreso" className={LABEL}>
                    Fecha de ingreso
                  </label>
                  <input
                    id="vac-ingreso"
                    type="date"
                    value={input.fechaIngreso}
                    onChange={e => updateField('fechaIngreso', e.target.value)}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor="vac-cese" className={LABEL}>
                    Fecha de cese
                  </label>
                  <input
                    id="vac-cese"
                    type="date"
                    value={input.fechaCese}
                    onChange={e => updateField('fechaCese', e.target.value)}
                    className={INPUT}
                  />
                </div>
              </div>
              <div className="-mt-3">
                <p className={HINT}>Si sigue trabajando, usa la fecha de hoy para ver lo acumulado.</p>
                <button
                  type="button"
                  onClick={() => updateField('fechaCese', hoyLimaIso())}
                  className="mt-1 text-xs font-semibold text-primary hover:underline"
                >
                  Usar la fecha de hoy
                </button>
                {fechasInvertidas && (
                  <p className="mt-1 text-xs font-medium text-crimson-700" role="alert">
                    La fecha de cese no puede ser anterior a la de ingreso.
                  </p>
                )}
              </div>

              {/* Días gozados */}
              <div>
                <label htmlFor="vac-gozados" className={LABEL}>
                  Días de vacaciones que ya tomó
                </label>
                <input
                  id="vac-gozados"
                  type="number"
                  value={input.diasGozados || ''}
                  onChange={e => updateField('diasGozados', Math.max(Number(e.target.value), 0))}
                  placeholder="0"
                  min={0}
                  className={`${INPUT} text-lg font-semibold`}
                />
                <p className={HINT}>Suma de todos los días de vacaciones que tomó desde que ingresó.</p>
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
            </div>
          </div>
        </div>

        {/* RESULTADO */}
        <div className="@4xl:col-span-3 space-y-6">
          {!result ? (
            <EstadoVacio titulo="Ingresa los datos del trabajador" faltantes={faltantes} />
          ) : (
            <>
              <AvisoRegimenEspecial regimen={input.regimenLaboral} />

              {/* Total */}
              <div className="bg-gradient-to-br from-cyan-600 to-cyan-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-white/80" />
                    <span className="text-sm font-medium text-white/90 uppercase tracking-wider">
                      Total por vacaciones
                    </span>
                  </div>
                  <span className="text-xs bg-white/15 px-2.5 py-1 rounded-full">
                    {regimen.label}{diasPorAno > 0 ? ` · ${diasPorAno} días por año` : ''}
                  </span>
                </div>
                <div className="text-4xl sm:text-5xl font-black tracking-tight mb-2 tabular-nums">
                  {formatSoles(result.total)}
                </div>
                <p className="text-white/85 text-sm">
                  Vacaciones truncas, no gozadas e indemnización vacacional
                  {regimen.tratamiento === 'especial' ? ' · referencial' : ''}
                </p>

                <div className="flex flex-wrap gap-2.5 mt-6">
                  <button
                    type="button"
                    onClick={descargarPdf}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-cyan-50 text-cyan-800 rounded-xl font-bold text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => openWhatsApp({ type: 'vacaciones', total: result.total })}
                    className={HERO_BTN}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enviar por WhatsApp
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
                    Desglose
                  </h3>
                </div>

                <div className="divide-y divide-[color:var(--border-subtle)]">
                  {breakdownItems.map(item => {
                    const percentage = result.total > 0 ? (item.amount / result.total) * 100 : 0
                    return (
                      <div key={item.key} className="px-6 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{item.label}</p>
                            <p className="text-xs text-[color:var(--text-tertiary)]">{item.hint}</p>
                          </div>
                          <span className="text-lg font-bold text-[color:var(--text-primary)] tabular-nums">
                            {formatSoles(item.amount)}
                          </span>
                        </div>
                        {item.amount > 0 && (
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex-1 h-2 bg-[color:var(--neutral-100)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-[color:var(--text-tertiary)] w-12 text-right tabular-nums">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <ResultadoExplicado
                resumen={
                  diasPorAno > 0
                    ? `Por cada año completo corresponden ${diasPorAno} días pagados; por el año incompleto, la parte proporcional a los meses trabajados.`
                    : 'En este régimen la calculadora no asigna días de vacaciones; consulta con tu asesor cuánto corresponde.'
                }
                pasos={pasos}
                baseLegal={baseLegal}
                formulaTecnica={result.formula}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
