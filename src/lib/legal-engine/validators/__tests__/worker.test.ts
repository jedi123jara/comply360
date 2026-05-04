import { describe, it, expect } from 'vitest'
import { validateWorkerLegality, assertWorkerLegality } from '../worker'
import { PERU_LABOR } from '../../peru-labor'

const RMV = PERU_LABOR.RMV

// Helper: input mínimo por defecto (régimen GENERAL, tipo INDEFINIDO)
function baseInput(overrides: Partial<Parameters<typeof validateWorkerLegality>[0]> = {}) {
  return {
    regimen: 'GENERAL',
    tipoContrato: 'INDEFINIDO',
    sueldoBruto: 1500,
    jornadaSemanal: 48,
    sctr: false,
    ...overrides,
  }
}

describe('validateWorkerLegality — sueldo mínimo (RMV)', () => {
  it('acepta sueldo igual a RMV en régimen GENERAL', () => {
    const r = validateWorkerLegality(baseInput({ sueldoBruto: RMV }))
    expect(r.valid).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it('rechaza sueldo menor a RMV en régimen GENERAL', () => {
    const r = validateWorkerLegality(baseInput({ sueldoBruto: RMV - 1 }))
    expect(r.valid).toBe(false)
    expect(r.errors.some(e => e.code === 'SUELDO_MENOR_A_RMV')).toBe(true)
  })

  it('rechaza sueldo menor a RMV en MYPE_MICRO', () => {
    const r = validateWorkerLegality(baseInput({ regimen: 'MYPE_MICRO', sueldoBruto: 1000 }))
    expect(r.valid).toBe(false)
    expect(r.errors.some(e => e.code === 'SUELDO_MENOR_A_RMV')).toBe(true)
  })

  it('exige RMV exacta en MODALIDAD_FORMATIVA', () => {
    const ok = validateWorkerLegality(baseInput({
      regimen: 'MODALIDAD_FORMATIVA',
      tipoContrato: 'TIEMPO_PARCIAL', // se valida después; aquí estamos en jornada legal del régimen
      sueldoBruto: RMV,
      jornadaSemanal: 20,
    }))
    // hay error por incompatibilidad régimen-tipo, pero NO por sueldo
    expect(ok.errors.some(e => e.code === 'MOD_FORMATIVA_SUELDO_DEBE_SER_RMV')).toBe(false)

    const wrong = validateWorkerLegality(baseInput({
      regimen: 'MODALIDAD_FORMATIVA',
      sueldoBruto: RMV + 100,
    }))
    expect(wrong.errors.some(e => e.code === 'MOD_FORMATIVA_SUELDO_DEBE_SER_RMV')).toBe(true)
  })

  it('CAS está exento de RMV (no valida ese campo aquí)', () => {
    // CAS sí necesita su propia validación, pero al menos no falla por RMV
    const r = validateWorkerLegality(baseInput({
      regimen: 'CAS',
      tipoContrato: 'PLAZO_FIJO',
      sueldoBruto: 1000,
    }))
    expect(r.errors.some(e => e.code === 'SUELDO_MENOR_A_RMV')).toBe(false)
  })
})

describe('validateWorkerLegality — tiempo parcial', () => {
  it('rechaza TIEMPO_PARCIAL con jornada >= 24h', () => {
    const r = validateWorkerLegality(baseInput({
      tipoContrato: 'TIEMPO_PARCIAL',
      jornadaSemanal: 24,
    }))
    expect(r.valid).toBe(false)
    expect(r.errors.some(e => e.code === 'TIEMPO_PARCIAL_JORNADA_INVALIDA')).toBe(true)
  })

  it('acepta TIEMPO_PARCIAL con jornada < 24h', () => {
    const r = validateWorkerLegality(baseInput({
      tipoContrato: 'TIEMPO_PARCIAL',
      jornadaSemanal: 20,
      sueldoBruto: RMV, // proporcional pero el validador no calcula proporcionalidad aquí
    }))
    // No tiene error de tiempo parcial
    expect(r.errors.some(e => e.code === 'TIEMPO_PARCIAL_JORNADA_INVALIDA')).toBe(false)
  })
})

describe('validateWorkerLegality — SCTR obligatorio', () => {
  it.each(['CONSTRUCCION_CIVIL', 'MINERO', 'PESQUERO'])(
    'exige sctr=true en régimen %s',
    (regimen) => {
      const r = validateWorkerLegality(baseInput({ regimen, sctr: false, sueldoBruto: 2000 }))
      expect(r.errors.some(e => e.code === 'SCTR_OBLIGATORIO_FALTANTE')).toBe(true)
    },
  )

  it('acepta CONSTRUCCION_CIVIL con sctr=true', () => {
    const r = validateWorkerLegality(baseInput({
      regimen: 'CONSTRUCCION_CIVIL',
      sctr: true,
      sueldoBruto: 2000,
    }))
    expect(r.errors.some(e => e.code === 'SCTR_OBLIGATORIO_FALTANTE')).toBe(false)
  })

  it('GENERAL no exige SCTR', () => {
    const r = validateWorkerLegality(baseInput({ sctr: false }))
    expect(r.errors.some(e => e.code === 'SCTR_OBLIGATORIO_FALTANTE')).toBe(false)
  })
})

describe('validateWorkerLegality — modalidad formativa edad', () => {
  it('rechaza menor de 14 años', () => {
    const birth = new Date()
    birth.setFullYear(birth.getFullYear() - 13)
    const r = validateWorkerLegality(baseInput({
      regimen: 'MODALIDAD_FORMATIVA',
      tipoContrato: 'TIEMPO_PARCIAL',
      sueldoBruto: RMV,
      birthDate: birth,
    }))
    expect(r.errors.some(e => e.code === 'MENOR_DE_EDAD_NO_ADMITIDO')).toBe(true)
  })

  it('warning para adolescente 14-17', () => {
    const birth = new Date()
    birth.setFullYear(birth.getFullYear() - 16)
    const r = validateWorkerLegality(baseInput({
      regimen: 'MODALIDAD_FORMATIVA',
      tipoContrato: 'TIEMPO_PARCIAL',
      sueldoBruto: RMV,
      birthDate: birth,
    }))
    expect(r.warnings.some(w => w.code === 'MODALIDAD_FORMATIVA_ADOLESCENTE')).toBe(true)
  })

  it('warning para mayor de 30', () => {
    const birth = new Date()
    birth.setFullYear(birth.getFullYear() - 35)
    const r = validateWorkerLegality(baseInput({
      regimen: 'MODALIDAD_FORMATIVA',
      tipoContrato: 'TIEMPO_PARCIAL',
      sueldoBruto: RMV,
      birthDate: birth,
    }))
    expect(r.warnings.some(w => w.code === 'MODALIDAD_FORMATIVA_FUERA_DE_EDAD')).toBe(true)
  })
})

describe('validateWorkerLegality — combinaciones inválidas régimen × tipo', () => {
  it('rechaza CAS con tipo INDEFINIDO', () => {
    const r = validateWorkerLegality(baseInput({
      regimen: 'CAS',
      tipoContrato: 'INDEFINIDO',
      sueldoBruto: 2000,
    }))
    expect(r.errors.some(e => e.code === 'REGIMEN_TIPO_INCOMPATIBLE')).toBe(true)
  })
})

describe('validateWorkerLegality — sueldo atípico (warning)', () => {
  it('emite warning cuando sueldo > 100k', () => {
    const r = validateWorkerLegality(baseInput({ sueldoBruto: 250_000 }))
    expect(r.warnings.some(w => w.code === 'SUELDO_FUERA_DE_RANGO')).toBe(true)
    // NO es error — solo advertencia
    expect(r.valid).toBe(true)
  })
})

describe('validateWorkerLegality — jornada > 48h', () => {
  it('emite warning si jornada excede 48h', () => {
    const r = validateWorkerLegality(baseInput({ jornadaSemanal: 50 }))
    expect(r.warnings.some(w => w.code === 'JORNADA_EXCEDE_MAXIMO')).toBe(true)
  })
})

describe('assertWorkerLegality — throw helper', () => {
  it('no lanza si todo es válido', () => {
    expect(() => assertWorkerLegality(baseInput({ sueldoBruto: RMV }))).not.toThrow()
  })

  it('lanza si hay errores', () => {
    expect(() => assertWorkerLegality(baseInput({ sueldoBruto: 100 }))).toThrow(/Validación legal/)
  })

  it('attach causes con issues', () => {
    try {
      assertWorkerLegality(baseInput({ sueldoBruto: 100 }))
      expect.fail('Debió lanzar')
    } catch (e) {
      const err = e as Error & { cause?: { issues: { code: string }[] } }
      expect(err.cause?.issues?.some(i => i.code === 'SUELDO_MENOR_A_RMV')).toBe(true)
    }
  })
})
