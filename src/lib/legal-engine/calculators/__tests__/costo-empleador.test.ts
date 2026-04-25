/**
 * Tests para calcularCostoEmpleador.
 *
 * El costo real del empleador es ~52% más que el bruto en régimen general
 * (EsSalud + provisiones CTS + gratificaciones + bonif extraordinaria +
 * vacaciones). Este test valida que ese múltiplo cae en el rango esperado
 * según régimen.
 */

import { calcularCostoEmpleador } from '../costo-empleador'

describe('calcularCostoEmpleador — régimen GENERAL', () => {
  test('sueldo S/3000 sin extras → costo total ~52% más', () => {
    const r = calcularCostoEmpleador({
      sueldoBruto: 3000,
      asignacionFamiliar: false,
      regimenLaboral: 'GENERAL',
      tipoAporte: 'AFP',
      sctr: false,
      essaludVida: false,
    })

    // EsSalud 9% = 270
    expect(r.essalud).toBe(270)
    // Gratificación: 3000/6 = 500
    expect(r.provisionGratificacion).toBe(500)
    // Bonificación extraordinaria 9% sobre gratif: 45
    expect(r.provisionBonifExtraordinaria).toBe(45)
    // Vacaciones: 3000/12 = 250
    expect(r.provisionVacaciones).toBe(250)

    // Costo mensual total > sueldo bruto
    expect(r.costoMensualEmpleador).toBeGreaterThan(3000)
    // Sobrecosto típico ~40-55% en régimen general (sin SCTR ni seguro vida)
    expect(r.porcentajeSobreSueldo).toBeGreaterThanOrEqual(40)
    expect(r.porcentajeSobreSueldo).toBeLessThanOrEqual(60)
  })

  test('asignación familiar suma a la base de aportes/provisiones', () => {
    const sin = calcularCostoEmpleador({
      sueldoBruto: 2000,
      asignacionFamiliar: false,
      regimenLaboral: 'GENERAL',
      tipoAporte: 'ONP',
      sctr: false,
      essaludVida: false,
    })
    const con = calcularCostoEmpleador({
      sueldoBruto: 2000,
      asignacionFamiliar: true,
      regimenLaboral: 'GENERAL',
      tipoAporte: 'ONP',
      sctr: false,
      essaludVida: false,
    })

    // Asignación = 10% RMV
    expect(con.asignacionFamiliar).toBeGreaterThan(0)
    expect(con.remuneracionTotal).toBeGreaterThan(sin.remuneracionTotal)
    expect(con.essalud).toBeGreaterThan(sin.essalud)
    expect(con.provisionGratificacion).toBeGreaterThan(sin.provisionGratificacion)
  })

  test('SCTR activo agrega ~1.53% al costo', () => {
    const sin = calcularCostoEmpleador({
      sueldoBruto: 4000,
      asignacionFamiliar: false,
      regimenLaboral: 'GENERAL',
      tipoAporte: 'AFP',
      sctr: false,
      essaludVida: false,
    })
    const con = calcularCostoEmpleador({
      sueldoBruto: 4000,
      asignacionFamiliar: false,
      regimenLaboral: 'GENERAL',
      tipoAporte: 'AFP',
      sctr: true,
      essaludVida: false,
    })

    expect(sin.sctr).toBe(0)
    expect(con.sctr).toBeGreaterThan(0)
    expect(con.costoMensualEmpleador).toBeGreaterThan(sin.costoMensualEmpleador)
    // 4000 * 0.0153 ≈ 61.2
    expect(con.sctr).toBeCloseTo(61.2, 0)
  })

  test('seguro vida ley agrega 0.53% al costo', () => {
    const con = calcularCostoEmpleador({
      sueldoBruto: 5000,
      asignacionFamiliar: false,
      regimenLaboral: 'GENERAL',
      tipoAporte: 'AFP',
      sctr: false,
      essaludVida: true,
    })
    expect(con.seguroVida).toBeCloseTo(26.5, 0) // 5000 × 0.0053
  })
})

describe('calcularCostoEmpleador — régimen MYPE', () => {
  test('MYPE_MICRO: sin CTS, sin gratificación, vacaciones de 15 días', () => {
    const r = calcularCostoEmpleador({
      sueldoBruto: 1500,
      asignacionFamiliar: false,
      regimenLaboral: 'MYPE_MICRO',
      tipoAporte: 'ONP',
      sctr: false,
      essaludVida: false,
    })

    expect(r.provisionCTS).toBe(0)
    expect(r.provisionGratificacion).toBe(0)
    // Vacaciones MYPE: 15 días/360 × sueldo
    expect(r.provisionVacaciones).toBeCloseTo(1500 * 15 / 360, 1)
    // Sobrecosto MYPE_MICRO mucho menor que GENERAL
    expect(r.porcentajeSobreSueldo).toBeLessThan(20)
  })

  test('MYPE_PEQUENA: 50% CTS y 50% gratificación', () => {
    const general = calcularCostoEmpleador({
      sueldoBruto: 2000,
      asignacionFamiliar: false,
      regimenLaboral: 'GENERAL',
      tipoAporte: 'ONP',
      sctr: false,
      essaludVida: false,
    })
    const mype = calcularCostoEmpleador({
      sueldoBruto: 2000,
      asignacionFamiliar: false,
      regimenLaboral: 'MYPE_PEQUENA',
      tipoAporte: 'ONP',
      sctr: false,
      essaludVida: false,
    })

    // MYPE pequeña tiene 50% de gratificación que la general
    expect(mype.provisionGratificacion).toBeCloseTo(general.provisionGratificacion * 0.5, 0)
    // Costo total MYPE < general
    expect(mype.costoMensualEmpleador).toBeLessThan(general.costoMensualEmpleador)
  })
})

describe('calcularCostoEmpleador — régimen AGRARIO', () => {
  test('EsSalud Agrario es 4.5% (no 9%)', () => {
    const r = calcularCostoEmpleador({
      sueldoBruto: 1500,
      asignacionFamiliar: false,
      regimenLaboral: 'AGRARIO',
      tipoAporte: 'ONP',
      sctr: false,
      essaludVida: false,
    })
    expect(r.essalud).toBeCloseTo(1500 * 0.045, 0) // 67.5
  })

  test('AGRARIO: CTS y gratificación incluidas en jornal (no se provisionan)', () => {
    const r = calcularCostoEmpleador({
      sueldoBruto: 2500,
      asignacionFamiliar: false,
      regimenLaboral: 'AGRARIO',
      tipoAporte: 'ONP',
      sctr: false,
      essaludVida: false,
    })
    expect(r.provisionCTS).toBe(0)
    expect(r.provisionGratificacion).toBe(0)
  })
})

describe('calcularCostoEmpleador — descuentos del trabajador', () => {
  test('AFP: descuenta ~12.34% del bruto', () => {
    const r = calcularCostoEmpleador({
      sueldoBruto: 4000,
      asignacionFamiliar: false,
      regimenLaboral: 'GENERAL',
      tipoAporte: 'AFP',
      sctr: false,
      essaludVida: false,
    })
    expect(r.descuentoAfp).toBeCloseTo(4000 * 0.1234, 0)
    expect(r.descuentoOnp).toBe(0)
  })

  test('ONP: descuenta 13% del bruto', () => {
    const r = calcularCostoEmpleador({
      sueldoBruto: 4000,
      asignacionFamiliar: false,
      regimenLaboral: 'GENERAL',
      tipoAporte: 'ONP',
      sctr: false,
      essaludVida: false,
    })
    expect(r.descuentoAfp).toBe(0)
    expect(r.descuentoOnp).toBeCloseTo(4000 * 0.13, 0)
  })

  test('SIN_APORTE (modalidad formativa): cero descuentos previsionales', () => {
    const r = calcularCostoEmpleador({
      sueldoBruto: 1130, // RMV
      asignacionFamiliar: false,
      regimenLaboral: 'MODALIDAD_FORMATIVA',
      tipoAporte: 'SIN_APORTE',
      sctr: false,
      essaludVida: false,
    })
    expect(r.descuentoAfp).toBe(0)
    expect(r.descuentoOnp).toBe(0)
  })

  test('renta 5ta: sueldos bajos no tributan (bajo 7 UIT anuales)', () => {
    // Sueldo S/2000 mensual → 28000 anual con gratif → < 7 UIT (38500)
    const r = calcularCostoEmpleador({
      sueldoBruto: 2000,
      asignacionFamiliar: false,
      regimenLaboral: 'GENERAL',
      tipoAporte: 'AFP',
      sctr: false,
      essaludVida: false,
    })
    expect(r.descuentoRenta5ta).toBe(0)
  })

  test('renta 5ta: sueldo alto sí tributa', () => {
    // Sueldo S/8000 mensual → 112000 anual >> 7 UIT (38500)
    const r = calcularCostoEmpleador({
      sueldoBruto: 8000,
      asignacionFamiliar: false,
      regimenLaboral: 'GENERAL',
      tipoAporte: 'AFP',
      sctr: false,
      essaludVida: false,
    })
    expect(r.descuentoRenta5ta).toBeGreaterThan(0)
  })

  test('netoEstimado = remuneracionTotal − descuentos', () => {
    const r = calcularCostoEmpleador({
      sueldoBruto: 3000,
      asignacionFamiliar: true,
      regimenLaboral: 'GENERAL',
      tipoAporte: 'AFP',
      sctr: false,
      essaludVida: false,
    })
    const expectedNeto = r.remuneracionTotal - r.descuentoAfp - r.descuentoOnp - r.descuentoRenta5ta
    expect(r.netoEstimado).toBeCloseTo(expectedNeto, 1)
  })
})

describe('calcularCostoEmpleador — base legal', () => {
  test('siempre incluye D.S. 003-97-TR, Ley 27735, Ley 30334', () => {
    const r = calcularCostoEmpleador({
      sueldoBruto: 2000,
      asignacionFamiliar: false,
      regimenLaboral: 'GENERAL',
      tipoAporte: 'AFP',
      sctr: false,
      essaludVida: false,
    })
    const text = r.baseLegal.join(' ')
    expect(text).toMatch(/003-97-TR/)
    expect(text).toMatch(/Ley 27735/)
    expect(text).toMatch(/Ley 30334/)
  })

  test('SCTR activa cita Ley 26790 Art. 19', () => {
    const r = calcularCostoEmpleador({
      sueldoBruto: 2000,
      asignacionFamiliar: false,
      regimenLaboral: 'GENERAL',
      tipoAporte: 'AFP',
      sctr: true,
      essaludVida: false,
    })
    expect(r.baseLegal.join(' ')).toMatch(/SCTR/)
  })

  test('régimen agrario cita Ley 31110', () => {
    const r = calcularCostoEmpleador({
      sueldoBruto: 1500,
      asignacionFamiliar: false,
      regimenLaboral: 'AGRARIO',
      tipoAporte: 'ONP',
      sctr: false,
      essaludVida: false,
    })
    expect(r.baseLegal.join(' ')).toMatch(/31110/)
  })
})
