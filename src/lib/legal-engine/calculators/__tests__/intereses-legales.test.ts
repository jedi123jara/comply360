/**
 * Tests para calcularInteresesLegales (D.Ley 25920).
 *
 * Cubren:
 *   - Cálculo correcto con interés simple (NO capitalizable)
 *   - Tasa anual / 360 = factor diario
 *   - Misma fecha inicio/fin → 0 días → interés=0
 *   - Fecha fin anterior → días=0 (no negativos)
 *   - tipoInteres laboral vs efectivo usan tasas distintas
 *   - Casos reales: CTS no depositada, gratificación tardía
 */

import { calcularInteresesLegales } from '../intereses-legales'

describe('calcularInteresesLegales — interés simple (D.Ley 25920)', () => {
  test('caso típico: CTS no depositada, S/3000 atrasada 90 días, tasa laboral 2.27%', () => {
    const r = calcularInteresesLegales({
      capital: 3000,
      fechaInicio: '2025-05-15',
      fechaFin: '2025-08-13', // 90 días
      tipoInteres: 'laboral',
    })

    // factor diario = 2.27 / 100 / 360 = 0.0000631 (aprox)
    // interés = 3000 × 0.0000631 × 90 ≈ 17.025
    expect(r.diasCalculados).toBe(90)
    expect(r.tasaAnual).toBe(2.27)
    expect(r.interesAcumulado).toBeCloseTo(17.03, 1)
    expect(r.total).toBeCloseTo(3017.03, 1)
  })

  test('cero días → interés cero', () => {
    const r = calcularInteresesLegales({
      capital: 5000,
      fechaInicio: '2025-05-15',
      fechaFin: '2025-05-15',
      tipoInteres: 'laboral',
    })
    expect(r.diasCalculados).toBe(0)
    expect(r.interesAcumulado).toBe(0)
    expect(r.total).toBe(5000)
  })

  test('fecha fin anterior a inicio → días=0 (defensivo, no negativo)', () => {
    const r = calcularInteresesLegales({
      capital: 1000,
      fechaInicio: '2025-08-13',
      fechaFin: '2025-05-15',
      tipoInteres: 'laboral',
    })
    expect(r.diasCalculados).toBe(0)
    expect(r.interesAcumulado).toBe(0)
  })

  test('un año completo (360 días financieros): interés = capital × tasa', () => {
    const r = calcularInteresesLegales({
      capital: 10000,
      fechaInicio: '2024-01-01',
      fechaFin: '2024-12-26', // 360 días exactos
      tipoInteres: 'laboral',
    })
    // 10000 × 2.27% × 360/360 = 227
    expect(r.interesAcumulado).toBeCloseTo(227, 1)
    expect(r.total).toBeCloseTo(10227, 1)
  })

  test('interés laboral vs efectivo: tasas distintas dan resultados distintos', () => {
    const args = {
      capital: 5000,
      fechaInicio: '2025-01-01',
      fechaFin: '2025-12-27', // 360 días
    } as const

    const laboral = calcularInteresesLegales({ ...args, tipoInteres: 'laboral' })
    const efectivo = calcularInteresesLegales({ ...args, tipoInteres: 'efectivo' })

    // Laboral 2.27% > Efectivo 1.89%
    expect(laboral.tasaAnual).toBeGreaterThan(efectivo.tasaAnual)
    expect(laboral.interesAcumulado).toBeGreaterThan(efectivo.interesAcumulado)
  })

  test('interés simple (NO capitalizable) — D.Ley 25920 prohibe anatocismo', () => {
    // Verificamos: 2 períodos de 180 días deberían dar lo mismo que 1 período de 360
    const a = calcularInteresesLegales({
      capital: 10000,
      fechaInicio: '2024-01-01',
      fechaFin: '2024-12-26', // 360 días
      tipoInteres: 'laboral',
    })
    const b1 = calcularInteresesLegales({
      capital: 10000,
      fechaInicio: '2024-01-01',
      fechaFin: '2024-06-29', // 180 días
      tipoInteres: 'laboral',
    })
    const b2 = calcularInteresesLegales({
      capital: 10000, // mismo capital, NO 10000+interés del b1
      fechaInicio: '2024-06-29',
      fechaFin: '2024-12-26', // 180 días
      tipoInteres: 'laboral',
    })

    // 360 días debe ser exactamente la suma de 2 × 180 días (interés simple)
    expect(a.interesAcumulado).toBeCloseTo(b1.interesAcumulado + b2.interesAcumulado, 1)
  })

  test('base legal cita D.Ley 25920 explícitamente', () => {
    const r = calcularInteresesLegales({
      capital: 1000,
      fechaInicio: '2025-01-01',
      fechaFin: '2025-04-01',
      tipoInteres: 'laboral',
    })
    expect(r.baseLegal).toMatch(/D\.\s?Ley\s?25920/)
  })

  test('formula y detalle se generan con montos correctos', () => {
    const r = calcularInteresesLegales({
      capital: 2500,
      fechaInicio: '2025-01-01',
      fechaFin: '2025-04-11', // 100 días
      tipoInteres: 'laboral',
    })
    expect(r.formula).toContain('2.27%')
    expect(r.detalle).toContain('100 días')
    expect(r.detalle).toContain('Capital')
  })

  test('caso real: gratificación de S/2000 pagada 45 días tarde', () => {
    const r = calcularInteresesLegales({
      capital: 2000,
      fechaInicio: '2025-07-15', // plazo legal
      fechaFin: '2025-08-29', // 45 días tarde
      tipoInteres: 'laboral',
    })
    // 2000 × 2.27% × 45/360 ≈ 5.675
    expect(r.diasCalculados).toBe(45)
    expect(r.interesAcumulado).toBeCloseTo(5.68, 1)
  })
})
