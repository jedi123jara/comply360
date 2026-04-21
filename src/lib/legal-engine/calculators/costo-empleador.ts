import { PERU_LABOR } from '../peru-labor'

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

  // ─── Determinar beneficios según régimen ───
  const isMypeMicro = regimenLaboral === 'MYPE_MICRO'
  const isMypePequena = regimenLaboral === 'MYPE_PEQUENA'
  const isAgrario = regimenLaboral === 'AGRARIO'

  // EsSalud: 9% en general, 4.5% en agrario
  const essaludRate = isAgrario ? 0.045 : ESSALUD_RATE
  const essalud = round(remuneracionTotal * essaludRate)

  // SCTR: solo si actividad de riesgo
  const sctrMonto = sctr ? round(remuneracionTotal * SCTR_RATE) : 0

  // Seguro Vida Ley: D.Leg. 688 (a partir de 4 años, pero muchos lo pagan desde el inicio)
  const seguroVida = essaludVida ? round(remuneracionTotal * SEGURO_VIDA_RATE) : 0

  // ─── Provisiones mensuales ───

  // CTS: 1 sueldo cada 6 meses = 1/6 mensual de (rem + 1/6 última gratificación)
  // MYPE Micro: SIN CTS / MYPE Pequeña: 50% CTS / Agrario: incluida en jornal
  let provisionCTS = 0
  if (isMypeMicro || isAgrario) {
    provisionCTS = 0 // Sin CTS (agrario lo incluye en remuneración diaria)
  } else if (isMypePequena) {
    provisionCTS = round((remuneracionTotal / 12) * 0.5) // 50%
  } else {
    // CTS completa = (rem + 1/6 gratif) / 12
    const gratifMensual = remuneracionTotal / 6
    const remComputable = remuneracionTotal + (gratifMensual / 6)
    provisionCTS = round(remComputable / 12)
  }

  // Gratificación: 1 sueldo en julio + 1 en diciembre = 2/12 mensual
  // MYPE Micro: SIN gratificación / MYPE Pequeña: 50%
  let provisionGratificacion = 0
  if (isMypeMicro) {
    provisionGratificacion = 0
  } else if (isMypePequena) {
    provisionGratificacion = round((remuneracionTotal / 6) * 0.5) // 50%
  } else if (isAgrario) {
    provisionGratificacion = 0 // Incluida en remuneración diaria (16.66%)
  } else {
    provisionGratificacion = round(remuneracionTotal / 6) // 2 gratificaciones / 12 meses
  }

  // Bonificación extraordinaria: 9% sobre gratificación (Ley 30334)
  const provisionBonifExtraordinaria = round(provisionGratificacion * 0.09)

  // Vacaciones: 30 días / 12 = 1/12 de remuneración mensual
  // MYPE: 15 días / 12
  let provisionVacaciones = 0
  if (isMypeMicro || isMypePequena) {
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

function round(n: number): number {
  return Math.round(n * 100) / 100
}
