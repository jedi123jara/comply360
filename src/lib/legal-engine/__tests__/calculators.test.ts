import { describe, it, expect } from 'vitest'
import { calcularCTS } from '../calculators/cts'
import { calcularGratificacion } from '../calculators/gratificacion'
import { calcularIndemnizacion } from '../calculators/indemnizacion'
import { calcularHorasExtras } from '../calculators/horas-extras'
import { calcularVacaciones } from '../calculators/vacaciones'
import { PERU_LABOR, calcularPeriodoLaboral, calcularRemuneracionComputable } from '../peru-labor'

// =============================================
// 1. CTS - Compensacion por Tiempo de Servicios
// Base legal: D.S. 001-97-TR (TUO Ley de CTS)
// =============================================
describe('CTS Calculator', () => {
  it('should calculate CTS for 6 months of service with S/3,000 salary', () => {
    // Art. 2 D.S. 001-97-TR: CTS = (remComp / 12) x meses + (remComp / 360) x dias
    // Worker: S/3,000 salary, full semester May-Oct, no family allowance
    // Gratificacion: S/3,000 -> 1/6 = S/500
    // RemComp = 3000 + 500 = 3500
    // Period May 1 to Nov 15: 6 months + 15 days (Nov 1 -> Nov 15 = 15 days remainder)
    // CTS = (3500 / 12) x 6 + (3500 / 360) x 15
    const result = calcularCTS({
      sueldoBruto: 3000,
      fechaIngreso: '2025-05-01',
      fechaCorte: '2025-11-15',
      asignacionFamiliar: false,
      ultimaGratificacion: 3000,
    })

    expect(result.mesesComputables).toBe(6)
    expect(result.remuneracionComputable).toBe(3500)
    expect(result.diasComputables).toBe(15)
    const expectedCts = Math.round(((3500 / 12) * 6 + (3500 / 360) * 15) * 100) / 100
    expect(result.ctsTotal).toBe(expectedCts)
    expect(result.baseLegal).toContain('001-97-TR')
  })

  it('should include asignacion familiar (10% RMV) in computable remuneration', () => {
    // Art. 9 D.S. 001-97-TR: asignacion familiar es remuneracion computable para CTS
    // RMV 2026 = S/1,130 -> Asig. Familiar = S/113.00
    // RemBase = 3000 + 113.00 = 3113.00
    // Sexto gratificacion = 3113.00 / 6 = 518.83
    // RemComp = 3113.00 + 518.83 = 3631.83
    const result = calcularCTS({
      sueldoBruto: 3000,
      fechaIngreso: '2025-05-01',
      fechaCorte: '2025-11-15',
      asignacionFamiliar: true,
      ultimaGratificacion: 3113.00,
    })

    expect(result.remuneracionComputable).toBeCloseTo(3113.00 + 3113.00 / 6, 1)
    expect(result.ctsTotal).toBeGreaterThan(1750) // Must be higher than without asig. familiar
  })

  it('should calculate proportional CTS for worker with less than 1 month', () => {
    // Art. 2 D.S. 001-97-TR: se computan dias si hay menos de 1 mes
    // Worker started Oct 1, cut Nov 15 -> ~1 month 15 days
    const result = calcularCTS({
      sueldoBruto: 3000,
      fechaIngreso: '2025-10-20',
      fechaCorte: '2025-11-15',
      asignacionFamiliar: false,
      ultimaGratificacion: 0,
    })

    // Only ~26 days of service, no full months
    expect(result.ctsTotal).toBeLessThan(300) // Much less than full semester
    expect(result.ctsTotal).toBeGreaterThanOrEqual(0)
  })

  it('should calculate exactly 6 months vs 5 months 29 days differently', () => {
    // Edge case: period computation boundary
    const fullSemester = calcularCTS({
      sueldoBruto: 3000,
      fechaIngreso: '2025-05-01',
      fechaCorte: '2025-11-15',
      asignacionFamiliar: false,
      ultimaGratificacion: 3000,
    })

    // Worker who started 2 days later gets fewer computable months/days
    const almostFull = calcularCTS({
      sueldoBruto: 3000,
      fechaIngreso: '2025-05-03',
      fechaCorte: '2025-11-15',
      asignacionFamiliar: false,
      ultimaGratificacion: 3000,
    })

    expect(fullSemester.mesesComputables).toBe(6)
    expect(almostFull.ctsTotal).toBeLessThan(fullSemester.ctsTotal)
  })

  it('should handle worker who started mid-semester (November deposit)', () => {
    // Worker ingresed Jul 15, 2025 -> corte Nov 15 = 4 months
    // May-Oct semester, but started in July
    const result = calcularCTS({
      sueldoBruto: 2500,
      fechaIngreso: '2025-07-15',
      fechaCorte: '2025-11-15',
      asignacionFamiliar: false,
      ultimaGratificacion: 0,
    })

    expect(result.mesesComputables).toBe(4)
    expect(result.ctsTotal).toBeGreaterThan(0)
  })

  it('should include 1/6 of last gratificacion in computable remuneration', () => {
    // Art. 18 D.S. 001-97-TR: 1/6 de la ultima gratificacion percibida
    const withGrat = calcularCTS({
      sueldoBruto: 3000,
      fechaIngreso: '2025-05-01',
      fechaCorte: '2025-11-15',
      asignacionFamiliar: false,
      ultimaGratificacion: 3000,
    })

    const withoutGrat = calcularCTS({
      sueldoBruto: 3000,
      fechaIngreso: '2025-05-01',
      fechaCorte: '2025-11-15',
      asignacionFamiliar: false,
      ultimaGratificacion: 0,
    })

    // Difference in remComp = 3000/6 = 500
    expect(withGrat.remuneracionComputable - withoutGrat.remuneracionComputable).toBe(500)
    // CTS difference = (500/12)*6 + (500/360)*14 days in period
    expect(withGrat.ctsTotal).toBeGreaterThan(withoutGrat.ctsTotal)
  })
})

// =============================================
// 2. GRATIFICACION - Fiestas Patrias / Navidad
// Base legal: Ley 27735 y D.S. 005-2002-TR
// =============================================
describe('Gratificacion Calculator', () => {
  it('should pay full remuneration for worker with 6 months in period', () => {
    // Art. 2 Ley 27735: gratificacion equivale a una remuneracion integra
    const result = calcularGratificacion({
      sueldoBruto: 4000,
      fechaIngreso: '2024-01-01',
      periodo: 'julio',
      mesesTrabajados: 6,
      asignacionFamiliar: false,
    })

    expect(result.gratificacionBruta).toBe(4000)
    expect(result.totalNeto).toBeGreaterThan(4000) // Includes 9% bonus
  })

  it('should calculate trunca (proportional) for mid-period start', () => {
    // Art. 7 Ley 27735: gratificacion trunca proporcional a meses trabajados
    // 3 months out of 6 = 50% of remuneration
    const result = calcularGratificacion({
      sueldoBruto: 4000,
      fechaIngreso: '2025-04-01',
      periodo: 'julio',
      mesesTrabajados: 3,
      asignacionFamiliar: false,
    })

    expect(result.gratificacionBruta).toBe(2000) // 4000 / 6 * 3
  })

  it('should add 9% bonificacion extraordinaria (Ley 30334)', () => {
    // Ley 30334: bonificacion extraordinaria = 9% del aporte EsSalud
    const result = calcularGratificacion({
      sueldoBruto: 4000,
      fechaIngreso: '2024-01-01',
      periodo: 'julio',
      mesesTrabajados: 6,
      asignacionFamiliar: false,
    })

    expect(result.bonificacionExtraordinaria).toBe(360) // 4000 * 0.09
    expect(result.totalNeto).toBe(4360) // 4000 + 360
  })

  it('should include asignacion familiar in computable remuneration', () => {
    // Asignacion familiar = 10% RMV = S/113.00
    const result = calcularGratificacion({
      sueldoBruto: 4000,
      fechaIngreso: '2024-01-01',
      periodo: 'julio',
      mesesTrabajados: 6,
      asignacionFamiliar: true,
    })

    const expectedRem = 4000 + PERU_LABOR.RMV * PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE // 4113.00
    expect(result.gratificacionBruta).toBe(expectedRem)
    expect(result.bonificacionExtraordinaria).toBeCloseTo(expectedRem * 0.09, 1)
  })

  it('should work for both July and December periods', () => {
    // Ley 27735: julio (Fiestas Patrias) y diciembre (Navidad)
    const julio = calcularGratificacion({
      sueldoBruto: 3000,
      fechaIngreso: '2024-01-01',
      periodo: 'julio',
      mesesTrabajados: 6,
      asignacionFamiliar: false,
    })

    const diciembre = calcularGratificacion({
      sueldoBruto: 3000,
      fechaIngreso: '2024-01-01',
      periodo: 'diciembre',
      mesesTrabajados: 6,
      asignacionFamiliar: false,
    })

    // Same salary, same months -> same amounts
    expect(julio.gratificacionBruta).toBe(diciembre.gratificacionBruta)
    expect(julio.totalNeto).toBe(diciembre.totalNeto)
  })

  it('should handle 1 month worked (minimal trunca)', () => {
    const result = calcularGratificacion({
      sueldoBruto: 3000,
      fechaIngreso: '2025-06-01',
      periodo: 'julio',
      mesesTrabajados: 1,
      asignacionFamiliar: false,
    })

    expect(result.gratificacionBruta).toBe(500) // 3000 / 6 * 1
    expect(result.bonificacionExtraordinaria).toBe(45) // 500 * 0.09
  })
})

// =============================================
// 3. INDEMNIZACION POR DESPIDO ARBITRARIO
// Base legal: D.S. 003-97-TR, Arts. 38 y 76
// =============================================
describe('Indemnizacion Calculator', () => {
  it('should calculate 1.5 salaries per year for indefinite contract', () => {
    // Art. 38 D.S. 003-97-TR: 1.5 remuneraciones por cada ano de servicio
    // 3 years of service, S/5,000 salary -> 1.5 * 5000 * 3 = S/22,500
    const result = calcularIndemnizacion({
      sueldoBruto: 5000,
      fechaIngreso: '2022-01-01',
      fechaDespido: '2025-01-01',
      tipoContrato: 'indefinido',
    })

    expect(result.anosServicio).toBe(3)
    expect(result.indemnizacion).toBe(22500)
    expect(result.topeAplicado).toBe(false)
    expect(result.baseLegal).toContain('003-97-TR')
  })

  it('should apply 12-salary cap for indefinite contract', () => {
    // Art. 38 D.S. 003-97-TR: tope de 12 remuneraciones
    // 10 years * 1.5 = 15 sueldos -> capped at 12
    const result = calcularIndemnizacion({
      sueldoBruto: 5000,
      fechaIngreso: '2015-01-01',
      fechaDespido: '2025-01-01',
      tipoContrato: 'indefinido',
    })

    expect(result.anosServicio).toBe(10)
    expect(result.topeAplicado).toBe(true)
    expect(result.indemnizacion).toBe(60000) // 12 * 5000
    expect(result.topeMaximo).toBe(60000)
  })

  it('should handle exactly at 12-year cap boundary (8 years = exactly 12 sueldos)', () => {
    // 8 years * 1.5 = exactly 12 sueldos -> at the cap but not exceeding
    const result = calcularIndemnizacion({
      sueldoBruto: 5000,
      fechaIngreso: '2017-01-01',
      fechaDespido: '2025-01-01',
      tipoContrato: 'indefinido',
    })

    expect(result.anosServicio).toBe(8)
    expect(result.indemnizacion).toBe(60000) // 1.5 * 5000 * 8 = 60000
    expect(result.topeAplicado).toBe(false) // Exactly at cap, not exceeded
  })

  it('should calculate fixed-term contract indemnization based on remaining months', () => {
    // Art. 76 D.S. 003-97-TR: 1.5 remuneraciones por cada mes restante
    // "una remuneración y media ordinaria mensual por cada mes dejado de laborar"
    // Despido: 2025-06-01, fin contrato: 2025-12-01 -> 6 months remaining
    // Indem = 1.5 * 5000 * 6 = S/45,000
    const result = calcularIndemnizacion({
      sueldoBruto: 5000,
      fechaIngreso: '2025-01-01',
      fechaDespido: '2025-06-01',
      tipoContrato: 'plazo_fijo',
      fechaFinContrato: '2025-12-01',
    })

    expect(result.indemnizacion).toBe(45000)
    expect(result.topeAplicado).toBe(false)
    expect(result.baseLegal).toContain('003-97-TR')
  })

  it('should include proportional fraction for months and days (less than 1 year)', () => {
    // Worker with 7 months and some days -> fraction applies
    const result = calcularIndemnizacion({
      sueldoBruto: 4000,
      fechaIngreso: '2024-06-01',
      fechaDespido: '2025-01-15',
      tipoContrato: 'indefinido',
    })

    expect(result.anosServicio).toBe(0)
    expect(result.mesesFraccion).toBe(7)
    expect(result.indemnizacion).toBeGreaterThan(0)
    // (1.5 * 4000 / 12) * 7 + (1.5 * 4000 / 360) * 14
    const expected = Math.round(((1.5 * 4000 / 12) * 7 + (1.5 * 4000 / 360) * 14) * 100) / 100
    expect(result.indemnizacion).toBeCloseTo(expected, 0)
  })

  it('should throw error for fixed-term contract without end date', () => {
    expect(() =>
      calcularIndemnizacion({
        sueldoBruto: 5000,
        fechaIngreso: '2025-01-01',
        fechaDespido: '2025-06-01',
        tipoContrato: 'plazo_fijo',
        // fechaFinContrato omitted
      })
    ).toThrow()
  })
})

// =============================================
// 4. HORAS EXTRAS (Sobretiempo)
// Base legal: D.S. 007-2002-TR (TUO Jornada de Trabajo)
// =============================================
describe('Horas Extras Calculator', () => {
  it('should apply 25% surcharge for first 2 hours per day', () => {
    // Art. 10 D.S. 007-2002-TR: primeras 2 horas con sobretasa del 25%
    // Sueldo S/3,000 -> valor hora = 3000 / 240 = 12.50
    // Hora extra 25% = 12.50 * 1.25 = 15.625 -> rounded 15.63
    const result = calcularHorasExtras({
      sueldoBruto: 3000,
      horasSemanales: 50, // 2 extra hours/week -> all at 25%
      mesesAcumulados: 1,
      incluyeDomingos: false,
      horasDomingo: 0,
    })

    expect(result.valorHora).toBeCloseTo(12.50, 2)
    expect(result.valorHoraExtra25).toBeCloseTo(15.63, 1)
    expect(result.breakdown.horas25.cantidad).toBeGreaterThan(0)
    expect(result.breakdown.horas35.cantidad).toBe(0) // Only 2 extra h/week, under 12h threshold
  })

  it('should apply 35% surcharge beyond 2 hours per day', () => {
    // Art. 10 D.S. 007-2002-TR: horas restantes con sobretasa del 35%
    // 62 hours/week = 14 extra/week -> 12 at 25%, 2 at 35%
    const result = calcularHorasExtras({
      sueldoBruto: 3000,
      horasSemanales: 62, // 14 extra hours/week
      mesesAcumulados: 1,
      incluyeDomingos: false,
      horasDomingo: 0,
    })

    expect(result.valorHoraExtra35).toBeCloseTo(16.88, 1) // 12.50 * 1.35
    expect(result.breakdown.horas25.cantidad).toBeGreaterThan(0)
    expect(result.breakdown.horas35.cantidad).toBeGreaterThan(0)
  })

  it('should calculate mixed hours correctly across multiple months', () => {
    // 3 months of 52 hours/week (4 extra/week at 25%)
    const result = calcularHorasExtras({
      sueldoBruto: 4000,
      horasSemanales: 52,
      mesesAcumulados: 3,
      incluyeDomingos: false,
      horasDomingo: 0,
    })

    // valor hora = 4000 / 240 = 16.67
    expect(result.valorHora).toBeCloseTo(16.67, 1)
    // 4 horas extra/semana * 4.33 sem/mes * 3 meses = ~51.96 hours
    expect(result.totalHoras).toBeGreaterThan(50)
    expect(result.montoTotal).toBeGreaterThan(0)
  })

  it('should handle Sunday work at 100% surcharge', () => {
    // Art. 3 D.S. 007-2002-TR: trabajo en dia de descanso semanal = 100% sobretasa
    const result = calcularHorasExtras({
      sueldoBruto: 3000,
      horasSemanales: 48, // No weekly overtime
      mesesAcumulados: 1,
      incluyeDomingos: true,
      horasDomingo: 8, // 8 hours on Sunday per week
    })

    // valor hora domingo = 12.50 * 2.0 = 25.00
    expect(result.breakdown.horasDomingo.cantidad).toBeGreaterThan(0)
    expect(result.breakdown.horasDomingo.monto).toBeGreaterThan(0)
    expect(result.montoTotal).toBeGreaterThan(0)
  })

  it('should return zero extras when working exactly 48 hours (no Sunday)', () => {
    // Art. 1 D.S. 007-2002-TR: jornada maxima 48 horas semanales
    const result = calcularHorasExtras({
      sueldoBruto: 3000,
      horasSemanales: 48, // Exactly at limit
      mesesAcumulados: 1,
      incluyeDomingos: false,
      horasDomingo: 0,
    })

    expect(result.breakdown.horas25.cantidad).toBe(0)
    expect(result.breakdown.horas35.cantidad).toBe(0)
    expect(result.montoTotal).toBe(0)
  })
})

// =============================================
// 5. VACACIONES
// Base legal: D.Leg. 713 y D.S. 012-92-TR
// =============================================
describe('Vacaciones Calculator', () => {
  it('should calculate 30 days for a full year of service', () => {
    // Art. 10 D.Leg. 713: 30 dias calendario de descanso vacacional por ano
    // Worker with exactly 1 year, 0 days enjoyed -> 30 days owed
    const result = calcularVacaciones({
      sueldoBruto: 4000,
      fechaIngreso: '2024-01-01',
      fechaCese: '2025-01-01',
      diasGozados: 0,
      asignacionFamiliar: false,
    })

    // 1 year, 0 months fraction -> vacacionesNoGozadas = 4000 (30 days of pay)
    expect(result.vacacionesNoGozadas).toBe(4000)
    expect(result.periodosNoGozados).toBe(1)
  })

  it('should calculate truncas proportionally for incomplete year', () => {
    // Art. 22 D.Leg. 713: vacaciones truncas proporcionales al tiempo trabajado
    // 6 months of service -> (4000 / 12) * 6 = 2000
    const result = calcularVacaciones({
      sueldoBruto: 4000,
      fechaIngreso: '2025-01-01',
      fechaCese: '2025-07-01',
      diasGozados: 0,
      asignacionFamiliar: false,
    })

    expect(result.vacacionesTruncas).toBe(2000)
    expect(result.vacacionesNoGozadas).toBe(0) // No full year completed
  })

  it('should apply indemnizacion vacacional for periods not taken', () => {
    // Art. 23 D.Leg. 713: indemnizacion por no gozar vacaciones oportunamente
    // 2 years completed, 0 days taken -> 2 periods not enjoyed
    // Indem = remComp * 1 * 2 periodos = 4000 * 2 = 8000
    const result = calcularVacaciones({
      sueldoBruto: 4000,
      fechaIngreso: '2023-01-01',
      fechaCese: '2025-01-01',
      diasGozados: 0,
      asignacionFamiliar: false,
    })

    expect(result.periodosNoGozados).toBe(2)
    expect(result.indemnizacionVacacional).toBe(8000) // 4000 * 2
    // Plus vacaciones no gozadas: 4000 / 30 * 60 = 8000
    expect(result.vacacionesNoGozadas).toBe(8000)
    expect(result.total).toBe(16000) // 8000 + 8000 + 0 truncas
  })

  it('should handle worker with partial days gozados', () => {
    // 1 year, took 15 of 30 days -> 15 days owed
    const result = calcularVacaciones({
      sueldoBruto: 3000,
      fechaIngreso: '2024-01-01',
      fechaCese: '2025-01-01',
      diasGozados: 15,
      asignacionFamiliar: false,
    })

    // 15 days not enjoyed: (3000 / 30) * 15 = 1500
    expect(result.vacacionesNoGozadas).toBe(1500)
    // 15 days < 30 so 0 full periods not enjoyed
    expect(result.periodosNoGozados).toBe(0)
    expect(result.indemnizacionVacacional).toBe(0)
  })

  it('should include asignacion familiar in vacation calculations', () => {
    const withAsig = calcularVacaciones({
      sueldoBruto: 3000,
      fechaIngreso: '2025-01-01',
      fechaCese: '2025-07-01',
      diasGozados: 0,
      asignacionFamiliar: true,
    })

    const withoutAsig = calcularVacaciones({
      sueldoBruto: 3000,
      fechaIngreso: '2025-01-01',
      fechaCese: '2025-07-01',
      diasGozados: 0,
      asignacionFamiliar: false,
    })

    expect(withAsig.vacacionesTruncas).toBeGreaterThan(withoutAsig.vacacionesTruncas)
  })
})

// =============================================
// 6. PERU LABOR CONSTANTS & HELPERS
// =============================================
describe('Peru Labor Constants', () => {
  it('should have UIT 2026 = S/5,500', () => {
    // D.S. MEF que fija la UIT para el ejercicio 2026
    expect(PERU_LABOR.UIT).toBe(5500)
  })

  it('should have RMV = S/1,130', () => {
    // D.S. que establece la Remuneracion Minima Vital vigente
    expect(PERU_LABOR.RMV).toBe(1130)
  })

  it('should have correct asignacion familiar percentage (10% RMV)', () => {
    // Ley 25129: asignacion familiar = 10% de la RMV
    expect(PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE).toBe(0.10)
    const asigFamiliar = PERU_LABOR.RMV * PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE
    expect(asigFamiliar).toBe(113.00)
  })
})

describe('calcularPeriodoLaboral', () => {
  it('should calculate exact years, months, and days', () => {
    const result = calcularPeriodoLaboral('2022-03-15', '2025-06-20')

    expect(result.anos).toBe(3)
    expect(result.meses).toBe(3)
    expect(result.dias).toBe(5)
    expect(result.totalMeses).toBe(39)
  })

  it('should handle same-month edge case', () => {
    const result = calcularPeriodoLaboral('2025-01-10', '2025-01-25')

    expect(result.anos).toBe(0)
    expect(result.meses).toBe(0)
    expect(result.dias).toBe(15)
    expect(result.totalDias).toBe(15)
  })

  it('should handle exactly 1 year', () => {
    const result = calcularPeriodoLaboral('2024-01-01', '2025-01-01')

    expect(result.anos).toBe(1)
    expect(result.meses).toBe(0)
    expect(result.dias).toBe(0)
    expect(result.totalMeses).toBe(12)
  })
})

describe('calcularRemuneracionComputable', () => {
  it('should return base salary without asignacion familiar', () => {
    expect(calcularRemuneracionComputable(3000, false)).toBe(3000)
  })

  it('should add 10% RMV for asignacion familiar', () => {
    // S/3,000 + S/113.00 = S/3,113.00
    expect(calcularRemuneracionComputable(3000, true)).toBe(3113.00)
  })

  it('should include comisiones promedio', () => {
    // S/3,000 + S/500 comisiones = S/3,500
    expect(calcularRemuneracionComputable(3000, false, 500)).toBe(3500)
  })

  it('should combine all components', () => {
    // S/3,000 + S/113.00 asig + S/500 comisiones = S/3,613.00
    expect(calcularRemuneracionComputable(3000, true, 500)).toBe(3613.00)
  })
})
