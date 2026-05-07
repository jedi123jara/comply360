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
} from '../peru-labor'

export function calcularLiquidacion(input: LiquidacionInput): LiquidacionResult {
  const periodo = calcularPeriodoLaboral(input.fechaIngreso, input.fechaCese)
  const remComputable = calcularRemuneracionComputable(
    input.sueldoBruto,
    input.asignacionFamiliar,
    input.comisionesPromedio
  )

  const breakdown: LiquidacionBreakdown = {
    cts: calcularCTSLiquidacion(remComputable, periodo, input),
    vacacionesTruncas: calcularVacacionesTruncas(remComputable, periodo),
    vacacionesNoGozadas: calcularVacacionesNoGozadas(remComputable, input.vacacionesNoGozadas),
    gratificacionTrunca: calcularGratificacionTrunca(remComputable, input),
    indemnizacion: calcularIndemnizacionSiAplica(remComputable, periodo, input),
    horasExtras: calcularHorasExtrasAcumuladas(input.sueldoBruto, input.horasExtrasPendientes),
    bonificacionEspecial: calcularBonificacionEspecial(remComputable, input),
  }

  const totalBruto = Object.values(breakdown).reduce(
    (sum, item) => sum + (item?.amount ?? 0),
    0
  )

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
  // CTS trunca: del último depósito al cese
  const fechaCese = new Date(input.fechaCese)
  const mesCese = fechaCese.getMonth() + 1

  // Determinar último depósito y meses truncos desde ese depósito
  // FIX #0.6: la rama ene-abr tenía off-by-one. El último depósito antes de
  // un cese en ene-abr es el de noviembre (semestre nov-abr en curso). De
  // noviembre a fin de enero son **3 meses completos** (nov, dic, ene), no 2.
  // Antes: `mesCese + 1` daba 2 para cese en enero. Ahora: `mesCese + 2`.
  let mesesTruncos: number
  if (mesCese >= 5 && mesCese <= 10) {
    // Último depósito: 15-may. Trunca desde mayo (mes 5 = 0 truncos).
    mesesTruncos = mesCese - 5
  } else if (mesCese >= 11) {
    // Último depósito: 15-nov. Trunca desde noviembre (mes 11 = 0 truncos).
    mesesTruncos = mesCese - 11
  } else {
    // Ene-Abr: último depósito 15-nov del año anterior. Nov+Dic ya pasaron
    // (2 meses) + meses transcurridos del año actual (mesCese).
    // Cese fin-ene → 3 meses (nov + dic + ene)
    // Cese fin-feb → 4 meses, etc.
    mesesTruncos = mesCese + 2
  }

  const diasTruncos = fechaCese.getDate()

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
  periodo: ReturnType<typeof calcularPeriodoLaboral>
): BreakdownItem {
  // Vacaciones truncas = (rem / 12) × meses del último periodo incompleto
  const mesesFraccion = periodo.totalMeses % 12
  const diasFraccion = periodo.dias

  const vacTruncas = (remComputable / 12) * mesesFraccion +
                     (remComputable / 360) * diasFraccion

  return {
    label: 'Vacaciones Truncas',
    amount: Math.round(vacTruncas * 100) / 100,
    formula: `(${fmt(remComputable)} / 12 × ${mesesFraccion} meses) + (${fmt(remComputable)} / 360 × ${diasFraccion} días)`,
    baseLegal: PERU_LABOR.VACACIONES.BASE_LEGAL,
    details: `Período incompleto: ${mesesFraccion} meses y ${diasFraccion} días`,
  }
}

// =============================================
// VACACIONES NO GOZADAS
// =============================================
function calcularVacacionesNoGozadas(
  remComputable: number,
  diasNoGozados: number
): BreakdownItem {
  // Vacaciones no gozadas = (rem / 30) × días + indemnización (1 rem adicional por periodo)
  const periodosCompletos = Math.floor(diasNoGozados / 30)
  const vacNoGozadas = (remComputable / 30) * diasNoGozados
  const indemnizacion = remComputable * periodosCompletos // 1 rem por cada periodo de 30 días no gozado

  return {
    label: 'Vacaciones No Gozadas',
    amount: Math.round((vacNoGozadas + indemnizacion) * 100) / 100,
    formula: `(${fmt(remComputable)} / 30 × ${diasNoGozados} días) + indemnización: ${fmt(indemnizacion)}`,
    baseLegal: PERU_LABOR.VACACIONES.BASE_LEGAL,
    details: diasNoGozados > 0
      ? `${diasNoGozados} días no gozados (${periodosCompletos} períodos × indemnización)`
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
  const fechaCese = new Date(input.fechaCese)
  const mes = fechaCese.getMonth() + 1

  // Determinar meses del semestre actual
  let mesesSemestre: number
  if (mes >= 1 && mes <= 6) {
    mesesSemestre = mes // Ene=1 ... Jun=6
  } else {
    mesesSemestre = mes - 6 // Jul=1 ... Dic=6
  }

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

  const config = PERU_LABOR.INDEMNIZACION.INDEFINIDO
  const anosCompletos = periodo.anos
  const fraccionMeses = periodo.meses

  // 1.5 sueldos × años + fracción proporcional
  let indemnizacion = config.FACTOR_POR_ANO * remComputable * anosCompletos
  if (fraccionMeses > 0) {
    indemnizacion += (config.FACTOR_POR_ANO * remComputable / 12) * fraccionMeses
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
  horasPendientes: number
): BreakdownItem {
  if (horasPendientes <= 0) {
    return {
      label: 'Horas Extras Pendientes',
      amount: 0,
      formula: 'No aplica',
      baseLegal: PERU_LABOR.HORAS_EXTRAS.BASE_LEGAL,
      details: 'Sin horas extras pendientes de pago',
    }
  }

  const valorHora = sueldoBruto / PERU_LABOR.HORAS_EXTRAS.HORAS_MENSUALES

  // Primeras 2 horas diarias al 25%, resto al 35%
  // Simplificación: asumimos promedio ponderado
  const valorHoraExtra = valorHora * (1 + PERU_LABOR.HORAS_EXTRAS.SOBRETASA_PRIMERAS_2H)
  const total = valorHoraExtra * horasPendientes

  return {
    label: 'Horas Extras Pendientes',
    amount: Math.round(total * 100) / 100,
    formula: `(${fmt(sueldoBruto)} / ${PERU_LABOR.HORAS_EXTRAS.HORAS_MENSUALES}) × 1.25 × ${horasPendientes} horas`,
    baseLegal: PERU_LABOR.HORAS_EXTRAS.BASE_LEGAL,
    details: `Valor hora base: ${fmt(valorHora)}. Sobretasa 25% aplicada.`,
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
      message: `El sueldo ingresado (S/ ${input.sueldoBruto}) es menor que la RMV vigente (S/ ${PERU_LABOR.RMV}). Esto podría constituir una infracción laboral.`,
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

// Format helper
function fmt(n: number): string {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
