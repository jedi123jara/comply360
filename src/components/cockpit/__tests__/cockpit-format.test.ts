import { describe, expect, it } from 'vitest'
import { NIVEL_LABEL, formatFechaLima, formatSolesRedondeado, nivelCumplimiento } from '../cockpit-format'

describe('formatSolesRedondeado', () => {
  it('muestra soles sin decimales con separador de miles', () => {
    expect(formatSolesRedondeado(12340.4)).toBe('S/ 12,340')
    expect(formatSolesRedondeado(999.5)).toBe('S/ 1,000')
  })

  it('no muestra montos negativos ni NaN', () => {
    expect(formatSolesRedondeado(-50)).toBe('S/ 0')
    expect(formatSolesRedondeado(Number.NaN)).toBe('S/ 0')
    expect(formatSolesRedondeado(null)).toBe('S/ 0')
  })
})

describe('formatFechaLima', () => {
  const now = new Date('2026-10-05T12:00:00Z')

  it('lee la fecha en hora de Lima', () => {
    // 2026-10-13 03:00 UTC = 2026-10-12 22:00 en Lima.
    expect(formatFechaLima('2026-10-13T03:00:00Z', now)).toBe('12 de octubre')
  })

  it('usa "setiembre" y agrega el año solo si no es el actual', () => {
    expect(formatFechaLima('2026-09-20T15:00:00Z', now)).toBe('20 de setiembre')
    expect(formatFechaLima('2025-12-03T15:00:00Z', now)).toBe('3 de diciembre de 2025')
  })

  it('devuelve null para valores vacíos o inválidos', () => {
    expect(formatFechaLima(null, now)).toBeNull()
    expect(formatFechaLima('no-es-fecha', now)).toBeNull()
  })
})

describe('nivelCumplimiento', () => {
  it('usa los cortes 80 / 60', () => {
    expect(nivelCumplimiento(80)).toBe('bien')
    expect(nivelCumplimiento(79)).toBe('en-riesgo')
    expect(nivelCumplimiento(60)).toBe('en-riesgo')
    expect(nivelCumplimiento(59)).toBe('critico')
    expect(NIVEL_LABEL[nivelCumplimiento(79)]).toBe('A mejorar')
    expect(NIVEL_LABEL[nivelCumplimiento(30)]).toBe('En riesgo')
  })
})
