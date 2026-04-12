import { describe, it, expect } from 'vitest'
import { calcularAportesPrevisionales } from '../aportes-previsionales'

// UIT 2026 = 5500, RMV = 1130
const BASE_INPUT = {
  sueldoBruto: 3000,
  asignacionFamiliar: false,
  tipoAporte: 'AFP' as const,
  afpNombre: 'PRIMA',
  sctr: false,
}

describe('calcularAportesPrevisionales', () => {
  it('calcula correctamente aporte AFP PRIMA', () => {
    const result = calcularAportesPrevisionales(BASE_INPUT)
    // Aporte obligatorio: 10% de 3000 = 300
    expect(result.aporteObligatorio).toBeCloseTo(300, 1)
    // EsSalud empleador: 9% = 270
    expect(result.essalud).toBeCloseTo(270, 1)
    // Sueldo neto = 3000 - descuentos trabajador
    expect(result.sueldoNeto).toBeLessThan(3000)
    expect(result.sistema).toContain('AFP')
    expect(result.afp).toBeTruthy()
  })

  it('calcula correctamente aporte ONP (13%)', () => {
    const input = { ...BASE_INPUT, tipoAporte: 'ONP' as const, afpNombre: undefined }
    const result = calcularAportesPrevisionales(input)
    // ONP: 13% de 3000 = 390
    expect(result.aporteObligatorio).toBeCloseTo(390, 1)
    expect(result.seguroInvalidez).toBe(0)
    expect(result.comisionAfp).toBe(0)
    expect(result.sistema).toContain('ONP')
  })

  it('aplica SCTR cuando corresponde', () => {
    const input = { ...BASE_INPUT, sctr: true }
    const result = calcularAportesPrevisionales(input)
    expect(result.sctr).toBeGreaterThan(0)
    expect(result.totalAporteEmpleador).toBeGreaterThan(result.essalud)
  })

  it('incluye asignacion familiar en remuneracion computable', () => {
    const withAF = calcularAportesPrevisionales({ ...BASE_INPUT, asignacionFamiliar: true })
    const withoutAF = calcularAportesPrevisionales({ ...BASE_INPUT, asignacionFamiliar: false })
    // Con asignacion familiar, remuneracion computable es mayor
    expect(withAF.remuneracionComputable).toBeGreaterThan(withoutAF.remuneracionComputable)
  })

  it('calcula costo total empleador correctamente', () => {
    const result = calcularAportesPrevisionales(BASE_INPUT)
    // Costo total = sueldo bruto + aportes del empleador
    expect(result.costoTotalEmpleador).toBeCloseTo(result.remuneracionComputable + result.totalAporteEmpleador, 1)
  })

  it('devuelve baseLegal no vacia', () => {
    const result = calcularAportesPrevisionales(BASE_INPUT)
    expect(result.baseLegal).toBeTruthy()
    expect(result.baseLegal.length).toBeGreaterThan(10)
  })

  it('maneja SIN_APORTE (contratista sin aporte previsional)', () => {
    const input = { ...BASE_INPUT, tipoAporte: 'SIN_APORTE' as const, afpNombre: undefined }
    const result = calcularAportesPrevisionales(input)
    expect(result.aporteObligatorio).toBe(0)
    expect(result.seguroInvalidez).toBe(0)
    expect(result.sueldoNeto).toBe(result.remuneracionComputable)
  })

  it('AFP PROFUTURO tiene comision flujo mayor que PRIMA', () => {
    const prima = calcularAportesPrevisionales({ ...BASE_INPUT, afpNombre: 'PRIMA' })
    const profuturo = calcularAportesPrevisionales({ ...BASE_INPUT, afpNombre: 'PROFUTURO' })
    // PRIMA comision 0.18%, PROFUTURO 0.69%
    expect(profuturo.comisionAfp).toBeGreaterThan(prima.comisionAfp)
  })
})
