'use client'

import { useState, useMemo } from 'react'
import { calcularGratificacion } from '@/lib/legal-engine/calculators/gratificacion'
import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'
import { openWhatsApp } from '@/lib/whatsapp'
import type { GratificacionInput, GratificacionResult } from '@/lib/legal-engine'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import { formatSoles } from '@/lib/format/peruvian'
import {
  Download,
  MessageCircle,
  TrendingUp,
  Gift,
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
  etiquetaGratificacion,
  mesesCompletosSemestreGrati,
  opcionesGratificacion,
  pagoGratiValue,
  parsePagoGrati,
  proximaGratificacion,
  semestreGratificacion,
  type PagoGrati,
} from './shared/fechas'
import { CARD, EstadoVacio, HERO_BTN, HINT, INPUT, LABEL } from './shared/ui'

interface GratificacionCalculadoraProps {
  /** DNI del trabajador para precargar sus datos (incluido su régimen). */
  prefillDni?: string
}

export function GratificacionCalculadora({ prefillDni }: GratificacionCalculadoraProps = {}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null)
  // Por defecto, el PRÓXIMO pago (julio o diciembre) según la fecha de hoy.
  const [opcionesPago] = useState(() => opcionesGratificacion())
  const [pago, setPago] = useState<PagoGrati>(() => proximaGratificacion())
  // Si el usuario escribe los meses a mano, no los recalculamos solos.
  const [mesesManual, setMesesManual] = useState(false)
  const [input, setInput] = useState<GratificacionInput>(() => ({
    sueldoBruto: 0,
    fechaIngreso: '',
    periodo: proximaGratificacion().periodo,
    mesesTrabajados: 6,
    asignacionFamiliar: false,
    regimenLaboral: 'GENERAL',
  }))

  const mesesSegunIngreso = (fecha: string, p: PagoGrati, actual: number) =>
    fecha ? (mesesCompletosSemestreGrati(fecha, p) ?? actual) : actual

  function handleWorkerSelect(w: WorkerData | null) {
    setSelectedWorker(w)
    if (w) {
      setInput(prev => ({
        ...prev,
        sueldoBruto: w.sueldoBruto,
        fechaIngreso: w.fechaIngreso,
        asignacionFamiliar: w.asignacionFamiliar,
        regimenLaboral: normalizarRegimen(w.regimenLaboral),
        mesesTrabajados: mesesManual ? prev.mesesTrabajados : mesesSegunIngreso(w.fechaIngreso, pago, prev.mesesTrabajados),
      }))
    }
  }

  function handleFechaIngreso(fecha: string) {
    setInput(prev => ({
      ...prev,
      fechaIngreso: fecha,
      mesesTrabajados: mesesManual ? prev.mesesTrabajados : mesesSegunIngreso(fecha, pago, prev.mesesTrabajados),
    }))
  }

  function handlePago(value: string) {
    const nuevo = parsePagoGrati(value)
    if (!nuevo) return
    setPago(nuevo)
    setInput(prev => ({
      ...prev,
      periodo: nuevo.periodo,
      mesesTrabajados: mesesManual ? prev.mesesTrabajados : mesesSegunIngreso(prev.fechaIngreso, nuevo, prev.mesesTrabajados),
    }))
  }

  function usarMesesSegunIngreso() {
    setMesesManual(false)
    setInput(prev => ({ ...prev, mesesTrabajados: mesesSegunIngreso(prev.fechaIngreso, pago, prev.mesesTrabajados) }))
  }

  const updateField = <K extends keyof GratificacionInput>(key: K, value: GratificacionInput[K]) => {
    setInput(prev => ({ ...prev, [key]: value }))
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

  const regimen = getRegimenInfo(input.regimenLaboral)
  const asignacion = input.asignacionFamiliar
    ? PERU_LABOR.RMV * PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE
    : 0
  const pagoLabel = etiquetaGratificacion(pago)
  const semestre = semestreGratificacion(pago)
  const mesesSugeridos = input.fechaIngreso ? mesesCompletosSemestreGrati(input.fechaIngreso, pago) : null
  const sinDerechoEnSemestre = mesesSugeridos === 0 && !mesesManual

  const faltantes = [
    input.sueldoBruto > 0 ? null : 'sueldo',
    input.fechaIngreso ? null : 'fecha de ingreso',
    input.mesesTrabajados > 0 ? null : 'meses trabajados',
  ].filter((x): x is string => x !== null)

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
      title: 'Desglose de la gratificación',
      items: [
        {
          label: 'Gratificación bruta',
          amount: result.gratificacionBruta,
          formula: input.mesesTrabajados >= 6
            ? 'Remuneración computable completa'
            : `Proporcional: ${input.mesesTrabajados}/6 de la remuneración`,
        },
        { label: 'Bonificación extraordinaria 9%', amount: result.bonificacionExtraordinaria, formula: 'Gratificación bruta x 9% (Ley 30334)', baseLegal: 'Ley 30334' },
      ],
      total: result.totalNeto,
      warnings: regimen.tratamiento === 'especial'
        ? [{ message: `Régimen ${regimen.label}: resultado referencial, consúltalo con tu asesor.` }]
        : [],
      legalRefs: [
        { norm: 'Ley 27735', description: 'Ley que regula el otorgamiento de las gratificaciones por Fiestas Patrias y Navidad' },
        { norm: 'Ley 30334', description: 'Gratificaciones inafectas a aportes de EsSalud; ese aporte se paga al trabajador como bonificación extraordinaria' },
      ],
      metadata: {
        'Régimen laboral': regimen.label,
        'Sueldo bruto': formatSoles(input.sueldoBruto),
        'Fecha de ingreso': input.fechaIngreso,
        'Pago': `${pagoLabel} (semestre ${semestre})`,
        'Meses completos en el semestre': `${input.mesesTrabajados}`,
        'Asignación familiar': input.asignacionFamiliar ? 'Sí' : 'No',
        'Fórmula aplicada': result.formula,
      },
    })
    generatePDFFromHTML({
      title: `Cálculo de gratificación - ${pagoLabel}`,
      filename: 'calculo-gratificacion.pdf',
      content,
      watermark: 'COMPLY360',
    })
  }

  // ── Explicación en simple ──────────────────────────────────────────────
  const pasos: string[] = []
  const baseLegal: BaseLegalSimple[] = [
    {
      norma: 'Ley 27735',
      enSimple:
        'Los trabajadores reciben dos gratificaciones al año: en julio (Fiestas Patrias) y en diciembre (Navidad). Solo cuentan los meses completos trabajados en el semestre.',
    },
    {
      norma: 'Ley 30334',
      enSimple:
        'La gratificación no paga aporte a EsSalud; ese 9% se le entrega al trabajador como bonificación extraordinaria.',
    },
  ]
  if (result) {
    const remComputable = input.sueldoBruto + asignacion
    pasos.push(
      `Remuneración computable: sueldo ${formatSoles(input.sueldoBruto)}` +
        (asignacion > 0 ? ` + asignación familiar ${formatSoles(asignacion)}` : '') +
        ` = ${formatSoles(remComputable)}.`,
    )
    pasos.push(
      input.mesesTrabajados >= 6
        ? `Trabajó el semestre completo (${semestre}): le corresponde una remuneración completa.`
        : `Trabajó ${input.mesesTrabajados} de 6 meses completos del semestre (${semestre}): le corresponde ${input.mesesTrabajados}/6 de la remuneración, es decir ${formatSoles((remComputable / 6) * input.mesesTrabajados)}.`,
    )
    if (regimen.key === 'MYPE_MICRO') {
      pasos.push('Como es microempresa, no corresponde gratificación: el monto final es cero.')
    } else if (regimen.key === 'MYPE_PEQUENA') {
      pasos.push(`Como es pequeña empresa, se paga la mitad: ${formatSoles(result.gratificacionBruta)}.`)
    } else if (regimen.tratamiento === 'especial') {
      pasos.push(`Régimen ${regimen.label}: el monto se calculó con las reglas generales y es solo una referencia.`)
    }
    pasos.push(
      `Además se paga una bonificación extraordinaria del 9% (${formatSoles(result.bonificacionExtraordinaria)}): es lo que el empleador habría aportado a EsSalud.`,
    )
    pasos.push(
      `Total a pagar: ${formatSoles(result.totalNeto)}, hasta el 15 de ${pago.periodo} de ${pago.anio}.`,
    )
    if (regimen.key === 'MYPE_MICRO' || regimen.key === 'MYPE_PEQUENA') {
      baseLegal.push({
        norma: PERU_LABOR.MYPE.MICRO.BASE_LEGAL,
        enSimple:
          'Régimen MYPE: la microempresa no paga gratificación y la pequeña empresa paga medio sueldo en julio y medio en diciembre.',
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
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Datos para la gratificación</h2>
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
                calc="gratificacion"
                value={input.regimenLaboral}
                onChange={v => updateField('regimenLaboral', v)}
                origenTrabajador={
                  selectedWorker && normalizarRegimen(selectedWorker.regimenLaboral) === input.regimenLaboral
                    ? `${selectedWorker.firstName} ${selectedWorker.lastName}`
                    : null
                }
              />

              {/* Pago */}
              <div>
                <label htmlFor="grati-pago" className={LABEL}>
                  ¿Qué gratificación quieres calcular?
                </label>
                <select
                  id="grati-pago"
                  value={pagoGratiValue(pago)}
                  onChange={e => handlePago(e.target.value)}
                  className={INPUT}
                >
                  {opcionesPago.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className={HINT}>Cubre los meses de {semestre}. Se paga hasta el 15 de {pago.periodo}.</p>
              </div>

              {/* Sueldo */}
              <div>
                <label htmlFor="grati-sueldo" className={LABEL}>
                  Sueldo bruto mensual
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)] font-semibold text-sm">S/</span>
                  <input
                    id="grati-sueldo"
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

              {/* Fecha de ingreso */}
              <div>
                <label htmlFor="grati-ingreso" className={LABEL}>
                  Fecha de ingreso
                </label>
                <input
                  id="grati-ingreso"
                  type="date"
                  value={input.fechaIngreso}
                  onChange={e => handleFechaIngreso(e.target.value)}
                  className={INPUT}
                />
              </div>

              {/* Meses trabajados */}
              <div>
                <label htmlFor="grati-meses" className={LABEL}>
                  Meses completos trabajados en el semestre
                </label>
                <input
                  id="grati-meses"
                  type="number"
                  min={0}
                  max={6}
                  value={input.mesesTrabajados || ''}
                  onChange={e => {
                    setMesesManual(true)
                    updateField('mesesTrabajados', Math.min(Math.max(Number(e.target.value), 0), 6))
                  }}
                  placeholder="6"
                  className={`${INPUT} text-lg font-semibold`}
                />
                <p className={HINT}>
                  De 0 a 6. Solo cuentan los meses calendario completos (si entró el 10 de marzo, marzo no cuenta).
                </p>
                {mesesSugeridos !== null && mesesManual && mesesSugeridos !== input.mesesTrabajados && (
                  <button
                    type="button"
                    onClick={usarMesesSegunIngreso}
                    className="mt-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    Usar {mesesSugeridos} {mesesSugeridos === 1 ? 'mes' : 'meses'} según la fecha de ingreso
                  </button>
                )}
                {mesesSugeridos !== null && !mesesManual && (
                  <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                    Calculado con la fecha de ingreso, suponiendo que sigue trabajando hasta fin de {pago.periodo === 'julio' ? 'junio' : 'diciembre'}.
                  </p>
                )}
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
            sinDerechoEnSemestre ? (
              <div className={`${CARD} p-8 text-center`}>
                <CalendarClock className="w-8 h-8 text-[color:var(--text-tertiary)] mx-auto mb-3" aria-hidden />
                <h3 className="text-base font-semibold text-[color:var(--text-primary)]">
                  No le corresponde esta gratificación
                </h3>
                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                  Con esa fecha de ingreso no completa ningún mes en el semestre de {semestre}. Elige la gratificación siguiente.
                </p>
              </div>
            ) : (
              <EstadoVacio titulo="Ingresa los datos del trabajador" faltantes={faltantes} />
            )
          ) : (
            <>
              <AvisoRegimenEspecial regimen={input.regimenLaboral} />

              {/* Total */}
              <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-white/80" />
                    <span className="text-sm font-medium text-white/90 uppercase tracking-wider">
                      Gratificación a pagar
                    </span>
                  </div>
                  <span className="text-xs bg-white/15 px-2.5 py-1 rounded-full">
                    {regimen.label}
                  </span>
                </div>
                <div className="text-4xl sm:text-5xl font-black tracking-tight mb-2 tabular-nums">
                  {formatSoles(result.totalNeto)}
                </div>
                <p className="text-white/85 text-sm">
                  {pagoLabel} · incluye la bonificación extraordinaria del 9%
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
                      type: 'gratificacion',
                      total: result.totalNeto,
                      data: { periodo: pagoLabel },
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
                  <div className="px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--text-primary)]">Gratificación</p>
                      <p className="text-xs text-[color:var(--text-tertiary)]">
                        {input.mesesTrabajados >= 6
                          ? 'Remuneración completa por el semestre'
                          : `Proporcional: ${input.mesesTrabajados}/6 de la remuneración`}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-[color:var(--text-primary)] tabular-nums">
                      {formatSoles(result.gratificacionBruta)}
                    </span>
                  </div>
                  <div className="px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--text-primary)]">Bonificación extraordinaria (9%)</p>
                      <p className="text-xs text-[color:var(--text-tertiary)]">Equivale al aporte a EsSalud que no se paga (Ley 30334)</p>
                    </div>
                    <span className="text-lg font-bold text-[color:var(--text-primary)] tabular-nums">
                      {formatSoles(result.bonificacionExtraordinaria)}
                    </span>
                  </div>
                  <div className="px-6 py-4 flex items-center justify-between gap-4 bg-[color:var(--bg-inset)]">
                    <div>
                      <p className="text-sm font-bold text-[color:var(--text-primary)]">Total a pagar</p>
                      <p className="text-xs text-[color:var(--text-tertiary)]">Antes del descuento de AFP/ONP</p>
                    </div>
                    <span className="text-lg font-black text-[color:var(--text-primary)] tabular-nums">
                      {formatSoles(result.totalNeto)}
                    </span>
                  </div>
                </div>
              </div>

              <ResultadoExplicado
                resumen="Un sueldo por semestre completo (o la parte de los meses trabajados), más 9% de bonificación."
                pasos={pasos}
                baseLegal={baseLegal}
                formulaTecnica={result.formula}
                nota="A la gratificación sí se le descuenta el aporte a la AFP u ONP (a la bonificación del 9%, no). Si el trabajador gana lo suficiente para pagar impuesto a la renta, también se retiene renta de quinta categoría. Si está afiliado a una EPS, la bonificación es de 6.75% en vez de 9%."
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
