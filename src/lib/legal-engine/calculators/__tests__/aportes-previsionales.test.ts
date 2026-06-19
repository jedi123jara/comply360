import { describe, it, expect } from 'vitest'
import { calcularAportesPrevisionales } from '../aportes-previsionales'
import { getPrimaSeguroSPP, getRemuneracionMaximaAsegurable, getComisionFlujoAFP } from '../../peru-labor'

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

describe('prima del seguro versionada + tope RMA (fix #4)', () => {
  it('aplica la prima vigente 1.37% (SISCO VIII) sobre remuneración bajo la RMA', () => {
    const r = calcularAportesPrevisionales({ ...BASE_INPUT, periodo: '2026-04' })
    // sueldo 3000 < RMA 12,598.91 → base = 3000; prima 1.37% = 41.10
    expect(r.seguroInvalidez).toBeCloseTo(3000 * 0.0137, 2)
  })

  it('topa la prima en la RMA para sueldos altos (Q2 2026 = S/ 12,598.91)', () => {
    const r = calcularAportesPrevisionales({ ...BASE_INPUT, sueldoBruto: 20000, periodo: '2026-04' })
    // la prima se calcula sobre el tope, no sobre 20,000
    expect(r.seguroInvalidez).toBeCloseTo(12598.91 * 0.0137, 2)
    // pero el aporte obligatorio (10%) NO se topa: va sobre la remuneración completa
    expect(r.aporteObligatorio).toBeCloseTo(20000 * 0.10, 2)
    expect(r.comisionAfp).toBeGreaterThan(0)
  })

  it('usa la RMA del trimestre correcto según el periodo', () => {
    const q1 = calcularAportesPrevisionales({ ...BASE_INPUT, sueldoBruto: 20000, periodo: '2026-01' })
    const q2 = calcularAportesPrevisionales({ ...BASE_INPUT, sueldoBruto: 20000, periodo: '2026-04' })
    expect(q1.seguroInvalidez).toBeCloseTo(12209.11 * 0.0137, 2)
    expect(q2.seguroInvalidez).toBeCloseTo(12598.91 * 0.0137, 2)
    expect(q1.seguroInvalidez).toBeLessThan(q2.seguroInvalidez)
  })

  it('sin periodo usa el valor vigente más reciente (default seguro)', () => {
    const r = calcularAportesPrevisionales({ ...BASE_INPUT, sueldoBruto: 20000 })
    expect(r.seguroInvalidez).toBeCloseTo(12598.91 * 0.0137, 2)
  })
})

describe('helpers versionados de prima y RMA', () => {
  it('getPrimaSeguroSPP devuelve la tasa por periodo (y default = más reciente)', () => {
    expect(getPrimaSeguroSPP('2023-06')).toBeCloseTo(0.0184, 4)
    expect(getPrimaSeguroSPP('2024-06')).toBeCloseTo(0.0170, 4)
    expect(getPrimaSeguroSPP('2025-06')).toBeCloseTo(0.0137, 4)
    expect(getPrimaSeguroSPP('2026-06')).toBeCloseTo(0.0137, 4)
    expect(getPrimaSeguroSPP()).toBeCloseTo(0.0137, 4)
  })

  it('getRemuneracionMaximaAsegurable devuelve la RMA por trimestre (y default = más reciente)', () => {
    expect(getRemuneracionMaximaAsegurable('2025-08')).toBeCloseTo(12184.88, 2)
    expect(getRemuneracionMaximaAsegurable('2026-01')).toBeCloseTo(12209.11, 2)
    expect(getRemuneracionMaximaAsegurable('2026-04')).toBeCloseTo(12598.91, 2)
    expect(getRemuneracionMaximaAsegurable()).toBeCloseTo(12598.91, 2)
  })

  it('getComisionFlujoAFP devuelve la comisión vigente por AFP (default PRIMA)', () => {
    expect(getComisionFlujoAFP('HABITAT')).toBeCloseTo(0.0147, 4)
    expect(getComisionFlujoAFP('INTEGRA')).toBeCloseTo(0.0155, 4)
    expect(getComisionFlujoAFP('PRIMA')).toBeCloseTo(0.0160, 4)
    expect(getComisionFlujoAFP('PROFUTURO')).toBeCloseTo(0.0169, 4)
    expect(getComisionFlujoAFP()).toBeCloseTo(0.0160, 4)
  })
})

describe('comisión por flujo AFP (fix divergencia motor/PLAME)', () => {
  it('usa la tasa vigente SBS por AFP (no la ~1 punto baja anterior)', () => {
    // sueldo 3000: PRIMA 1.60% = 48.0; PROFUTURO 1.69% = 50.7.
    const prima = calcularAportesPrevisionales({ ...BASE_INPUT, afpNombre: 'PRIMA' })
    const profuturo = calcularAportesPrevisionales({ ...BASE_INPUT, afpNombre: 'PROFUTURO' })
    expect(prima.comisionAfp).toBeCloseTo(3000 * 0.0160, 2)
    expect(profuturo.comisionAfp).toBeCloseTo(3000 * 0.0169, 2)
  })
})

describe('comisión por esquema (flujo vs saldo)', () => {
  it('SALDO → comisión 0 sobre el sueldo (se cobra contra el fondo)', () => {
    const r = calcularAportesPrevisionales({ ...BASE_INPUT, afpNombre: 'PRIMA', afpComisionTipo: 'SALDO' })
    expect(r.comisionAfp).toBe(0)
  })

  it('FLUJO → aplica la comisión por flujo (1.60% Prima)', () => {
    const r = calcularAportesPrevisionales({ ...BASE_INPUT, afpNombre: 'PRIMA', afpComisionTipo: 'FLUJO' })
    expect(r.comisionAfp).toBeCloseTo(3000 * 0.0160, 2)
  })

  it('default (sin clasificar / legacy) → flujo, no cambia la data actual', () => {
    const r = calcularAportesPrevisionales({ ...BASE_INPUT, afpNombre: 'PRIMA' })
    expect(r.comisionAfp).toBeCloseTo(3000 * 0.0160, 2)
  })
})
