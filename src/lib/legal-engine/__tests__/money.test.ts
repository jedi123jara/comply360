/**
 * Tests para Money (FIX #2.A).
 */

import { describe, it, expect } from 'vitest'
import { money, sumMoney } from '../money'

describe('Money construcción', () => {
  it('acepta number', () => {
    expect(money(100).toNumber()).toBe(100)
    expect(money(100.50).toNumber()).toBe(100.5)
  })

  it('acepta string', () => {
    expect(money('1234.56').toNumber()).toBe(1234.56)
  })

  it('acepta otro Money', () => {
    const m1 = money(50)
    const m2 = money(m1)
    expect(m2.toNumber()).toBe(50)
  })

  it('lanza con NaN/Infinity', () => {
    expect(() => money(NaN)).toThrow()
    expect(() => money(Infinity)).toThrow()
  })
})

describe('Money operaciones', () => {
  it('add suma exacta sin floating point', () => {
    // 0.1 + 0.2 ≠ 0.3 en JS native, pero con Money sí
    const r = money(0.1).add(0.2)
    expect(r.toNumber()).toBe(0.3)
  })

  it('add encadenable', () => {
    const r = money(100).add(50).add(25.50)
    expect(r.toNumber()).toBe(175.5)
  })

  it('sub', () => {
    expect(money(1000).sub(250.75).toNumber()).toBe(749.25)
  })

  it('mul', () => {
    expect(money(2500).mul(0.0972).toNumber()).toBe(243)
  })

  it('div con divisor distinto de 0', () => {
    expect(money(3500).div(12).toNumber()).toBe(291.67)
  })

  it('div por cero lanza', () => {
    expect(() => money(100).div(0)).toThrow(/división por cero/)
  })
})

describe('Money inmutabilidad', () => {
  it('add no muta el original', () => {
    const m = money(100)
    const r = m.add(50)
    expect(m.toNumber()).toBe(100)
    expect(r.toNumber()).toBe(150)
  })
})

describe('Money comparaciones', () => {
  it('cmp', () => {
    expect(money(100).cmp(50)).toBe(1)
    expect(money(50).cmp(100)).toBe(-1)
    expect(money(50).cmp(50)).toBe(0)
  })

  it('isZero / isNegative / isPositive', () => {
    expect(money(0).isZero()).toBe(true)
    expect(money(-10).isNegative()).toBe(true)
    expect(money(10).isPositive()).toBe(true)
    expect(money(0).isPositive()).toBe(false)
  })

  it('max / min', () => {
    expect(money(100).max(50).toNumber()).toBe(100)
    expect(money(100).max(150).toNumber()).toBe(150)
    expect(money(100).min(50).toNumber()).toBe(50)
    expect(money(100).min(150).toNumber()).toBe(100)
  })
})

describe('Money formateo', () => {
  it('toFixed', () => {
    expect(money(1234.5).toFixed(2)).toBe('1234.50')
    expect(money(1234.567).toFixed(2)).toBe('1234.57')
  })

  it('toFormatted', () => {
    expect(money(1234.5).toFormatted()).toMatch(/S\/ 1[,.]234[.,]50/)
  })

  it('toJSON da number', () => {
    expect(JSON.stringify({ x: money(100) })).toBe('{"x":100}')
  })
})

describe('Money — caso real CTS', () => {
  it('CTS = (rem+1/6grati)/12 × meses + (rem+1/6grati)/360 × días', () => {
    // Caso: rem = 3000 + asig 113 = 3113, ultimaGrati = 3113
    // remComputable = 3113 + 3113/6 = 3113 + 518.83 = 3631.83
    // ctsMensual = 3631.83 / 12 = 302.65
    // ctsDiaria = 3631.83 / 360 = 10.09
    // 6 meses + 0 días = 302.65 × 6 = 1815.92
    const rem = money(3000).add(113)
    const grati = money(3113)
    const remComp = rem.add(grati.div(6))
    const ctsMensual = remComp.div(12)
    const ctsDiaria = remComp.div(360)
    const total = ctsMensual.mul(6).add(ctsDiaria.mul(0))
    expect(total.toNumber()).toBeCloseTo(1815.92, 1)
  })
})

describe('sumMoney', () => {
  it('suma una lista correcta', () => {
    const r = sumMoney([100, 50, 25.50, money(10)])
    expect(r.toNumber()).toBe(185.5)
  })

  it('lista vacía → 0', () => {
    expect(sumMoney([]).toNumber()).toBe(0)
  })

  it('precisión: suma de 100 × 0.1 = 10 exacto (no 9.999...)', () => {
    const list = Array.from({ length: 100 }, () => 0.1)
    expect(sumMoney(list).toNumber()).toBe(10)
  })
})
