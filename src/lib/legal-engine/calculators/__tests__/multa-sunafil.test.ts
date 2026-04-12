import { calcularMultaSunafil, MultaSunafilInput } from '../multa-sunafil'
import { PERU_LABOR } from '../../peru-labor'

describe('calcularMultaSunafil', () => {
  const UIT_2026 = PERU_LABOR.UIT // 5500
  const config = PERU_LABOR.MULTAS_SUNAFIL
  // Usamos la escala oficial por régimen (fuente única)
  const escalaNoMype = config.ESCALA.NO_MYPE

  // -----------------------------------------------
  // Infraccion LEVE, pocos trabajadores (régimen general)
  // -----------------------------------------------
  describe('infraccion leve - empresa pequena (5 trabajadores)', () => {
    const input: MultaSunafilInput = {
      tipoInfraccion: 'LEVE',
      numeroTrabajadores: 5,
      reincidente: false,
      subsanacionVoluntaria: false,
    }

    it('debe usar UIT 2026 = S/ 5,500', () => {
      expect(UIT_2026).toBe(5500)
    })

    it('debe calcular multa minima en soles correctamente', () => {
      const result = calcularMultaSunafil(input)
      // multaMinima = 0.26 * 5500 (NO_MYPE LEVE min)
      expect(result.multaMinima).toBeCloseTo(escalaNoMype.LEVE.min * UIT_2026, 2)
    })

    it('debe calcular multa maxima en soles correctamente', () => {
      const result = calcularMultaSunafil(input)
      // multaMaxima = 26.12 * 5500 (NO_MYPE LEVE max)
      expect(result.multaMaxima).toBeCloseTo(escalaNoMype.LEVE.max * UIT_2026, 2)
    })

    it('multa estimada debe estar entre minima y maxima', () => {
      const result = calcularMultaSunafil(input)
      expect(result.multaEstimada).toBeGreaterThanOrEqual(result.multaMinima)
      expect(result.multaEstimada).toBeLessThanOrEqual(result.multaMaxima)
    })

    it('debe retornar factor de gravedad entre 0 y 1', () => {
      const result = calcularMultaSunafil(input)
      // 5 workers: (5/10) * 0.25 = 0.125
      expect(result.factorGravedad).toBeCloseTo(0.125, 3)
    })

    it('enUITs debe reflejar rango LEVE NO_MYPE', () => {
      const result = calcularMultaSunafil(input)
      expect(result.enUITs.min).toBe(escalaNoMype.LEVE.min)
      expect(result.enUITs.max).toBe(escalaNoMype.LEVE.max)
    })

    it('multaConDescuento debe ser null sin subsanacion', () => {
      const result = calcularMultaSunafil(input)
      expect(result.multaConDescuento).toBeNull()
    })

    it('descuentoTipo debe ser null sin subsanacion', () => {
      const result = calcularMultaSunafil(input)
      expect(result.descuentoTipo).toBeNull()
    })

    it('debe referenciar D.S. 019-2006-TR como base legal', () => {
      const result = calcularMultaSunafil(input)
      expect(result.baseLegal).toBe(config.BASE_LEGAL)
    })
  })

  // -----------------------------------------------
  // Infraccion GRAVE, empresa mediana
  // -----------------------------------------------
  describe('infraccion grave - empresa mediana (30 trabajadores)', () => {
    const input: MultaSunafilInput = {
      tipoInfraccion: 'GRAVE',
      numeroTrabajadores: 30,
      reincidente: false,
      subsanacionVoluntaria: false,
    }

    it('debe usar rango de UITs para infraccion grave', () => {
      const result = calcularMultaSunafil(input)
      expect(result.enUITs.min).toBe(config.GRAVE.min)
      expect(result.enUITs.max).toBe(config.GRAVE.max)
    })

    it('factor de gravedad para 30 trabajadores (tramo 11-50)', () => {
      const result = calcularMultaSunafil(input)
      // 11-50 → 0.25 + ((30-10)/40) * 0.25 = 0.25 + 0.125 = 0.375
      expect(result.factorGravedad).toBeCloseTo(0.375, 3)
    })

    it('multa estimada calculada con interpolacion dentro del rango', () => {
      const result = calcularMultaSunafil(input)
      // estimadaUITs = 1.57 + (26.12 - 1.57) * 0.375 = 1.57 + 9.20625 = 10.77625
      // estimada = 10.78 * 5500 = 59,290 approx
      expect(result.multaEstimada).toBeGreaterThan(0)
      expect(result.multaEstimada).toBeLessThanOrEqual(config.GRAVE.max * UIT_2026)
    })
  })

  // -----------------------------------------------
  // Infraccion MUY GRAVE, empresa grande
  // -----------------------------------------------
  describe('infraccion muy grave - empresa grande (150 trabajadores)', () => {
    const input: MultaSunafilInput = {
      tipoInfraccion: 'MUY_GRAVE',
      numeroTrabajadores: 150,
      reincidente: false,
      subsanacionVoluntaria: false,
    }

    it('debe usar rango de UITs para infraccion muy grave', () => {
      const result = calcularMultaSunafil(input)
      expect(result.enUITs.min).toBe(config.MUY_GRAVE.min)
      expect(result.enUITs.max).toBe(config.MUY_GRAVE.max)
    })

    it('factor de gravedad para 150 trabajadores (tramo 100+)', () => {
      const result = calcularMultaSunafil(input)
      // 100+ → 0.75 + (min(150-100, 100)/100) * 0.25 = 0.75 + 0.125 = 0.875
      expect(result.factorGravedad).toBeCloseTo(0.875, 3)
    })

    it('multa estimada debe ser alta para infraccion muy grave', () => {
      const result = calcularMultaSunafil(input)
      expect(result.multaEstimada).toBeGreaterThan(100000)
    })
  })

  // -----------------------------------------------
  // Reincidencia: incremento del 50%
  // -----------------------------------------------
  describe('reincidencia (+50%)', () => {
    const inputBase: MultaSunafilInput = {
      tipoInfraccion: 'GRAVE',
      numeroTrabajadores: 10,
      reincidente: false,
      subsanacionVoluntaria: false,
    }
    const inputReincidente: MultaSunafilInput = {
      ...inputBase,
      reincidente: true,
    }

    it('debe incrementar multa en 50% por reincidencia', () => {
      const resultBase = calcularMultaSunafil(inputBase)
      const resultReincidente = calcularMultaSunafil(inputReincidente)
      expect(resultReincidente.multaEstimada).toBeCloseTo(resultBase.multaEstimada * 1.5, 0)
    })

    it('formula debe mencionar reincidencia', () => {
      const result = calcularMultaSunafil(inputReincidente)
      expect(result.formula).toContain('Reincidencia')
    })
  })

  // -----------------------------------------------
  // Subsanacion voluntaria: descuento del 90% (Art. 40 Ley 28806)
  // -----------------------------------------------
  describe('subsanacion voluntaria (-90%)', () => {
    const input: MultaSunafilInput = {
      tipoInfraccion: 'LEVE',
      numeroTrabajadores: 10,
      reincidente: false,
      subsanacionVoluntaria: true,
    }

    it('debe calcular multa con descuento del 90%', () => {
      const result = calcularMultaSunafil(input)
      expect(result.multaConDescuento).not.toBeNull()
      expect(result.multaConDescuento!).toBeCloseTo(result.multaEstimada * 0.10, 2)
    })

    it('formula debe mencionar subsanacion voluntaria', () => {
      const result = calcularMultaSunafil(input)
      expect(result.formula).toContain('subsanación voluntaria')
    })
  })

  // -----------------------------------------------
  // Reincidente + subsanacion simultaneamente
  // -----------------------------------------------
  describe('reincidente con subsanacion voluntaria', () => {
    const input: MultaSunafilInput = {
      tipoInfraccion: 'GRAVE',
      numeroTrabajadores: 20,
      reincidente: true,
      subsanacionVoluntaria: true,
    }

    it('debe aplicar ambos: +50% reincidencia y -90% subsanacion', () => {
      const result = calcularMultaSunafil(input)
      expect(result.multaConDescuento).not.toBeNull()
      // Multa con descuento = estimada (ya con +50%) * 0.10 (-90% Art. 40 Ley 28806)
      expect(result.multaConDescuento!).toBeCloseTo(result.multaEstimada * 0.10, 2)
    })
  })

  // -----------------------------------------------
  // Factor de gravedad por tramos de trabajadores
  // -----------------------------------------------
  describe('factor de gravedad por tramos', () => {
    it('1 trabajador: factor bajo', () => {
      const result = calcularMultaSunafil({
        tipoInfraccion: 'LEVE',
        numeroTrabajadores: 1,
        reincidente: false,
        subsanacionVoluntaria: false,
      })
      // (1/10) * 0.25 = 0.025
      expect(result.factorGravedad).toBeCloseTo(0.025, 3)
    })

    it('10 trabajadores: borde del primer tramo', () => {
      const result = calcularMultaSunafil({
        tipoInfraccion: 'LEVE',
        numeroTrabajadores: 10,
        reincidente: false,
        subsanacionVoluntaria: false,
      })
      // (10/10) * 0.25 = 0.25
      expect(result.factorGravedad).toBeCloseTo(0.25, 3)
    })

    it('50 trabajadores: borde del segundo tramo', () => {
      const result = calcularMultaSunafil({
        tipoInfraccion: 'LEVE',
        numeroTrabajadores: 50,
        reincidente: false,
        subsanacionVoluntaria: false,
      })
      // 0.25 + ((50-10)/40) * 0.25 = 0.25 + 0.25 = 0.50
      expect(result.factorGravedad).toBeCloseTo(0.5, 3)
    })

    it('100 trabajadores: borde del tercer tramo', () => {
      const result = calcularMultaSunafil({
        tipoInfraccion: 'LEVE',
        numeroTrabajadores: 100,
        reincidente: false,
        subsanacionVoluntaria: false,
      })
      // 0.50 + ((100-50)/50) * 0.25 = 0.50 + 0.25 = 0.75
      expect(result.factorGravedad).toBeCloseTo(0.75, 3)
    })

    it('200+ trabajadores: factor maximo de 1.0', () => {
      const result = calcularMultaSunafil({
        tipoInfraccion: 'LEVE',
        numeroTrabajadores: 200,
        reincidente: false,
        subsanacionVoluntaria: false,
      })
      // 0.75 + (min(100,100)/100) * 0.25 = 0.75 + 0.25 = 1.0
      expect(result.factorGravedad).toBeCloseTo(1.0, 3)
    })
  })

  // -----------------------------------------------
  // Recomendaciones legales
  // -----------------------------------------------
  describe('recomendaciones legales', () => {
    it('debe incluir recomendacion de subsanacion si no la ha hecho', () => {
      const result = calcularMultaSunafil({
        tipoInfraccion: 'LEVE',
        numeroTrabajadores: 5,
        reincidente: false,
        subsanacionVoluntaria: false,
      })
      const subsanacionRec = result.recomendaciones.find(r => r.includes('Subsane'))
      expect(subsanacionRec).toBeDefined()
    })

    it('debe incluir recomendacion de plazo de impugnacion', () => {
      const result = calcularMultaSunafil({
        tipoInfraccion: 'GRAVE',
        numeroTrabajadores: 10,
        reincidente: false,
        subsanacionVoluntaria: false,
      })
      const plazoRec = result.recomendaciones.find(r => r.includes('15 días hábiles'))
      expect(plazoRec).toBeDefined()
    })

    it('debe incluir advertencia penal para infraccion muy grave', () => {
      const result = calcularMultaSunafil({
        tipoInfraccion: 'MUY_GRAVE',
        numeroTrabajadores: 10,
        reincidente: false,
        subsanacionVoluntaria: false,
      })
      const penalRec = result.recomendaciones.find(r => r.includes('responsabilidad penal'))
      expect(penalRec).toBeDefined()
    })

    it('debe recomendar SST para empresas con mas de 50 trabajadores', () => {
      const result = calcularMultaSunafil({
        tipoInfraccion: 'LEVE',
        numeroTrabajadores: 60,
        reincidente: false,
        subsanacionVoluntaria: false,
      })
      const sstRec = result.recomendaciones.find(r => r.includes('Comité de Seguridad'))
      expect(sstRec).toBeDefined()
    })
  })
})

  // -----------------------------------------------
  // MYPE deductions (Sprint 7 feature)
  // -----------------------------------------------
  describe('descuentos MYPE', () => {
    const baseInput: MultaSunafilInput = {
      tipoInfraccion: 'GRAVE',
      numeroTrabajadores: 5,
      reincidente: false,
      subsanacionVoluntaria: false,
    }

    it('microempresa usa escala propia (menor que general) y mypeDescuento = 0.5', () => {
      const general = calcularMultaSunafil({ ...baseInput, regimenMype: 'GENERAL' })
      const micro = calcularMultaSunafil({ ...baseInput, regimenMype: 'MICROEMPRESA' })
      // Escala MICRO independiente (D.S. 008-2020-TR): multa siempre menor que NO_MYPE
      expect(micro.multaEstimada).toBeLessThan(general.multaEstimada)
      expect(micro.mypeDescuento).toBe(0.5)
    })

    it('pequena empresa usa escala propia (menor que general) y mypeDescuento = 0.25', () => {
      const general = calcularMultaSunafil({ ...baseInput, regimenMype: 'GENERAL' })
      const pequena = calcularMultaSunafil({ ...baseInput, regimenMype: 'PEQUEÑA_EMPRESA' })
      // Escala PEQUENA independiente (D.S. 008-2020-TR): multa siempre menor que NO_MYPE
      expect(pequena.multaEstimada).toBeLessThan(general.multaEstimada)
      expect(pequena.mypeDescuento).toBe(0.25)
    })

    it('regimen general no aplica descuento MYPE', () => {
      const result = calcularMultaSunafil({ ...baseInput, regimenMype: 'GENERAL' })
      expect(result.mypeDescuento).toBeNull()
    })

    it('incluye recomendacion REMYPE para microempresa', () => {
      const result = calcularMultaSunafil({ ...baseInput, regimenMype: 'MICROEMPRESA' })
      const remypeRec = result.recomendaciones.find(r => r.includes('REMYPE'))
      expect(remypeRec).toBeDefined()
    })
  })
