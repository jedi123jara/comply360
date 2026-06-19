import {
  LiquidacionInput,
  LiquidacionResult,
  LiquidacionBreakdown,
  BreakdownItem,
  LegalWarning,
  LegalReference,
} from '../types'
import {
  PERU_LABOR,
  calcularPeriodoLaboral,
  calcularRemuneracionComputable,
  getDiasVacacionesPorRegimen,
} from '../peru-labor'
import { sumMoney } from '../money'
import { formatSoles as fmt } from '@/lib/format/peruvian'

/** Parsea "YYYY-MM-DD" como fecha civil (Lima) sin que la zona del host la corra
 *  un día (mismo fix TZ que cts.ts / calcularPeriodoLaboral). */
function civilParts(value: string): { year: number; month: number; day: number } {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
  const d = new Date(value)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function calcularLiquidacion(input: LiquidacionInput): LiquidacionResult {
  const periodo = calcularPeriodoLaboral(input.fechaIngreso, input.fechaCese)
  const remComputable = calcularRemuneracionComputable(
    input.sueldoBruto,
    input.asignacionFamiliar,
    input.comisionesPromedio
  )

  // FIX #2.C: factor MYPE para CTS y gratificaciones.
  // - MYPE_MICRO: 0 (sin derecho a CTS/grati)
  // - MYPE_PEQUENA: 0.5 (50% CTS, 50% grati)
  // - Otros: 1.0 (full)
  const regimen = input.regimenLaboral
  const mypeFactor =
    regimen === 'MYPE_MICRO' ? 0 :
    regimen === 'MYPE_PEQUENA' ? 0.5 :
    1.0

  const ctsItem = calcularCTSLiquidacion(remComputable, periodo, input)
  const gratItem = calcularGratificacionTrunca(remComputable, input)
  if (mypeFactor !== 1.0) {
    ctsItem.amount = Math.round(ctsItem.amount * mypeFactor * 100) / 100
    ctsItem.details = (ctsItem.details ?? '') +
      ` [Régimen ${regimen}: factor ${mypeFactor} aplicado — Ley 32353 Art. 64]`
    gratItem.amount = Math.round(gratItem.amount * mypeFactor * 100) / 100
    gratItem.details = (gratItem.details ?? '') +
      ` [Régimen ${regimen}: factor ${mypeFactor} aplicado]`
  }

  const breakdown: LiquidacionBreakdown = {
    cts: ctsItem,
    vacacionesTruncas: calcularVacacionesTruncas(remComputable, periodo, regimen),
    vacacionesNoGozadas: calcularVacacionesNoGozadas(remComputable, input.vacacionesNoGozadas, regimen),
    gratificacionTrunca: gratItem,
    indemnizacion: calcularIndemnizacionSiAplica(remComputable, periodo, input),
    horasExtras: calcularHorasExtrasAcumuladas(input.sueldoBruto, input.horasExtrasPendientes, input.horasExtras25, input.horasExtras35),
    bonificacionEspecial: calcularBonificacionEspecial(remComputable, input),
  }

  // FIX #2.A: suma con Money para evitar acumulación de errores de coma
  // flotante (~S/0.05 por cada operación intermedia, hasta ~S/0.30 en una
  // liquidación full con 7 componentes).
  const totalBruto = sumMoney(
    Object.values(breakdown).map((item) => item?.amount ?? 0),
  ).toNumber()

  const warnings = generarAlertas(input, periodo)
  const legalBasis = generarBasesTeoricasLiquidacion()

  return {
    breakdown,
    totalBruto,
    totalNeto: totalBruto, // En liquidación laboral no hay retención de renta
    warnings,
    legalBasis,
  }
}

// =============================================
// CTS TRUNCA (en liquidación)
// Art. 9-10 D.S. 001-97-TR: la remuneración computable incluye
// 1/6 de la última gratificación percibida.
// Usa input.ultimaGratificacion (no aproxima por remComputable).
// =============================================
function calcularCTSLiquidacion(
  remComputable: number,
  periodo: ReturnType<typeof calcularPeriodoLaboral>,
  input: LiquidacionInput
): BreakdownItem {
  // CTS trunca: del inicio del semestre de CTS en curso (último depósito) al cese.
  // FIX TZ + clamp por ingreso: parseamos la fecha civil sin shift de zona horaria
  // y computamos el periodo desde max(fechaIngreso, inicio del semestre). Antes se
  // derivaban los meses truncos SOLO del mes calendario del cese (con getMonth()/
  // getDate() locales), lo que (a) corría un día en zona Lima y (b) sobrecontaba la
  // CTS de quien ingresó DENTRO del semestre (le pagaba desde el depósito y no desde
  // su ingreso). El semestre de CTS es nov-abr (depósito 15-may) o may-oct (15-nov).
  const cese = civilParts(input.fechaCese)
  const mesCese = cese.month
  let inicioSemestre: string
  if (mesCese >= 5 && mesCese <= 10) {
    inicioSemestre = isoDate(cese.year, 5, 1) // depósito 15-nov cubre may-oct
  } else if (mesCese >= 11) {
    inicioSemestre = isoDate(cese.year, 11, 1)
  } else {
    inicioSemestre = isoDate(cese.year - 1, 11, 1) // ene-abr: semestre nov(prev)-abr
  }
  const efectivaInicio = input.fechaIngreso > inicioSemestre ? input.fechaIngreso : inicioSemestre
  const periodoCts = calcularPeriodoLaboral(efectivaInicio, input.fechaCese)
  const mesesTruncos = periodoCts.totalMeses
  const diasTruncos = periodoCts.dias

  // Remuneración computable para CTS = sueldo + 1/6 de la ÚLTIMA GRATIFICACIÓN
  // (Art. 9 D.S. 001-97-TR, no asume gratificación = sueldo)
  const gratSexto = (input.ultimaGratificacion ?? 0) / 6
  const remCTS = remComputable + gratSexto

  const ctsMensual = remCTS / 12
  const ctsDiaria = remCTS / 360

  const amount = (ctsMensual * mesesTruncos) + (ctsDiaria * diasTruncos)

  return {
    label: 'CTS Trunca',
    amount: Math.round(amount * 100) / 100,
    formula: `(${fmt(remCTS)} / 12 × ${mesesTruncos} meses) + (${fmt(remCTS)} / 360 × ${diasTruncos} días)`,
    baseLegal: PERU_LABOR.CTS.BASE_LEGAL,
    details: `Remuneración computable: ${fmt(remComputable)} + 1/6 última gratificación (${fmt(input.ultimaGratificacion ?? 0)}): ${fmt(gratSexto)}`,
  }
}

// =============================================
// VACACIONES TRUNCAS
// =============================================
function calcularVacacionesTruncas(
  remComputable: number,
  periodo: ReturnType<typeof calcularPeriodoLaboral>,
  regimen: string | undefined,
): BreakdownItem {
  // Vacaciones truncas = (rem / 12) × meses del último periodo incompleto
  const mesesFraccion = periodo.totalMeses % 12
  const diasFraccion = periodo.dias

  // FIX: la base asume 30 días/año (régimen general). Para MYPE_MICRO/PEQUENA y
  // DOMESTICO el derecho vacacional es 15 días/año → la trunca es la mitad. Mismo
  // escalado ya validado en vacaciones.ts. Antes se sobrepagaba 2x a esos regímenes.
  const factorRegimen = getDiasVacacionesPorRegimen(regimen) / 30
  const vacTruncas = ((remComputable / 12) * mesesFraccion +
                     (remComputable / 360) * diasFraccion) * factorRegimen

  return {
    label: 'Vacaciones Truncas',
    amount: Math.round(vacTruncas * 100) / 100,
    formula: `[(${fmt(remComputable)} / 12 × ${mesesFraccion} meses) + (${fmt(remComputable)} / 360 × ${diasFraccion} días)] × ${factorRegimen} (régimen ${regimen})`,
    baseLegal: PERU_LABOR.VACACIONES.BASE_LEGAL,
    details: `Período incompleto: ${mesesFraccion} meses y ${diasFraccion} días. Días/año régimen: ${getDiasVacacionesPorRegimen(regimen)}.`,
  }
}

// =============================================
// VACACIONES NO GOZADAS
// =============================================
function calcularVacacionesNoGozadas(
  remComputable: number,
  diasNoGozados: number,
  regimen: string | undefined,
): BreakdownItem {
  // Vacaciones no gozadas = (rem / díasPorAño) × días + indemnización (1 rem por periodo).
  // FIX: antes hardcodeaba 30, ignorando que MYPE/doméstico tienen 15 días/año →
  // contaba mal los periodos y el divisor para esos regímenes. Mismo criterio que
  // vacaciones.ts (getDiasVacacionesPorRegimen como divisor y conteo de periodos).
  const diasPorAno = getDiasVacacionesPorRegimen(regimen)
  const periodosCompletos = diasPorAno > 0 ? Math.floor(diasNoGozados / diasPorAno) : 0
  const vacNoGozadas = diasPorAno > 0 ? (remComputable / diasPorAno) * diasNoGozados : 0
  const indemnizacion = remComputable * periodosCompletos // 1 rem por cada periodo no gozado

  return {
    label: 'Vacaciones No Gozadas',
    amount: Math.round((vacNoGozadas + indemnizacion) * 100) / 100,
    formula: `(${fmt(remComputable)} / ${diasPorAno} × ${diasNoGozados} días) + indemnización: ${fmt(indemnizacion)}`,
    baseLegal: PERU_LABOR.VACACIONES.BASE_LEGAL,
    details: diasNoGozados > 0
      ? `${diasNoGozados} días no gozados (${periodosCompletos} períodos × indemnización, ${diasPorAno} días/año)`
      : 'Sin vacaciones pendientes',
  }
}

// =============================================
// GRATIFICACIÓN TRUNCA
// =============================================
function calcularGratificacionTrunca(
  remComputable: number,
  input: LiquidacionInput
): BreakdownItem {
  const cese = civilParts(input.fechaCese)
  const ing = civilParts(input.fechaIngreso)
  const mes = cese.month
  const semStartMonth = mes <= 6 ? 1 : 7
  const ceseSemMonth = mes <= 6 ? mes : mes - 6 // 1..6 meses del semestre

  // FIX: antes mesesSemestre dependía SOLO del mes calendario del cese, ignorando
  // fechaIngreso → un ingreso a mitad de semestre pagaba la grati completa (hasta 1
  // sueldo por <1 mes laborado). Si el trabajador ingresó DENTRO del semestre en
  // curso, contamos solo los meses calendario completos desde su ingreso. (TZ-safe.)
  const ingresoAntesDelSemestre =
    ing.year < cese.year || (ing.year === cese.year && ing.month < semStartMonth)
  let mesesSemestre: number
  if (ingresoAntesDelSemestre) {
    mesesSemestre = ceseSemMonth
  } else {
    const primerMesCompleto = ing.day === 1 ? ing.month : ing.month + 1
    mesesSemestre = Math.max(0, mes - primerMesCompleto + 1)
  }
  mesesSemestre = Math.min(6, mesesSemestre)

  const gratTrunca = (remComputable / 6) * mesesSemestre
  const bonificacion = gratTrunca * PERU_LABOR.GRATIFICACION.BONIFICACION_EXTRAORDINARIA

  return {
    label: 'Gratificación Trunca',
    amount: Math.round((gratTrunca + bonificacion) * 100) / 100,
    formula: `(${fmt(remComputable)} / 6 × ${mesesSemestre} meses) + bonificación 9%: ${fmt(bonificacion)}`,
    baseLegal: PERU_LABOR.GRATIFICACION.BASE_LEGAL,
    details: `Semestre actual: ${mesesSemestre}/6 meses trabajados. Incluye bonificación extraordinaria 9%.`,
  }
}

// =============================================
// INDEMNIZACIÓN POR DESPIDO
// =============================================
function calcularIndemnizacionSiAplica(
  remComputable: number,
  periodo: ReturnType<typeof calcularPeriodoLaboral>,
  input: LiquidacionInput
): BreakdownItem | null {
  // Solo aplica en despido arbitrario, hostilidad o despido nulo
  if (!['despido_arbitrario', 'hostilidad', 'despido_nulo'].includes(input.motivoCese)) {
    return null
  }

  const anosCompletos = periodo.anos
  const fraccionMeses = periodo.meses
  const regimen = input.regimenLaboral

  // RÉGIMEN MYPE (Ley 32353): la indemnización NO es 1.5 sueldos/año, sino
  // remuneraciones DIARIAS por año completo (MICRO 10, PEQUEÑA 20) con tope en
  // remuneraciones diarias (MICRO 90, PEQUEÑA 120). Antes se aplicaba siempre el
  // 1.5 sueldos/año del régimen general → sobrevaluaba la indemnización MYPE
  // (hasta ~4.5x en microempresa). Fracciones por dozavos y treintavos.
  if (regimen === 'MYPE_MICRO' || regimen === 'MYPE_PEQUENA') {
    const cfg = regimen === 'MYPE_MICRO' ? PERU_LABOR.MYPE.MICRO : PERU_LABOR.MYPE.PEQUENA
    const factorDiario = cfg.INDEMNIZACION_FACTOR_DIARIO
    const remDiaria = remComputable / 30
    let indemMype = factorDiario * remDiaria * anosCompletos
    if (fraccionMeses > 0) indemMype += (factorDiario * remDiaria / 12) * fraccionMeses
    if (periodo.dias > 0) indemMype += (factorDiario * remDiaria / 360) * periodo.dias

    const topeMype = cfg.INDEMNIZACION_TOPE_DIARIO * remDiaria
    const topeMypeAplicado = indemMype > topeMype
    if (topeMypeAplicado) indemMype = topeMype

    const etiqueta = regimen === 'MYPE_MICRO' ? 'Microempresa' : 'Pequeña Empresa'
    return {
      label: `Indemnización por Despido (MYPE ${etiqueta})`,
      amount: Math.round(indemMype * 100) / 100,
      formula: `${factorDiario} jornales × (${fmt(remComputable)} / 30) × ${anosCompletos} años${fraccionMeses > 0 ? ` + fracción ${fraccionMeses} meses` : ''}${topeMypeAplicado ? ` (TOPE ${cfg.INDEMNIZACION_TOPE_DIARIO} jornales)` : ''}`,
      baseLegal: cfg.BASE_LEGAL,
      details: topeMypeAplicado
        ? `Tope de ${cfg.INDEMNIZACION_TOPE_DIARIO} remuneraciones diarias aplicado: ${fmt(topeMype)} (jornal ${fmt(remDiaria)})`
        : `${factorDiario} remuneraciones diarias por año (jornal ${fmt(remDiaria)}). Tiempo: ${anosCompletos} años y ${fraccionMeses} meses`,
    }
  }

  // RÉGIMEN GENERAL (indefinido): 1.5 sueldos/año, tope 12 sueldos.
  const config = PERU_LABOR.INDEMNIZACION.INDEFINIDO

  // 1.5 sueldos × años + fracción proporcional (dozavos y treintavos).
  let indemnizacion = config.FACTOR_POR_ANO * remComputable * anosCompletos
  if (fraccionMeses > 0) {
    indemnizacion += (config.FACTOR_POR_ANO * remComputable / 12) * fraccionMeses
  }
  // FIX: agregar los treintavos por días sueltos (Art. 38 D.S. 003-97-TR: las
  // fracciones de año se pagan por dozavos y treintavos). Antes se ignoraba
  // periodo.dias, subvaluando la indemnización vs la calculadora dedicada.
  if (periodo.dias > 0) {
    indemnizacion += (config.FACTOR_POR_ANO * remComputable / 360) * periodo.dias
  }

  // Tope: 12 sueldos
  const tope = config.TOPE_SUELDOS * remComputable
  const topeAplicado = indemnizacion > tope
  if (topeAplicado) {
    indemnizacion = tope
  }

  return {
    label: 'Indemnización por Despido Arbitrario',
    amount: Math.round(indemnizacion * 100) / 100,
    formula: `${config.FACTOR_POR_ANO} × ${fmt(remComputable)} × ${anosCompletos} años${fraccionMeses > 0 ? ` + fracción ${fraccionMeses} meses` : ''}${topeAplicado ? ' (TOPE 12 sueldos aplicado)' : ''}`,
    baseLegal: config.BASE_LEGAL,
    details: topeAplicado
      ? `Tope máximo de ${config.TOPE_SUELDOS} remuneraciones aplicado: ${fmt(tope)}`
      : `Tiempo de servicio: ${anosCompletos} años y ${fraccionMeses} meses`,
  }
}

// =============================================
// HORAS EXTRAS ACUMULADAS
// =============================================
function calcularHorasExtrasAcumuladas(
  sueldoBruto: number,
  horasPendientes: number,
  horas25?: number,
  horas35?: number,
): BreakdownItem {
  const valorHora = sueldoBruto / PERU_LABOR.HORAS_EXTRAS.HORAS_MENSUALES
  const tasa25 = PERU_LABOR.HORAS_EXTRAS.SOBRETASA_PRIMERAS_2H // 25%
  const tasa35 = PERU_LABOR.HORAS_EXTRAS.SOBRETASA_SIGUIENTES  // 35%

  // Si el caller provee la distribución por tramo (horas al 25% y al 35%), se
  // calcula con precisión legal: primeras 2 h/día al 25%, las siguientes al 35%
  // (D.S. 007-2002-TR). El input escalar `horasPendientes` no lleva distribución.
  const h25 = horas25 ?? 0
  const h35 = horas35 ?? 0
  if (h25 > 0 || h35 > 0) {
    const total = valorHora * ((1 + tasa25) * h25 + (1 + tasa35) * h35)
    return {
      label: 'Horas Extras Pendientes',
      amount: Math.round(total * 100) / 100,
      formula: `(${fmt(sueldoBruto)} / ${PERU_LABOR.HORAS_EXTRAS.HORAS_MENSUALES}) × [1.25 × ${h25}h + 1.35 × ${h35}h]`,
      baseLegal: PERU_LABOR.HORAS_EXTRAS.BASE_LEGAL,
      details: `Distribución: ${h25} h al 25% y ${h35} h al 35%. Valor hora base: ${fmt(valorHora)}.`,
    }
  }

  if (horasPendientes <= 0) {
    return {
      label: 'Horas Extras Pendientes',
      amount: 0,
      formula: 'No aplica',
      baseLegal: PERU_LABOR.HORAS_EXTRAS.BASE_LEGAL,
      details: 'Sin horas extras pendientes de pago',
    }
  }

  // Sin distribución diaria no se puede saber cuántas horas superan las 2/día,
  // así que se aplica la sobretasa MÍNIMA del 25% (D.S. 007-2002-TR). Para el
  // 35% exacto, el caller debe pasar la distribución por tramo (horas25/horas35).
  const total = valorHora * (1 + tasa25) * horasPendientes

  return {
    label: 'Horas Extras Pendientes',
    amount: Math.round(total * 100) / 100,
    formula: `(${fmt(sueldoBruto)} / ${PERU_LABOR.HORAS_EXTRAS.HORAS_MENSUALES}) × 1.25 × ${horasPendientes} horas`,
    baseLegal: PERU_LABOR.HORAS_EXTRAS.BASE_LEGAL,
    details: `Valor hora base: ${fmt(valorHora)}. Sobretasa MÍNIMA 25% aplicada (sin distribución diaria; indica horas por tramo para el 35% exacto).`,
  }
}

// =============================================
// BONIFICACIÓN ESPECIAL 9%
// =============================================
function calcularBonificacionEspecial(
  remComputable: number,
  input: LiquidacionInput
): BreakdownItem {
  // Aplica sobre gratificaciones si hay pendientes
  if (!input.gratificacionesPendientes) {
    return {
      label: 'Bonificación Extraordinaria (9%)',
      amount: 0,
      formula: 'No aplica - gratificaciones al día',
      baseLegal: 'Ley 30334',
      details: 'La bonificación del 9% ya está incluida en la gratificación trunca',
    }
  }

  const bonif = remComputable * PERU_LABOR.GRATIFICACION.BONIFICACION_EXTRAORDINARIA

  return {
    label: 'Bonificación Extraordinaria (9%)',
    amount: Math.round(bonif * 100) / 100,
    formula: `${fmt(remComputable)} × 9%`,
    baseLegal: 'Ley 30334',
    details: 'Bonificación extraordinaria sobre gratificación adeudada',
  }
}

// =============================================
// ALERTAS LEGALES
// =============================================
function generarAlertas(
  input: LiquidacionInput,
  periodo: ReturnType<typeof calcularPeriodoLaboral>
): LegalWarning[] {
  const warnings: LegalWarning[] = []
  const hoy = new Date()
  const fechaCese = new Date(input.fechaCese)

  // Alerta de plazo para impugnación de despido
  if (['despido_arbitrario', 'despido_nulo', 'hostilidad'].includes(input.motivoCese)) {
    const diasTranscurridos = Math.floor(
      (hoy.getTime() - fechaCese.getTime()) / (1000 * 60 * 60 * 24)
    )
    const diasRestantes = PERU_LABOR.PLAZOS.IMPUGNACION_DESPIDO_DIAS - diasTranscurridos

    if (diasRestantes <= 0) {
      warnings.push({
        type: 'urgente',
        message: `PLAZO VENCIDO: Han pasado ${Math.abs(diasRestantes)} días desde el despido. El plazo de impugnación de 30 días ha expirado.`,
        daysRemaining: diasRestantes,
      })
    } else if (diasRestantes <= 7) {
      warnings.push({
        type: 'urgente',
        message: `URGENTE: Solo quedan ${diasRestantes} días para impugnar el despido. Actúe de inmediato.`,
        daysRemaining: diasRestantes,
      })
    } else {
      warnings.push({
        type: 'info',
        message: `Plazo de impugnación: ${diasRestantes} días restantes (vence ${new Date(fechaCese.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-PE')}).`,
        daysRemaining: diasRestantes,
      })
    }
  }

  // Alerta de prescripción de beneficios
  if (periodo.totalMeses > 36) {
    warnings.push({
      type: 'info',
      message: `Recuerde: los beneficios sociales prescriben a los 4 años desde el cese (Art. 48, Ley 29497).`,
    })
  }

  // Alerta si sueldo es menor que RMV
  if (input.sueldoBruto < PERU_LABOR.RMV) {
    warnings.push({
      type: 'riesgo',
      message: `El sueldo ingresado (${fmt(input.sueldoBruto)}) es menor que la RMV vigente (${fmt(PERU_LABOR.RMV)}). Esto podría constituir una infracción laboral.`,
    })
  }

  return warnings
}

// =============================================
// BASES LEGALES
// =============================================
function generarBasesTeoricasLiquidacion(): LegalReference[] {
  return [
    { norm: 'D.S. 003-97-TR', article: 'Art. 34-38', description: 'Indemnización por despido arbitrario' },
    { norm: 'D.S. 001-97-TR', article: 'Art. 1-7', description: 'CTS: cálculo y depósito' },
    { norm: 'Ley 27735', article: 'Art. 1-3', description: 'Gratificaciones de julio y diciembre' },
    { norm: 'Ley 30334', article: 'Art. 3', description: 'Bonificación extraordinaria 9%' },
    { norm: 'D.Leg. 713', article: 'Art. 10-23', description: 'Vacaciones: truncas y no gozadas' },
    { norm: 'D.S. 007-2002-TR', article: 'Art. 10-11', description: 'Horas extras y sobretasas' },
  ]
}

