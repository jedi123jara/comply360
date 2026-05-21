import { describe, expect, it } from 'vitest'
import {
  formatSoles,
  formatSolesMarketing,
  formatSolesParts,
  formatDni,
  formatDniMasked,
  formatRuc,
  formatPhonePE,
  formatPeriodo,
  formatPeriodoCorto,
  formatShortDate,
} from '../peruvian'

describe('formatSoles', () => {
  it('formatea con 2 decimales, separadores US y sufijo "nuevos soles"', () => {
    expect(formatSoles(2350.55)).toBe('2,350.55 nuevos soles')
    expect(formatSoles(1234567.89)).toBe('1,234,567.89 nuevos soles')
  })

  it('plural siempre, incluso para 1.00 (convención BCRP)', () => {
    expect(formatSoles(1)).toBe('1.00 nuevos soles')
    expect(formatSoles(0.01)).toBe('0.01 nuevos soles')
  })

  it('acepta strings numéricos', () => {
    expect(formatSoles('1500.00')).toBe('1,500.00 nuevos soles')
  })

  it('acepta objetos tipo Decimal (con toNumber())', () => {
    expect(formatSoles({ toNumber: () => 1234.5 })).toBe('1,234.50 nuevos soles')
  })

  it('retorna "0.00 nuevos soles" para null/undefined/NaN', () => {
    expect(formatSoles(null)).toBe('0.00 nuevos soles')
    expect(formatSoles(undefined)).toBe('0.00 nuevos soles')
    expect(formatSoles('not-a-number')).toBe('0.00 nuevos soles')
  })

  it('maneja cero correctamente', () => {
    expect(formatSoles(0)).toBe('0.00 nuevos soles')
  })

  it('maneja negativos', () => {
    expect(formatSoles(-1234.56)).toBe('-1,234.56 nuevos soles')
  })

  it('millones grandes mantienen formato completo (sin compactar)', () => {
    expect(formatSoles(1_500_000)).toBe('1,500,000.00 nuevos soles')
    expect(formatSoles(45_000)).toBe('45,000.00 nuevos soles')
  })
})

describe('formatSolesMarketing', () => {
  it('omite decimales cuando el monto es entero', () => {
    expect(formatSolesMarketing(49)).toBe('49 nuevos soles')
    expect(formatSolesMarketing(349)).toBe('349 nuevos soles')
    expect(formatSolesMarketing(4990)).toBe('4,990 nuevos soles')
  })

  it('mantiene decimales si el monto no es entero', () => {
    expect(formatSolesMarketing(49.5)).toBe('49.50 nuevos soles')
    expect(formatSolesMarketing(99.99)).toBe('99.99 nuevos soles')
  })

  it('separadores US para enteros grandes', () => {
    expect(formatSolesMarketing(150_000)).toBe('150,000 nuevos soles')
  })

  it('null/undefined/NaN → "Consultar"', () => {
    expect(formatSolesMarketing(null)).toBe('Consultar')
    expect(formatSolesMarketing(undefined)).toBe('Consultar')
    expect(formatSolesMarketing(NaN)).toBe('Consultar')
  })
})

describe('formatSolesParts', () => {
  it('separa monto y moneda para estilo jerárquico', () => {
    expect(formatSolesParts(2350.55)).toEqual({
      amount: '2,350.55',
      currency: 'nuevos soles',
    })
  })

  it('null/NaN → defaults seguros', () => {
    expect(formatSolesParts(null)).toEqual({
      amount: '0.00',
      currency: 'nuevos soles',
    })
  })

  it('acepta Decimal', () => {
    expect(formatSolesParts({ toNumber: () => 5000 })).toEqual({
      amount: '5,000.00',
      currency: 'nuevos soles',
    })
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
