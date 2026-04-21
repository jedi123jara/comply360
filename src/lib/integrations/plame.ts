/**
 * Generador de archivo PLAME (Planilla Mensual de Pagos)
 * Formato: texto plano segun especificaciones SUNAT
 * Referencia: Res. 032-2015/SUNAT y modificatorias
 *
 * Tasas vigentes 2026 (actualizadas por SBS):
 * - AFP aporte obligatorio: varía por fondo
 * - AFP seguro de invalidez: 1.84%
 * - AFP comision de flujo: varía por AFP
 * - ONP: 13%
 * - EsSalud: 9% (aporte empleador)
 * - SCTR: varía por actividad economica (tasa promedio 1.53%)
 */

interface WorkerPlame {
  dni: string
  firstName: string
  lastName: string
  regimenLaboral: string
  tipoContrato: string
  sueldoBruto: number
  asignacionFamiliar: boolean
  diasTrabajados: number
  horasExtras25: number
  horasExtras35: number
  inasistencias: number
  tardanzas: number
  tipoAporte: string
  afpNombre: string | null
  sctr: boolean
}

// -------------------------------------------------------------------
// Codigos AFP segun SUNAT
// -------------------------------------------------------------------
const AFP_CODES: Record<string, string> = {
  HABITAT: '01',
  INTEGRA: '02',
  PRIMA: '03',
  PROFUTURO: '04',
}

// -------------------------------------------------------------------
// Tasas AFP vigentes 2026 (fuente: SBS, actualizacion trimestral)
// Aporte obligatorio al fondo de pensiones
// -------------------------------------------------------------------
const AFP_APORTE_OBLIGATORIO: Record<string, number> = {
  HABITAT: 0.10,
  INTEGRA: 0.10,
  PRIMA: 0.10,
  PROFUTURO: 0.10,
}

// Seguro de invalidez, sobrevivencia y gastos de sepelio (prima de seguro)
const AFP_SEGURO_INVALIDEZ = 0.0184

// Comision sobre flujo (porcentaje sobre remuneracion asegurable)
const AFP_COMISION_FLUJO: Record<string, number> = {
  HABITAT: 0.0138,
  INTEGRA: 0.0155,
  PRIMA: 0.0155,
  PROFUTURO: 0.0169,
}

// -------------------------------------------------------------------
// Tasas fijas
// -------------------------------------------------------------------
const TASA_ONP = 0.13
const TASA_ESSALUD = 0.09
const TASA_SCTR_SALUD = 0.0053
const TASA_SCTR_PENSION = 0.0100

// RMV vigente 2026
const RMV = 1130

// -------------------------------------------------------------------
// Interfaces de resultado
// -------------------------------------------------------------------

interface WorkerPlameDetail {
  dni: string
  nombre: string
  remuneracionBruta: number
  asignacionFamiliar: number
  horasExtras25: number
  horasExtras35: number
  descInasistencias: number
  descTardanzas: number
  remuneracionTotal: number
  // Descuentos trabajador
  afpAporteObligatorio: number
  afpSeguroInvalidez: number
  afpComisionFlujo: number
  onpAporte: number
  totalDescuentoTrabajador: number
  // Aportes empleador
  essalud: number
  sctrSalud: number
  sctrPension: number
  totalAporteEmpleador: number
  // Neto
  sueldoNeto: number
  costoLaboralTotal: number
}

export interface PlameResult {
  content: string
  details: WorkerPlameDetail[]
  summary: {
    totalWorkers: number
    totalRemuneracionesBrutas: number
    totalRemuneraciones: number
    totalDescuentosTrabajador: number
    totalAfpAporteObligatorio: number
    totalAfpSeguroInvalidez: number
    totalAfpComisionFlujo: number
    totalOnp: number
    totalEssalud: number
    totalSctrSalud: number
    totalSctrPension: number
    totalSctr: number
    totalAportesEmpleador: number
    totalCostoLaboral: number
    totalSueldosNetos: number
  }
}

// -------------------------------------------------------------------
// Funciones auxiliares
// -------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function getAfpRate(afpName: string | null, table: Record<string, number>): number {
  if (!afpName) return 0
  return table[afpName.toUpperCase()] ?? 0
}

// -------------------------------------------------------------------
// Generador principal PLAME
// -------------------------------------------------------------------

export function generatePlameExport(
  ruc: string,
  periodo: string, // "202604"
  workers: WorkerPlame[]
): PlameResult {
  const lines: string[] = []
  const details: WorkerPlameDetail[] = []

  // Acumuladores de totales
  let totalRemuneracionesBrutas = 0
  let totalRemuneraciones = 0
  let totalAfpAporteObligatorio = 0
  let totalAfpSeguroInvalidez = 0
  let totalAfpComisionFlujo = 0
  let totalOnp = 0
  let totalEssalud = 0
  let totalSctrSalud = 0
  let totalSctrPension = 0
  let totalDescuentosTrabajador = 0
  let totalAportesEmpleador = 0
  let totalSueldosNetos = 0

  // ================================================================
  // Registro 0601 - Cabecera
  // Formato: 0601|RUC|Periodo|NumTrabajadores|NumPensionistas|
  // ================================================================
  lines.push(`0601|${ruc}|${periodo}|${workers.length}|0|`)

  workers.forEach((w, idx) => {
    // --- Calculo de remuneracion ---
    const asigFamiliar = w.asignacionFamiliar ? RMV * 0.1 : 0
    const heExtra25 = w.horasExtras25 * (w.sueldoBruto / 240) * 1.25
    const heExtra35 = w.horasExtras35 * (w.sueldoBruto / 240) * 1.35
    const descInasistencias = (w.sueldoBruto / 30) * w.inasistencias
    const descTardanzas = (w.sueldoBruto / 240) * w.tardanzas

    const remuneracionTotal = round2(
      w.sueldoBruto + asigFamiliar + heExtra25 + heExtra35 - descInasistencias - descTardanzas
    )

    // --- Descuentos del trabajador (pension) ---
    let afpAporteObligatorio = 0
    let afpSeguroInvalidez = 0
    let afpComisionFlujo = 0
    let onpAporte = 0

    if (w.tipoAporte === 'AFP' && w.afpNombre) {
      const afpKey = w.afpNombre.toUpperCase()
      afpAporteObligatorio = round2(remuneracionTotal * getAfpRate(afpKey, AFP_APORTE_OBLIGATORIO))
      afpSeguroInvalidez = round2(remuneracionTotal * AFP_SEGURO_INVALIDEZ)
      afpComisionFlujo = round2(remuneracionTotal * getAfpRate(afpKey, AFP_COMISION_FLUJO))
    } else if (w.tipoAporte === 'ONP') {
      onpAporte = round2(remuneracionTotal * TASA_ONP)
    }

    const totalDescTrabajador = round2(
      afpAporteObligatorio + afpSeguroInvalidez + afpComisionFlujo + onpAporte
    )

    // --- Aportes del empleador ---
    const essalud = round2(remuneracionTotal * TASA_ESSALUD)
    const sctrSalud = w.sctr ? round2(remuneracionTotal * TASA_SCTR_SALUD) : 0
    const sctrPension = w.sctr ? round2(remuneracionTotal * TASA_SCTR_PENSION) : 0
    const totalAporteEmpleador = round2(essalud + sctrSalud + sctrPension)

    // --- Neto y costo laboral ---
    const sueldoNeto = round2(remuneracionTotal - totalDescTrabajador)
    const costoLaboralTotal = round2(remuneracionTotal + totalAporteEmpleador)

    // --- Acumular totales ---
    totalRemuneracionesBrutas += w.sueldoBruto
    totalRemuneraciones += remuneracionTotal
    totalAfpAporteObligatorio += afpAporteObligatorio
    totalAfpSeguroInvalidez += afpSeguroInvalidez
    totalAfpComisionFlujo += afpComisionFlujo
    totalOnp += onpAporte
    totalEssalud += essalud
    totalSctrSalud += sctrSalud
    totalSctrPension += sctrPension
    totalDescuentosTrabajador += totalDescTrabajador
    totalAportesEmpleador += totalAporteEmpleador
    totalSueldosNetos += sueldoNeto

    // --- Guardar detalle ---
    details.push({
      dni: w.dni,
      nombre: `${w.lastName}, ${w.firstName}`,
      remuneracionBruta: w.sueldoBruto,
      asignacionFamiliar: round2(asigFamiliar),
      horasExtras25: round2(heExtra25),
      horasExtras35: round2(heExtra35),
      descInasistencias: round2(descInasistencias),
      descTardanzas: round2(descTardanzas),
      remuneracionTotal,
      afpAporteObligatorio,
      afpSeguroInvalidez,
      afpComisionFlujo,
      onpAporte,
      totalDescuentoTrabajador: totalDescTrabajador,
      essalud,
      sctrSalud,
      sctrPension,
      totalAporteEmpleador,
      sueldoNeto,
      costoLaboralTotal,
    })

    // ================================================================
    // Registro 0701 - Datos del trabajador
    // Formato alineado a estructura SUNAT T-REGISTRO/PLAME
    // ================================================================
    const afpCode = w.afpNombre ? (AFP_CODES[w.afpNombre.toUpperCase()] || '00') : '00'
    const tipoAporteCod = w.tipoAporte === 'AFP' ? '1' : '2' // 1=AFP, 2=ONP

    const fields = [
      '0701',                                                    // Tipo registro detalle
      String(idx + 1).padStart(5, '0'),                          // Correlativo
      '01',                                                      // Tipo documento (01=DNI)
      w.dni,                                                     // Numero documento
      w.lastName.split(' ')[0] || '',                            // Apellido paterno
      w.lastName.split(' ').slice(1).join(' ') || '',            // Apellido materno
      w.firstName,                                               // Nombres
      String(w.diasTrabajados),                                  // Dias trabajados
      String(w.horasExtras25),                                   // Horas extras 25%
      String(w.horasExtras35),                                   // Horas extras 35%
      remuneracionTotal.toFixed(2),                              // Remuneracion computable
      w.sueldoBruto.toFixed(2),                                  // Sueldo basico
      asigFamiliar.toFixed(2),                                   // Asignacion familiar
      heExtra25.toFixed(2),                                      // Monto HE 25%
      heExtra35.toFixed(2),                                      // Monto HE 35%
      descInasistencias.toFixed(2),                              // Descuento inasistencias
      descTardanzas.toFixed(2),                                  // Descuento tardanzas
      // --- Aportes empleador ---
      essalud.toFixed(2),                                        // EsSalud (9%)
      sctrSalud.toFixed(2),                                      // SCTR Salud
      sctrPension.toFixed(2),                                    // SCTR Pension
      // --- Descuentos trabajador ---
      tipoAporteCod,                                             // Tipo aporte (1=AFP, 2=ONP)
      afpCode,                                                   // Codigo AFP
      afpAporteObligatorio.toFixed(2),                           // AFP aporte obligatorio
      afpSeguroInvalidez.toFixed(2),                             // AFP seguro invalidez
      afpComisionFlujo.toFixed(2),                               // AFP comision flujo
      onpAporte.toFixed(2),                                      // ONP 13%
      // --- Totales por trabajador ---
      totalDescTrabajador.toFixed(2),                            // Total descuento trabajador
      totalAporteEmpleador.toFixed(2),                           // Total aporte empleador
      sueldoNeto.toFixed(2),                                     // Sueldo neto
    ]
    lines.push(fields.join('|'))
  })

  // ================================================================
  // Registro 0801 - Totales
  // ================================================================
  const totalSctr = round2(totalSctrSalud + totalSctrPension)
  const totalCostoLaboral = round2(totalRemuneraciones + totalAportesEmpleador)

  lines.push([
    '0801',
    // --- Conteo ---
    workers.length.toString(),
    // --- Remuneraciones ---
    round2(totalRemuneracionesBrutas).toFixed(2),
    round2(totalRemuneraciones).toFixed(2),
    // --- Descuentos trabajador ---
    round2(totalAfpAporteObligatorio).toFixed(2),
    round2(totalAfpSeguroInvalidez).toFixed(2),
    round2(totalAfpComisionFlujo).toFixed(2),
    round2(totalOnp).toFixed(2),
    round2(totalDescuentosTrabajador).toFixed(2),
    // --- Aportes empleador ---
    round2(totalEssalud).toFixed(2),
    round2(totalSctrSalud).toFixed(2),
    round2(totalSctrPension).toFixed(2),
    totalSctr.toFixed(2),
    round2(totalAportesEmpleador).toFixed(2),
    // --- Resumen final ---
    totalCostoLaboral.toFixed(2),
    round2(totalSueldosNetos).toFixed(2),
  ].join('|'))

  return {
    content: lines.join('\n'),
    details,
    summary: {
      totalWorkers: workers.length,
      totalRemuneracionesBrutas: round2(totalRemuneracionesBrutas),
      totalRemuneraciones: round2(totalRemuneraciones),
      totalDescuentosTrabajador: round2(totalDescuentosTrabajador),
      totalAfpAporteObligatorio: round2(totalAfpAporteObligatorio),
      totalAfpSeguroInvalidez: round2(totalAfpSeguroInvalidez),
      totalAfpComisionFlujo: round2(totalAfpComisionFlujo),
      totalOnp: round2(totalOnp),
      totalEssalud: round2(totalEssalud),
      totalSctrSalud: round2(totalSctrSalud),
      totalSctrPension: round2(totalSctrPension),
      totalSctr,
      totalAportesEmpleador: round2(totalAportesEmpleador),
      totalCostoLaboral,
      totalSueldosNetos: round2(totalSueldosNetos),
    },
  }
}

// -------------------------------------------------------------------
// CSV resumido de PLAME para revision interna
// -------------------------------------------------------------------

export function generatePlameSummaryCSV(
  ruc: string,
  periodo: string,
  workers: WorkerPlame[]
): string {
  const headers = [
    'DNI',
    'Apellidos',
    'Nombres',
    'Sueldo Basico',
    'Asig. Familiar',
    'HE 25%',
    'HE 35%',
    'Desc. Inasist.',
    'Desc. Tardanzas',
    'Dias',
    'Rem. Total',
    'EsSalud 9%',
    'SCTR Salud',
    'SCTR Pension',
    'AFP Aporte Oblig.',
    'AFP Seg. Invalidez',
    'AFP Comision Flujo',
    'ONP 13%',
    'Total Desc. Trab.',
    'Total Aporte Empl.',
    'Neto Aprox.',
    'Costo Laboral Total',
  ]

  const rows = workers.map(w => {
    const asig = w.asignacionFamiliar ? RMV * 0.1 : 0
    const he25 = w.horasExtras25 * (w.sueldoBruto / 240) * 1.25
    const he35 = w.horasExtras35 * (w.sueldoBruto / 240) * 1.35
    const descInasist = (w.sueldoBruto / 30) * w.inasistencias
    const descTard = (w.sueldoBruto / 240) * w.tardanzas
    const remTotal = round2(w.sueldoBruto + asig + he25 + he35 - descInasist - descTard)

    // Descuentos trabajador
    let afpOblig = 0
    let afpSeguro = 0
    let afpComision = 0
    let onp = 0

    if (w.tipoAporte === 'AFP' && w.afpNombre) {
      const key = w.afpNombre.toUpperCase()
      afpOblig = round2(remTotal * getAfpRate(key, AFP_APORTE_OBLIGATORIO))
      afpSeguro = round2(remTotal * AFP_SEGURO_INVALIDEZ)
      afpComision = round2(remTotal * getAfpRate(key, AFP_COMISION_FLUJO))
    } else if (w.tipoAporte === 'ONP') {
      onp = round2(remTotal * TASA_ONP)
    }

    const totalDescTrab = round2(afpOblig + afpSeguro + afpComision + onp)

    // Aportes empleador
    const essalud = round2(remTotal * TASA_ESSALUD)
    const sctrSalud = w.sctr ? round2(remTotal * TASA_SCTR_SALUD) : 0
    const sctrPension = w.sctr ? round2(remTotal * TASA_SCTR_PENSION) : 0
    const totalAporteEmpl = round2(essalud + sctrSalud + sctrPension)

    const neto = round2(remTotal - totalDescTrab)
    const costoLaboral = round2(remTotal + totalAporteEmpl)

    return [
      w.dni,
      w.lastName,
      w.firstName,
      w.sueldoBruto.toFixed(2),
      asig.toFixed(2),
      he25.toFixed(2),
      he35.toFixed(2),
      descInasist.toFixed(2),
      descTard.toFixed(2),
      String(w.diasTrabajados),
      remTotal.toFixed(2),
      essalud.toFixed(2),
      sctrSalud.toFixed(2),
      sctrPension.toFixed(2),
      afpOblig.toFixed(2),
      afpSeguro.toFixed(2),
      afpComision.toFixed(2),
      onp.toFixed(2),
      totalDescTrab.toFixed(2),
      totalAporteEmpl.toFixed(2),
      neto.toFixed(2),
      costoLaboral.toFixed(2),
    ]
  })

  return [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
}
