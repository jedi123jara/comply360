import { describe, it, expect } from 'vitest'
import {
  detectarCamposMedicosProhibidos,
  emoCreateSchema,
  arcoCreateSchema,
} from '../schemas'

describe('detectarCamposMedicosProhibidos', () => {
  it('retorna null para payload limpio', () => {
    expect(
      detectarCamposMedicosProhibidos({
        workerId: 'abc',
        tipoExamen: 'PERIODICO',
        aptitud: 'APTO',
        restricciones: 'Evitar cargas mayores a 10 kg',
      }),
    ).toBeNull()
  })

  it('detecta "diagnostico"', () => {
    expect(detectarCamposMedicosProhibidos({ diagnostico: 'X' })).toBe('diagnostico')
  })

  it('detecta variantes case-insensitive', () => {
    expect(detectarCamposMedicosProhibidos({ Diagnostico: 'X' })).toBe('Diagnostico')
    expect(detectarCamposMedicosProhibidos({ DX: 'X' })).toBe('DX')
    expect(detectarCamposMedicosProhibidos({ icd10: 'M54.5' })).toBe('icd10')
  })

  it('detecta como substring (defensivo)', () => {
    expect(detectarCamposMedicosProhibidos({ diagnostico_principal: 'X' })).toBe(
      'diagnostico_principal',
    )
    expect(detectarCamposMedicosProhibidos({ codigoCIE10: 'X' })).toBe('codigoCIE10')
  })

  it('detecta historia clínica', () => {
    expect(detectarCamposMedicosProhibidos({ historiaClinica: '...' })).toBe('historiaClinica')
    expect(detectarCamposMedicosProhibidos({ historia_clinica: '...' })).toBe('historia_clinica')
  })

  it('detecta tratamiento y medicamento', () => {
    expect(detectarCamposMedicosProhibidos({ tratamiento: 'X' })).toBe('tratamiento')
    expect(detectarCamposMedicosProhibidos({ medicamento: 'X' })).toBe('medicamento')
  })

  it('null para input no-objeto', () => {
    expect(detectarCamposMedicosProhibidos(null)).toBeNull()
    expect(detectarCamposMedicosProhibidos('string')).toBeNull()
    expect(detectarCamposMedicosProhibidos(42)).toBeNull()
  })
})

describe('emoCreateSchema', () => {
  const validBase = {
    workerId: 'wkr_123',
    tipoExamen: 'PERIODICO' as const,
    fechaExamen: '2026-05-10',
    centroMedicoNombre: 'Centro Médico San Felipe',
    aptitud: 'APTO' as const,
    consentimientoLey29733: true,
  }

  it('acepta payload mínimo válido', () => {
    expect(emoCreateSchema.safeParse(validBase).success).toBe(true)
  })

  it('rechaza si consentimiento es false', () => {
    const r = emoCreateSchema.safeParse({ ...validBase, consentimientoLey29733: false })
    expect(r.success).toBe(false)
  })

  it('rechaza tipoExamen inválido', () => {
    const r = emoCreateSchema.safeParse({ ...validBase, tipoExamen: 'OTRO' })
    expect(r.success).toBe(false)
  })

  it('rechaza aptitud inválida', () => {
    const r = emoCreateSchema.safeParse({ ...validBase, aptitud: 'CRÍTICO' })
    expect(r.success).toBe(false)
  })

  it('acepta restricciones largas pero <2000 chars', () => {
    const r = emoCreateSchema.safeParse({
      ...validBase,
      restricciones: 'a'.repeat(1500),
    })
    expect(r.success).toBe(true)
  })

  it('rechaza RUC del centro médico con menos de 11 dígitos', () => {
    const r = emoCreateSchema.safeParse({ ...validBase, centroMedicoRuc: '12345' })
    expect(r.success).toBe(false)
  })
})

describe('arcoCreateSchema', () => {
  const valid = {
    solicitanteDni: '12345678',
    solicitanteName: 'Juan Pérez',
    tipo: 'ACCESO' as const,
    detalle: 'Solicito acceso a mis datos personales tratados.',
  }

  it('acepta payload válido', () => {
    expect(arcoCreateSchema.safeParse(valid).success).toBe(true)
  })

  it('rechaza DNI con menos de 8 dígitos', () => {
    const r = arcoCreateSchema.safeParse({ ...valid, solicitanteDni: '1234567' })
    expect(r.success).toBe(false)
  })

  it('rechaza tipo inválido', () => {
    const r = arcoCreateSchema.safeParse({ ...valid, tipo: 'BORRADO' })
    expect(r.success).toBe(false)
  })

  it('rechaza detalle muy corto', () => {
    const r = arcoCreateSchema.safeParse({ ...valid, detalle: 'corto' })
    expect(r.success).toBe(false)
  })

  it('acepta los 5 tipos ARCO + portabilidad', () => {
    for (const tipo of ['ACCESO', 'RECTIFICACION', 'CANCELACION', 'OPOSICION', 'PORTABILIDAD'] as const) {
      const r = arcoCreateSchema.safeParse({ ...valid, tipo })
      expect(r.success).toBe(true)
    }
  })
})
