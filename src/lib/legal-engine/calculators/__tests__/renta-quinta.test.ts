import { describe, it, expect } from 'vitest'
import { calcularRentaQuinta, estimarRentaQuintaAnual } from '../renta-quinta'

// UIT 2026 = S/ 5,500 → 7 UIT = S/ 38,500
const UIT = 5500
const DEDUCCION = 7 * UIT // 38,500

describe('calcularRentaQuinta', () => {
  it('retorna cero para sueldo bajo (no alcanza la deducción 7 UIT)', () => {
    // Proyección anual: 1130 × 14 (12 sueldos + 2 gratif) = 15,820 < 38,500
    const result = calcularRentaQuinta({
      remuneracionMensual: 1130,
      mes: 1,
      gratificacionesAnuales: 1130 * 2,
    })
    expect(result.rentaNetaAnualImponible).toBe(0)
    expect(result.retencionMesActual).toBe(0)
    expect(result.deduccion7UIT).toBe(DEDUCCION)
  })

  it('calcula correctamente la proyección anual', () => {
    const sueldo = 5000
    const result = calcularRentaQuinta({
      remuneracionMensual: sueldo,
      mes: 1,
      gratificacionesAnuales: sueldo * 2,
    })
    const expectedRBA = sueldo * 12 + sueldo * 2  // 70,000
    expect(result.rentaBrutaAnualProyectada).toBeCloseTo(expectedRBA, 0)
    expect(result.rentaNetaAnualImponible).toBeCloseTo(expectedRBA - DEDUCCION, 0)
  })

  it('aplica la escala progresiva: primer tramo 8% (0-5 UIT)', () => {
    // Renta neta = 4 UIT = 22,000 → solo primer tramo (0-5 UIT @ 8%)
    // impuesto = 22,000 × 8% = 1,760
    // Necesito RBA tal que RBA - 38,500 = 22,000 → RBA = 60,500
    // rem mensual = (60,500 - gratif_anual) / 12, sin gratif: 60,500 / 12 ≈ 5,041.67
    const result = calcularRentaQuinta({
      remuneracionMensual: 5042, // approx
      mes: 1,
      gratificacionesAnuales: 0,
    })
    // Verify impuesto ≤ 5 UIT × 8% = 2,200
    expect(result.impuestoAnualProyectado).toBeLessThanOrEqual(5 * UIT * 0.08 + 1)
  })

  it('calcula retención mensual dividiendo entre meses restantes', () => {
    // Mes 12: solo 1 mes restante → retención = impuesto total - acumulado
    const result = calcularRentaQuinta({
      remuneracionMensual: 8000,
      mes: 12,
      gratificacionesAnuales: 8000 * 2,
      retenidoAcumulado: 500,
    })
    // Mes 12: meses restantes = 13 - 12 = 1
    // retencion = (impuesto - 500) / 1
    expect(result.retencionMesActual).toBeGreaterThanOrEqual(0)
    if (result.impuestoAnualProyectado > 500) {
      expect(result.retencionMesActual).toBeCloseTo(
        result.impuestoAnualProyectado - 500, 0
      )
    }
  })

  it('no genera retención negativa cuando el acumulado excede el impuesto proyectado', () => {
    const result = calcularRentaQuinta({
      remuneracionMensual: 2000,
      mes: 10,
      retenidoAcumulado: 10000, // exagerado
    })
    expect(result.retencionMesActual).toBe(0)
  })

  it('calcula correctamente mes 4 (9 meses restantes)', () => {
    const sueldo = 10000
    const gratif = sueldo * 2
    const result = calcularRentaQuinta({
      remuneracionMensual: sueldo,
      mes: 4,
      gratificacionesAnuales: gratif,
      retenidoAcumulado: 0,
    })
    // RBA = 10000 × 12 + 20000 = 140,000
    // Neta = 140,000 - 38,500 = 101,500
    expect(result.rentaBrutaAnualProyectada).toBe(140000)
    expect(result.rentaNetaAnualImponible).toBe(101500)
    // Retención mensual = impuesto / (13-4) = impuesto / 9
    const expectedMonthly = result.impuestoAnualProyectado / 9
    expect(result.retencionMesActual).toBeCloseTo(expectedMonthly, 1)
  })

  it('devuelve el desglose de escala en detalleEscala', () => {
    const result = calcularRentaQuinta({
      remuneracionMensual: 15000,
      mes: 1,
      gratificacionesAnuales: 30000,
    })
    expect(result.detalleEscala.length).toBeGreaterThan(0)
    const totalFromDesglose = result.detalleEscala.reduce((s, t) => s + t.impuesto, 0)
    expect(totalFromDesglose).toBeCloseTo(result.impuestoAnualProyectado, 1)
  })
})

describe('estimarRentaQuintaAnual', () => {
  it('retorna 0 para sueldos menores que 7 UIT / 14', () => {
    // 38,500 / 14 = 2,750 → sueldos ≤ S/2,750 dan renta neta ≤ 0
    const result = estimarRentaQuintaAnual(2500)
    expect(result).toBe(0)
  })

  it('retorna un valor positivo para sueldos altos', () => {
    expect(estimarRentaQuintaAnual(10000)).toBeGreaterThan(0)
  })
})
