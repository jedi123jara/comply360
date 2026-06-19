import {
  PERU_LABOR,
  calcularRemuneracionComputable,
  getPrimaSeguroSPP,
  getRemuneracionMaximaAsegurable,
  getComisionFlujoAFP,
} from '../peru-labor'
import { money, sumMoney } from '../money'
import { formatSoles } from '@/lib/format/peruvian'

const fmt = formatSoles

// =============================================
// APORTES PREVISIONALES - AFP/ONP/EsSalud/SCTR
// TUO Ley del SPP (D.S. 054-97-EF), D.Ley 19990, Ley 26790
// =============================================

// El aporte obligatorio (10%), la prima del seguro (versionada por periodo) y la
// comisión por flujo (por AFP) viven centralizados en peru-labor.ts y se leen con
// sus helpers. Ya no se duplican aquí — antes la comisión estaba ~1 punto baja.

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
  periodo?: string      // 'YYYY-MM' — elige RMA y prima vigentes (default: la más reciente)
  afpComisionTipo?: string // 'FLUJO' | 'SALDO' | 'MIXTA'(legacy). 'SALDO' → comisión 0 sobre el sueldo.
}

export interface AportesResult {
  remuneracionComputable: number
  // Worker deductions
  aporteObligatorio: number  // AFP 10% or ONP 13%
  seguroInvalidez: number    // AFP only — prima SPP vigente (~1.37%), topada por la RMA
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

    // La prima del seguro se cobra SOLO hasta la Remuneración Máxima Asegurable
    // (RMA) que publica la SBS cada trimestre — antes se aplicaba sobre toda la
    // remuneración, sobrecargando a sueldos altos. El aporte 10% y la comisión por
    // flujo NO se topan: van sobre la remuneración completa.
    const rma = getRemuneracionMaximaAsegurable(input.periodo)
    const baseSeguro = money(Math.min(remuneracionComputable, rma))
    const primaTasa = getPrimaSeguroSPP(input.periodo)

    aporteObligatorio = remM.mul(PERU_LABOR.APORTES.AFP_APORTE_OBLIGATORIO).toNumber()
    seguroInvalidez = baseSeguro.mul(primaTasa).toNumber()
    // La comisión sobre el sueldo SOLO existe en el esquema "por flujo". En "por
    // saldo" Y en la "mixta" (cuyo componente de flujo es 0% desde feb-2023) la
    // comisión se cobra contra el FONDO, no sobre la remuneración → 0 en la boleta.
    // Default (sin clasificar / null) = flujo, para no alterar las boletas actuales
    // hasta que se clasifique a cada trabajador. (Validado vs SBS, jun-2026.)
    const sinComisionSobreSueldo =
      input.afpComisionTipo === 'SALDO' || input.afpComisionTipo === 'MIXTA'
    comisionAfp = sinComisionSobreSueldo
      ? 0
      : remM.mul(getComisionFlujoAFP(afpKey)).toNumber()
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
  for (const afpNombre of Object.keys(PERU_LABOR.APORTES.COMISION_FLUJO_AFP)) {
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

/** @deprecated usar `formatSoles` desde `@/lib/format/peruvian`. */
export { fmt }
