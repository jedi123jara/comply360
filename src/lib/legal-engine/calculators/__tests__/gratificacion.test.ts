import { calcularGratificacion } from '../gratificacion'
import { GratificacionInput } from '../../types'
import { PERU_LABOR } from '../../peru-labor'

describe('calcularGratificacion', () => {
  // -----------------------------------------------
  // Full gratificacion: 6 months worked
  // Worker: S/ 3,000 sueldo, no asig familiar
  // -----------------------------------------------
  describe('gratificacion completa (6 meses trabajados)', () => {
    const input: GratificacionInput = {
      sueldoBruto: 3000,
      fechaIngreso: '2020-01-15',
      periodo: 'julio',
      mesesTrabajados: 6,
      asignacionFamiliar: false,
    }

    it('debe otorgar 1 remuneracion completa como gratificacion bruta', () => {
      const result = calcularGratificacion(input)
      // remComputable = 3000 (sin asig familiar)
      // 6 meses completos → gratificacion = remComputable integra
      expect(result.gratificacionBruta).toBe(3000)
    })

    it('debe calcular bonificacion extraordinaria del 9%', () => {
      const result = calcularGratificacion(input)
      // bonif = 3000 * 0.09 = 270
      expect(result.bonificacionExtraordinaria).toBe(270)
    })

    it('debe sumar bruta + bonificacion para total neto', () => {
      const result = calcularGratificacion(input)
      // totalNeto = 3000 + 270 = 3270
      expect(result.totalNeto).toBe(3270)
    })

    it('debe referenciar Ley 27735 como base legal', () => {
      const result = calcularGratificacion(input)
      expect(result.baseLegal).toBe(PERU_LABOR.GRATIFICACION.BASE_LEGAL)
    })
  })

  // -----------------------------------------------
  // Gratificacion trunca: 3 months worked
  // -----------------------------------------------
  describe('gratificacion trunca (parcial, 3 meses)', () => {
    const input: GratificacionInput = {
      sueldoBruto: 4000,
      fechaIngreso: '2026-04-01',
      periodo: 'julio',
      mesesTrabajados: 3,
      asignacionFamiliar: false,
    }

    it('debe calcular gratificacion proporcional a meses trabajados', () => {
      const result = calcularGratificacion(input)
      // remComputable = 4000
      // gratTrunca = (4000 / 6) * 3 = 2000
      expect(result.gratificacionBruta).toBe(2000)
    })

    it('debe calcular bonificacion del 9% sobre monto trunco', () => {
      const result = calcularGratificacion(input)
      // bonif = 2000 * 0.09 = 180
      expect(result.bonificacionExtraordinaria).toBe(180)
    })

    it('debe calcular total neto correcto', () => {
      const result = calcularGratificacion(input)
      // totalNeto = 2000 + 180 = 2180
      expect(result.totalNeto).toBe(2180)
    })

    it('debe indicar en la formula que es trunca', () => {
      const result = calcularGratificacion(input)
      expect(result.formula).toContain('trunca')
    })
  })

  // -----------------------------------------------
  // Gratificacion trunca: 1 month only
  // -----------------------------------------------
  describe('gratificacion trunca (1 mes)', () => {
    const input: GratificacionInput = {
      sueldoBruto: 2500,
      fechaIngreso: '2026-06-01',
      periodo: 'julio',
      mesesTrabajados: 1,
      asignacionFamiliar: false,
    }

    it('debe calcular 1/6 de la remuneracion', () => {
      const result = calcularGratificacion(input)
      // gratTrunca = (2500 / 6) * 1 = 416.67
      expect(result.gratificacionBruta).toBeCloseTo(416.67, 2)
    })

    it('debe calcular bonificacion 9% sobre el monto trunco', () => {
      const result = calcularGratificacion(input)
      // bonif = 416.67 * 0.09 = 37.50
      expect(result.bonificacionExtraordinaria).toBeCloseTo(37.50, 2)
    })
  })

  // -----------------------------------------------
  // Gratificacion with asignacion familiar
  // -----------------------------------------------
  describe('gratificacion con asignacion familiar', () => {
    const input: GratificacionInput = {
      sueldoBruto: 2000,
      fechaIngreso: '2020-01-01',
      periodo: 'diciembre',
      mesesTrabajados: 6,
      asignacionFamiliar: true,
    }

    it('debe incluir asignacion familiar en la remuneracion computable', () => {
      const result = calcularGratificacion(input)
      // remComputable = 2000 + (1130 * 0.10) = 2113.00
      // gratificacionBruta = 2113.00 (6 meses completos)
      expect(result.gratificacionBruta).toBe(2113.00)
    })

    it('debe calcular bonificacion sobre monto con asignacion familiar', () => {
      const result = calcularGratificacion(input)
      // bonif = 2113.00 * 0.09 = 190.17
      expect(result.bonificacionExtraordinaria).toBeCloseTo(190.17, 2)
    })
  })

  // -----------------------------------------------
  // Gratificacion diciembre
  // -----------------------------------------------
  describe('gratificacion de diciembre (Navidad)', () => {
    const input: GratificacionInput = {
      sueldoBruto: 5000,
      fechaIngreso: '2020-01-01',
      periodo: 'diciembre',
      mesesTrabajados: 6,
      asignacionFamiliar: false,
    }

    it('debe calcular gratificacion completa para Navidad', () => {
      const result = calcularGratificacion(input)
      expect(result.gratificacionBruta).toBe(5000)
      expect(result.bonificacionExtraordinaria).toBe(450)
      expect(result.totalNeto).toBe(5450)
    })

    it('debe indicar Navidad en la formula', () => {
      const result = calcularGratificacion(input)
      expect(result.formula).toContain('Navidad')
    })
  })

  // -----------------------------------------------
  // Edge case: 0 months worked
  // -----------------------------------------------
  describe('caso borde: 0 meses trabajados', () => {
    const input: GratificacionInput = {
      sueldoBruto: 3000,
      fechaIngreso: '2026-07-01',
      periodo: 'julio',
      mesesTrabajados: 0,
      asignacionFamiliar: false,
    }

    it('debe retornar gratificacion de 0', () => {
      const result = calcularGratificacion(input)
      expect(result.gratificacionBruta).toBe(0)
      expect(result.bonificacionExtraordinaria).toBe(0)
      expect(result.totalNeto).toBe(0)
    })
  })

  // -----------------------------------------------
  // Edge case: more than 6 months → capped at 6
  // -----------------------------------------------
  describe('caso borde: meses capped a 6', () => {
    const input: GratificacionInput = {
      sueldoBruto: 3000,
      fechaIngreso: '2020-01-01',
      periodo: 'julio',
      mesesTrabajados: 10, // more than 6
      asignacionFamiliar: false,
    }

    it('debe limitar a 6 meses y otorgar gratificacion completa', () => {
      const result = calcularGratificacion(input)
      // Capped at 6 → full gratification
      expect(result.gratificacionBruta).toBe(3000)
    })
  })
})
