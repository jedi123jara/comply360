import { IndemnizacionInput, IndemnizacionResult } from '../types'
import {
  PERU_LABOR,
  calcularPeriodoLaboral,
  calcularRemuneracionComputable,
} from '../peru-labor'

// =============================================
// INDEMNIZACIÓN POR DESPIDO ARBITRARIO
// D.S. 003-97-TR (TUO Ley de Productividad
// y Competitividad Laboral)
// =============================================

export function calcularIndemnizacion(input: IndemnizacionInput): IndemnizacionResult {
  const remComputable = calcularRemuneracionComputable(input.sueldoBruto, false)

  if (input.tipoContrato === 'indefinido') {
    return calcularIndemnizacionIndefinido(input, remComputable)
  } else {
    return calcularIndemnizacionPlazoFijo(input, remComputable)
  }
}

// =============================================
// Contrato a plazo indefinido
// 1.5 sueldos × año + fracción proporcional
// Tope: 12 sueldos
// =============================================
function calcularIndemnizacionIndefinido(
  input: IndemnizacionInput,
  remComputable: number
): IndemnizacionResult {
  const config = PERU_LABOR.INDEMNIZACION.INDEFINIDO
  const periodo = calcularPeriodoLaboral(input.fechaIngreso, input.fechaDespido)

  const anosServicio = periodo.anos
  const mesesFraccion = periodo.meses

  // Indemnización = 1.5 sueldos × años completos
  let indemnizacion = config.FACTOR_POR_ANO * remComputable * anosServicio

  // Fracción proporcional por meses (mínimo 1 mes para que aplique)
  if (mesesFraccion >= config.FRACCION_MINIMA_MESES) {
    indemnizacion += (config.FACTOR_POR_ANO * remComputable / 12) * mesesFraccion
  }

  // Fracción proporcional por días
  if (periodo.dias > 0) {
    indemnizacion += (config.FACTOR_POR_ANO * remComputable / 360) * periodo.dias
  }

  indemnizacion = Math.round(indemnizacion * 100) / 100

  // Tope: 12 remuneraciones
  const topeMaximo = Math.round(config.TOPE_SUELDOS * remComputable * 100) / 100
  const topeAplicado = indemnizacion > topeMaximo
  if (topeAplicado) {
    indemnizacion = topeMaximo
  }

  // Fórmula descriptiva
  const partes: string[] = []
  if (anosServicio > 0) {
    partes.push(`${config.FACTOR_POR_ANO} × ${fmt(remComputable)} × ${anosServicio} año(s)`)
  }
  if (mesesFraccion >= config.FRACCION_MINIMA_MESES) {
    partes.push(`(${config.FACTOR_POR_ANO} × ${fmt(remComputable)} / 12) × ${mesesFraccion} mes(es)`)
  }
  if (periodo.dias > 0) {
    partes.push(`(${config.FACTOR_POR_ANO} × ${fmt(remComputable)} / 360) × ${periodo.dias} día(s)`)
  }

  const formula =
    `Indemnización (indefinido) = ${partes.join(' + ')} = ${fmt(indemnizacion)}` +
    (topeAplicado ? `. TOPE APLICADO: máximo ${config.TOPE_SUELDOS} remuneraciones = ${fmt(topeMaximo)}` : '') +
    `. Tiempo de servicio: ${anosServicio} año(s), ${mesesFraccion} mes(es) y ${periodo.dias} día(s).`

  return {
    anosServicio,
    mesesFraccion,
    indemnizacion,
    topeAplicado,
    topeMaximo,
    formula,
    baseLegal: config.BASE_LEGAL,
  }
}

// =============================================
// Contrato a plazo fijo
// Art. 76 D.S. 003-97-TR: "una remuneración y media ordinaria mensual
// por cada mes dejado de laborar hasta el vencimiento del contrato"
// Fórmula: 1.5 × rem × meses restantes
// Tope: 12 remuneraciones
// =============================================
function calcularIndemnizacionPlazoFijo(
  input: IndemnizacionInput,
  remComputable: number
): IndemnizacionResult {
  const config = PERU_LABOR.INDEMNIZACION.PLAZO_FIJO
  const periodo = calcularPeriodoLaboral(input.fechaIngreso, input.fechaDespido)

  const anosServicio = periodo.anos
  const mesesFraccion = periodo.meses

  // Calcular meses restantes hasta fin de contrato
  if (!input.fechaFinContrato) {
    throw new Error('Para contratos a plazo fijo, se requiere la fecha de fin de contrato (fechaFinContrato).')
  }

  const periodoRestante = calcularPeriodoLaboral(input.fechaDespido, input.fechaFinContrato)
  const mesesRestantes = periodoRestante.totalMeses + (periodoRestante.dias > 0 ? 1 : 0)

  // Indemnización = 1.5 × remuneración × meses restantes (Art. 76 D.S. 003-97-TR)
  // "una remuneración y media ordinaria mensual por cada mes dejado de laborar"
  let indemnizacion = Math.round(
    config.FACTOR_POR_MES_RESTANTE * remComputable * mesesRestantes * 100
  ) / 100

  // Tope: 12 remuneraciones
  const topeMaximo = Math.round(config.TOPE_SUELDOS * remComputable * 100) / 100
  const topeAplicado = indemnizacion > topeMaximo
  if (topeAplicado) {
    indemnizacion = topeMaximo
  }

  const formula =
    `Indemnización (plazo fijo) = ${config.FACTOR_POR_MES_RESTANTE} × ${fmt(remComputable)} × ${mesesRestantes} mes(es) restante(s) = ${fmt(indemnizacion)}` +
    (topeAplicado ? `. TOPE APLICADO: máximo ${config.TOPE_SUELDOS} remuneraciones = ${fmt(topeMaximo)}` : '') +
    `. Fecha despido: ${input.fechaDespido}. Fin contrato: ${input.fechaFinContrato}. Base legal: Art. 76 D.S. 003-97-TR.`

  return {
    anosServicio,
    mesesFraccion,
    indemnizacion,
    topeAplicado,
    topeMaximo,
    formula,
    baseLegal: config.BASE_LEGAL,
    // FIX #2.E.1: warning sobre criterio jurisprudencial divergente.
    // Art. 76 D.S. 003-97-TR dice "una remuneración y media ordinaria mensual
    // por cada mes dejado de laborar" (factor 1.5×). Las Casaciones Laborales
    // 1724-2013-Lima y 6437-2017-Lima han aplicado 1.0× en supuestos
    // similares. Es zona gris — el caller debe mostrar este warning en UI.
    legalWarning:
      `El factor 1.5× usado es la lectura literal del Art. 76 D.S. 003-97-TR. ` +
      `Las Casaciones Laborales 1724-2013-Lima y 6437-2017-Lima han aplicado factor 1.0× ` +
      `en supuestos similares. Si liquidas con 1.5× y la corte ordena 1.0×, hay sobrepago ` +
      `no reembolsable; si pagas 1.0× y te ordenan 1.5×, hay multa SUNAFIL + intereses. ` +
      `Consulta criterio del juzgado correspondiente antes de pagar.`,
  }
}

// Format helper
function fmt(n: number): string {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
