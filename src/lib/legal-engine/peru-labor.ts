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
