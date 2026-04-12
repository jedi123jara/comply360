import {
  PERU_LABOR,
} from '../peru-labor'

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

export function calcularMultaSunafil(input: MultaSunafilInput): MultaSunafilResult {
  const config = PERU_LABOR.MULTAS_SUNAFIL
  const uit = PERU_LABOR.UIT
  const regimen: RegimenMype = input.regimenMype || 'GENERAL'
  const escalaKey = ESCALA_KEY[regimen]

  // 1. Rango de UITs directo de la tabla oficial por tipo de empresa
  //    (NO aplicamos un factor porcentual sobre NO_MYPE; los rangos son independientes)
  const rango = config.ESCALA[escalaKey][input.tipoInfraccion]
  const rangoMin = rango.min
  const rangoMax = rango.max

  // 2. Factor de gravedad por número de trabajadores (interpolación dentro del rango)
  const factorGravedad = calcularFactorPorTrabajadores(input.numeroTrabajadores)

  // 3. Multa estimada en UITs
  const multaEstimadaUITs = rangoMin + (rangoMax - rangoMin) * factorGravedad
  const multaEstimadaUITsRedondeada = Math.round(multaEstimadaUITs * 100) / 100

  // 4. Tope máximo
  const multaEstimadaUITsFinal = Math.min(multaEstimadaUITsRedondeada, config.TOPE_MAXIMO_UIT)

  // 5. Convertir a soles
  const multaMinima = Math.round(rangoMin * uit * 100) / 100
  const multaMaxima = Math.round(rangoMax * uit * 100) / 100
  let multaEstimada = Math.round(multaEstimadaUITsFinal * uit * 100) / 100

  // 6. Reincidencia: +50% (Art. 40 Ley 28806)
  if (input.reincidente) {
    multaEstimada = Math.round(multaEstimada * (1 + config.RECARGO_REINCIDENCIA) * 100) / 100
    const topeSoles = config.TOPE_MAXIMO_UIT * uit
    if (multaEstimada > topeSoles) multaEstimada = topeSoles
  }

  // 7. Descuentos por subsanación (Art. 40 Ley 28806)
  //    - Voluntaria antes de inspección:  -90% (prevalece si ambos flags = true)
  //    - Durante inspección:              -70%
  let multaConDescuento: number | null = null
  let descuentoTipo: MultaSunafilResult['descuentoTipo'] = null
  if (input.subsanacionVoluntaria) {
    multaConDescuento = Math.round(
      multaEstimada * (1 - config.DESCUENTOS.SUBSANACION_VOLUNTARIA) * 100
    ) / 100
    descuentoTipo = 'voluntaria_90'
  } else if (input.subsanacionDuranteInspeccion) {
    multaConDescuento = Math.round(
      multaEstimada * (1 - config.DESCUENTOS.SUBSANACION_DURANTE_INSPECCION) * 100
    ) / 100
    descuentoTipo = 'durante_inspeccion_70'
  }

  // 8. UITs de referencia (para UI)
  const enUITs = {
    min: rangoMin,
    max: rangoMax,
    estimada: Math.round((multaEstimada / uit) * 100) / 100,
  }

  // 9. Fórmula descriptiva
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
    `Rango: ${rangoMin} - ${rangoMax} UITs. ` +
    `Factor de gravedad: ${(factorGravedad * 100).toFixed(1)}% del rango. ` +
    `Multa estimada: ${multaEstimadaUITsFinal} UITs × ${fmt(uit)} (UIT) = ${fmt(multaEstimada)}` +
    (input.reincidente ? '. Reincidencia: +50% aplicado' : '') +
    descuentoNote + '.'

  // 10. Recomendaciones
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

// =============================================
// Factor de gravedad por número de trabajadores
// =============================================
function calcularFactorPorTrabajadores(numTrabajadores: number): number {
  if (numTrabajadores <= 0) return 0

  if (numTrabajadores <= 10) {
    // 1-10 → factor 0.00 a 0.25
    return (numTrabajadores / 10) * 0.25
  } else if (numTrabajadores <= 50) {
    // 11-50 → factor 0.25 a 0.50
    return 0.25 + ((numTrabajadores - 10) / 40) * 0.25
  } else if (numTrabajadores <= 100) {
    // 51-100 → factor 0.50 to 0.75
    return 0.50 + ((numTrabajadores - 50) / 50) * 0.25
  } else {
    // 100+ → factor 0.75 to 1.00 (capped at 200 workers for scaling)
    const exceso = Math.min(numTrabajadores - 100, 100)
    return 0.75 + (exceso / 100) * 0.25
  }
}

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
