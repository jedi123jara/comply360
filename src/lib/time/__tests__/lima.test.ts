/**
 * Tests para los helpers de timezone Lima (UTC-5, sin DST).
 */

import { describe, expect, it } from 'vitest'
import {
  getLimaParts,
  startOfDayLima,
  daysBetween,
  isSameDayLima,
  formatDateLima,
} from '../lima'

describe('getLimaParts', () => {
  it('convierte UTC 00:00 a 19:00 del día anterior Lima', () => {
    // 2026-04-23 00:00:00 UTC = 2026-04-22 19:00:00 Lima
    const p = getLimaParts(new Date('2026-04-23T00:00:00Z'))
    expect(p.year).toBe(2026)
    expect(p.month).toBe(4)
    expect(p.day).toBe(22)
    expect(p.hour).toBe(19)
    expect(p.minute).toBe(0)
  })

  it('convierte UTC 05:00 a 00:00 Lima mismo día', () => {
    const p = getLimaParts(new Date('2026-04-23T05:00:00Z'))
    expect(p.day).toBe(23)
    expect(p.hour).toBe(0)
  })

  it('convierte UTC 13:00 a 08:00 Lima', () => {
    // Cron "0 8 * * *" debe matchear este instante en Lima
    const p = getLimaParts(new Date('2026-04-23T13:00:00Z'))
    expect(p.hour).toBe(8)
    expect(p.minute).toBe(0)
  })

  it('expone weekday correctamente', () => {
    // 2026-04-23 es jueves en Lima
    const p = getLimaParts(new Date('2026-04-23T15:00:00Z'))
    expect(p.weekday).toBe(4)
  })

  it('cruza fronteras de año correctamente', () => {
    // 2027-01-01 03:00 UTC = 2026-12-31 22:00 Lima
    const p = getLimaParts(new Date('2027-01-01T03:00:00Z'))
    expect(p.year).toBe(2026)
    expect(p.month).toBe(12)
    expect(p.day).toBe(31)
    expect(p.hour).toBe(22)
  })
})

describe('startOfDayLima', () => {
  it('retorna 05:00 UTC del mismo día Lima para medio día Lima', () => {
    // Input: 2026-04-23 18:30 UTC = 2026-04-23 13:30 Lima
    // Expected: 2026-04-23 05:00 UTC = 2026-04-23 00:00 Lima
    const sod = startOfDayLima(new Date('2026-04-23T18:30:00Z'))
    expect(sod.toISOString()).toBe('2026-04-23T05:00:00.000Z')
  })

  it('retorna el día anterior Lima cuando el instante UTC es madrugada', () => {
    // Input: 2026-04-23 03:00 UTC = 2026-04-22 22:00 Lima
    // Expected: 2026-04-22 05:00 UTC (00:00 Lima del día 22)
    const sod = startOfDayLima(new Date('2026-04-23T03:00:00Z'))
    expect(sod.toISOString()).toBe('2026-04-22T05:00:00.000Z')
  })
})

describe('daysBetween', () => {
  it('retorna 0 para instantes del mismo día Lima', () => {
    const a = new Date('2026-04-23T10:00:00Z')
    const b = new Date('2026-04-23T23:00:00Z')
    expect(daysBetween(a, b)).toBe(0)
  })

  it('retorna 1 cuando a es un día después de b', () => {
    const today = new Date('2026-04-23T15:00:00Z')
    const yesterday = new Date('2026-04-22T15:00:00Z')
    expect(daysBetween(today, yesterday)).toBe(1)
  })

  it('retorna -1 para el caso inverso', () => {
    const today = new Date('2026-04-23T15:00:00Z')
    const yesterday = new Date('2026-04-22T15:00:00Z')
    expect(daysBetween(yesterday, today)).toBe(-1)
  })

  it('maneja gaps de múltiples días', () => {
    const may1 = new Date('2026-05-01T12:00:00Z')
    const apr28 = new Date('2026-04-28T12:00:00Z')
    expect(daysBetween(may1, apr28)).toBe(3)
  })

  it('correcto en frontera UTC: 03:00 UTC es día anterior Lima', () => {
    // "Hoy" Lima: 2026-04-23 22:00 Lima = 2026-04-24 03:00 UTC
    // "Ayer" Lima: 2026-04-22 22:00 Lima = 2026-04-23 03:00 UTC
    const today = new Date('2026-04-24T03:00:00Z')
    const yesterday = new Date('2026-04-23T03:00:00Z')
    expect(daysBetween(today, yesterday)).toBe(1)
  })
})

describe('isSameDayLima', () => {
  it('true para instantes del mismo día Lima aunque difieran en UTC', () => {
    // Ambos son 23 de abril en Lima
    const morning = new Date('2026-04-23T13:00:00Z') // 08:00 Lima
    const night = new Date('2026-04-24T04:59:00Z') // 23:59 Lima del 23
    expect(isSameDayLima(morning, night)).toBe(true)
  })

  it('false cuando cruzan medianoche Lima', () => {
    const night23 = new Date('2026-04-24T04:59:00Z') // 23:59 Lima del 23
    const earlyAm24 = new Date('2026-04-24T05:01:00Z') // 00:01 Lima del 24
    expect(isSameDayLima(night23, earlyAm24)).toBe(false)
  })
})

describe('formatDateLima', () => {
  it('formatea como YYYY-MM-DD', () => {
    const d = new Date('2026-04-23T15:00:00Z')
    expect(formatDateLima(d)).toBe('2026-04-23')
  })

  it('respeta la zona Lima en el límite', () => {
    // 2026-04-24 03:00 UTC = 2026-04-23 22:00 Lima
    const d = new Date('2026-04-24T03:00:00Z')
    expect(formatDateLima(d)).toBe('2026-04-23')
  })

  it('zero-paddea mes y día', () => {
    const d = new Date('2026-01-05T15:00:00Z')
    expect(formatDateLima(d)).toBe('2026-01-05')
  })
})
