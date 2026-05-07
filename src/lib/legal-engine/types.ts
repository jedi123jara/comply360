// =============================================
// LEGAL ENGINE: Core Types
// =============================================

export interface LiquidacionInput {
  sueldoBruto: number
  fechaIngreso: string    // ISO date
  fechaCese: string       // ISO date
  motivoCese: MotivoCese
  asignacionFamiliar: boolean
  gratificacionesPendientes: boolean
  vacacionesNoGozadas: number  // días
  horasExtrasPendientes: number
  ultimaGratificacion: number  // monto
  comisionesPromedio: number
}

export type MotivoCese =
  | 'despido_arbitrario'
  | 'renuncia'
  | 'mutuo_acuerdo'
  | 'fin_contrato'
  | 'despido_nulo'
  | 'hostilidad'

export interface LiquidacionResult {
  breakdown: LiquidacionBreakdown
  totalBruto: number
  totalNeto: number
  warnings: LegalWarning[]
  legalBasis: LegalReference[]
}

export interface LiquidacionBreakdown {
  cts: BreakdownItem
  vacacionesTruncas: BreakdownItem
  vacacionesNoGozadas: BreakdownItem
  gratificacionTrunca: BreakdownItem
  indemnizacion: BreakdownItem | null
  horasExtras: BreakdownItem
  bonificacionEspecial: BreakdownItem  // 9% sobre gratificación
}

export interface BreakdownItem {
  label: string
  amount: number
  formula: string
  baseLegal: string
  details: string
}

export interface LegalWarning {
  type: 'urgente' | 'info' | 'riesgo'
  message: string
  daysRemaining?: number
}

export interface LegalReference {
  norm: string
  article: string
  description: string
}

// =============================================
// CTS Types
// =============================================

export interface CTSInput {
  sueldoBruto: number
  fechaIngreso: string
  fechaCorte: string  // May 15 or Nov 15
  asignacionFamiliar: boolean
  ultimaGratificacion: number
}

export interface CTSResult {
  remuneracionComputable: number
  mesesComputables: number
  diasComputables: number
  ctsTotal: number
  formula: string
  baseLegal: string
}

// =============================================
// Gratificación Types
// =============================================

export interface GratificacionInput {
  sueldoBruto: number
  fechaIngreso: string
  periodo: 'julio' | 'diciembre'
  mesesTrabajados: number
  asignacionFamiliar: boolean
}

export interface GratificacionResult {
  gratificacionBruta: number
  bonificacionExtraordinaria: number  // 9%
  totalNeto: number
  formula: string
  baseLegal: string
}

// =============================================
// Indemnización Types
// =============================================

export interface IndemnizacionInput {
  sueldoBruto: number
  fechaIngreso: string
  fechaDespido: string
  tipoContrato: 'indefinido' | 'plazo_fijo'
  fechaFinContrato?: string  // For plazo_fijo
}

export interface IndemnizacionResult {
  anosServicio: number
  mesesFraccion: number
  indemnizacion: number
  topeAplicado: boolean
  topeMaximo: number
  formula: string
  baseLegal: string
  /**
   * Advertencia legal opcional: zonas grises o criterios jurisprudenciales
   * divergentes que el caller (UI) debe mostrar al usuario para que tome
   * decisión informada. Empezó con FIX #2.E.1 (1.5x vs 1x plazo fijo).
   */
  legalWarning?: string
}

// =============================================
// Horas Extras Types
// =============================================

export interface HorasExtrasInput {
  sueldoBruto: number
  horasSemanales: number
  mesesAcumulados: number
  incluyeDomingos: boolean
  horasDomingo: number
  /**
   * Distribución diaria opcional (horas trabajadas por día, hasta 6 días).
   * Si se provee, el cálculo es exacto día por día (FIX #2.E.2). Si NO se
   * provee, asume distribución óptima al 25% (ej. 4h extras se computan
   * 2h@25% + 2h@35% si vinieron en un mismo día; sin distribución asume
   * 4h@25% que subestima en favor del empleador).
   */
  horasDiarias?: number[]
}

export interface HorasExtrasResult {
  valorHora: number
  valorHoraExtra25: number
  valorHoraExtra35: number
  totalHoras: number
  montoTotal: number
  breakdown: {
    horas25: { cantidad: number; monto: number }
    horas35: { cantidad: number; monto: number }
    horasDomingo: { cantidad: number; monto: number }
  }
  formula: string
  baseLegal: string
}

// =============================================
// Vacaciones Types
// =============================================

export interface VacacionesInput {
  sueldoBruto: number
  fechaIngreso: string
  fechaCese: string
  diasGozados: number
  asignacionFamiliar: boolean
  /**
   * Régimen laboral del trabajador (Prisma enum). Determina los días anuales
   * de vacaciones que corresponden. Default `'GENERAL'` (30 días) si no se
   * provee. FIX #0.10: antes se asumía 30 días para todos los regímenes.
   */
  regimenLaboral?: string
}

export interface VacacionesResult {
  vacacionesTruncas: number
  vacacionesNoGozadas: number
  indemnizacionVacacional: number
  total: number
  diasTruncosComputables: number
  periodosNoGozados: number
  formula: string
  baseLegal: string
}
