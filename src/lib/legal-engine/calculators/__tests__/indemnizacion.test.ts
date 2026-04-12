import { calcularIndemnizacion } from '../indemnizacion'
import { IndemnizacionInput } from '../../types'
import { PERU_LABOR } from '../../peru-labor'

describe('calcularIndemnizacion', () => {
  const configIndef = PERU_LABOR.INDEMNIZACION.INDEFINIDO
  const configPlazoFijo = PERU_LABOR.INDEMNIZACION.PLAZO_FIJO

  // -----------------------------------------------
  // Contrato indefinido: 1.5 sueldos por ano
  // Worker: S/ 3,000, 3 years service
  // Indemnizacion = 1.5 * 3000 * 3 = 13,500
  // -----------------------------------------------
  describe('contrato indefinido - calculo basico', () => {
    const input: IndemnizacionInput = {
      sueldoBruto: 3000,
      fechaIngreso: '2023-03-15',
      fechaDespido: '2026-03-15',
      tipoContrato: 'indefinido',
    }

    it('debe calcular 3 anos de servicio', () => {
      const result = calcularIndemnizacion(input)
      expect(result.anosServicio).toBe(3)
    })

    it('debe calcular indemnizacion = 1.5 * sueldo * anos', () => {
      const result = calcularIndemnizacion(input)
      // 1.5 * 3000 * 3 = 13,500
      expect(result.indemnizacion).toBe(13500)
    })

    it('no debe aplicar tope para 3 anos', () => {
      const result = calcularIndemnizacion(input)
      // Tope = 12 * 3000 = 36,000. 13,500 < 36,000
      expect(result.topeAplicado).toBe(false)
    })

    it('debe calcular tope maximo correctamente', () => {
      const result = calcularIndemnizacion(input)
      // topeMaximo = 12 * 3000 = 36,000
      expect(result.topeMaximo).toBe(36000)
    })

    it('debe referenciar D.S. 003-97-TR como base legal', () => {
      const result = calcularIndemnizacion(input)
      expect(result.baseLegal).toBe(configIndef.BASE_LEGAL)
    })
  })

  // -----------------------------------------------
  // Contrato indefinido: con fraccion de meses
  // Worker: 2 years and 6 months
  // -----------------------------------------------
  describe('contrato indefinido - con fraccion de meses', () => {
    const input: IndemnizacionInput = {
      sueldoBruto: 4000,
      fechaIngreso: '2023-09-15',
      fechaDespido: '2026-03-15',
      tipoContrato: 'indefinido',
    }

    it('debe calcular anos y meses de servicio correctamente', () => {
      const result = calcularIndemnizacion(input)
      expect(result.anosServicio).toBe(2)
      expect(result.mesesFraccion).toBe(6)
    })

    it('debe incluir fraccion proporcional por meses', () => {
      const result = calcularIndemnizacion(input)
      // 1.5 * 4000 * 2 = 12,000 (por anos)
      // (1.5 * 4000 / 12) * 6 = 3,000 (por fraccion)
      // Total = 15,000
      expect(result.indemnizacion).toBe(15000)
    })
  })

  // -----------------------------------------------
  // Tope de 12 remuneraciones aplicado
  // Worker: S/ 5,000, 10 years service
  // Without cap: 1.5 * 5000 * 10 = 75,000
  // Cap: 12 * 5000 = 60,000
  // -----------------------------------------------
  describe('contrato indefinido - tope de 12 remuneraciones', () => {
    const input: IndemnizacionInput = {
      sueldoBruto: 5000,
      fechaIngreso: '2016-03-15',
      fechaDespido: '2026-03-15',
      tipoContrato: 'indefinido',
    }

    it('debe aplicar tope de 12 remuneraciones', () => {
      const result = calcularIndemnizacion(input)
      expect(result.topeAplicado).toBe(true)
    })

    it('indemnizacion debe ser exactamente 12 sueldos', () => {
      const result = calcularIndemnizacion(input)
      // tope = 12 * 5000 = 60,000
      expect(result.indemnizacion).toBe(60000)
    })

    it('topeMaximo debe coincidir con indemnizacion cuando se aplica tope', () => {
      const result = calcularIndemnizacion(input)
      expect(result.indemnizacion).toBe(result.topeMaximo)
    })

    it('formula debe mencionar el tope aplicado', () => {
      const result = calcularIndemnizacion(input)
      expect(result.formula).toContain('TOPE APLICADO')
    })
  })

  // -----------------------------------------------
  // Contrato indefinido: servicio menor a 1 ano
  // Worker: 8 months
  // -----------------------------------------------
  describe('contrato indefinido - menos de 1 ano', () => {
    const input: IndemnizacionInput = {
      sueldoBruto: 2000,
      fechaIngreso: '2025-07-15',
      fechaDespido: '2026-03-15',
      tipoContrato: 'indefinido',
    }

    it('debe tener 0 anos de servicio', () => {
      const result = calcularIndemnizacion(input)
      expect(result.anosServicio).toBe(0)
    })

    it('debe calcular fraccion proporcional solo por meses', () => {
      const result = calcularIndemnizacion(input)
      expect(result.mesesFraccion).toBe(8)
      // (1.5 * 2000 / 12) * 8 = 2000
      expect(result.indemnizacion).toBe(2000)
    })
  })

  // -----------------------------------------------
  // Contrato a plazo fijo
  // Worker: despido con 6 months remaining
  // -----------------------------------------------
  describe('contrato a plazo fijo', () => {
    const input: IndemnizacionInput = {
      sueldoBruto: 3000,
      fechaIngreso: '2025-01-01',
      fechaDespido: '2026-01-01',
      tipoContrato: 'plazo_fijo',
      fechaFinContrato: '2026-07-01', // 6 months remaining
    }

    it('debe calcular indemnizacion basada en meses restantes', () => {
      const result = calcularIndemnizacion(input)
      // Art. 76 D.S. 003-97-TR: 1.5 remuneraciones × mes restante
      // meses restantes = 6
      // indemnizacion = 1.5 × 3000 × 6 = 27,000
      // tope = 12 × 3000 = 36,000 (no aplica, 27k < 36k)
      expect(result.indemnizacion).toBeCloseTo(27000, 0)
      expect(result.topeAplicado).toBe(false)
    })

    it('debe referenciar Art. 76 como base legal', () => {
      const result = calcularIndemnizacion(input)
      expect(result.baseLegal).toBe(configPlazoFijo.BASE_LEGAL)
    })
  })

  // -----------------------------------------------
  // Contrato a plazo fijo: tope de 12 remuneraciones
  // Worker with many months remaining
  // -----------------------------------------------
  describe('contrato a plazo fijo - tope de 12 remuneraciones', () => {
    const input: IndemnizacionInput = {
      sueldoBruto: 4000,
      fechaIngreso: '2024-01-01',
      fechaDespido: '2025-01-01',
      tipoContrato: 'plazo_fijo',
      fechaFinContrato: '2034-01-01', // 9 years remaining (108 months)
    }

    it('debe aplicar tope de 12 remuneraciones', () => {
      const result = calcularIndemnizacion(input)
      expect(result.topeAplicado).toBe(true)
      // tope = 12 * 4000 = 48,000
      expect(result.indemnizacion).toBe(48000)
    })
  })

  // -----------------------------------------------
  // Contrato a plazo fijo: sin fechaFinContrato -> error
  // -----------------------------------------------
  describe('contrato a plazo fijo sin fechaFinContrato', () => {
    it('debe lanzar error si no se provee fechaFinContrato', () => {
      const input: IndemnizacionInput = {
        sueldoBruto: 3000,
        fechaIngreso: '2025-01-01',
        fechaDespido: '2026-01-01',
        tipoContrato: 'plazo_fijo',
        // fechaFinContrato is missing
      }

      expect(() => calcularIndemnizacion(input)).toThrow()
    })
  })

  // -----------------------------------------------
  // Contrato indefinido: dias fraccionados
  // Worker: 1 year 3 months 10 days
  // -----------------------------------------------
  describe('contrato indefinido - con dias fraccionados', () => {
    const input: IndemnizacionInput = {
      sueldoBruto: 2400,
      fechaIngreso: '2025-01-05',
      fechaDespido: '2026-04-15',
      tipoContrato: 'indefinido',
    }

    it('debe incluir fraccion por dias en el calculo', () => {
      const result = calcularIndemnizacion(input)
      // 1 year, 3 months, 10 days
      // 1.5 * 2400 * 1 = 3600 (por ano)
      // (1.5 * 2400 / 12) * 3 = 900 (por meses)
      // (1.5 * 2400 / 360) * 10 = 100 (por dias)
      // Total = 4600
      expect(result.anosServicio).toBe(1)
      expect(result.mesesFraccion).toBe(3)
      expect(result.indemnizacion).toBeCloseTo(4600, 0)
    })
  })
})
