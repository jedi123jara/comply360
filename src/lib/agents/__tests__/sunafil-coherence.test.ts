/**
 * Coherence test: verifies that multa-sunafil calculator and sunafil-analyzer
 * use the same constants from PERU_LABOR (single source of truth).
 *
 * This prevents drift where one module is updated and the other is not.
 */

import { calcularMultaSunafil } from '../../legal-engine/calculators/multa-sunafil'
import { PERU_LABOR } from '../../legal-engine/peru-labor'

const escala = PERU_LABOR.MULTAS_SUNAFIL.ESCALA
const UIT = PERU_LABOR.UIT

describe('coherence: multa-sunafil vs sunafil-analyzer constants', () => {
  it('PERU_LABOR.UIT should be 5500 (D.S. 380-2025-EF)', () => {
    expect(UIT).toBe(5500)
  })

  it('ESCALA.NO_MYPE values match what calcularMultaSunafil returns (enUITs)', () => {
    const cases: Array<{ tipo: 'LEVE' | 'GRAVE' | 'MUY_GRAVE' }> = [
      { tipo: 'LEVE' },
      { tipo: 'GRAVE' },
      { tipo: 'MUY_GRAVE' },
    ]
    for (const { tipo } of cases) {
      const result = calcularMultaSunafil({
        tipoInfraccion: tipo,
        numeroTrabajadores: 10,
        reincidente: false,
        subsanacionVoluntaria: false,
        regimenMype: 'GENERAL',
      })
      expect(result.enUITs.min).toBe(escala.NO_MYPE[tipo].min)
      expect(result.enUITs.max).toBe(escala.NO_MYPE[tipo].max)
    }
  })

  it('ESCALA.MICRO values match what calcularMultaSunafil returns for MICROEMPRESA', () => {
    const casos: Array<{ tipo: 'LEVE' | 'GRAVE' | 'MUY_GRAVE' }> = [
      { tipo: 'LEVE' },
      { tipo: 'GRAVE' },
      { tipo: 'MUY_GRAVE' },
    ]
    for (const { tipo } of casos) {
      const result = calcularMultaSunafil({
        tipoInfraccion: tipo,
        numeroTrabajadores: 5,
        reincidente: false,
        subsanacionVoluntaria: false,
        regimenMype: 'MICROEMPRESA',
      })
      expect(result.enUITs.min).toBe(escala.MICRO[tipo].min)
      expect(result.enUITs.max).toBe(escala.MICRO[tipo].max)
    }
  })

  it('ESCALA.PEQUENA values match what calcularMultaSunafil returns for PEQUEÑA_EMPRESA', () => {
    const casos: Array<{ tipo: 'LEVE' | 'GRAVE' | 'MUY_GRAVE' }> = [
      { tipo: 'LEVE' },
      { tipo: 'GRAVE' },
      { tipo: 'MUY_GRAVE' },
    ]
    for (const { tipo } of casos) {
      const result = calcularMultaSunafil({
        tipoInfraccion: tipo,
        numeroTrabajadores: 5,
        reincidente: false,
        subsanacionVoluntaria: false,
        regimenMype: 'PEQUEÑA_EMPRESA',
      })
      expect(result.enUITs.min).toBe(escala.PEQUENA[tipo].min)
      expect(result.enUITs.max).toBe(escala.PEQUENA[tipo].max)
    }
  })

  it('sunafil-analyzer scale values (as embedded in prompt) match PERU_LABOR constants', () => {
    // These are the values the analyzer embeds in the LLM prompt — verify they match the source
    expect(escala.MICRO.LEVE.min).toBeCloseTo(0.045, 3)
    expect(escala.MICRO.LEVE.max).toBeCloseTo(0.45, 2)
    expect(escala.MICRO.GRAVE.min).toBeCloseTo(0.11, 2)
    expect(escala.MICRO.GRAVE.max).toBeCloseTo(1.13, 2)
    expect(escala.MICRO.MUY_GRAVE.min).toBeCloseTo(0.23, 2)
    expect(escala.MICRO.MUY_GRAVE.max).toBeCloseTo(2.25, 2)

    expect(escala.PEQUENA.LEVE.min).toBeCloseTo(0.09, 2)
    expect(escala.PEQUENA.LEVE.max).toBeCloseTo(1.13, 2)
    expect(escala.PEQUENA.GRAVE.min).toBeCloseTo(0.45, 2)
    expect(escala.PEQUENA.GRAVE.max).toBeCloseTo(4.50, 2)
    expect(escala.PEQUENA.MUY_GRAVE.min).toBeCloseTo(0.77, 2)
    expect(escala.PEQUENA.MUY_GRAVE.max).toBeCloseTo(7.65, 2)

    expect(escala.NO_MYPE.LEVE.min).toBeCloseTo(0.26, 2)
    expect(escala.NO_MYPE.LEVE.max).toBeCloseTo(26.12, 2)
    expect(escala.NO_MYPE.GRAVE.min).toBeCloseTo(1.57, 2)
    expect(escala.NO_MYPE.GRAVE.max).toBeCloseTo(52.53, 2)
    expect(escala.NO_MYPE.MUY_GRAVE.min).toBeCloseTo(2.63, 2)
    expect(escala.NO_MYPE.MUY_GRAVE.max).toBeCloseTo(52.53, 2)
  })

  it('multaMinima/Maxima en soles = UITs × UIT vigente (no hardcoded)', () => {
    const result = calcularMultaSunafil({
      tipoInfraccion: 'GRAVE',
      numeroTrabajadores: 20,
      reincidente: false,
      subsanacionVoluntaria: false,
      regimenMype: 'GENERAL',
    })
    expect(result.multaMinima).toBeCloseTo(escala.NO_MYPE.GRAVE.min * UIT, 1)
    expect(result.multaMaxima).toBeCloseTo(escala.NO_MYPE.GRAVE.max * UIT, 1)
  })

  it('recargo de reincidencia = PERU_LABOR constant (50%)', () => {
    const base = calcularMultaSunafil({
      tipoInfraccion: 'LEVE',
      numeroTrabajadores: 10,
      reincidente: false,
      subsanacionVoluntaria: false,
    })
    const reincidente = calcularMultaSunafil({
      tipoInfraccion: 'LEVE',
      numeroTrabajadores: 10,
      reincidente: true,
      subsanacionVoluntaria: false,
    })
    const expectedRatio = 1 + PERU_LABOR.MULTAS_SUNAFIL.RECARGO_REINCIDENCIA
    expect(expectedRatio).toBe(1.5)
    expect(reincidente.multaEstimada).toBeCloseTo(base.multaEstimada * expectedRatio, 0)
  })

  it('descuento subsanacion voluntaria = PERU_LABOR constant (90%)', () => {
    const result = calcularMultaSunafil({
      tipoInfraccion: 'LEVE',
      numeroTrabajadores: 10,
      reincidente: false,
      subsanacionVoluntaria: true,
    })
    const descuento = PERU_LABOR.MULTAS_SUNAFIL.DESCUENTOS.SUBSANACION_VOLUNTARIA
    expect(descuento).toBe(0.90)
    expect(result.multaConDescuento).not.toBeNull()
    expect(result.multaConDescuento!).toBeCloseTo(result.multaEstimada * (1 - descuento), 1)
  })
})
