import {
  PERU_LABOR,
  calcularRemuneracionComputable,
} from '../peru-labor'
import { money, sumMoney } from '../money'

// =============================================
// APORTES PREVISIONALES - AFP/ONP/EsSalud/SCTR
// TUO Ley del SPP (D.S. 054-97-EF), D.Ley 19990, Ley 26790
// =============================================

// AFP rates by fund (approximate averages 2026)
const AFP_RATES: Record<string, { aporte: number; seguro: number; comision_flujo: number }> = {
  HABITAT: { aporte: 0.10, seguro: 0.0184, comision_flujo: 0.0038 },
  INTEGRA: { aporte: 0.10, seguro: 0.0184, comision_flujo: 0.0055 },
  PRIMA: { aporte: 0.10, seguro: 0.0184, comision_flujo: 0.0018 },
  PROFUTURO: { aporte: 0.10, seguro: 0.0184, comision_flujo: 0.0069 },
}

const ONP_RATE = 0.13  // 13% fixed
const ESSALUD_RATE = PERU_LABOR.APORTES.ESSALUD_TASA  // 9% employer
const SCTR_RATE = PERU_LABOR.APORTES.SCTR_TASA_PROMEDIO  // ~1.53%

// =============================================
// Types
// =============================================

export interface AportesInput {
  sueldoBruto: number
  asignacionFamiliar: boolean
  tipoAporte: 'AFP' | 'ONP' | 'SIN_APORTE'
  afpNombre?: string
  sctr: boolean
  horasExtras?: number  // monto horas extras del mes
}

export interface AportesResult {
  remuneracionComputable: number
  // Worker deductions
  aporteObligatorio: number  // AFP 10% or ONP 13%
  seguroInvalidez: number    // AFP only ~1.84%
  comisionAfp: number        // AFP only, varies
  totalDescuentoTrabajador: number
  // Employer contributions
  essalud: number           // 9%
  sctr: number              // ~1.53% if applicable
  totalAporteEmpleador: number
  // Net
  sueldoNeto: number
  costoTotalEmpleador: number
  // Details
  sistema: string
  afp?: string
  baseLegal: string
}

// =============================================
// Calculator
// =============================================

export function calcularAportesPrevisionales(input: AportesInput): AportesResult {
  // 1. Remuneracion computable (sueldo + asig. familiar)
  const remBase = calcularRemuneracionComputable(
    input.sueldoBruto,
    input.asignacionFamiliar
  )

  // Add horas extras to computable remuneration
  const horasExtras = input.horasExtras ?? 0
  const remuneracionComputable = remBase + horasExtras

  // 2. Worker deductions based on pension system
  let aporteObligatorio = 0
  let seguroInvalidez = 0
  let comisionAfp = 0
  let sistema = ''
  let baseLegal = ''

  // FIX #2.A aritmética decimal precisa.
  const remM = money(remuneracionComputable)

  if (input.tipoAporte === 'AFP') {
    const afpKey = (input.afpNombre ?? 'PRIMA').toUpperCase()
    const afpRates = AFP_RATES[afpKey] ?? AFP_RATES.PRIMA

    aporteObligatorio = remM.mul(afpRates.aporte).toNumber()
    seguroInvalidez = remM.mul(afpRates.seguro).toNumber()
    comisionAfp = remM.mul(afpRates.comision_flujo).toNumber()
    sistema = `AFP ${capitalize(afpKey)}`
    baseLegal = PERU_LABOR.APORTES.BASE_LEGAL_AFP
  } else if (input.tipoAporte === 'ONP') {
    aporteObligatorio = remM.mul(ONP_RATE).toNumber()
    seguroInvalidez = 0
    comisionAfp = 0
    sistema = 'ONP (Sistema Nacional de Pensiones)'
    baseLegal = PERU_LABOR.APORTES.BASE_LEGAL_ONP
  } else {
    sistema = 'Sin aporte previsional'
    baseLegal = ''
  }

  const totalDescuentoTrabajador = sumMoney([aporteObligatorio, seguroInvalidez, comisionAfp]).toNumber()

  // 3. Employer contributions
  const essalud = remM.mul(ESSALUD_RATE).toNumber()
  const sctr = input.sctr ? remM.mul(SCTR_RATE).toNumber() : 0
  const totalAporteEmpleador = money(essalud).add(sctr).toNumber()

  // 4. Net salary and total employer cost
  const sueldoNeto = remM.sub(totalDescuentoTrabajador).toNumber()
  const costoTotalEmpleador = remM.add(totalAporteEmpleador).toNumber()

  // 5. Combine base legal references
  const baseLegalCompleta = [
    baseLegal,
    PERU_LABOR.APORTES.BASE_LEGAL_ESSALUD,
  ].filter(Boolean).join('; ')

  return {
    remuneracionComputable,
    aporteObligatorio,
    seguroInvalidez,
    comisionAfp,
    totalDescuentoTrabajador,
    essalud,
    sctr,
    totalAporteEmpleador,
    sueldoNeto,
    costoTotalEmpleador,
    sistema,
    afp: input.tipoAporte === 'AFP' ? (input.afpNombre ?? 'PRIMA').toUpperCase() : undefined,
    baseLegal: baseLegalCompleta,
  }
}

// =============================================
// Compare AFP vs ONP for same input
// =============================================

export function compararAfpVsOnp(input: Omit<AportesInput, 'tipoAporte' | 'afpNombre'>): {
  afps: Record<string, AportesResult>
  onp: AportesResult
} {
  const afps: Record<string, AportesResult> = {}
  for (const afpNombre of Object.keys(AFP_RATES)) {
    afps[afpNombre] = calcularAportesPrevisionales({
      ...input,
      tipoAporte: 'AFP',
      afpNombre,
    })
  }

  const onp = calcularAportesPrevisionales({
    ...input,
    tipoAporte: 'ONP',
  })

  return { afps, onp }
}

// =============================================
// Helpers
// =============================================

function round(n: number): number {
  return Math.round(n * 100) / 100
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

// Format helper
export function fmt(n: number): string {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
