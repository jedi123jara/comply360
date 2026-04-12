import { calcularCTS } from '../cts'
import { CTSInput } from '../../types'
import { PERU_LABOR } from '../../peru-labor'

describe('calcularCTS', () => {
  // -----------------------------------------------
  // Basic CTS for regimen general: 6 full months
  // Worker: S/ 3,000 sueldo, no asig familiar
  // Periodo: Nov 1 2025 to May 15 2026 (full semester)
  // Ultima gratificacion: S/ 3,000
  // -----------------------------------------------
  describe('CTS completa - semestre completo (6 meses)', () => {
    const input: CTSInput = {
      sueldoBruto: 3000,
      fechaIngreso: '2020-01-15', // started well before the semester
      fechaCorte: '2026-05-15',   // May 15 deposit
      asignacionFamiliar: false,
      ultimaGratificacion: 3000,
    }

    it('debe calcular 6 meses computables para semestre completo', () => {
      const result = calcularCTS(input)
      expect(result.mesesComputables).toBe(6)
    })

    it('debe incluir 1/6 de gratificacion en remuneracion computable', () => {
      const result = calcularCTS(input)
      // remBase = 3000 (no asig familiar)
      // sextoGratificacion = 3000 / 6 = 500
      // remuneracionComputable = 3000 + 500 = 3500
      expect(result.remuneracionComputable).toBe(3500)
    })

    it('debe calcular CTS para semestre completo', () => {
      const result = calcularCTS(input)
      // Nov 1 to May 15 = 6 months + 14 days
      // CTS = (3500 / 12) * 6 + (3500 / 360) * 14 = 1750 + 136.11... ≈ 1876.39 (with days beyond 6m)
      // Meses are capped at 6, but the period calculation includes extra days
      expect(result.ctsTotal).toBeCloseTo(1876.39, 2)
    })

    it('debe referenciar D.S. 001-97-TR como base legal', () => {
      const result = calcularCTS(input)
      expect(result.baseLegal).toBe(PERU_LABOR.CTS.BASE_LEGAL)
    })
  })

  // -----------------------------------------------
  // CTS with asignacion familiar
  // Sueldo S/ 2,500 + asig familiar (10% RMV = 113.00)
  // -----------------------------------------------
  describe('CTS con asignacion familiar', () => {
    const input: CTSInput = {
      sueldoBruto: 2500,
      fechaIngreso: '2019-06-01',
      fechaCorte: '2026-05-15',
      asignacionFamiliar: true,
      ultimaGratificacion: 2613.00, // sueldo + asig familiar
    }

    it('debe sumar asignacion familiar a la remuneracion computable', () => {
      const result = calcularCTS(input)
      // remBase = 2500 + (1130 * 0.10) = 2500 + 113.00 = 2613.00
      // sextoGratificacion = 2613.00 / 6 = 435.50
      // remuneracionComputable = 2613.00 + 435.50 = 3048.50
      expect(result.remuneracionComputable).toBe(3048.50)
    })

    it('debe calcular CTS correcta con asignacion familiar', () => {
      const result = calcularCTS(input)
      // Nov 1 to May 15 = 6 months + 14 days
      // CTS = (3048.50 / 12) * 6 + (3048.50 / 360) * 14 = 1524.25 + 118.55... ≈ 1634.33 (aprox with days)
      expect(result.ctsTotal).toBeCloseTo(1634.33, 2)
    })
  })

  // -----------------------------------------------
  // CTS trunca: less than 6 months in the semester
  // Worker started Feb 1, 2026 → corte May 15, 2026
  // Only 3 full months (Feb, Mar, Apr) + 15 days (May)
  // -----------------------------------------------
  describe('CTS trunca (menos de 6 meses)', () => {
    const input: CTSInput = {
      sueldoBruto: 2000,
      fechaIngreso: '2026-02-01',
      fechaCorte: '2026-05-15',
      asignacionFamiliar: false,
      ultimaGratificacion: 0, // no gratificacion yet
    }

    it('debe computar menos de 6 meses', () => {
      const result = calcularCTS(input)
      // Feb 1 to May 15 = 3 months and 14 days
      expect(result.mesesComputables).toBeLessThan(6)
      expect(result.mesesComputables).toBeGreaterThanOrEqual(3)
    })

    it('debe calcular CTS proporcional (trunca)', () => {
      const result = calcularCTS(input)
      // remComp = 2000 + 0/6 = 2000
      // CTS = (2000/12) * meses + (2000/360) * dias
      // Should be significantly less than 1000 (which would be 6 months)
      expect(result.ctsTotal).toBeGreaterThan(0)
      expect(result.ctsTotal).toBeLessThan(1000)
    })

    it('debe tener remuneracion computable sin componente de gratificacion', () => {
      const result = calcularCTS(input)
      // No gratificacion → sextoGratificacion = 0
      expect(result.remuneracionComputable).toBe(2000)
    })
  })

  // -----------------------------------------------
  // CTS for November deposit period
  // Worker with full May-Oct semester
  // -----------------------------------------------
  describe('CTS para deposito de noviembre', () => {
    const input: CTSInput = {
      sueldoBruto: 4000,
      fechaIngreso: '2020-03-10',
      fechaCorte: '2026-11-15', // November deposit
      asignacionFamiliar: false,
      ultimaGratificacion: 4000,
    }

    it('debe calcular 6 meses computables para semestre May-Oct', () => {
      const result = calcularCTS(input)
      expect(result.mesesComputables).toBe(6)
    })

    it('debe calcular CTS correcta para deposito noviembre', () => {
      const result = calcularCTS(input)
      // remComp = 4000 + 4000/6 = 4000 + 666.67 = 4666.67
      // May 1 to Nov 15 = 6 months + 14 days
      // CTS = (4666.67 / 12) * 6 + (4666.67 / 360) * 14 = 2333.33 + 181.48... ≈ 2527.78 (with days)
      expect(result.remuneracionComputable).toBeCloseTo(4666.67, 1)
      expect(result.ctsTotal).toBeCloseTo(2527.78, 0)
    })
  })

  // -----------------------------------------------
  // Edge case: worker started in the middle of semester
  // -----------------------------------------------
  describe('trabajador que inicio en medio del semestre', () => {
    const input: CTSInput = {
      sueldoBruto: 1500,
      fechaIngreso: '2026-03-01', // started March 1 (mid Nov-Apr semester)
      fechaCorte: '2026-05-15',
      asignacionFamiliar: false,
      ultimaGratificacion: 0,
    }

    it('debe computar solo desde la fecha de ingreso', () => {
      const result = calcularCTS(input)
      // March 1 to May 15 = 2 months and 14 days
      expect(result.mesesComputables).toBeLessThanOrEqual(3)
    })

    it('debe retornar formula descriptiva no vacia', () => {
      const result = calcularCTS(input)
      expect(result.formula).toBeTruthy()
      expect(result.formula.length).toBeGreaterThan(0)
    })
  })
})
