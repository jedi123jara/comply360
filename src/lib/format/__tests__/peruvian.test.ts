import { describe, expect, it } from 'vitest'
import {
  formatSoles,
  formatSolesCompact,
  formatDni,
  formatDniMasked,
  formatRuc,
  formatPhonePE,
  formatPeriodo,
  formatPeriodoCorto,
  formatShortDate,
} from '../peruvian'

describe('formatSoles', () => {
  it('formatea con 2 decimales y separador de miles', () => {
    expect(formatSoles(2350.55)).toBe('S/ 2,350.55')
    expect(formatSoles(1234567.89)).toBe('S/ 1,234,567.89')
  })

  it('acepta strings numéricos', () => {
    expect(formatSoles('1500.00')).toBe('S/ 1,500.00')
  })

  it('retorna S/ 0.00 para null/undefined/NaN', () => {
    expect(formatSoles(null)).toBe('S/ 0.00')
    expect(formatSoles(undefined)).toBe('S/ 0.00')
    expect(formatSoles('not-a-number')).toBe('S/ 0.00')
  })

  it('maneja cero correctamente', () => {
    expect(formatSoles(0)).toBe('S/ 0.00')
  })
})

describe('formatSolesCompact', () => {
  it('M para millones', () => {
    expect(formatSolesCompact(1_500_000)).toBe('S/ 1.50M')
  })

  it('K para valores >= 10K', () => {
    expect(formatSolesCompact(45_000)).toBe('S/ 45.0K')
  })

  it('formato completo para < 10K', () => {
    expect(formatSolesCompact(2350.55)).toBe('S/ 2,350.55')
  })
})

describe('formatDni / formatDniMasked', () => {
  it('DNI plano si tiene 8 dígitos', () => {
    expect(formatDni('45678912')).toBe('45678912')
  })

  it('DNI enmascarado preserva solo primeros y últimos 2', () => {
    expect(formatDniMasked('45678912')).toBe('45****12')
  })

  it('DNI muy corto → ****', () => {
    expect(formatDniMasked('123')).toBe('****')
  })

  it('null → —', () => {
    expect(formatDni(null)).toBe('—')
    expect(formatDniMasked(null)).toBe('—')
  })
})

describe('formatRuc', () => {
  it('limpia caracteres no dígitos', () => {
    expect(formatRuc('20-505-897-867')).toBe('20505897867')
  })
})

describe('formatPhonePE', () => {
  it('9 dígitos móvil: formato con espacios', () => {
    expect(formatPhonePE('916275643')).toBe('916 275 643')
  })

  it('11 dígitos con código país 51: +51 XXX XXX XXX', () => {
    expect(formatPhonePE('51916275643')).toBe('+51 916 275 643')
  })

  it('fijo Lima 7 dígitos', () => {
    expect(formatPhonePE('4445566')).toBe('01 444 5566')
  })

  it('null → —', () => {
    expect(formatPhonePE(null)).toBe('—')
  })
})

describe('formatPeriodo / formatPeriodoCorto', () => {
  it('YYYY-MM → "Mes YYYY"', () => {
    expect(formatPeriodo('2026-04')).toBe('Abril 2026')
    expect(formatPeriodo('2026-01')).toBe('Enero 2026')
    expect(formatPeriodo('2026-12')).toBe('Diciembre 2026')
  })

  it('YYYY-MM → "Mes \'YY" para compacto', () => {
    expect(formatPeriodoCorto('2026-04')).toBe("Abr '26")
  })

  it('formato inválido → devuelve tal cual', () => {
    expect(formatPeriodo('invalido')).toBe('invalido')
    expect(formatPeriodo('2026-13')).toBe('2026-13')
  })

  it('null → —', () => {
    expect(formatPeriodo(null)).toBe('—')
  })
})

describe('formatShortDate', () => {
  it('retorna formato dd mmm yyyy', () => {
    const out = formatShortDate('2026-04-23T15:00:00Z')
    // El output tiene el día + mes abreviado + año. El formateo exacto lo
    // resuelve Intl según locale, así que validamos contenido clave.
    expect(out).toMatch(/abr/i)
    expect(out).toContain('2026')
  })

  it('null → —', () => {
    expect(formatShortDate(null)).toBe('—')
  })

  it('iso inválido → —', () => {
    expect(formatShortDate('not-a-date')).toBe('—')
  })
})
