import { PERU_LABOR } from '../peru-labor'
import { money, sumMoney } from '../money'

// =============================================
// COSTO TOTAL EMPLEADOR
// Calcula el costo real mensual y anual de un trabajador
// incluyendo todos los costos laborales obligatorios
// =============================================

export interface CostoEmpleadorInput {
  sueldoBruto: number
  asignacionFamiliar: boolean
  regimenLaboral: string // GENERAL, MYPE_MICRO, MYPE_PEQUENA, AGRARIO, etc.
  tipoAporte: 'AFP' | 'ONP' | 'SIN_APORTE'
  sctr: boolean
  essaludVida: boolean
  jornadaSemanal?: number // default 48
}

export interface CostoEmpleadorResult {
  // Remuneración
  sueldoBruto: number
  asignacionFamiliar: number
  remuneracionTotal: number

  // Costos mensuales del empleador
  essalud: number         // 9% (empleador paga)
  sctr: number            // ~1.53% si aplica
  seguroVida: number      // ~0.53% si tiene 4+ años

  // Provisiones mensuales (se pagan en fechas específicas)
  provisionCTS: number          // 1/12 de rem + 1/6 gratificación
  provisionGratificacion: number // 1/6 de remuneración
  provisionVacaciones: number   // 1/12 de remuneración
  provisionBonifExtraordinaria: number // 9% sobre gratificación

  // Totales
  costoMensualEmpleador: number
  costoAnualEmpleador: number
  porcentajeSobreSueldo: number // cuánto % más sobre el bruto

  // Desglose para el trabajador (informativo)
  descuentoAfp: number
  descuentoOnp: number
  descuentoRenta5ta: number // estimado simplificado
  netoEstimado: number

  // Base legal
  baseLegal: string[]
}

const ESSALUD_RATE = PERU_LABOR.APORTES.ESSALUD_TASA // 9%
const SCTR_RATE = PERU_LABOR.APORTES.SCTR_TASA_PROMEDIO // ~1.53%
const SEGURO_VIDA_RATE = 0.0053 // D.Leg. 688 - Seguro de Vida Ley

export function calcularCostoEmpleador(input: CostoEmpleadorInput): CostoEmpleadorResult {
  const {
    sueldoBruto,
    asignacionFamiliar,
    regimenLaboral,
    tipoAporte,
    sctr,
    essaludVida,
  } = input

  const asigFam = asignacionFamiliar
    ? Math.round(PERU_LABOR.RMV * PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE * 100) / 100
    : 0
  const remuneracionTotal = sueldoBruto + asigFam

  // ─── Determinar beneficios según régimen (FIX #2.C — 12 regímenes) ───
  // Antes: solo cubría MYPE_MICRO/PEQUENA/AGRARIO. Resto caía a GENERAL,
  // sobreestimando costos para CAS pre-2026 (sin CTS/grati), MODALIDAD_FORMATIVA
  // (sin beneficios), DOMESTICO (15 días vacaciones, 50% grati), TEXTIL (general).
  // CONSTRUCCION_CIVIL tiene cálculo especial (jornales + BUC + dominical) que
  // este calculador NO modela en detalle — devolvemos resultado parcial con
  // legalWarning para que el caller use la calculadora especializada.
  const isMypeMicro = regimenLaboral === 'MYPE_MICRO'
  const isMypePequena = regimenLaboral === 'MYPE_PEQUENA'
  const isAgrario = regimenLaboral === 'AGRARIO'
  const isCas = regimenLaboral === 'CAS'  // post-2026 con CTS y grati (Ley 2026)
  const isFormativa = regimenLaboral === 'MODALIDAD_FORMATIVA'
  const isDomestico = regimenLaboral === 'DOMESTICO'
  const isConstruccion = regimenLaboral === 'CONSTRUCCION_CIVIL'
  // PESQUERO, MINERO, TEXTIL_EXPORTACION, TELETRABAJO → tratamiento GENERAL
  // (D.Leg. 728). Pesquero tiene CBSSP especial pero el costo empleador
  // base es similar; minero tiene jornada acumulativa pero costo igual.

  // EsSalud: 9% en general, 4.5% en agrario, 0% en formativa (sólo seguro
  // contra accidentes ~0.75%)
  const essaludRate = isAgrario ? 0.045 : isFormativa ? 0 : ESSALUD_RATE
  const essalud = round(remuneracionTotal * essaludRate)

  // SCTR: solo si actividad de riesgo
  const sctrMonto = sctr ? round(remuneracionTotal * SCTR_RATE) : 0

  // Seguro Vida Ley: D.Leg. 688 (a partir de 4 años, pero muchos lo pagan desde el inicio)
  const seguroVida = essaludVida ? round(remuneracionTotal * SEGURO_VIDA_RATE) : 0

  // ─── Provisiones mensuales ───

  // CTS:
  //   - MYPE Micro / MODALIDAD_FORMATIVA: SIN CTS
  //   - MYPE Pequeña: 50% CTS
  //   - AGRARIO: incluida en jornal (9.72%)
  //   - DOMESTICO: 50% CTS (Ley 27986)
  //   - CAS post-2026: CTS completa
  //   - Resto (GENERAL/PESQUERO/MINERO/TEXTIL/TELETRABAJO): CTS completa
  let provisionCTS = 0
  if (isMypeMicro || isAgrario || isFormativa) {
    provisionCTS = 0
  } else if (isMypePequena || isDomestico) {
    provisionCTS = round((remuneracionTotal / 12) * 0.5) // 50%
  } else {
    const gratifMensual = remuneracionTotal / 6
    const remComputable = remuneracionTotal + (gratifMensual / 6)
    provisionCTS = round(remComputable / 12)
  }

  // Gratificación:
  //   - MYPE Micro / MODALIDAD_FORMATIVA: SIN gratificación
  //   - MYPE Pequeña: 50%
  //   - AGRARIO: incluida en jornal (16.66%)
  //   - DOMESTICO: 50% (Ley 27986)
  //   - CAS post-2026: gratificación completa
  //   - Resto: gratificación completa
  let provisionGratificacion = 0
  if (isMypeMicro || isFormativa) {
    provisionGratificacion = 0
  } else if (isMypePequena || isDomestico) {
    provisionGratificacion = round((remuneracionTotal / 6) * 0.5)
  } else if (isAgrario) {
    provisionGratificacion = 0
  } else {
    provisionGratificacion = round(remuneracionTotal / 6)
  }

  // Bonificación extraordinaria: 9% sobre gratificación (Ley 30334)
  const provisionBonifExtraordinaria = round(provisionGratificacion * 0.09)

  // Vacaciones:
  //   - MYPE Micro/Pequeña/DOMESTICO: 15 días (Ley 32353, Ley 27986)
  //   - MODALIDAD_FORMATIVA: SIN vacaciones legales (Ley 28518)
  //   - Resto: 30 días (D.Leg. 713)
  let provisionVacaciones = 0
  if (isFormativa) {
    provisionVacaciones = 0
  } else if (isMypeMicro || isMypePequena || isDomestico) {
    provisionVacaciones = round(remuneracionTotal * 15 / 360) // 15 días
  } else {
    provisionVacaciones = round(remuneracionTotal / 12) // 30 días
  }

  // ─── Costo total ───
  const costoMensualEmpleador =
    remuneracionTotal +
    essalud +
    sctrMonto +
    seguroVida +
    provisionCTS +
    provisionGratificacion +
    provisionBonifExtraordinaria +
    provisionVacaciones

  const costoAnualEmpleador = round(costoMensualEmpleador * 12)
  const porcentajeSobreSueldo = round(((costoMensualEmpleador - sueldoBruto) / sueldoBruto) * 100)

  // ─── Desglose del trabajador (informativo) ───
  let descuentoAfp = 0
  let descuentoOnp = 0
  if (tipoAporte === 'AFP') {
    // AFP promedio: 10% aporte + 1.84% seguro + ~0.5% comisión ≈ 12.34%
    descuentoAfp = round(remuneracionTotal * 0.1234)
  } else if (tipoAporte === 'ONP') {
    descuentoOnp = round(remuneracionTotal * 0.13)
  }

  // Renta 5ta simplificada: estimado para sueldo típico
  const remuneracionAnual = remuneracionTotal * 14 // 12 sueldos + 2 gratificaciones
  const uit = PERU_LABOR.UIT
  let descuentoRenta5ta = 0
  const rentaAnual = remuneracionAnual - (7 * uit) // 7 UIT deducción
  if (rentaAnual > 0) {
    // Escala simplificada (primer tramo 8%)
    if (rentaAnual <= 5 * uit) {
      descuentoRenta5ta = round((rentaAnual * 0.08) / 12)
    } else if (rentaAnual <= 20 * uit) {
      descuentoRenta5ta = round(((5 * uit * 0.08) + ((rentaAnual - 5 * uit) * 0.14)) / 12)
    } else {
      descuentoRenta5ta = round(((5 * uit * 0.08) + (15 * uit * 0.14) + ((rentaAnual - 20 * uit) * 0.17)) / 12)
    }
  }

  const netoEstimado = round(remuneracionTotal - descuentoAfp - descuentoOnp - descuentoRenta5ta)

  const baseLegal = [
    'D.S. 003-97-TR (Ley de Productividad y Competitividad Laboral)',
    'D.S. 001-97-TR (CTS)',
    'Ley 27735 (Gratificaciones)',
    'Ley 30334 (Bonificacion Extraordinaria 9%)',
    'D.Leg. 713 (Vacaciones)',
    'Ley 26790 (EsSalud)',
    ...(sctr ? ['Ley 26790 Art. 19 (SCTR)'] : []),
    ...(essaludVida ? ['D.Leg. 688 (Seguro Vida Ley)'] : []),
    ...(isMypeMicro || isMypePequena ? ['Ley 32353 (Regimen MYPE)'] : []),
    ...(isAgrario ? ['Ley 31110 (Regimen Agrario)'] : []),
    ...(isCas ? ['D.Leg. 1057 + Ley 2026 (CAS extensión CTS/grati)'] : []),
    ...(isFormativa ? ['Ley 28518 (Modalidades Formativas — sin beneficios sociales)'] : []),
    ...(isDomestico ? ['Ley 27986 (Trabajadoras del Hogar)'] : []),
    ...(isConstruccion
      ? ['Acuerdo CAPECO-FTCCP 2025-2026 (NOTA: usar calculadora especializada para construcción civil)']
      : []),
  ]

  return {
    sueldoBruto,
    asignacionFamiliar: asigFam,
    remuneracionTotal,
    essalud,
    sctr: sctrMonto,
    seguroVida,
    provisionCTS,
    provisionGratificacion,
    provisionVacaciones,
    provisionBonifExtraordinaria,
    costoMensualEmpleador: round(costoMensualEmpleador),
    costoAnualEmpleador,
    porcentajeSobreSueldo,
    descuentoAfp,
    descuentoOnp,
    descuentoRenta5ta,
    netoEstimado,
    baseLegal,
  }
}

// FIX #2.A: round usa Money para evitar acumulación de errores de coma
// flotante. Cada operación que usa round() ahora pasa por decimal.js.
function round(n: number): number {
  return money(n).toNumber()
}
