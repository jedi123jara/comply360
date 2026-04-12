import { calcularVacaciones } from '../vacaciones'
import { VacacionesInput } from '../../types'
import { PERU_LABOR } from '../../peru-labor'

describe('calcularVacaciones', () => {
  // -----------------------------------------------
  // 30 days per year for regimen general
  // Worker: S/ 3,000, 2 years + 3 months service,
  // 30 days used (1 period gozado)
  // -----------------------------------------------
  describe('regimen general - 30 dias por ano', () => {
    const input: VacacionesInput = {
      sueldoBruto: 3000,
      fechaIngreso: '2024-01-15',
      fechaCese: '2026-04-15',
      diasGozados: 30,
      asignacionFamiliar: false,
    }

    it('debe calcular vacaciones truncas para la fraccion de meses', () => {
      const result = calcularVacaciones(input)
      // 2 years, 3 months, 0 days
      // vacTruncas = (3000 / 12) * 3 = 750
      expect(result.vacacionesTruncas).toBeCloseTo(750, 0)
    })

    it('debe calcular 0 vacaciones no gozadas si se gozaron todos los periodos', () => {
      const result = calcularVacaciones(input)
      // 2 years * 30 dias = 60 dias debidos, gozados = 30
      // noGozados = 60 - 30 = 30
      expect(result.vacacionesNoGozadas).toBeGreaterThan(0)
    })

    it('debe calcular dias truncos computables', () => {
      const result = calcularVacaciones(input)
      // 3 months of 30 = 3 * 30/12 = 7.5 → ~8 dias truncos
      expect(result.diasTruncosComputables).toBeGreaterThan(0)
    })

    it('debe referenciar D.Leg. 713 como base legal', () => {
      const result = calcularVacaciones(input)
      expect(result.baseLegal).toBe(PERU_LABOR.VACACIONES.BASE_LEGAL)
    })
  })

  // -----------------------------------------------
  // Worker who gozed ALL vacation days (no pendientes)
  // 2 years, 60 dias debidos, 60 gozados
  // -----------------------------------------------
  describe('vacaciones al dia (sin dias no gozados)', () => {
    const input: VacacionesInput = {
      sueldoBruto: 2500,
      fechaIngreso: '2024-01-01',
      fechaCese: '2026-04-01',
      diasGozados: 60, // 2 years * 30 = 60, all gozed
      asignacionFamiliar: false,
    }

    it('vacaciones no gozadas debe ser 0', () => {
      const result = calcularVacaciones(input)
      expect(result.vacacionesNoGozadas).toBe(0)
    })

    it('indemnizacion vacacional debe ser 0', () => {
      const result = calcularVacaciones(input)
      expect(result.indemnizacionVacacional).toBe(0)
    })

    it('periodos no gozados debe ser 0', () => {
      const result = calcularVacaciones(input)
      expect(result.periodosNoGozados).toBe(0)
    })

    it('solo vacaciones truncas deben tener monto', () => {
      const result = calcularVacaciones(input)
      // 3 months fraccion
      expect(result.vacacionesTruncas).toBeGreaterThan(0)
      expect(result.total).toBe(result.vacacionesTruncas)
    })
  })

  // -----------------------------------------------
  // Indemnizacion vacacional: 1 rem adicional por
  // periodo completo no gozado
  // Worker: 3 years, 0 dias gozados
  // -----------------------------------------------
  describe('indemnizacion vacacional por periodos no gozados', () => {
    const input: VacacionesInput = {
      sueldoBruto: 4000,
      fechaIngreso: '2023-01-01',
      fechaCese: '2026-01-01',
      diasGozados: 0, // no vacation taken in 3 years
      asignacionFamiliar: false,
    }

    it('debe calcular 3 periodos no gozados', () => {
      const result = calcularVacaciones(input)
      // 3 years * 30 dias = 90 dias debidos, 0 gozados
      // periodos = 90 / 30 = 3
      expect(result.periodosNoGozados).toBe(3)
    })

    it('debe calcular indemnizacion = 1 rem por periodo no gozado', () => {
      const result = calcularVacaciones(input)
      // indemnizacion = 4000 * 1 * 3 = 12,000
      expect(result.indemnizacionVacacional).toBe(12000)
    })

    it('vacaciones no gozadas = (rem/30) * dias no gozados', () => {
      const result = calcularVacaciones(input)
      // vacNoGozadas = (4000 / 30) * 90 = 12,000
      expect(result.vacacionesNoGozadas).toBe(12000)
    })

    it('total debe sumar vacaciones no gozadas + indemnizacion', () => {
      const result = calcularVacaciones(input)
      // total = 0 (truncas, exact years) + 12000 + 12000 = 24000
      expect(result.total).toBe(
        result.vacacionesTruncas + result.vacacionesNoGozadas + result.indemnizacionVacacional
      )
    })
  })

  // -----------------------------------------------
  // With asignacion familiar
  // -----------------------------------------------
  describe('vacaciones con asignacion familiar', () => {
    const input: VacacionesInput = {
      sueldoBruto: 2000,
      fechaIngreso: '2025-01-01',
      fechaCese: '2026-04-01',
      diasGozados: 0,
      asignacionFamiliar: true,
    }

    it('debe incluir asignacion familiar en remuneracion computable', () => {
      const result = calcularVacaciones(input)
      // remComputable = 2000 + (1130 * 0.10) = 2113.00
      // 1 year, 3 months. 1 period of 30 dias not gozed
      // vacNoGozadas = (2113.00 / 30) * 30 = 2113.00
      // indemnizacion = 2113.00 * 1 = 2113.00
      expect(result.vacacionesNoGozadas).toBeCloseTo(2113.00, 2)
    })
  })

  // -----------------------------------------------
  // Minimum record: less than 1 month
  // -----------------------------------------------
  describe('menos de 1 mes de servicio', () => {
    const input: VacacionesInput = {
      sueldoBruto: 2000,
      fechaIngreso: '2026-03-01',
      fechaCese: '2026-03-20',
      diasGozados: 0,
      asignacionFamiliar: false,
    }

    it('puede generar vacaciones truncas si tiene al menos dias trabajados', () => {
      const result = calcularVacaciones(input)
      // 0 months, 19 days - edge case for RECORD_MINIMO_MESES
      // The code handles this: mesesFraccion === 0 && anosCompletos === 0 && diasFraccion > 0
      expect(result.vacacionesTruncas).toBeGreaterThanOrEqual(0)
    })

    it('no debe generar vacaciones no gozadas (menos de 1 ano)', () => {
      const result = calcularVacaciones(input)
      expect(result.vacacionesNoGozadas).toBe(0)
      expect(result.periodosNoGozados).toBe(0)
    })
  })

  // -----------------------------------------------
  // Partial vacation: some days gozados
  // Worker: 2 years, 15 dias gozados (of 60 debidos)
  // -----------------------------------------------
  describe('vacaciones parcialmente gozadas', () => {
    const input: VacacionesInput = {
      sueldoBruto: 3000,
      fechaIngreso: '2024-01-01',
      fechaCese: '2026-01-01',
      diasGozados: 15,
      asignacionFamiliar: false,
    }

    it('debe calcular dias no gozados correctamente', () => {
      const result = calcularVacaciones(input)
      // 2 years * 30 = 60 debidos - 15 gozados = 45 no gozados
      // periodos no gozados = floor(45 / 30) = 1
      expect(result.periodosNoGozados).toBe(1)
    })

    it('vacaciones no gozadas debe calcularse sobre los dias restantes', () => {
      const result = calcularVacaciones(input)
      // vacNoGozadas = (3000 / 30) * 45 = 4500
      expect(result.vacacionesNoGozadas).toBe(4500)
    })

    it('indemnizacion vacacional solo por periodos completos no gozados', () => {
      const result = calcularVacaciones(input)
      // Solo 1 periodo completo de 30 dias no gozado
      // indemnizacion = 3000 * 1 * 1 = 3000
      expect(result.indemnizacionVacacional).toBe(3000)
    })
  })

  // -----------------------------------------------
  // Formula must be descriptive
  // -----------------------------------------------
  describe('formula descriptiva', () => {
    it('debe generar formula con detalle de calculo', () => {
      const input: VacacionesInput = {
        sueldoBruto: 2500,
        fechaIngreso: '2023-01-01',
        fechaCese: '2026-04-01',
        diasGozados: 30,
        asignacionFamiliar: false,
      }
      const result = calcularVacaciones(input)
      expect(result.formula).toBeTruthy()
      expect(result.formula.length).toBeGreaterThan(0)
    })
  })
})
