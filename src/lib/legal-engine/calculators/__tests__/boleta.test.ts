import { describe, it, expect } from 'vitest'
import { calcularBoleta, type BoletaInput } from '../boleta'

// UIT 2026 = 5,500 | RMV = 1,130
const BASE: BoletaInput = {
  sueldoBruto: 3000,
  asignacionFamiliar: false,
  tipoAporte: 'AFP',
  afpNombre: 'PRIMA',
  sctr: false,
  regimenLaboral: 'GENERAL',
  horasExtras: 0,
  bonificaciones: 0,
  incluirGratificacion: false,
  mes: 4,
  retencionRentaAcumulada: 0,
}

describe('calcularBoleta', () => {
  it('calcula totalIngresos = sueldo bruto cuando no hay variables', () => {
    const r = calcularBoleta(BASE)
    expect(r.totalIngresos).toBe(3000)
    expect(r.sueldoBruto).toBe(3000)
    expect(r.asignacionFamiliar).toBe(0)
    expect(r.gratificacion).toBe(0)
  })

  it('incluye asignación familiar (10% de RMV = 113)', () => {
    const r = calcularBoleta({ ...BASE, asignacionFamiliar: true })
    expect(r.asignacionFamiliar).toBeCloseTo(113, 1)
    expect(r.totalIngresos).toBeCloseTo(3113, 1)
  })

  it('suma horas extras al total de ingresos', () => {
    const r = calcularBoleta({ ...BASE, horasExtras: 200 })
    expect(r.totalIngresos).toBeCloseTo(3200, 1)
    expect(r.horasExtras).toBe(200)
  })

  it('suma bonificaciones al total de ingresos', () => {
    const r = calcularBoleta({ ...BASE, bonificaciones: 500 })
    expect(r.totalIngresos).toBeCloseTo(3500, 1)
  })

  it('incluye gratificación + bonif. extraordinaria en julio', () => {
    const r = calcularBoleta({ ...BASE, incluirGratificacion: true, mes: 7 })
    // Gratificación = rem computable (3000) × 1 = 3000
    // Bonif extra = 3000 × 9% = 270
    expect(r.gratificacion).toBeCloseTo(3000, 1)
    expect(r.bonificacionExtraordinaria).toBeCloseTo(270, 1)
    expect(r.totalIngresos).toBeCloseTo(3000 + 3000 + 270, 1)
  })

  it('MYPE_MICRO: gratificación = 0 aunque se pida', () => {
    const r = calcularBoleta({
      ...BASE,
      regimenLaboral: 'MYPE_MICRO',
      incluirGratificacion: true,
      mes: 7,
    })
    expect(r.gratificacion).toBe(0)
    expect(r.bonificacionExtraordinaria).toBe(0)
  })

  it('MYPE_PEQUENA: gratificación al 50%', () => {
    const r = calcularBoleta({
      ...BASE,
      regimenLaboral: 'MYPE_PEQUENA',
      incluirGratificacion: true,
      mes: 7,
    })
    // 50% de rem computable (3000) = 1500
    expect(r.gratificacion).toBeCloseTo(1500, 1)
  })

  it('descuenta AFP correctamente (Prima: 10% + 1.84% + 0.18%)', () => {
    const r = calcularBoleta(BASE)
    // aporteAfpOnp = 10% de 3000 = 300
    expect(r.aporteAfpOnp).toBeCloseTo(300, 1)
    // seguro invalidez: 1.84% de 3000 = 55.2
    expect(r.seguroInvalidez).toBeCloseTo(55.2, 1)
    expect(r.totalDescuentos).toBeGreaterThan(0)
  })

  it('descuenta ONP 13%', () => {
    const r = calcularBoleta({ ...BASE, tipoAporte: 'ONP', afpNombre: undefined })
    expect(r.aporteAfpOnp).toBeCloseTo(390, 1)
    expect(r.seguroInvalidez).toBe(0)
    expect(r.comisionAfp).toBe(0)
  })

  it('netoPagar = totalIngresos - totalDescuentos', () => {
    const r = calcularBoleta(BASE)
    expect(r.netoPagar).toBeCloseTo(r.totalIngresos - r.totalDescuentos, 2)
  })

  it('neto siempre menor que ingresos (hay descuentos)', () => {
    const r = calcularBoleta(BASE)
    expect(r.netoPagar).toBeLessThan(r.totalIngresos)
  })

  it('essalud = 9% sobre rem computable (aportes empleador)', () => {
    const r = calcularBoleta(BASE)
    // rem computable = 3000 (sin asig familiar), essalud = 9% = 270
    expect(r.essalud).toBeCloseTo(270, 1)
  })

  it('costoTotalEmpleador > totalIngresos', () => {
    const r = calcularBoleta(BASE)
    expect(r.costoTotalEmpleador).toBeGreaterThan(r.totalIngresos)
  })

  it('detalleJson contiene todos los campos clave', () => {
    const r = calcularBoleta(BASE)
    expect(r.detalleJson).toHaveProperty('sueldoBruto', 3000)
    expect(r.detalleJson).toHaveProperty('totalIngresos')
    expect(r.detalleJson).toHaveProperty('netoPagar')
    expect(r.detalleJson).toHaveProperty('aporteAfpOnp')
    expect(r.detalleJson).toHaveProperty('rentaQuintaCat')
    expect(r.detalleJson).toHaveProperty('essalud')
  })

  it('renta 5ta es cero para sueldo bajo (RMV)', () => {
    const r = calcularBoleta({ ...BASE, sueldoBruto: 1130 })
    // Con S/1,130: RBA proyectada = 1130×12 + 1130×2 = 15,820 < 38,500 → renta = 0
    expect(r.rentaQuintaCat).toBe(0)
  })

  it('renta 5ta positiva para sueldos altos', () => {
    const r = calcularBoleta({ ...BASE, sueldoBruto: 15000, mes: 1 })
    expect(r.rentaQuintaCat).toBeGreaterThan(0)
  })

  it('ingresos breakdown tiene al menos el concepto sueldo básico', () => {
    const r = calcularBoleta(BASE)
    expect(r.ingresos.some(i => i.concepto === 'Sueldo Básico')).toBe(true)
  })

  it('descuentos breakdown tiene entrada AFP o ONP', () => {
    const r = calcularBoleta(BASE)
    expect(r.descuentos.length).toBeGreaterThan(0)
    expect(r.descuentos.some(d => d.concepto.includes('AFP') || d.concepto.includes('ONP'))).toBe(true)
  })

  it('sistemaPrevisional refleja AFP seleccionado', () => {
    const r = calcularBoleta({ ...BASE, afpNombre: 'INTEGRA' })
    expect(r.sistemaPrevisional.toUpperCase()).toContain('INTEGRA')
  })

  it('ctsEstimadoMes es mayor que 0 con sueldo normal', () => {
    const r = calcularBoleta(BASE)
    expect(r.ctsEstimadoMes).toBeGreaterThan(0)
  })
})
