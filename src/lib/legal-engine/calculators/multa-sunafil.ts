import {
  PERU_LABOR,
  calcularMultaSunafil as calcularMultaSunafilGranular,
} from '../peru-labor'
import { money } from '../money'

// =============================================
// MULTA SUNAFIL - Cálculo de multas laborales
// D.S. 019-2006-TR y modificatorias
// =============================================

// =============================================
// Types (inline - specific to SUNAFIL)
// =============================================

export type RegimenMype = 'GENERAL' | 'MICROEMPRESA' | 'PEQUEÑA_EMPRESA'

export interface MultaSunafilInput {
  tipoInfraccion: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  numeroTrabajadores: number
  reincidente: boolean
  /** Subsanación voluntaria ANTES de la inspección — 90% de descuento (Art. 40 Ley 28806) */
  subsanacionVoluntaria: boolean
  /** Subsanación DURANTE la inspección (plazo otorgado) — 70% de descuento */
  subsanacionDuranteInspeccion?: boolean
  regimenMype?: RegimenMype  // MYPE benefit: escala propia de rangos
}

export interface MultaSunafilResult {
  multaMinima: number
  multaMaxima: number
  multaEstimada: number
  /** Multa con descuento aplicado (voluntaria 90% o durante inspección 70%) */
  multaConDescuento: number | null
  /** Tipo de descuento aplicado para que la UI muestre el porcentaje real */
  descuentoTipo: 'voluntaria_90' | 'durante_inspeccion_70' | null
  /** Indicador nominal del régimen MYPE: 0.5 para Microempresa, 0.25 para Pequeña Empresa, null para General */
  mypeDescuento: number | null
  factorGravedad: number
  enUITs: { min: number; max: number; estimada: number }
  formula: string
  baseLegal: string
  recomendaciones: string[]
  regimenLabel: string
}

// =============================================
// Calculator
// =============================================

// Mapeo del régimen del caller al nombre usado en PERU_LABOR.MULTAS_SUNAFIL.ESCALA
const ESCALA_KEY: Record<RegimenMype, 'MICRO' | 'PEQUENA' | 'NO_MYPE'> = {
  GENERAL: 'NO_MYPE',
  PEQUEÑA_EMPRESA: 'PEQUENA',
  MICROEMPRESA: 'MICRO',
}

const MYPE_LABELS: Record<RegimenMype, string> = {
  GENERAL: 'Regimen General / Mediana-Gran Empresa',
  PEQUEÑA_EMPRESA: 'Pequeña Empresa (Ley 30056)',
  MICROEMPRESA: 'Microempresa (D.Leg. 1086)',
}

// Indicador nominal del beneficio MYPE (no es un multiplicador exacto; las escalas son independientes)
const MYPE_DESCUENTO: Record<RegimenMype, number | null> = {
  GENERAL: null,
  PEQUEÑA_EMPRESA: 0.25,
  MICROEMPRESA: 0.50,
}

/**
 * FIX #2.B: reconciliación de los dos motores de multa SUNAFIL.
 *
 * Antes esta función usaba interpolación lineal entre `rango.min` y `rango.max`
 * según un "factor de gravedad" derivado del número de trabajadores. Eso NO
 * respeta la escala oficial del D.S. 019-2006-TR, que define **10 tramos
 * discretos** por número de trabajadores afectados (no interpolación).
 *
 * Diferencia documentada en el audit:
 *   GRAVE × 75 trabajadores en NO_MYPE
 *     - granular oficial: 10.51 UIT (S/ 57,805)
 *     - interpolada: ~33.42 UIT (S/ 183,810)
 *     - delta: S/ 126,005
 *
 * Ahora delegamos al motor granular `calcularMultaSunafilGranular()` que
 * existe en peru-labor.ts (los tramos están en `PERU_LABOR.MULTAS_SUNAFIL.
 * ESCALA_GRANULAR`). Mantenemos el mismo shape de input/output para no
 * romper callers (UI, AI, reports).
 */
export function calcularMultaSunafil(input: MultaSunafilInput): MultaSunafilResult {
  const config = PERU_LABOR.MULTAS_SUNAFIL
  const uit = PERU_LABOR.UIT
  const regimen: RegimenMype = input.regimenMype || 'GENERAL'
  const escalaKey = ESCALA_KEY[regimen]

  // Rango oficial (min/max del tipo de infracción) — para UI informativa
  const rango = config.ESCALA[escalaKey][input.tipoInfraccion]
  const rangoMin = rango.min
  const rangoMax = rango.max

  // Motor granular: devuelve UITs ya con reincidencia + descuento aplicados.
  // Calculamos en 3 pasos para poder reportar cada componente:
  const multaBaseUit = calcularMultaSunafilGranular(
    escalaKey,
    input.tipoInfraccion,
    input.numeroTrabajadores,
    false, // sin reincidencia
    null,  // sin descuento
  )
  const multaConReincidenciaUit = calcularMultaSunafilGranular(
    escalaKey,
    input.tipoInfraccion,
    input.numeroTrabajadores,
    input.reincidente,
    null,
  )
  const subsanacion: 'VOLUNTARIA' | 'DURANTE_INSPECCION' | null =
    input.subsanacionVoluntaria ? 'VOLUNTARIA'
    : input.subsanacionDuranteInspeccion ? 'DURANTE_INSPECCION'
    : null

  // Conversión a soles + tope absoluto (52.53 UIT) — FIX #2.A.
  const uitM = money(uit)
  const multaMinima = uitM.mul(rangoMin).toNumber()
  const multaMaxima = uitM.mul(rangoMax).toNumber()
  const topeSoles = config.TOPE_MAXIMO_UIT * uit
  const multaEstimada = Math.min(uitM.mul(multaConReincidenciaUit).toNumber(), topeSoles)

  // Multa con descuento — aplicamos el % en soles para evitar pérdida de
  // precisión por redondeo intermedio en UITs.
  let multaConDescuento: number | null = null
  let descuentoTipo: MultaSunafilResult['descuentoTipo'] = null
  if (subsanacion === 'VOLUNTARIA') {
    const factor = 1 - config.DESCUENTOS.SUBSANACION_VOLUNTARIA
    multaConDescuento = Math.min(money(multaEstimada).mul(factor).toNumber(), topeSoles)
    descuentoTipo = 'voluntaria_90'
  } else if (subsanacion === 'DURANTE_INSPECCION') {
    const factor = 1 - config.DESCUENTOS.SUBSANACION_DURANTE_INSPECCION
    multaConDescuento = Math.min(money(multaEstimada).mul(factor).toNumber(), topeSoles)
    descuentoTipo = 'durante_inspeccion_70'
  }

  // UITs de referencia (para UI)
  const enUITs = {
    min: rangoMin,
    max: rangoMax,
    estimada: Math.round((multaEstimada / uit) * 100) / 100,
  }

  // Tipo y régimen labels
  const tipoLabel = input.tipoInfraccion === 'LEVE' ? 'Leve'
    : input.tipoInfraccion === 'GRAVE' ? 'Grave' : 'Muy Grave'

  const regimenNote = regimen !== 'GENERAL'
    ? ` [${MYPE_LABELS[regimen]}: escala propia ${rangoMin}-${rangoMax} UITs]`
    : ''

  const descuentoNote = descuentoTipo === 'voluntaria_90'
    ? `. Con subsanación voluntaria antes de inspección (-90% Art. 40 Ley 28806): ${fmt(multaConDescuento!)}`
    : descuentoTipo === 'durante_inspeccion_70'
    ? `. Con subsanación durante inspección (-70%): ${fmt(multaConDescuento!)}`
    : ''

  const formula =
    `Infracción ${tipoLabel} con ${input.numeroTrabajadores} trabajador(es).${regimenNote} ` +
    `Rango oficial: ${rangoMin}-${rangoMax} UITs. ` +
    `Tramo aplicable (D.S. 019-2006-TR escala granular): ${multaBaseUit} UITs. ` +
    `Multa: ${multaBaseUit} UIT × ${fmt(uit)} = ${fmt(multaBaseUit * uit)}` +
    (input.reincidente ? `. Con reincidencia +50%: ${fmt(multaEstimada)}` : '') +
    descuentoNote + '.'

  // factorGravedad ya no aplica con tramos discretos. Devolvemos posición
  // dentro del rango como aproximación para que la UI no rompa.
  const factorGravedad = rangoMax > rangoMin
    ? (multaBaseUit - rangoMin) / (rangoMax - rangoMin)
    : 0

  const recomendaciones = generarRecomendaciones(input, multaEstimada, multaConDescuento, regimen)

  return {
    multaMinima,
    multaMaxima,
    multaEstimada,
    multaConDescuento,
    descuentoTipo,
    mypeDescuento: MYPE_DESCUENTO[regimen],
    factorGravedad: Math.round(factorGravedad * 1000) / 1000,
    enUITs,
    formula,
    baseLegal: config.BASE_LEGAL,
    recomendaciones,
    regimenLabel: MYPE_LABELS[regimen],
  }
}

// FIX #2.B: `calcularFactorPorTrabajadores` ELIMINADA. Era la fuente del bug —
// interpolación lineal entre rangos cuando la norma define 10 tramos discretos.
// El motor granular en peru-labor.ts es ahora la fuente única de verdad.

// =============================================
// Recomendaciones legales
// =============================================
function generarRecomendaciones(
  input: MultaSunafilInput,
  multaEstimada: number,
  multaConDescuento: number | null,
  regimen: RegimenMype = 'GENERAL'
): string[] {
  const recomendaciones: string[] = []

  // Recomendar subsanación según el estado actual (Art. 40 Ley 28806)
  if (!input.subsanacionVoluntaria && !input.subsanacionDuranteInspeccion) {
    const ahorro = Math.round(multaEstimada * PERU_LABOR.MULTAS_SUNAFIL.DESCUENTOS.SUBSANACION_VOLUNTARIA * 100) / 100
    recomendaciones.push(
      `Subsane la infracción ANTES de la inspección para obtener el descuento del 90% (Art. 40 Ley 28806). ` +
      `Ahorro estimado: ${fmt(ahorro)}.`
    )
    recomendaciones.push(
      `Alternativa: si subsana DURANTE la inspección (dentro del plazo otorgado por el inspector), ` +
      `puede obtener hasta 70% de descuento.`
    )
  } else if (input.subsanacionVoluntaria) {
    recomendaciones.push(
      `Se ha aplicado el descuento del 90% por subsanación voluntaria antes de inspección (Art. 40 Ley 28806). ` +
      `Multa reducida: ${fmt(multaConDescuento!)}.`
    )
  } else if (input.subsanacionDuranteInspeccion) {
    recomendaciones.push(
      `Se ha aplicado el descuento del 70% por subsanación durante la inspección. ` +
      `Multa reducida: ${fmt(multaConDescuento!)}.`
    )
  }

  // Reincidencia
  if (input.reincidente) {
    recomendaciones.push(
      'La condición de reincidente incrementa la multa en un 50%. ' +
      'Implemente un plan de cumplimiento laboral para evitar futuras infracciones.'
    )
  }

  // Según tipo de infracción
  if (input.tipoInfraccion === 'MUY_GRAVE') {
    recomendaciones.push(
      'Las infracciones muy graves pueden acarrear responsabilidad penal en casos de trabajo forzoso, ' +
      'discriminación o violación de derechos fundamentales. Consulte con un abogado penalista.'
    )
    recomendaciones.push(
      'Considere solicitar un fraccionamiento de pago si el monto de la multa compromete la viabilidad económica de la empresa.'
    )
  } else if (input.tipoInfraccion === 'GRAVE') {
    recomendaciones.push(
      'Corrija la infracción de inmediato y documente las medidas adoptadas. ' +
      'SUNAFIL verificará el cumplimiento en inspección posterior.'
    )
  } else {
    recomendaciones.push(
      'Las infracciones leves pueden subsanarse durante la diligencia inspectiva. ' +
      'Tenga la documentación laboral actualizada y a disposición del inspector.'
    )
  }

  // MYPE recommendation — ahora con escala real, no factor
  if (regimen === 'MICROEMPRESA') {
    recomendaciones.push(
      'Como Microempresa inscrita en el REMYPE, aplica la escala reducida del D.S. 008-2020-TR ' +
      '(ej: infracción leve 0.045-0.45 UIT). Mantenga su inscripción vigente en el REMYPE del MTPE.'
    )
  } else if (regimen === 'PEQUEÑA_EMPRESA') {
    recomendaciones.push(
      'Como Pequeña Empresa inscrita en el REMYPE, aplica la escala reducida del D.S. 008-2020-TR ' +
      '(ej: infracción leve 0.09-1.13 UIT). Verifique que su inscripción en el REMYPE esté vigente.'
    )
  }

  // Recomendación general por número de trabajadores
  if (input.numeroTrabajadores > 50) {
    recomendaciones.push(
      'Con más de 50 trabajadores, se recomienda implementar un Comité de Seguridad y Salud en el Trabajo ' +
      'y un Sistema de Gestión de SST conforme a la Ley 29783.'
    )
  }

  recomendaciones.push(
    'Plazo para impugnar: 15 días hábiles desde la notificación del acta de infracción ' +
    '(recurso de apelación ante el Tribunal de Fiscalización Laboral).'
  )

  return recomendaciones
}

// Format helper
function fmt(n: number): string {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
