// =============================================
// PERUVIAN LABOR LAW CONSTANTS (2026)
// Updated based on current legislation
// These values live here (not hardcoded in calculators)
// so they can be moved to the DB later
// =============================================

export const PERU_LABOR = {
  // UIT 2026
  UIT: 5500,

  // Remuneración Mínima Vital 2026
  RMV: 1130,

  // Asignación Familiar (10% RMV)
  ASIGNACION_FAMILIAR_PORCENTAJE: 0.10,

  // CTS
  CTS: {
    MESES_POR_PERIODO: 6,  // May-Oct, Nov-Apr
    DEPOSITO_MAYO: { mes: 5, dia: 15 },
    DEPOSITO_NOVIEMBRE: { mes: 11, dia: 15 },
    BASE_LEGAL: 'D.S. 001-97-TR (TUO Ley de CTS)',
  },

  // Gratificaciones
  GRATIFICACION: {
    BONIFICACION_EXTRAORDINARIA: 0.09, // 9% (EsSalud)
    PERIODOS: {
      JULIO: { meses: [1, 2, 3, 4, 5, 6], pago_mes: 7, pago_dia: 15 },
      DICIEMBRE: { meses: [7, 8, 9, 10, 11, 12], pago_mes: 12, pago_dia: 15 },
    },
    BASE_LEGAL: 'Ley 27735 y su Reglamento D.S. 005-2002-TR',
  },

  // Indemnización por despido arbitrario
  INDEMNIZACION: {
    INDEFINIDO: {
      FACTOR_POR_ANO: 1.5,    // 1.5 sueldos por año
      TOPE_SUELDOS: 12,        // Máximo 12 sueldos
      FRACCION_MINIMA_MESES: 1, // Mínimo 1 mes para fracción
      BASE_LEGAL: 'D.S. 003-97-TR, Art. 38',
    },
    PLAZO_FIJO: {
      FACTOR_POR_MES_RESTANTE: 1.5, // 1.5 sueldos por mes restante
      TOPE_SUELDOS: 12,
      BASE_LEGAL: 'D.S. 003-97-TR, Art. 76',
    },
  },

  // Horas extras
  HORAS_EXTRAS: {
    JORNADA_MAXIMA_DIARIA: 8,
    JORNADA_MAXIMA_SEMANAL: 48,
    HORAS_MENSUALES: 240,       // 30 × 8
    SOBRETASA_PRIMERAS_2H: 0.25, // 25%
    SOBRETASA_SIGUIENTES: 0.35,  // 35%
    SOBRETASA_DOMINGO: 1.00,     // 100%
    SOBRETASA_NOCTURNA: 0.35,    // 35% adicional
    BASE_LEGAL: 'D.S. 007-2002-TR (TUO Jornada de Trabajo)',
  },

  // Vacaciones
  VACACIONES: {
    DIAS_POR_ANO: 30,           // 30 días calendario
    RECORD_MINIMO_MESES: 1,     // Mínimo 1 mes para truncas
    INDEMNIZACION_NO_GOZADAS: 1, // 1 remuneración adicional
    BASE_LEGAL: 'D.Leg. 713 y D.S. 012-92-TR',
  },

  // Plazos legales
  PLAZOS: {
    IMPUGNACION_DESPIDO_DIAS: 30,
    PRESCRIPCION_BENEFICIOS_ANOS: 4,
    HOSTIGAMIENTO_DIAS: 30,
  },

  // Multas SUNAFIL
  // D.S. 019-2006-TR (Art. 48), modificado por D.S. 008-2020-TR
  // Escala granular con 10 tramos por número de trabajadores afectados
  MULTAS_SUNAFIL: {
    // Legacy range aliases (backward compat — apunta al rango completo NO_MYPE)
    LEVE: { min: 0.26, max: 26.12 },
    GRAVE: { min: 1.57, max: 52.53 },
    MUY_GRAVE: { min: 2.63, max: 52.53 },
    TOPE_MAXIMO_UIT: 200,
    BASE_LEGAL: 'D.S. 019-2006-TR (Art. 48), modificado por D.S. 008-2020-TR',

    // ── Escala granular por N° trabajadores afectados ────────────────────
    // Fuente: Art. 48° D.S. N° 019-2006-TR y modificatoria D.S. N° 008-2020-TR
    // Uso: calcularMultaSunafil(tipoEmpresa, tipoInfraccion, numTrabajadoresAfectados)
    ESCALA_GRANULAR: {
      MICRO: [
        // { hasta: maxTrabajadores, LEVE, GRAVE, MUY_GRAVE } — UIT
        { hasta: 1,  LEVE: 0.045, GRAVE: 0.110, MUY_GRAVE: 0.230 },
        { hasta: 5,  LEVE: 0.090, GRAVE: 0.230, MUY_GRAVE: 0.450 },
        { hasta: 10, LEVE: 0.180, GRAVE: 0.450, MUY_GRAVE: 0.900 },
      ],
      PEQUENA: [
        { hasta: 5,   LEVE: 0.09, GRAVE: 0.45, MUY_GRAVE: 0.77 },
        { hasta: 10,  LEVE: 0.18, GRAVE: 0.90, MUY_GRAVE: 1.55 },
        { hasta: 20,  LEVE: 0.45, GRAVE: 1.80, MUY_GRAVE: 3.06 },
        { hasta: 30,  LEVE: 0.90, GRAVE: 2.70, MUY_GRAVE: 4.50 },
        { hasta: 40,  LEVE: 0.90, GRAVE: 3.15, MUY_GRAVE: 5.40 },
        { hasta: 50,  LEVE: 1.13, GRAVE: 3.60, MUY_GRAVE: 6.30 },
        { hasta: 100, LEVE: 1.13, GRAVE: 4.50, MUY_GRAVE: 7.65 },
      ],
      NO_MYPE: [
        // 10 tramos — fuente: Art. 48 D.S. 019-2006-TR
        { hasta: 1,    LEVE:  0.26, GRAVE:  1.57, MUY_GRAVE:  2.63 },
        { hasta: 10,   LEVE:  0.52, GRAVE:  3.15, MUY_GRAVE:  5.25 },
        { hasta: 25,   LEVE:  1.31, GRAVE:  5.25, MUY_GRAVE:  7.88 },
        { hasta: 50,   LEVE:  2.63, GRAVE:  7.88, MUY_GRAVE: 13.13 },
        { hasta: 100,  LEVE:  5.25, GRAVE: 10.51, MUY_GRAVE: 15.77 },
        { hasta: 200,  LEVE:  7.88, GRAVE: 13.13, MUY_GRAVE: 21.02 },
        { hasta: 300,  LEVE: 10.51, GRAVE: 17.64, MUY_GRAVE: 26.26 },
        { hasta: 400,  LEVE: 13.13, GRAVE: 22.14, MUY_GRAVE: 36.77 },
        { hasta: 500,  LEVE: 15.77, GRAVE: 26.26, MUY_GRAVE: 42.01 },
        { hasta: 999,  LEVE: 20.02, GRAVE: 39.40, MUY_GRAVE: 47.26 },
        { hasta: 99999, LEVE: 26.12, GRAVE: 52.53, MUY_GRAVE: 52.53 }, // 1000+
      ],
    },

    // ── Rangos simples por tipo empresa (para compatibilidad y UI) ───────
    ESCALA: {
      MICRO: {
        LEVE:      { min: 0.045, max: 0.45 },
        GRAVE:     { min: 0.11,  max: 1.13 },
        MUY_GRAVE: { min: 0.23,  max: 2.25 },
      },
      PEQUENA: {
        LEVE:      { min: 0.09, max: 1.13 },
        GRAVE:     { min: 0.45, max: 4.50 },
        MUY_GRAVE: { min: 0.77, max: 7.65 },
      },
      NO_MYPE: {
        LEVE:      { min: 0.26, max: 26.12 },
        GRAVE:     { min: 1.57, max: 52.53 },
        MUY_GRAVE: { min: 2.63, max: 52.53 },
      },
    },

    // Descuentos por subsanación — Art. 40 Ley 28806
    DESCUENTOS: {
      SUBSANACION_VOLUNTARIA: 0.90,           // -90% antes de la inspección
      SUBSANACION_DURANTE_INSPECCION: 0.70,   // -70% durante la inspección
    },
    RECARGO_REINCIDENCIA: 0.50, // +50%
  },

  // Aportes previsionales
  APORTES: {
    AFP_APORTE_OBLIGATORIO: 0.10,
    AFP_SEGURO_INVALIDEZ: 0.0184,
    ONP_TASA: 0.13,
    ESSALUD_TASA: 0.09,
    SCTR_TASA_PROMEDIO: 0.0153,
    BASE_LEGAL_AFP: 'TUO Ley del SPP, D.S. 054-97-EF',
    BASE_LEGAL_ONP: 'D.Ley 19990',
    BASE_LEGAL_ESSALUD: 'Ley 26790',
  },

  // Seguro Vida Ley
  SEGURO_VIDA_LEY: {
    ANTIGUEDAD_MINIMA_ANOS: 4,
    COBERTURA_MINIMA_SUELDOS: 16,  // muerte natural
    COBERTURA_ACCIDENTE_SUELDOS: 32,
    BASE_LEGAL: 'D.Leg. 688',
  },

  // Utilidades
  UTILIDADES: {
    PLAZO_PAGO_DIAS: 30,  // despues de DJ anual
    TOPE_REMUNERACIONES: 18,
    BASE_LEGAL: 'D.Leg. 892',
  },

  // ── RÉGIMEN CAS — Actualizado 2026 ───────────────────────────────────────
  // Ley promulgada en marzo 2026 extendió CTS y gratificaciones al CAS
  // (anteriormente solo tenían aguinaldo S/ 300 en jul/dic)
  CAS_2026: {
    CTS: {
      TIENE_CTS: true,
      FACTOR_MENSUAL: 1 / 12,         // 1 remuneración / 12 meses
      BASE_LEGAL: 'Ley [2026] — extensión CTS a CAS',
    },
    GRATIFICACIONES: {
      TIENE_GRATIFICACION: true,
      MONTO_JULIO: 1,                  // 1 remuneración mensual
      MONTO_DICIEMBRE: 1,              // 1 remuneración mensual
      BASE_LEGAL: 'Ley [2026] — extensión gratificaciones a CAS',
    },
    AGUINALDO_LEGACY: {               // Conservar para trabajadores pre-2026
      MONTO_JULIO: 300,
      MONTO_DICIEMBRE: 300,
      BASE_LEGAL: 'D.Leg. 1057 Art. 6 (derogado para los nuevos beneficios)',
    },
    VACACIONES_DIAS: 30,
    TIENE_SCTR: true,
    BASE_LEGAL_GENERAL: 'D.Leg. 1057 y modificatoria Ley [2026]',
  },

  // ── RÉGIMEN AGRARIO (Ley N° 31110, 2021) ────────────────────────────────
  AGRARIO: {
    REMUNERACION_MINIMA_DIARIA: 0,     // Se calcula dinámicamente (RMV + 30% + beneficios)
    // BETA: sobretasa agraria = 30% de RMV mensual (Ley 31110 Art. 7)
    BETA_PORCENTAJE: 0.30,             // 30% de RMV
    BETA_MONTO_2026: 339,              // 30% × S/ 1,130 RMV
    // La remuneración diaria agraria incluye CTS y gratificaciones prorateadas
    // CTS incluida en remuneración: 9.72% (1/12 del total)
    // Gratificación incluida: 16.66% (2/12 del total)
    CTS_PRORATEADO_PORCENTAJE: 0.0972,
    GRATIFICACION_PRORATEADA_PORCENTAJE: 0.1666,
    VACACIONES_DIAS: 30,
    BASE_LEGAL: 'Ley N° 31110 (reemplaza D.Leg. 885 y Ley 27360)',
  },

  // ── CONSTRUCCIÓN CIVIL ───────────────────────────────────────────────────
  // Jornales base 2026 según Acuerdo de Techo y Piso (negociación colectiva)
  CONSTRUCCION_CIVIL: {
    JORNAL_OPERARIO: 87.30,           // S/ por día (jornal básico)
    JORNAL_OFICIAL: 68.50,            // S/ por día
    JORNAL_PEON: 61.65,               // S/ por día
    // BUC: Bonificación Unificada de Construcción (cubre varios beneficios)
    BUC_OPERARIO_PORCENTAJE: 0.32,    // 32% sobre jornal básico
    BUC_OFICIAL_PEON_PORCENTAJE: 0.30, // 30% sobre jornal básico
    // Dominical: 1/6 del jornal diario por cada día de descanso semanal
    DOMINICAL_FACTOR: 1 / 6,
    // Vacaciones: 10% sobre remuneración (en vez de 30 días)
    VACACIONES_PORCENTAJE: 0.10,
    // Compensación por tiempo de servicios: diferente cálculo
    CTS_FACTOR_MENSUAL: 1 / 12,
    BASE_LEGAL: 'Acuerdo CAPECO-FTCCP 2025-2026 | D.S. 001-2023-TR',
  },

  // ── RÉGIMEN MYPE (Ley 32353, 2024 — reemplaza Ley 28015 y Ley 30056) ────
  MYPE: {
    MICRO: {
      // Sin CTS, sin gratificaciones, vacaciones 15 días, indem. 10 rem/día por año
      TRABAJADORES_MAX: 10,
      VENTAS_MAX_UIT_ANUALES: 150,
      VACACIONES_DIAS: 15,
      CTS: false,
      GRATIFICACIONES: false,
      INDEMNIZACION_FACTOR_DIARIO: 10, // 10 remuneraciones diarias por año
      BASE_LEGAL: 'Ley N° 32353 (2024)',
    },
    PEQUENA: {
      // 50% CTS, 50% gratificaciones, 15 días vacaciones, indem. 20 rem/día por año
      TRABAJADORES_MAX: 100,
      VENTAS_MAX_UIT_ANUALES: 1700,
      VACACIONES_DIAS: 15,
      CTS_PORCENTAJE: 0.50,
      GRATIFICACIONES_PORCENTAJE: 0.50,
      INDEMNIZACION_FACTOR_DIARIO: 20, // 20 remuneraciones diarias por año
      BASE_LEGAL: 'Ley N° 32353 (2024)',
    },
  },
} as const

// =============================================
// HELPER: Días de vacaciones por régimen laboral
// =============================================

/**
 * Devuelve los días anuales de vacaciones que corresponden según régimen.
 *
 * FIX #0.10: antes la calculadora de vacaciones usaba un valor hardcoded
 * de 30 días, ignorando los regímenes con vacaciones distintas. Esto
 * sobrepagaba a trabajadores MYPE (que tienen 15 días por Ley 32353)
 * y a domésticos (Ley 27986). Construcción civil tiene un cálculo
 * especial (10% sobre remuneración, no días) y modalidad formativa
 * no tiene vacaciones legales. El consumidor debe ramificar.
 *
 * Bases legales:
 *  - GENERAL/TELETRABAJO/AGRARIO/CAS/PESQUERO/MINERO/TEXTIL: 30 días (D.Leg. 713)
 *  - MYPE_MICRO/MYPE_PEQUENA: 15 días (Ley 32353 Art. 64)
 *  - DOMESTICO: 15 días (Ley 27986 Art. 12)
 *  - CONSTRUCCION_CIVIL: especial (10% sobre rem) — caller debe usar otra fórmula
 *  - MODALIDAD_FORMATIVA: sin vacaciones legales (Ley 28518) — devuelve 0
 */
export type RegimenLaboralKey =
  | 'GENERAL'
  | 'MYPE_MICRO'
  | 'MYPE_PEQUENA'
  | 'AGRARIO'
  | 'CONSTRUCCION_CIVIL'
  | 'MINERO'
  | 'PESQUERO'
  | 'TEXTIL_EXPORTACION'
  | 'DOMESTICO'
  | 'CAS'
  | 'MODALIDAD_FORMATIVA'
  | 'TELETRABAJO'

export function getDiasVacacionesPorRegimen(regimen: string | null | undefined): number {
  switch (regimen) {
    case 'MYPE_MICRO':
    case 'MYPE_PEQUENA':
    case 'DOMESTICO':
      return 15
    case 'MODALIDAD_FORMATIVA':
      return 0
    case 'CONSTRUCCION_CIVIL':
      // Régimen especial: 10% sobre remuneración. Aquí devolvemos 30 como
      // proxy para que el cálculo no cuadre con cero, pero el caller DEBE
      // detectar este régimen y usar la fórmula 10% antes de invocar.
      return 30
    case 'GENERAL':
    case 'AGRARIO':
    case 'CAS':
    case 'MINERO':
    case 'PESQUERO':
    case 'TEXTIL_EXPORTACION':
    case 'TELETRABAJO':
    case null:
    case undefined:
    case '':
    default:
      return 30
  }
}

// =============================================
// HELPER: Calculate working periods
// =============================================

export function calcularPeriodoLaboral(fechaIngreso: string, fechaCese: string) {
  const inicio = new Date(fechaIngreso)
  const fin = new Date(fechaCese)

  let anos = fin.getFullYear() - inicio.getFullYear()
  let meses = fin.getMonth() - inicio.getMonth()
  let dias = fin.getDate() - inicio.getDate()

  if (dias < 0) {
    meses--
    const lastDay = new Date(fin.getFullYear(), fin.getMonth(), 0).getDate()
    dias += lastDay
  }

  if (meses < 0) {
    anos--
    meses += 12
  }

  const totalMeses = anos * 12 + meses
  const totalDias = Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))

  return { anos, meses, dias, totalMeses, totalDias }
}

// =============================================
// HELPER: Granular SUNAFIL fine calculation
// Uses the 10-bracket scale per workers affected
// =============================================

export type TipoEmpresaSunafil = 'MICRO' | 'PEQUENA' | 'NO_MYPE'
export type TipoInfraccion = 'LEVE' | 'GRAVE' | 'MUY_GRAVE'

/**
 * Calculates the exact SUNAFIL fine in UIT for a given infraction,
 * using the granular 10-bracket scale from D.S. 019-2006-TR.
 *
 * @param tipoEmpresa  - MICRO | PEQUENA | NO_MYPE
 * @param tipoInfraccion - LEVE | GRAVE | MUY_GRAVE
 * @param numTrabajadoresAfectados - number of workers affected by the infraction
 * @param reincidencia - if true, applies +50% surcharge
 * @param subsanacion  - "VOLUNTARIA" | "DURANTE_INSPECCION" | null
 * @returns fine amount in UIT
 */
export function calcularMultaSunafil(
  tipoEmpresa: TipoEmpresaSunafil,
  tipoInfraccion: TipoInfraccion,
  numTrabajadoresAfectados: number,
  reincidencia = false,
  subsanacion: 'VOLUNTARIA' | 'DURANTE_INSPECCION' | null = null
): number {
  const escala = PERU_LABOR.MULTAS_SUNAFIL.ESCALA_GRANULAR[tipoEmpresa]
  // Find the matching bracket
  const tramo = escala.find(t => numTrabajadoresAfectados <= t.hasta)
    ?? escala[escala.length - 1] // fallback to last bracket
  const baseUit = tramo[tipoInfraccion]

  let multa = baseUit
  if (reincidencia) multa *= 1 + PERU_LABOR.MULTAS_SUNAFIL.RECARGO_REINCIDENCIA
  if (subsanacion === 'VOLUNTARIA') multa *= 1 - PERU_LABOR.MULTAS_SUNAFIL.DESCUENTOS.SUBSANACION_VOLUNTARIA
  if (subsanacion === 'DURANTE_INSPECCION') multa *= 1 - PERU_LABOR.MULTAS_SUNAFIL.DESCUENTOS.SUBSANACION_DURANTE_INSPECCION

  return Math.round(multa * 100) / 100
}

/**
 * Returns the fine in soles using the current UIT (2026 = S/ 5,500)
 */
export function calcularMultaSunafilSoles(
  tipoEmpresa: TipoEmpresaSunafil,
  tipoInfraccion: TipoInfraccion,
  numTrabajadoresAfectados: number,
  reincidencia = false,
  subsanacion: 'VOLUNTARIA' | 'DURANTE_INSPECCION' | null = null
): number {
  const uit = calcularMultaSunafil(tipoEmpresa, tipoInfraccion, numTrabajadoresAfectados, reincidencia, subsanacion)
  return Math.round(uit * PERU_LABOR.UIT * 100) / 100
}

/**
 * Costos laborales oficiales por régimen (2026).
 *
 * Fuente: "08 Tabla de costos laborales.docx" del pack Compensaciones 30°
 * + normativa vigente (D.Leg. 728, D.Leg. 650, Ley 27735, Ley 32353, Ley 31110).
 *
 * Cobertura: 7 regímenes laborales peruanos.
 */

export type RegimenCosto =
  | 'GENERAL'
  | 'MYPE_PEQUENA'
  | 'MYPE_MICRO'
  | 'AGRARIO'
  | 'LOCACION_SERVICIOS'
  | 'CAS'
  | 'FORMATIVA'

export interface CostosRegimen {
  /** Nombre legible del régimen. */
  label: string
  /** Base legal principal. */
  baseLegal: string
  /** RMV diurna aplicable. */
  rmvDiurna: number
  /** RMV nocturna (+35%) si aplica. */
  rmvNocturna: number | null
  /** Asignación familiar (10% RMV) si aplica. */
  asignacionFamiliar: number | null
  /** Bonificación Especial por Trabajo Agrario (BETA) si aplica. */
  beta: number | null
  /** CTS como porcentaje anual (sobre sueldo × año). Null = no aplica. */
  ctsPercent: number | null
  /** Gratificaciones anuales como porcentaje (16.66% = 2 × 1 sueldo / 12 meses). */
  gratificacionPercent: number | null
  /** EsSalud patronal. */
  essaludPercent: number | null
  /** SIS mensual si aplica (microempresa). */
  sisMensual: number | null
  /** Vacaciones anuales como porcentaje (30 días = 8.33%). */
  vacacionesPercent: number
  /** Senati cuando aplica (industrias manufactureras). */
  senatiPercent: number | null
  /** Sobretasa de horas extras (1ras 2h / siguientes). */
  horasExtras: { primeras2h: number | null; siguientes: number | null } | null
  /** Sobretasa por trabajo en día de descanso o feriado. */
  sobretasaFeriado: number | null
  /** Utilidades anuales como rango (min, max) de porcentaje. */
  utilidades: { min: number; max: number } | null
  /** Indemnización por despido arbitrario. */
  indemnizacionDespido: {
    factorPorAno: number | null
    topeMeses: number
    /** Porcentaje-año (cuando aplica cálculo continuo). */
    percentAnual: number | null
  } | null
  /** Seguro de vida ley (rango 0.25%-2% según actividad). */
  seguroVida: { min: number; max: number } | null
  /** SCTR (cuando actividad riesgosa). */
  sctr: {
    essaludMin: number
    essaludMax: number
    onpMin: number
  } | null
  /** Aporte adicional SPP por riesgo. */
  aporteSppRiesgo: { min: number; max: number } | null
}

export const COSTOS_LABORALES: Record<RegimenCosto, CostosRegimen> = {
  GENERAL: {
    label: 'Régimen General (D.Leg. 728)',
    baseLegal: 'D.Leg. 728, TUO D.S. 003-97-TR',
    rmvDiurna: 1130,
    rmvNocturna: 1525.5,
    asignacionFamiliar: 113,
    beta: null,
    ctsPercent: 9.72,
    gratificacionPercent: 16.66,
    essaludPercent: 9.0,
    sisMensual: null,
    vacacionesPercent: 8.33,
    senatiPercent: 0.75,
    horasExtras: { primeras2h: 25, siguientes: 35 },
    sobretasaFeriado: 100,
    utilidades: { min: 5, max: 10 },
    indemnizacionDespido: { factorPorAno: 1.5, topeMeses: 12, percentAnual: 12.5 },
    seguroVida: { min: 0.25, max: 2.0 },
    sctr: { essaludMin: 0.63, essaludMax: 1.84, onpMin: 54 },
    aporteSppRiesgo: { min: 1.0, max: 2.0 },
  },
  MYPE_PEQUENA: {
    label: 'MYPE Pequeña Empresa (Ley 32353)',
    baseLegal: 'Ley 32353 (ex-28015), D.S. 013-2013-PRODUCE',
    rmvDiurna: 1130,
    rmvNocturna: 1525.5,
    asignacionFamiliar: null,
    beta: null,
    ctsPercent: 4.86, // 50% del general
    gratificacionPercent: 8.33, // 50% del general
    essaludPercent: 9.0,
    sisMensual: null,
    vacacionesPercent: 4.17, // 15 días
    senatiPercent: 0.75,
    horasExtras: { primeras2h: 25, siguientes: 35 },
    sobretasaFeriado: 100,
    utilidades: { min: 5, max: 10 },
    indemnizacionDespido: { factorPorAno: 0.67, topeMeses: 4, percentAnual: 5.58 }, // 20 rem diarias/año
    seguroVida: { min: 0.25, max: 2.0 },
    sctr: { essaludMin: 0.63, essaludMax: 1.84, onpMin: 54 },
    aporteSppRiesgo: { min: 1.0, max: 2.0 },
  },
  MYPE_MICRO: {
    label: 'MYPE Microempresa (Ley 32353)',
    baseLegal: 'Ley 32353, D.S. 007-2008-TR',
    rmvDiurna: 1130,
    rmvNocturna: 1130, // no diferencia nocturna (caso especial — verificar por actividad)
    asignacionFamiliar: null,
    beta: null,
    ctsPercent: null, // no aplica
    gratificacionPercent: null, // no aplica
    essaludPercent: null,
    sisMensual: 15, // SIS a cargo del empleador
    vacacionesPercent: 4.17, // 15 días
    senatiPercent: 0.75,
    horasExtras: { primeras2h: 25, siguientes: 35 },
    sobretasaFeriado: 100,
    utilidades: null,
    indemnizacionDespido: { factorPorAno: 0.33, topeMeses: 3, percentAnual: 2.75 }, // 10 rem diarias/año
    seguroVida: { min: 0.25, max: 2.0 },
    sctr: null, // facultativo
    aporteSppRiesgo: { min: 1.0, max: 2.0 },
  },
  AGRARIO: {
    label: 'Régimen Agrario (Ley 31110)',
    baseLegal: 'Ley 31110, D.S. 005-2021-MIDAGRI',
    rmvDiurna: 1130,
    rmvNocturna: 1525.5,
    asignacionFamiliar: 113,
    beta: 339, // Bonificación Especial por Trabajo Agrario (no remunerativa)
    ctsPercent: 9.72, // incluida en remuneración diaria
    gratificacionPercent: 16.66, // incluida en remuneración diaria
    essaludPercent: 6.0, // escalonado: 6% → 9% a 2029
    sisMensual: null,
    vacacionesPercent: 8.33,
    senatiPercent: null,
    horasExtras: { primeras2h: 25, siguientes: 35 },
    sobretasaFeriado: 100,
    utilidades: { min: 5, max: 10 },
    indemnizacionDespido: { factorPorAno: 1.5, topeMeses: 12, percentAnual: 12.5 },
    seguroVida: { min: 0.25, max: 2.0 },
    sctr: { essaludMin: 0.63, essaludMax: 1.84, onpMin: 54 },
    aporteSppRiesgo: null,
  },
  LOCACION_SERVICIOS: {
    label: 'Locación de servicios (civil)',
    baseLegal: 'Código Civil art. 1764-1770',
    rmvDiurna: 1130,
    rmvNocturna: null,
    asignacionFamiliar: null,
    beta: null,
    ctsPercent: null,
    gratificacionPercent: null,
    essaludPercent: null,
    sisMensual: null,
    vacacionesPercent: 0,
    senatiPercent: null,
    horasExtras: null,
    sobretasaFeriado: null,
    utilidades: null,
    indemnizacionDespido: null, // se rige por el contrato
    seguroVida: null,
    sctr: null,
    aporteSppRiesgo: null,
  },
  CAS: {
    label: 'CAS — Contrato Administrativo de Servicios',
    baseLegal: 'D.Leg. 1057, D.S. 065-2011-PCM',
    rmvDiurna: 1130,
    rmvNocturna: null,
    asignacionFamiliar: null,
    beta: null,
    ctsPercent: null,
    gratificacionPercent: 8.33, // Aguinaldo S/300 (~mensualizado 25 aprox)
    essaludPercent: 9.0,
    sisMensual: null,
    vacacionesPercent: 8.33,
    senatiPercent: null,
    horasExtras: null, // se compensan
    sobretasaFeriado: null,
    utilidades: null,
    indemnizacionDespido: { factorPorAno: 1.0, topeMeses: 3, percentAnual: 8.33 }, // 1-3 rem
    seguroVida: null,
    sctr: { essaludMin: 0.63, essaludMax: 1.84, onpMin: 54 },
    aporteSppRiesgo: null,
  },
  FORMATIVA: {
    label: 'Modalidad Formativa Laboral (Ley 28518)',
    baseLegal: 'Ley 28518, D.S. 007-2005-TR',
    rmvDiurna: 1130,
    rmvNocturna: null,
    asignacionFamiliar: null,
    beta: null,
    ctsPercent: null,
    gratificacionPercent: 8.33, // media subvención 2 veces/año
    essaludPercent: null, // EsSalud Potestativo
    sisMensual: null,
    vacacionesPercent: 4.17, // 15 días
    senatiPercent: null,
    horasExtras: null, // no pueden
    sobretasaFeriado: null,
    utilidades: null,
    indemnizacionDespido: null,
    seguroVida: null,
    sctr: null,
    aporteSppRiesgo: null,
  },
}

/**
 * Costo total anual estimado para un sueldo bruto dado, por régimen.
 * Suma: sueldo × 12 + CTS + gratificación + vacaciones + EsSalud + Senati.
 * No incluye costos variables (SCTR, seguro vida, utilidades) por requerir
 * actividad específica.
 */
export function costoEmpleadorAnual(
  sueldoBruto: number,
  regimen: RegimenCosto,
  opts?: { conAsignacionFamiliar?: boolean; conSenati?: boolean }
): { breakdown: Record<string, number>; total: number } {
  const r = COSTOS_LABORALES[regimen]
  const asigFam = opts?.conAsignacionFamiliar && r.asignacionFamiliar ? r.asignacionFamiliar : 0
  const mensualTotal = sueldoBruto + asigFam
  const sueldoAnual = mensualTotal * 12

  const cts = r.ctsPercent ? (sueldoAnual * r.ctsPercent) / 100 : 0
  const grat = r.gratificacionPercent ? (sueldoAnual * r.gratificacionPercent) / 100 : 0
  const vac = (sueldoAnual * r.vacacionesPercent) / 100
  const essalud = r.essaludPercent ? (sueldoAnual * r.essaludPercent) / 100 : 0
  const sis = r.sisMensual ? r.sisMensual * 12 : 0
  const senati = opts?.conSenati && r.senatiPercent ? (sueldoAnual * r.senatiPercent) / 100 : 0
  const beta = r.beta ? r.beta * 12 : 0

  const breakdown = {
    sueldoAnual,
    asignacionFamiliarAnual: asigFam * 12,
    cts: Math.round(cts * 100) / 100,
    gratificacion: Math.round(grat * 100) / 100,
    vacaciones: Math.round(vac * 100) / 100,
    essalud: Math.round(essalud * 100) / 100,
    sis,
    senati: Math.round(senati * 100) / 100,
    beta,
  }
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)
  return { breakdown, total: Math.round(total * 100) / 100 }
}

export function calcularRemuneracionComputable(
  sueldoBruto: number,
  asignacionFamiliar: boolean,
  comisionesPromedio: number = 0
): number {
  let rem = sueldoBruto
  if (asignacionFamiliar) {
    rem += PERU_LABOR.RMV * PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE
  }
  rem += comisionesPromedio
  return rem
}
