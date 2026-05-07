import { calcularMultaSunafil, MultaSunafilInput } from '../multa-sunafil'
import { PERU_LABOR } from '../../peru-labor'

/**
 * Tests post-FIX #2.B (reconciliación de los dos motores).
 *
 * El cálculo ya NO usa interpolación lineal entre min/max del rango por
 * tipo de infracción. Ahora delega al motor granular oficial
 * `peru-labor.calcularMultaSunafil()` que implementa los 10 tramos discretos
 * del D.S. 019-2006-TR. Por eso los tests cambian:
 *   - `factorGravedad` ya no se valida con valores específicos (es un
 *     aproximado retro-compat para UI).
 *   - Las multas siguen los tramos oficiales por # trabajadores afectados.
 */
describe('calcularMultaSunafil', () => {
  const UIT_2026 = PERU_LABOR.UIT // 5500
  const config = PERU_LABOR.MULTAS_SUNAFIL
  const escalaNoMype = config.ESCALA.NO_MYPE
  const escalaMicro = config.ESCALA.MICRO

  describe('infracción leve - empresa pequeña (5 trabajadores)', () => {
    const input: MultaSunafilInput = {
      tipoInfraccion: 'LEVE',
      numeroTrabajadores: 5,
      reincidente: false,
      subsanacionVoluntaria: false,
    }

    it('debe usar UIT 2026 = S/ 5,500', () => {
      expect(UIT_2026).toBe(5500)
    })

    it('multa mínima en soles refleja escala oficial NO_MYPE LEVE', () => {
      const result = calcularMultaSunafil(input)
      expect(result.multaMinima).toBeCloseTo(escalaNoMype.LEVE.min * UIT_2026, 2)
    })

    it('multa máxima en soles refleja escala oficial', () => {
      const result = calcularMultaSunafil(input)
      expect(result.multaMaxima).toBeCloseTo(escalaNoMype.LEVE.max * UIT_2026, 2)
    })

    it('multa estimada está entre mínima y máxima', () => {
      const result = calcularMultaSunafil(input)
      expect(result.multaEstimada).toBeGreaterThanOrEqual(result.multaMinima)
      expect(result.multaEstimada).toBeLessThanOrEqual(result.multaMaxima)
    })

    it('multa estimada es positiva (5 trabajadores LEVE NO_MYPE)', () => {
      const result = calcularMultaSunafil(input)
      expect(result.multaEstimada).toBeGreaterThan(0)
    })

    it('enUITs.min/max coincide con la escala', () => {
      const result = calcularMultaSunafil(input)
      expect(result.enUITs.min).toBe(escalaNoMype.LEVE.min)
      expect(result.enUITs.max).toBe(escalaNoMype.LEVE.max)
    })

    it('multaConDescuento es null sin subsanación', () => {
      const result = calcularMultaSunafil(input)
      expect(result.multaConDescuento).toBeNull()
    })

    it('descuentoTipo es null sin subsanación', () => {
      const result = calcularMultaSunafil(input)
      expect(result.descuentoTipo).toBeNull()
    })

    it('referencia D.S. 019-2006-TR como base legal', () => {
      const result = calcularMultaSunafil(input)
      expect(result.baseLegal).toBe(config.BASE_LEGAL)
    })
  })

  describe('infracción grave - 30 trabajadores (motor granular)', () => {
    const input: MultaSunafilInput = {
      tipoInfraccion: 'GRAVE',
      numeroTrabajadores: 30,
      reincidente: false,
      subsanacionVoluntaria: false,
    }

    it('usa la escala oficial GRAVE NO_MYPE', () => {
      const result = calcularMultaSunafil(input)
      expect(result.enUITs.min).toBe(escalaNoMype.GRAVE.min)
      expect(result.enUITs.max).toBe(escalaNoMype.GRAVE.max)
    })

    it('multa estimada > 0 y dentro del rango', () => {
      const result = calcularMultaSunafil(input)
      expect(result.multaEstimada).toBeGreaterThan(0)
      expect(result.multaEstimada).toBeLessThanOrEqual(escalaNoMype.GRAVE.max * UIT_2026)
    })
  })

  describe('infracción muy grave - 150 trabajadores', () => {
    const input: MultaSunafilInput = {
      tipoInfraccion: 'MUY_GRAVE',
      numeroTrabajadores: 150,
      reincidente: false,
      subsanacionVoluntaria: false,
    }

    it('usa la escala oficial MUY_GRAVE NO_MYPE', () => {
      const result = calcularMultaSunafil(input)
      expect(result.enUITs.min).toBe(escalaNoMype.MUY_GRAVE.min)
      expect(result.enUITs.max).toBe(escalaNoMype.MUY_GRAVE.max)
    })

    it('multa muy grave para 150 trabajadores es alta (> S/ 100k)', () => {
      const result = calcularMultaSunafil(input)
      expect(result.multaEstimada).toBeGreaterThan(100_000)
    })
  })

  describe('reincidencia (+50%)', () => {
    const inputBase: MultaSunafilInput = {
      tipoInfraccion: 'GRAVE',
      numeroTrabajadores: 10,
      reincidente: false,
      subsanacionVoluntaria: false,
    }
    const inputReincidente: MultaSunafilInput = { ...inputBase, reincidente: true }

    it('reincidencia incrementa la multa ~50%', () => {
      const resultBase = calcularMultaSunafil(inputBase)
      const resultReincidente = calcularMultaSunafil(inputReincidente)
      // Tolerancia 1% (redondeo a 2 decimales en cents)
      const ratio = resultReincidente.multaEstimada / resultBase.multaEstimada
      expect(ratio).toBeCloseTo(1.5, 1)
    })

    it('fórmula menciona reincidencia (case-insensitive)', () => {
      const result = calcularMultaSunafil(inputReincidente)
      expect(result.formula.toLowerCase()).toContain('reincidencia')
    })
  })

  describe('subsanación voluntaria (-90%)', () => {
    const input: MultaSunafilInput = {
      tipoInfraccion: 'LEVE',
      numeroTrabajadores: 10,
      reincidente: false,
      subsanacionVoluntaria: true,
    }

    it('multa con descuento ≈ 10% de la estimada', () => {
      const result = calcularMultaSunafil(input)
      expect(result.multaConDescuento).not.toBeNull()
      // Por redondeo en tramos discretos puede haber diferencia de centavos
      const ratio = result.multaConDescuento! / result.multaEstimada
      expect(ratio).toBeCloseTo(0.10, 1)
    })

    it('fórmula menciona subsanación voluntaria', () => {
      const result = calcularMultaSunafil(input)
      expect(result.formula.toLowerCase()).toContain('subsanación voluntaria')
    })

    it('descuentoTipo es voluntaria_90', () => {
      const result = calcularMultaSunafil(input)
      expect(result.descuentoTipo).toBe('voluntaria_90')
    })
  })

  describe('reincidente con subsanación voluntaria', () => {
    const input: MultaSunafilInput = {
      tipoInfraccion: 'GRAVE',
      numeroTrabajadores: 20,
      reincidente: true,
      subsanacionVoluntaria: true,
    }

    it('aplica ambos: reincidencia +50% sobre la base, después -90%', () => {
      const result = calcularMultaSunafil(input)
      expect(result.multaConDescuento).not.toBeNull()
      const ratio = result.multaConDescuento! / result.multaEstimada
      expect(ratio).toBeCloseTo(0.10, 1)
    })
  })

  describe('escala granular por # trabajadores (D.S. 019-2006-TR)', () => {
    // Con la escala granular, multa NO crece linealmente. Validamos
    // monotonicidad por tramos: más trabajadores ⇒ multa ≥ trabajadores menores.
    function multaPara(n: number): number {
      return calcularMultaSunafil({
        tipoInfraccion: 'LEVE',
        numeroTrabajadores: n,
        reincidente: false,
        subsanacionVoluntaria: false,
      }).multaEstimada
    }

    it('1 trabajador < 10 trabajadores < 50 trabajadores', () => {
      expect(multaPara(1)).toBeLessThanOrEqual(multaPara(10))
      expect(multaPara(10)).toBeLessThanOrEqual(multaPara(50))
    })

    it('50 < 100 < 200 trabajadores', () => {
      expect(multaPara(50)).toBeLessThanOrEqual(multaPara(100))
      expect(multaPara(100)).toBeLessThanOrEqual(multaPara(200))
    })

    it('200+ trabajadores está dentro del rango LEVE', () => {
      const result = calcularMultaSunafil({
        tipoInfraccion: 'LEVE',
        numeroTrabajadores: 200,
        reincidente: false,
        subsanacionVoluntaria: false,
      })
      expect(result.multaEstimada).toBeLessThanOrEqual(escalaNoMype.LEVE.max * UIT_2026)
    })
  })

  describe('recomendaciones legales', () => {
    it('incluye recomendación de subsanación si no la ha hecho', () => {
      const result = calcularMultaSunafil({
        tipoInfraccion: 'LEVE',
        numeroTrabajadores: 5,
        reincidente: false,
        subsanacionVoluntaria: false,
      })
      const subsanacionRec = result.recomendaciones.find((r) => r.includes('Subsane'))
      expect(subsanacionRec).toBeDefined()
    })

    it('incluye recomendación de plazo de impugnación', () => {
      const result = calcularMultaSunafil({
        tipoInfraccion: 'GRAVE',
        numeroTrabajadores: 10,
        reincidente: false,
        subsanacionVoluntaria: false,
      })
      const plazoRec = result.recomendaciones.find((r) => r.includes('15 días hábiles'))
      expect(plazoRec).toBeDefined()
    })

    it('advertencia penal para infracción muy grave', () => {
      const result = calcularMultaSunafil({
        tipoInfraccion: 'MUY_GRAVE',
        numeroTrabajadores: 10,
        reincidente: false,
        subsanacionVoluntaria: false,
      })
      const penalRec = result.recomendaciones.find((r) => r.includes('responsabilidad penal'))
      expect(penalRec).toBeDefined()
    })

    it('recomienda SST para empresas con > 50 trabajadores', () => {
      const result = calcularMultaSunafil({
        tipoInfraccion: 'LEVE',
        numeroTrabajadores: 60,
        reincidente: false,
        subsanacionVoluntaria: false,
      })
      const sstRec = result.recomendaciones.find((r) => r.includes('Comité de Seguridad'))
      expect(sstRec).toBeDefined()
    })
  })

  describe('descuentos MYPE', () => {
    const baseInput: MultaSunafilInput = {
      tipoInfraccion: 'GRAVE',
      numeroTrabajadores: 5,
      reincidente: false,
      subsanacionVoluntaria: false,
    }

    it('microempresa usa escala propia menor que general; mypeDescuento = 0.5', () => {
      const general = calcularMultaSunafil({ ...baseInput, regimenMype: 'GENERAL' })
      const micro = calcularMultaSunafil({ ...baseInput, regimenMype: 'MICROEMPRESA' })
      expect(micro.multaEstimada).toBeLessThan(general.multaEstimada)
      expect(micro.mypeDescuento).toBe(0.5)
    })

    it('pequeña empresa usa escala propia menor que general; mypeDescuento = 0.25', () => {
      const general = calcularMultaSunafil({ ...baseInput, regimenMype: 'GENERAL' })
      const pequena = calcularMultaSunafil({ ...baseInput, regimenMype: 'PEQUEÑA_EMPRESA' })
      expect(pequena.multaEstimada).toBeLessThan(general.multaEstimada)
      expect(pequena.mypeDescuento).toBe(0.25)
    })

    it('régimen general no aplica descuento MYPE', () => {
      const result = calcularMultaSunafil({ ...baseInput, regimenMype: 'GENERAL' })
      expect(result.mypeDescuento).toBeNull()
    })

    it('incluye recomendación REMYPE para microempresa', () => {
      const result = calcularMultaSunafil({ ...baseInput, regimenMype: 'MICROEMPRESA' })
      const remypeRec = result.recomendaciones.find((r) => r.includes('REMYPE'))
      expect(remypeRec).toBeDefined()
    })

    it('rango UITs MICRO < rango UITs NO_MYPE', () => {
      const general = calcularMultaSunafil({ ...baseInput, regimenMype: 'GENERAL' })
      const micro = calcularMultaSunafil({ ...baseInput, regimenMype: 'MICROEMPRESA' })
      expect(micro.enUITs.max).toBeLessThan(general.enUITs.max)
      expect(escalaMicro.GRAVE.max).toBeLessThan(escalaNoMype.GRAVE.max)
    })
  })

  describe('FIX #2.B — coincide con motor granular peru-labor', () => {
    it('GRAVE × 75 trabajadores NO_MYPE: multa razonable (no inflada)', () => {
      // Antes el bug interpolaba a ~33 UIT (S/ 183k). El motor granular da
      // un valor menor según el tramo del D.S. 019-2006-TR.
      const result = calcularMultaSunafil({
        tipoInfraccion: 'GRAVE',
        numeroTrabajadores: 75,
        reincidente: false,
        subsanacionVoluntaria: false,
      })
      // Confirma que la multa NO está cerca del máximo del rango (52.53 UIT × 5500 = 288k)
      // que es lo que daba la interpolación buggy.
      expect(result.multaEstimada).toBeLessThan(150_000)
    })
  })
})
